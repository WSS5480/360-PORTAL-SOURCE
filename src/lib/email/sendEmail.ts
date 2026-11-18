// src/lib/email/sendEmail.ts
import { ConfidentialClientApplication } from "@azure/msal-node";

export type EmailAttachment = {
  filename: string;
  contentType: string;
  // base64 (no data: prefix)
  contentBytesBase64: string;
};

type EmailList = string | string[];

type SendEmailArgs = {
  to: EmailList;
  cc?: EmailList;
  bcc?: EmailList;
  subject: string;

  // Allow html-only calls; we’ll derive text if missing
  text?: string;
  html?: string;

  replyTo?: string;
  attachments?: EmailAttachment[];

  /** Use type-specific sender when set. Falls back to EMAIL_FROM_* if type-specific vars are unset. */
  emailType?: "ivr" | "order" | "default";
};

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

/**
 * Effective `EMAIL_MODE`. Missing or blank means `disabled` in every environment.
 * Set `EMAIL_MODE=graph` to send through Microsoft Graph.
 */
export function resolveEmailMode(): string {
  const explicit = env("EMAIL_MODE");
  if (!explicit) return "disabled";
  return explicit.toLowerCase();
}

function getFromForType(emailType?: "ivr" | "order" | "default"): { fromAddress: string; fromName: string } {
  const defaultAddress = env("EMAIL_FROM_ADDRESS");
  const defaultName = env("EMAIL_FROM_NAME") || "360 Medical";

  if (emailType === "ivr") {
    const addr = env("EMAIL_IVR_FROM_ADDRESS") || defaultAddress;
    const name = env("EMAIL_IVR_FROM_NAME") || defaultName;
    return { fromAddress: addr!, fromName: name };
  }
  if (emailType === "order") {
    const addr = env("EMAIL_ORDER_FROM_ADDRESS") || defaultAddress;
    const name = env("EMAIL_ORDER_FROM_NAME") || defaultName;
    return { fromAddress: addr!, fromName: name };
  }
  return { fromAddress: defaultAddress!, fromName: defaultName };
}

async function getAccessToken(): Promise<string> {
  const tenantId = env("AZURE_TENANT_ID");
  const clientId = env("AZURE_CLIENT_ID");
  const clientSecret = env("AZURE_CLIENT_SECRET");

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Missing Azure Graph env vars: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET");
  }

  const app = new ConfidentialClientApplication({
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      clientSecret,
    },
  });

  const result = await app.acquireTokenByClientCredential({
    scopes: ["https://graph.microsoft.com/.default"],
  });

  if (!result?.accessToken) {
    throw new Error("Failed to acquire Microsoft Graph access token");
  }

  return result.accessToken;
}

function base64ByteLength(b64: string): number {
  const s = (b64 || "").trim();
  if (!s) return 0;
  const padding = s.endsWith("==") ? 2 : s.endsWith("=") ? 1 : 0;
  return Math.floor((s.length * 3) / 4) - padding;
}

