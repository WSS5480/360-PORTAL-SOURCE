import { supabaseAdmin } from "@/lib/supabase/admin";

function envStr(key: string): string {
  return String(process.env[key] || "").trim();
}

/** Reuse private bucket used by IVR / clinical uploads unless overridden. */
export function getSurgicalCaseDocumentsBucket(): string {
  return envStr("SUPABASE_PRIVATE_BUCKET") || "ivr-private";
}

export function surgicalCaseDocumentObjectPath(caseId: string, originalFilename: string): string {
  const safe = (originalFilename || "document").replace(/[^a-zA-Z0-9._-]/g, "_");
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  return `surgical-cases/${caseId}/${ts}-${rand}-${safe}`;
}

export async function uploadSurgicalCaseDocumentFile(args: {
  bucket: string;
  objectPath: string;
  file: File;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const buf = Buffer.from(await args.file.arrayBuffer());
  const { error } = await supabaseAdmin.storage.from(args.bucket).upload(args.objectPath, buf, {
    contentType: args.file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function createSignedUrlForCaseDocument(args: {
  bucket: string;
  storageKey: string;
  expiresInSeconds?: number;
}): Promise<{ ok: true; signedUrl: string } | { ok: false; message: string }> {
  const { data, error } = await supabaseAdmin.storage
    .from(args.bucket)
    .createSignedUrl(args.storageKey, args.expiresInSeconds ?? 120);
  if (error || !data?.signedUrl) return { ok: false, message: error?.message || "Could not sign URL" };
  return { ok: true, signedUrl: data.signedUrl };
}
