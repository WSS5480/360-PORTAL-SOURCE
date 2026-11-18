// src/app/portal/ivr/[ivrId]/page.tsx
import React from "react";
import Link from "next/link";
import { requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isPortalIvrRowViewable } from "@/lib/portal/portalRowScope";

export const dynamic = "force-dynamic";

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function fmtDateOnly(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toLocaleDateString();
}

function fmtDateTime(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toLocaleString();
}

function fmtVal(v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  return String(v);
}

function baseBorder(): React.CSSProperties {
  return { borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)" };
}

function pill(tone: "neutral" | "danger" | "success" | "warning"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border)",
    background: "color-mix(in srgb, var(--surface) 86%, var(--background))",
    color: "var(--foreground)",
    whiteSpace: "nowrap",
  };

  if (tone === "danger") {
    return {
      ...base,
      borderColor: "color-mix(in srgb, var(--danger) 26%, var(--border))",
      background: "color-mix(in srgb, var(--danger) 9%, var(--surface))",
      color: "color-mix(in srgb, var(--danger) 78%, black)",
    };
  }
  if (tone === "success") {
    return {
      ...base,
      borderColor: "color-mix(in srgb, var(--success) 26%, var(--border))",
      background: "color-mix(in srgb, var(--success) 9%, var(--surface))",
      color: "color-mix(in srgb, var(--success) 78%, black)",
    };
  }
  if (tone === "warning") {
    return {
      ...base,
      borderColor: "color-mix(in srgb, var(--warning) 26%, var(--border))",
      background: "color-mix(in srgb, var(--warning) 12%, var(--surface))",
      color: "var(--foreground)",
    };
  }
  return base;
}

function softLink(): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    textDecoration: "none",
    fontWeight: 950,
    color: "var(--brand-700)",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    whiteSpace: "nowrap",
  };
}

function primaryLink(): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border))",
    background: "var(--brand-700)",
    textDecoration: "none",
    fontWeight: 950,
    color: "white",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    whiteSpace: "nowrap",
  };
}

function subtleText(): React.CSSProperties {
  return { fontSize: 12, color: "var(--muted)", fontWeight: 800, lineHeight: 1.4 };
}

function fileRow(): React.CSSProperties {
  return {
    ...baseBorder(),
    borderRadius: 12,
    padding: 12,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    background: "var(--surface)",
  };
}

function Card({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        ...baseBorder(),
        borderRadius: 16,
        overflow: "hidden",
        background: "var(--surface)",
        boxShadow: "var(--shadow-1)",
      }}
    >
      <div
        style={{
          padding: 12,
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          background: "color-mix(in srgb, var(--surface) 92%, var(--background))",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 950 }}>{title}</div>
          {subtitle ? (
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)", fontWeight: 800, lineHeight: 1.35 }}>
              {subtitle}
            </div>
          ) : null}
        </div>
        {right ? <div style={{ display: "flex", gap: 10, alignItems: "center" }}>{right}</div> : null}
      </div>

      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

function Banner({ kind, title, body }: { kind: "error" | "warning" | "ok"; title: string; body?: React.ReactNode }) {
  let bg = "color-mix(in srgb, var(--surface) 90%, var(--background))";
  let border = "var(--border)";
  let color = "var(--foreground)";

  if (kind === "error") {
    bg = "color-mix(in srgb, var(--danger) 10%, var(--surface))";
    border = "color-mix(in srgb, var(--danger) 26%, var(--border))";
    color = "color-mix(in srgb, var(--danger) 78%, black)";
  }
  if (kind === "warning") {
    bg = "color-mix(in srgb, var(--warning) 12%, var(--surface))";
    border = "color-mix(in srgb, var(--warning) 26%, var(--border))";
    color = "var(--foreground)";
  }
  if (kind === "ok") {
    bg = "color-mix(in srgb, var(--success) 10%, var(--surface))";
    border = "color-mix(in srgb, var(--success) 26%, var(--border))";
    color = "color-mix(in srgb, var(--success) 78%, black)";
  }

  return (
    <div
      style={{
        ...baseBorder(),
        borderColor: border,
        background: bg,
        borderRadius: 16,
        padding: 14,
        color,
        boxShadow: "var(--shadow-1)",
      }}
    >
      <div style={{ fontWeight: 950 }}>{title}</div>
      {body ? <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9, lineHeight: 1.45 }}>{body}</div> : null}
    </div>
  );
}

function Grid({ items }: { items: Array<{ label: string; value: unknown }> }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
      {items.map((it) => (
        <div key={it.label} style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 900 }}>{it.label}</div>
          <div style={{ marginTop: 4, fontSize: 13, fontWeight: 950, wordBreak: "break-word" }}>{fmtVal(it.value)}</div>
        </div>
      ))}
    </div>
  );
}