function normalizeEmailList(list: EmailList | undefined): string[] {
  if (!list) return [];
  const arr = Array.isArray(list) ? list : [list];
  return arr.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function toGraphRecipients(list: EmailList | undefined) {
  const arr = normalizeEmailList(list);
  return arr.map((email) => ({ emailAddress: { address: email } }));
}

function stripHtmlToText(html: string): string {
  const s = String(html ?? "");
  // cheap + safe-ish fallback
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildGraphMessage(args: SendEmailArgs) {
  const hasHtml = !!(args.html && String(args.html).trim());
  const text = String(args.text ?? "").trim() || (hasHtml ? stripHtmlToText(String(args.html)) : "");

  if (!hasHtml && !text) {
    throw new Error("sendEmail: Provide at least one of { text, html }");
  }

  const message: any = {
    subject: args.subject,
    body: {
      contentType: hasHtml ? "HTML" : "Text",
      content: hasHtml ? String(args.html) : text,
    },
    toRecipients: toGraphRecipients(args.to),
    ...(normalizeEmailList(args.cc).length ? { ccRecipients: toGraphRecipients(args.cc) } : {}),
    ...(args.replyTo ? { replyTo: [{ emailAddress: { address: String(args.replyTo).trim() } }] } : {}),
    ...(normalizeEmailList(args.bcc).length ? { bccRecipients: toGraphRecipients(args.bcc) } : {}),
  };

  return { message, textDerived: text };
}

async function graphFetch(token: string, url: string, init: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Graph request failed: ${res.status} ${text}`);
  }

  return res;
}

async function sendViaDraftWithUpload(
  token: string,
  fromAddress: string,
  message: any,
  attachment: EmailAttachment
) {
  // 1) Create draft
  const createDraftRes = await graphFetch(
    token,
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(fromAddress)}/messages`,
    { method: "POST", body: JSON.stringify(message) }
  );

  const draftJson = (await createDraftRes.json().catch(() => null)) as any;
  const draftId = typeof draftJson?.id === "string" ? draftJson.id : "";
  if (!draftId) throw new Error("Graph: failed to create draft message (missing id)");

  // 2) Create upload session
  const bytes = Buffer.from(attachment.contentBytesBase64, "base64");
  const attachmentItem = {
    attachmentType: "file",
    name: attachment.filename,
    size: bytes.length,
    contentType: attachment.contentType,
  };

  const uploadSessionRes = await graphFetch(
    token,
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(fromAddress)}/messages/${encodeURIComponent(
      draftId
    )}/attachments/createUploadSession`,
    {
      method: "POST",
      body: JSON.stringify({ AttachmentItem: attachmentItem }),
    }
  );

  const uploadJson = (await uploadSessionRes.json().catch(() => null)) as any;
  const uploadUrl = typeof uploadJson?.uploadUrl === "string" ? uploadJson.uploadUrl : "";
  if (!uploadUrl) throw new Error("Graph: failed to create upload session (missing uploadUrl)");

  // 3) Upload bytes in chunks
  const CHUNK = 320 * 1024;
  let start = 0;

  while (start < bytes.length) {
    const end = Math.min(start + CHUNK, bytes.length);
    const chunk = bytes.subarray(start, end);

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": String(chunk.length),
        "Content-Range": `bytes ${start}-${end - 1}/${bytes.length}`,
      },
      body: chunk,
    });

    if (!(putRes.status === 200 || putRes.status === 201 || putRes.status === 202)) {
      const t = await putRes.text().catch(() => "");
      throw new Error(`Graph upload session PUT failed: ${putRes.status} ${t}`);
    }

    start = end;
  }

  // 4) Send the draft
  await graphFetch(
    token,
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(fromAddress)}/messages/${encodeURIComponent(
      draftId
    )}/send`,
    { method: "POST", body: JSON.stringify({}) }
  );

  return { ok: true, mode: "graph" as const };
}

export async function sendEmail(args: SendEmailArgs) {
  const mode = resolveEmailMode();

  const { fromAddress, fromName } = getFromForType(args.emailType);
  if (!fromAddress) throw new Error("EMAIL_FROM_ADDRESS is required");

  const { message, textDerived } = buildGraphMessage(args);

  // 🧪 Safe dev mode
  if (mode === "disabled") {
    console.log("[sendEmail] EMAIL_MODE=disabled");
    console.log({
      from: `${fromName} <${fromAddress}>`,
      to: normalizeEmailList(args.to),
      cc: normalizeEmailList(args.cc),
      bcc: normalizeEmailList(args.bcc),
      subject: args.subject,
      preview: textDerived.slice(0, 160),
      attachments: (args.attachments || []).map((a) => ({
        filename: a.filename,
        bytes: Buffer.from(a.contentBytesBase64, "base64").length,
        contentType: a.contentType,
      })),
    });
    return { ok: true, mode };
  }

  if (mode !== "graph") {
    throw new Error(`Unsupported EMAIL_MODE: ${mode}`);
  }

  const token = await getAccessToken();

  const attachments = Array.isArray(args.attachments) ? args.attachments : [];

  // Graph "simple attachments" are limited (commonly ~3MB).
  const LARGE_THRESHOLD = 2.5 * 1024 * 1024;
  const large = attachments.find((a) => base64ByteLength(a.contentBytesBase64) > LARGE_THRESHOLD);

  if (large) {
    if (attachments.length > 1) {
      throw new Error(
        "Graph: multiple attachments provided, but at least one is large. Upload-session path currently supports one large attachment."
      );
    }

    return await sendViaDraftWithUpload(token, fromAddress, message, large);
  }

  const messageWithAttachments: any = {
    ...message,
    ...(attachments.length
      ? {
          attachments: attachments.map((a) => ({
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: a.filename,
            contentType: a.contentType,
            contentBytes: a.contentBytesBase64,
          })),
        }
      : {}),
  };

  const res = await graphFetch(
    token,
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(fromAddress)}/sendMail`,
    {
      method: "POST",
      body: JSON.stringify({ message: messageWithAttachments, saveToSentItems: true }),
    }
  );

  void res;

  return { ok: true, mode };
}