type ContactLite = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type VerificationLite = {
  id: string;
  created_at: string;
  pdf_bucket: string | null;
  pdf_object_path: string | null;
};

async function resolveUserDisplay(userId: string): Promise<{ name: string | null; email: string | null }> {
  const uid = safeStr(userId).trim();
  if (!uid) return { name: null, email: null };

  // Try user_profiles.user_id then user_profiles.id
  const { data: p1 } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id,email,full_name")
    .eq("user_id", uid)
    .maybeSingle();

  if (p1) {
    return {
      name: safeStr((p1 as any).full_name) || null,
      email: safeStr((p1 as any).email) || null,
    };
  }

  const { data: p2 } = await supabaseAdmin.from("user_profiles").select("id,email,full_name").eq("id", uid).maybeSingle();
  if (p2) {
    return {
      name: safeStr((p2 as any).full_name) || null,
      email: safeStr((p2 as any).email) || null,
    };
  }

  // Final fallback: auth lookup (works for portal members even if user_profiles is missing)
  try {
    const res = await supabaseAdmin.auth.admin.getUserById(uid);
    const u: any = (res as any)?.data?.user || null;
    const email = safeStr(u?.email) || null;
    const meta = (u?.user_metadata || {}) as Record<string, unknown>;
    const name = safeStr(meta.full_name) || safeStr(meta.name) || safeStr(meta.display_name) || null;
    return { name, email };
  } catch {
    return { name: null, email: null };
  }
}

function formatPersonDisplay(opts: { name: string | null; email: string | null; fallbackId?: string | null }) {
  const name = safeStr(opts.name).trim();
  const email = safeStr(opts.email).trim();
  const fid = safeStr(opts.fallbackId).trim();

  if (name && email) return `${name} (${email})`;
  if (name) return name;
  if (email) return email;
  if (fid) return `${fid.slice(0, 8)}…`;
  return "—";
}

function statusLabel(statusUpper: string) {
  if (statusUpper === "COMPLETED") return "APPROVED";
  if (statusUpper === "DENIED") return "DENIED";
  if (statusUpper === "IN_REVIEW") return "IN REVIEW";
  if (statusUpper === "SUBMITTED") return "SUBMITTED";
  return statusUpper || "—";
}

function statusTone(statusUpper: string): "neutral" | "danger" | "success" | "warning" {
  if (statusUpper === "DENIED") return "danger";
  if (statusUpper === "COMPLETED") return "success";
  if (statusUpper === "IN_REVIEW") return "warning";
  return "neutral";
}

export default async function PortalIvrDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ ivrId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const portal = await requireCurrentAccount();
  const { ivrId } = await params;

  const sp = searchParams ? await searchParams : {};
  const err = typeof (sp as any)?.err === "string" ? String((sp as any).err) : "";
  const flash = typeof (sp as any)?.flash === "string" ? String((sp as any).flash) : "";

  const accountId = portal.currentAccountId;
  const viewerUserId = (portal as any)?.user?.id || "";

  if (!accountId) {
    return (
      <div style={{ padding: 16, maxWidth: 1100 }}>
        <Banner kind="error" title="No account selected" body="Please select an account first." />
        <div style={{ marginTop: 12 }}>
          <Link href="/portal" style={{ ...softLink(), color: "var(--brand-700)" }}>
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { data: ivr, error: ivrErr } = await supabaseAdmin
    .from("ivr_requests")
    .select("*")
    .eq("id", ivrId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (ivrErr) {
    return (
      <div style={{ padding: 16, maxWidth: 1100 }}>
        <Banner kind="error" title="Failed to load IVR" body={ivrErr.message} />
        <div style={{ marginTop: 12 }}>
          <Link href="/portal/ivr" style={{ ...softLink(), color: "var(--brand-700)" }}>
            ← Back to IVRs
          </Link>
        </div>
      </div>
    );
  }
  if (!ivr) {
    return (
      <div style={{ padding: 16, maxWidth: 1100 }}>
        <Banner kind="error" title="IVR not found" body="This request does not exist or you don't have access." />
        <div style={{ marginTop: 12 }}>
          <Link href="/portal/ivr" style={{ ...softLink(), color: "var(--brand-700)" }}>
            ← Back to IVRs
          </Link>
        </div>
      </div>
    );
  }

  if (!isPortalIvrRowViewable(portal.currentRole, viewerUserId, ivr as any, accountId)) {
    return (
      <div style={{ padding: 16, maxWidth: 1100 }}>
        <Banner kind="error" title="IVR not found" body="This request does not exist or you don't have access." />
        <div style={{ marginTop: 12 }}>
          <Link href="/portal/ivr" style={{ ...softLink(), color: "var(--brand-700)" }}>
            ← Back to IVRs
          </Link>
        </div>
      </div>
    );
  }

  const { data: vRow } = await supabaseAdmin
    .from("ivr_insurance_verifications")
    .select("id, created_at, pdf_bucket, pdf_object_path")
    .eq("ivr_request_id", ivrId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const verification = (vRow || null) as VerificationLite | null;
  const hasPdf = Boolean(verification?.pdf_object_path);

  const pdfHref = `/api/portal/ivr/${encodeURIComponent(ivrId)}/verification-pdf`;

  // Resolve "Submitted For" correctly (contact first for intake)
  const contactId = safeStr((ivr as any).contact_id || "").trim();
  const submittedByUserId = safeStr((ivr as any).submitted_by_user_id || "").trim();
  const createdByUserId = safeStr((ivr as any).created_by_user_id || "").trim();

  let submittedForDisplay = "—";
  if (contactId) {
    const { data: c } = await supabaseAdmin
      .from("account_contacts")
      .select("id, full_name, email")
      .eq("id", contactId)
      .eq("account_id", accountId)
      .maybeSingle();

    if (c) {
      const cc = c as any as ContactLite;
      submittedForDisplay = formatPersonDisplay({
        name: safeStr(cc.full_name) || null,
        email: safeStr(cc.email) || null,
        fallbackId: contactId,
      });
    } else {
      submittedForDisplay = `${contactId.slice(0, 8)}…`;
    }
  } else if (submittedByUserId) {
    const u = await resolveUserDisplay(submittedByUserId);
    submittedForDisplay = formatPersonDisplay({ ...u, fallbackId: submittedByUserId });
  } else if (createdByUserId) {
    const u = await resolveUserDisplay(createdByUserId);
    submittedForDisplay = formatPersonDisplay({ ...u, fallbackId: createdByUserId });
  }

  // Optional context: internal creator (helps explain intake records)
  let createdByDisplay = "—";
  if (createdByUserId) {
    const u = await resolveUserDisplay(createdByUserId);
    createdByDisplay = formatPersonDisplay({ ...u, fallbackId: createdByUserId });
  }

  const hasOpenRequest =
    Boolean((ivr as any).additional_info_requested_at) &&
    (!(ivr as any).additional_info_submitted_at ||
      new Date((ivr as any).additional_info_submitted_at).getTime() <
        new Date((ivr as any).additional_info_requested_at).getTime());

  const requestMessageFromRow = String((ivr as any).additional_info_message || "").trim();

  const { data: audit } = await supabaseAdmin
    .from("ivr_audit_log")
    .select("id,action,created_at,meta,actor_user_id")
    .eq("ivr_request_id", ivrId)
    .in("action", ["ADDITIONAL_INFO_REQUESTED", "ADDITIONAL_INFO_PROVIDED"])
    .order("created_at", { ascending: false })
    .limit(30);

  const auditRows = audit ?? [];
  const canRespond = Boolean(viewerUserId);

  const { data: filesRaw } = await supabaseAdmin
    .from("ivr_files")
    .select("id,file_type,created_at,bucket,object_path")
    .eq("ivr_request_id", ivrId)
    .order("created_at", { ascending: false });

  const allFiles = Array.isArray(filesRaw) ? filesRaw : [];

  const files = allFiles.filter((f: any) => {
    if (!f?.bucket || !f?.object_path) return false;
    if (String(f.file_type || "").toUpperCase() === "ADDITIONAL_INFO") return false;
    return true;
  });

  const additionalInfoFiles = allFiles.filter((f: any) => {
    if (!f?.bucket || !f?.object_path) return false;
    return String(f.file_type || "").toUpperCase() === "ADDITIONAL_INFO";
  });

  const rawStatus = safeStr((ivr as any).status || "—");
  const statusUpper = rawStatus.toUpperCase();

  return (
    <div style={{ padding: 16, maxWidth: 1100, display: "grid", gap: 16 }}>
      {/* Header */}
      <div
        style={{
          ...baseBorder(),
          borderRadius: 18,
          padding: 16,
          background:
            "radial-gradient(900px 260px at 10% 0%, color-mix(in srgb, var(--brand-600) 18%, transparent), transparent 60%)," +
            "linear-gradient(180deg, color-mix(in srgb, var(--surface) 92%, var(--background)), var(--surface))",
          boxShadow: "var(--shadow-1)",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 950, letterSpacing: 0.4, textTransform: "uppercase" }}>
            360 Portal
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 950, margin: "6px 0 0" }}>IVR Request</h1>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={pill(statusTone(statusUpper))}>{statusLabel(statusUpper)}</span>

            <span style={pill("neutral")}>
              Submitted for <span style={{ opacity: 0.9, fontWeight: 950 }}>{submittedForDisplay}</span>
            </span>

            {hasOpenRequest ? <span style={pill("warning")}>Action required</span> : <span style={pill("success")}>No action needed</span>}
          </div>

          <div style={{ marginTop: 10, ...subtleText() }}>
            Created <b style={{ color: "var(--foreground)" }}>{fmtDateOnly((ivr as any).created_at)}</b>
            {"  "}
            <span style={{ opacity: 0.55 }}>•</span>
            {"  "}
            Updated <b style={{ color: "var(--foreground)" }}>{fmtDateOnly((ivr as any).updated_at)}</b>
            {createdByDisplay !== "—" ? (
              <>
                {"  "}
                <span style={{ opacity: 0.55 }}>•</span>
                {"  "}
                Internal creator <b style={{ color: "var(--foreground)" }}>{createdByDisplay}</b>
              </>
            ) : null}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/portal/ivr" style={softLink()}>
            ← Back
          </Link>
          <Link href="/portal/ivr/new" style={softLink()}>
            + Submit new
          </Link>

          {hasPdf ? (
            <a href={pdfHref} target="_blank" rel="noopener noreferrer" style={primaryLink()}>
              Open verification PDF ↗
            </a>
          ) : (
            <span style={{ ...softLink(), cursor: "default", opacity: 0.65 }}>Verification PDF not available</span>
          )}
        </div>
      </div>

      {err ? <Banner kind="error" title="Error" body={err} /> : null}
      {flash ? <Banner kind="ok" title={flash} /> : null}

      {/* Action banner */}
      {hasOpenRequest ? (
        <Banner
          kind="warning"
          title="Action required: additional information requested"
          body={
            <>
              <div style={{ whiteSpace: "pre-wrap" }}>
                {requestMessageFromRow || "A request was sent, but the message text is not available yet."}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
                Requested at: <b>{fmtDateTime((ivr as any).additional_info_requested_at)}</b>
              </div>
            </>
          }
        />
      ) : (
        <Banner kind="ok" title="No additional information requested" body="You're all set — no action is required right now." />
      )}

      {/* Respond */}
      {hasOpenRequest ? (
        <Card title="Respond to request" subtitle="Submit a message and/or upload documents requested by the IVR team.">
          {!canRespond ? (
            <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 800 }}>Please sign in to respond.</div>
          ) : (
            <form
              method="post"
              action={`/portal/ivr/${encodeURIComponent(ivrId)}/additional-info`}
              encType="multipart/form-data"
              style={{ display: "grid", gap: 12 }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 950, color: "var(--muted)", marginBottom: 6 }}>
                  Your response (optional if uploading files)
                </div>
                <textarea
                  name="message"
                  rows={5}
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    fontSize: 14,
                    resize: "vertical",
                    background: "var(--surface)",
                    outline: "none",
                  }}
                  placeholder="Type your response…"
                />
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 950, color: "var(--muted)", marginBottom: 6 }}>Upload files (optional)</div>
                <input type="file" name="files" multiple />
                <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>
                  Only upload files if the team asked for documents.
                </div>
              </div>

              <button
                type="submit"
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border))",
                  background: "var(--brand-700)",
                  color: "white",
                  fontWeight: 950,
                  cursor: "pointer",
                  width: "fit-content",
                }}
              >
                Submit response
              </button>
            </form>
          )}
        </Card>
      ) : null}

      {/* Main content */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
        <div style={{ display: "grid", gap: 16 }}>
          <Card title="Overview" right={<span style={pill(hasOpenRequest ? "warning" : "success")}>{hasOpenRequest ? "Needs action" : "OK"}</span>}>
            <Grid
              items={[
                { label: "Status", value: statusLabel(statusUpper) },
                { label: "Date of service", value: (ivr as any).dos ? fmtDateOnly((ivr as any).dos) : "—" },
                { label: "Place of service", value: (ivr as any).place_of_service },
                { label: "Primary insurance", value: (ivr as any).primary_insurance },
                { label: "Secondary insurance", value: (ivr as any).secondary_insurance },
              ]}
            />
          </Card>

          <Card title="Patient">
            <Grid
              items={[
                { label: "First name", value: (ivr as any).patient_first_name },
                { label: "Last name", value: (ivr as any).patient_last_name },
                { label: "DOB", value: (ivr as any).patient_dob ? fmtDateOnly((ivr as any).patient_dob) : "—" },
                { label: "Address", value: (ivr as any).patient_address1 },
                { label: "City", value: (ivr as any).patient_city },
                { label: "State", value: (ivr as any).patient_state },
                { label: "ZIP", value: (ivr as any).patient_zip },
              ]}
            />
          </Card>

          <Card title="Provider / Facility">
            <Grid
              items={[
                { label: "Provider", value: (ivr as any).provider_name },
                { label: "Facility", value: (ivr as any).facility_name },
                { label: "Facility city", value: (ivr as any).facility_city },
                { label: "Facility state", value: (ivr as any).facility_state },
              ]}
            />
          </Card>

          <Card title="Product / Codes">
            <Grid
              items={[
                { label: "Product", value: (ivr as any).product },
                { label: "HCPCS Q code", value: (ivr as any).qcode },
                { label: "Units (cm²)", value: (ivr as any).units_cm2 },
                { label: "ICD-10 codes", value: (ivr as any).icd10_codes },
                { label: "CPT codes", value: (ivr as any).cpt_codes },
              ]}
            />
          </Card>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <Card
            title="Verification PDF"
            subtitle="If available, open the most recent verification results PDF."
            right={hasPdf ? <span style={pill("success")}>Available</span> : <span style={pill("neutral")}>Not available</span>}
          >
            {hasPdf ? (
              <div style={{ display: "grid", gap: 10 }}>
                <a href={pdfHref} target="_blank" rel="noopener noreferrer" style={primaryLink()}>
                  Open verification PDF ↗
                </a>
                <div style={subtleText()}>
                  Generated <b style={{ color: "var(--foreground)" }}>{fmtDateOnly(verification?.created_at || null)}</b>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 800, lineHeight: 1.45 }}>
                Verification results have not been published to the portal yet.
              </div>
            )}
          </Card>

          <Card title="Attachments" subtitle="Files uploaded with the original request.">
            {files.length ? (
              <div style={{ display: "grid", gap: 10 }}>
                {files.map((f: any) => (
                  <div key={String(f.id)} style={fileRow()}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 950, fontSize: 13 }}>{fmtVal(f.file_type)}</div>
                      <div style={subtleText()}>{fmtDateOnly(f.created_at)}</div>
                    </div>
                    <a
                      href={`/api/portal/ivr-files/${encodeURIComponent(String(f.id))}/download`}
                      style={{ fontWeight: 950, textDecoration: "none", color: "var(--brand-700)", whiteSpace: "nowrap" }}
                    >
                      Download →
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 800 }}>No downloadable attachments for this IVR.</div>
            )}
          </Card>

          <Card title="Additional info attachments" subtitle="Files uploaded in response to an additional-info request.">
            {additionalInfoFiles.length ? (
              <div style={{ display: "grid", gap: 10 }}>
                {additionalInfoFiles.map((f: any) => (
                  <div key={String(f.id)} style={fileRow()}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 950, fontSize: 13 }}>Additional info file</div>
                      <div style={subtleText()}>{fmtDateOnly(f.created_at)}</div>
                    </div>
                    <a
                      href={`/api/portal/ivr-files/${encodeURIComponent(String(f.id))}/download`}
                      style={{ fontWeight: 950, textDecoration: "none", color: "var(--brand-700)", whiteSpace: "nowrap" }}
                    >
                      Download →
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 800 }}>No files uploaded for the additional-info request.</div>
            )}
          </Card>

          <Card title="Additional info history" subtitle="Most recent activity related to additional-info requests.">
            {auditRows.length ? (
              <div style={{ display: "grid", gap: 10 }}>
                {auditRows.slice(0, 10).map((a: any) => (
                  <div
                    key={String(a.id)}
                    style={{
                      ...baseBorder(),
                      borderRadius: 12,
                      padding: 12,
                      background: "var(--surface)",
                    }}
                  >
                    <div style={{ fontWeight: 950, fontSize: 13 }}>
                      {String(a.action)}{" "}
                      <span style={{ color: "var(--muted)", fontWeight: 800 }}>• {fmtDateOnly(a.created_at)}</span>
                    </div>
                    {a?.meta?.message ? (
                      <div style={{ marginTop: 8, fontSize: 13, whiteSpace: "pre-wrap" }}>{String(a.meta.message)}</div>
                    ) : (
                      <div style={{ marginTop: 8, fontSize: 13, color: "var(--muted)", fontWeight: 800 }}>—</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 800 }}>No additional-info events yet.</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
