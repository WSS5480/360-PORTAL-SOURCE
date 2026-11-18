// src/app/admin/ivr/[ivrId]/page.tsx
import Link from "next/link";
import { requireIvrTeamOrAdmin } from "@/lib/auth/requireIvrTeamOrAdmin";
import { formatStatusLabel } from "@/lib/formatStatusLabel";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STATUSES = ["NEW", "IN_REVIEW", "SUBMITTED", "COMPLETED", "DENIED"] as const;

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function fmtDateTime(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toLocaleString();
}

function shortId(id?: string | null) {
  const s = safeStr(id).trim();
  if (!s) return "—";
  return s.length > 10 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
}

function statusLabel(s?: string | null) {
  const up = (s || "NEW").toUpperCase();
  if (up === "COMPLETED") return "APPROVED";
  return formatStatusLabel(s);
}

function statusTone(s?: string | null): "neutral" | "warn" | "info" | "success" | "danger" {
  const up = (s || "NEW").toUpperCase();
  if (up === "NEW") return "warn";
  if (up === "IN_REVIEW") return "info";
  if (up === "SUBMITTED") return "neutral";
  if (up === "COMPLETED") return "success";
  if (up === "DENIED") return "danger";
  return "neutral";
}

/**
 * IMPORTANT:
 * - Do NOT mix `border` shorthand with `borderColor` overrides (React warning).
 * - Use boxSizing: "border-box" on inputs/textarea/select to prevent right-edge clipping in grids.
 */

function pill(tone: "neutral" | "warn" | "info" | "success" | "danger"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    paddingTop: 7,
    paddingBottom: 7,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(0,0,0,0.12)",
    fontWeight: 950,
    fontSize: 12,
    whiteSpace: "nowrap",
    background: "rgba(0,0,0,0.02)",
    color: "rgba(0,0,0,0.82)",
  };

  if (tone === "danger")
    return { ...base, background: "rgba(220,0,0,0.06)", borderColor: "rgba(220,0,0,0.20)", color: "crimson" };
  if (tone === "warn")
    return { ...base, background: "rgba(255,165,0,0.16)", borderColor: "rgba(255,165,0,0.25)", color: "#7a4b00" };
  if (tone === "info")
    return { ...base, background: "rgba(90,140,255,0.10)", borderColor: "rgba(90,140,255,0.22)", color: "#204aa8" };
  if (tone === "success")
    return { ...base, background: "rgba(0,140,60,0.08)", borderColor: "rgba(0,140,60,0.18)", color: "rgb(0,120,55)" };
  return base;
}

function card(): React.CSSProperties {
  return {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(0,0,0,0.10)",
    borderRadius: 16,
    background: "white",
    boxShadow: "0 18px 60px rgba(0,0,0,0.06)",
    overflow: "hidden",
  };
}

function cardHeader(): React.CSSProperties {
  return {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "rgba(0,0,0,0.06)",
    background: "rgba(0,0,0,0.01)",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  };
}

function cardTitle(): React.CSSProperties {
  return { fontSize: 13, fontWeight: 950 };
}

function cardBody(): React.CSSProperties {
  return { padding: 14, minWidth: 0 };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(0,0,0,0.16)",
    fontSize: 14,
    background: "white",
    outline: "none",
  };
}

function btnPrimary(): React.CSSProperties {
  return {
    width: "100%",
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 14,
    paddingRight: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(0,0,0,0.14)",
    background: "#111",
    color: "white",
    fontWeight: 950,
    cursor: "pointer",
  };
}

function btnGhost(disabled?: boolean): React.CSSProperties {
  return {
    width: "100%",
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 14,
    paddingRight: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(0,0,0,0.14)",
    background: "white",
    color: "#111",
    fontWeight: 950,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.65 : 1,
  };
}

function row(label: string, value: any) {
  const v =
    value === null || value === undefined || value === ""
      ? null
      : Array.isArray(value)
        ? value.filter(Boolean).join(", ")
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);

  return (
    <div style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.06)", minWidth: 0 }}>
      <div style={{ width: 220, fontSize: 12, fontWeight: 950, opacity: 0.75, flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, fontSize: 13, wordBreak: "break-word", minWidth: 0 }}>
        {v ? v : <span style={{ opacity: 0.6 }}>—</span>}
      </div>
    </div>
  );
}

export default async function AdminIvrDetailPage(props: {
  params: Promise<{ ivrId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await requireIvrTeamOrAdmin();
  if (!auth) {
    return (
      <main style={{ padding: 18, maxWidth: 980, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 950, margin: 0 }}>Access required</h1>
        <p style={{ marginTop: 10, opacity: 0.82, fontSize: 13, lineHeight: 1.45 }}>
          You don’t have permission to view this IVR request.
        </p>
        <Link href="/portal" style={{ fontWeight: 900 }}>
          ← Go to Portal
        </Link>
      </main>
    );
  }

  const actorUserId = (auth as any)?.user?.id || "";

  const { ivrId } = await props.params;
  const sp = props.searchParams ? await props.searchParams : {};
  const flash = typeof (sp as any)?.flash === "string" ? String((sp as any).flash) : "";
  const err = typeof (sp as any)?.err === "string" ? String((sp as any).err) : "";

  if (!ivrId || ivrId === "undefined" || !UUID_RE.test(ivrId)) {
    return (
      <main style={{ padding: 18, maxWidth: 980, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 950, margin: 0 }}>IVR Detail</h1>
        <p style={{ marginTop: 10, color: "crimson", fontWeight: 900 }}>
          Invalid IVR id in URL: <code>{String(ivrId)}</code>
        </p>
        <Link href="/admin/ivr" style={{ fontWeight: 900 }}>
          ← Back to Queue
        </Link>
      </main>
    );
  }

  const supabase: any = createSupabaseAdminClient();
  const { data: ivr, error: ivrError } = await supabase.from("ivr_requests").select("*").eq("id", ivrId).single();

  if (ivrError || !ivr) {
    return (
      <main style={{ padding: 18, maxWidth: 980, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 950, margin: 0 }}>IVR Detail</h1>
        <p style={{ marginTop: 10, color: "crimson", fontWeight: 900 }}>Failed to load IVR.</p>
        <p style={{ marginTop: 12, fontSize: 13, opacity: 0.85 }}>
          {(ivrError as { message?: string } | null)?.message?.trim() || "Please try again."}
        </p>
        <Link href="/admin/ivr" style={{ fontWeight: 900 }}>
          ← Back to Queue
        </Link>
      </main>
    );
  }

  // ✅ NEW: show identifier everywhere instead of GUID
  const ivrIdentifier = safeStr((ivr as any).ivr_identifier).trim();
  const ivrIdentifierDisplay = ivrIdentifier || "—";

  // audit: viewed
  if (actorUserId) {
    try {
      await supabase.from("ivr_audit_log").insert({
        ivr_request_id: ivr.id,
        actor_user_id: actorUserId,
        action: "IVR_VIEWED",
        meta: {},
      });
    } catch {}
  }

  // Account name (derive from accounts table)
  let accountName = "";
  try {
    const accountId = safeStr(ivr.account_id).trim();
    if (accountId) {
      const { data: acct } = await supabase.from("accounts").select("name").eq("id", accountId).maybeSingle();
      if (acct?.name) accountName = String(acct.name);
    }
  } catch {}

  const { data: filesRaw } = await supabase
    .from("ivr_files")
    .select("id,file_type,created_at")
    .eq("ivr_request_id", ivr.id)
    .order("created_at", { ascending: true });

  const filesAll = Array.isArray(filesRaw) ? filesRaw : [];
  const additionalInfoFiles = filesAll.filter((f: any) => String(f?.file_type || "").toUpperCase() === "ADDITIONAL_INFO");
  const nonAdditionalFiles = filesAll.filter((f: any) => String(f?.file_type || "").toUpperCase() !== "ADDITIONAL_INFO");

  const { data: verifs } = await supabase
    .from("ivr_insurance_verifications")
    .select("id,created_at,notify_to,notify_cc,pdf_object_path")
    .eq("ivr_request_id", ivr.id)
    .order("created_at", { ascending: false });

  const { data: additionalInfoAudit } = await supabase
    .from("ivr_audit_log")
    .select("id,action,created_at,meta")
    .eq("ivr_request_id", ivr.id)
    .in("action", ["ADDITIONAL_INFO_REQUESTED", "IVR_ADDITIONAL_INFO_REQUESTED", "ADDITIONAL_INFO_PROVIDED"])
    .order("created_at", { ascending: false })
    .limit(20);

  const additionalInfoHistory = Array.isArray(additionalInfoAudit) ? additionalInfoAudit : [];

  const patient = [ivr.patient_first_name, ivr.patient_last_name].filter(Boolean).join(" ").trim() || "—";

  // Additional info state
  const requestedAt: string | null = ivr.additional_info_requested_at ?? null;
  const requestedMsg: string = String(ivr.additional_info_message || "").trim();
  const submittedAt: string | null = ivr.additional_info_submitted_at ?? null;
  const responseMsg: string = String(ivr.additional_info_response || "").trim();

  const hasRequest = Boolean(requestedAt);
  const responded =
    hasRequest &&
    Boolean(submittedAt) &&
    Number.isFinite(new Date(String(requestedAt)).getTime()) &&
    Number.isFinite(new Date(String(submittedAt)).getTime()) &&
    new Date(String(submittedAt)).getTime() >= new Date(String(requestedAt)).getTime();

  const waitingOnCustomer = hasRequest && !responded;

  // submitter lookup (email + optional name)
  const submitterUserId = safeStr(ivr.submitted_by_user_id).trim();
  let submitterEmail = "";
  let submitterName = "";

  if (submitterUserId) {
    const { data: p1 } = await supabase.from("user_profiles").select("user_id,email,full_name").eq("user_id", submitterUserId).maybeSingle();
    if (p1?.email) {
      submitterEmail = String(p1.email || "").trim();
      submitterName = String(p1.full_name || "").trim();
    } else {
      const { data: p2 } = await supabase.from("user_profiles").select("id,email,full_name").eq("id", submitterUserId).maybeSingle();
      if (p2?.email) {
        submitterEmail = String(p2.email || "").trim();
        submitterName = String(p2.full_name || "").trim();
      }
    }
  }

  if (!submitterEmail) {
    const fallback = String(ivr.distributor_email || "").trim();
    if (fallback) submitterEmail = fallback;
  }

  const submitterPill =
    submitterEmail ? `Submitter: ${submitterEmail}` : submitterUserId ? `Submitter: ${shortId(submitterUserId)}` : "";

  const accountPill = accountName ? `Account: ${accountName}` : safeStr(ivr.account_id).trim() ? `Account: ${shortId(ivr.account_id)}` : "";

  const recipientLabel = submitterEmail ? `${submitterName ? `${submitterName} • ` : ""}${submitterEmail}` : "Not available";

  return (
    <main style={{ padding: 18, maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ minWidth: 260 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 22, fontWeight: 950, margin: 0 }}>IVR Detail</h1>
            <span style={pill(statusTone(ivr.status))}>{statusLabel(ivr.status)}</span>
            {waitingOnCustomer ? <span style={pill("danger")}>Needs customer info</span> : responded ? <span style={pill("success")}>Customer responded</span> : null}
          </div>

          <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={pill("neutral")}>Patient: {patient}</span>
            <span style={pill("neutral")}>Created: {fmtDateTime(ivr.created_at)}</span>

            {/* ✅ REPLACED: show new identifier instead of GUID */}
            <span style={pill("neutral")}>IVR ID: {ivrIdentifierDisplay}</span>

            {accountPill ? <span style={pill("neutral")}>{accountPill}</span> : null}
            {submitterPill ? <span style={pill("neutral")}>{submitterPill}</span> : null}
          </div>

          {/* ✅ REPLACED: show identifier as the primary reference */}
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
            Identifier: <code>{ivrIdentifierDisplay}</code>
          </div>

          {/* Optional: keep GUID available (internal) */}
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.65 }}>
            Internal GUID: <code>{safeStr(ivr.id)}</code>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/admin/ivr" style={{ fontSize: 13, fontWeight: 900, textDecoration: "none" }}>
            ← Back to Queue
          </Link>

          <Link
            href={`/admin/ivr/${ivr.id}/verification`}
            style={{
              paddingTop: 10,
              paddingBottom: 10,
              paddingLeft: 12,
              paddingRight: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "rgba(0,0,0,0.12)",
              background: "#111",
              color: "white",
              fontWeight: 950,
              textDecoration: "none",
              fontSize: 13,
              whiteSpace: "nowrap",
            }}
          >
            Enter / Generate Results →
          </Link>
        </div>
      </div>

      {/* Flash / Error */}
      {flash ? (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: "rgba(0,0,0,0.06)", fontSize: 13 }}>{flash}</div>
      ) : null}
      {err ? (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 14,
            background: "rgba(220,0,0,0.08)",
            fontSize: 13,
            color: "crimson",
            fontWeight: 900,
          }}
        >
          {err}
        </div>
      ) : null}

      {/* Layout */}
      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 420px)",
          gap: 14,
          alignItems: "start",
        }}
      >
        {/* LEFT */}
        <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
          {/* Team Actions */}
          <div style={card()}>
            <div style={cardHeader()}>
              <div style={cardTitle()}>Team Actions</div>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>
                Tip: keep NEW moving → Request info → Update status → Generate results
              </div>
            </div>

            <div style={cardBody()}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                  gap: 12,
                  alignItems: "start",
                }}
              >
                {/* Status update */}
                <div
                  style={{
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "rgba(0,0,0,0.08)",
                    borderRadius: 14,
                    padding: 12,
                    minWidth: 0,
                  }}
                >
                  <div style={{ fontWeight: 950, fontSize: 13 }}>Update Status</div>

                  <form method="post" action={`/admin/ivr/${ivr.id}/status`} style={{ display: "grid", gap: 10, marginTop: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.75, marginBottom: 6 }}>Status</div>
                      <select name="status" defaultValue={ivr.status} style={inputStyle()}>
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s === "COMPLETED" ? "APPROVED (COMPLETED)" : s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.75, marginBottom: 6 }}>Internal note (optional)</div>
                      <input name="note" placeholder="Short note" style={inputStyle()} />
                    </div>

                    <button type="submit" style={btnPrimary()}>
                      Update Status
                    </button>
                  </form>
                </div>

                {/* Additional info request */}
                <div
                  style={{
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "rgba(0,0,0,0.08)",
                    borderRadius: 14,
                    padding: 12,
                    minWidth: 0,
                  }}
                >
                  <div style={{ fontWeight: 950, fontSize: 13 }}>Request Additional Info</div>

                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                    Sends to:{" "}
                    {submitterEmail ? (
                      <span style={{ fontWeight: 950 }}>{recipientLabel}</span>
                    ) : (
                      <span style={{ fontWeight: 950, color: "crimson" }}>Not available (no submitter email found)</span>
                    )}
                  </div>

                  <form
                    method="post"
                    action={`/api/admin/ivr/${ivr.id}/additional-info`}
                    encType="multipart/form-data"
                    style={{ display: "grid", gap: 10, marginTop: 10, minWidth: 0 }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.75, marginBottom: 6 }}>Message to customer (required)</div>
                      <textarea
                        name="message"
                        rows={6}
                        required
                        style={{
                          ...inputStyle(),
                          minWidth: 0,
                          resize: "vertical",
                          lineHeight: 1.4,
                        }}
                        placeholder="What do you need from the customer to proceed?"
                      />
                      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>Updates portal fields and sends an email notification.</div>
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.75, marginBottom: 6 }}>Attach files (optional)</div>
                      <input style={{ maxWidth: "100%" }} type="file" name="files" multiple />
                    </div>

                    <button
                      type="submit"
                      disabled={!submitterEmail}
                      style={btnGhost(!submitterEmail)}
                      title={!submitterEmail ? "No submitter email found for this request" : undefined}
                    >
                      Request Additional Info
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info (Customer) */}
          <div style={card()} id="additional-info">
            <div style={cardHeader()}>
              <div style={cardTitle()}>Additional Info</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                {waitingOnCustomer ? (
                  <span style={pill("danger")}>Waiting on customer</span>
                ) : responded ? (
                  <span style={pill("success")}>Response received</span>
                ) : (
                  <span style={pill("neutral")}>No active request</span>
                )}
              </div>
            </div>

            <div style={cardBody()}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }}>
                <div style={{ borderWidth: 1, borderStyle: "solid", borderColor: "rgba(0,0,0,0.08)", borderRadius: 14, padding: 12, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.75 }}>Request</div>
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                    Requested at: <b>{fmtDateTime(requestedAt)}</b>
                  </div>
                  <div style={{ marginTop: 10, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.45 }}>
                    {requestedMsg ? requestedMsg : <span style={{ opacity: 0.65 }}>—</span>}
                  </div>
                </div>

                <div style={{ borderWidth: 1, borderStyle: "solid", borderColor: "rgba(0,0,0,0.08)", borderRadius: 14, padding: 12, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.75 }}>Customer Response</div>
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                    Responded at: <b>{fmtDateTime(submittedAt)}</b>
                  </div>
                  <div style={{ marginTop: 10, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.45 }}>
                    {responseMsg ? responseMsg : responded ? <span style={{ opacity: 0.65 }}>—</span> : <span style={{ opacity: 0.65 }}>Not submitted yet.</span>}
                  </div>

                  <div style={{ marginTop: 12, borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.75 }}>Attachments ({additionalInfoFiles.length})</div>

                    {additionalInfoFiles.length ? (
                      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                        {additionalInfoFiles
                          .slice()
                          .sort((a: any, b: any) => (new Date(b.created_at).getTime() || 0) - (new Date(a.created_at).getTime() || 0))
                          .map((f: any) => (
                            <div
                              key={f.id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 12,
                                alignItems: "center",
                                borderWidth: 1,
                                borderStyle: "solid",
                                borderColor: "rgba(0,0,0,0.08)",
                                borderRadius: 14,
                                padding: 10,
                                minWidth: 0,
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 950, fontSize: 13 }}>ADDITIONAL_INFO</div>
                                <div style={{ fontSize: 12, opacity: 0.75 }}>{fmtDateTime(f.created_at)}</div>
                              </div>

                              <Link href={`/admin/ivr/${ivr.id}/download/${f.id}`} style={{ fontWeight: 950, whiteSpace: "nowrap" }}>
                                Download →
                              </Link>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>No attachments were uploaded.</div>
                    )}
                  </div>
                </div>
              </div>

              {additionalInfoHistory.length > 0 ? (
                <div style={{ marginTop: 16, borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.75, marginBottom: 10 }}>History (all requests & responses)</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {additionalInfoHistory.map((a: any) => (
                      <div
                        key={String(a.id)}
                        style={{
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderColor: "rgba(0,0,0,0.08)",
                          borderRadius: 10,
                          padding: 10,
                          background: "rgba(0,0,0,0.02)",
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 950 }}>
                          {String(a.action).replace(/_/g, " ")}{" "}
                          <span style={{ color: "rgba(0,0,0,0.55)", fontWeight: 800 }}>• {fmtDateTime(a.created_at)}</span>
                        </div>
                        {a?.meta?.message ? (
                          <div style={{ marginTop: 6, fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.4 }}>{String(a.meta.message)}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
                Tip: If this shows “Response received”, you can flip the status to <b>IN_REVIEW</b> or proceed to results generation.
              </div>
            </div>
          </div>

          {/* Submission */}
          <div style={card()}>
            <div style={cardHeader()}>
              <div style={cardTitle()}>Submission</div>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Read-only</div>
            </div>
            <div style={cardBody()}>
              {row("Patient Name", patient)}
              {row("DOB", ivr.patient_dob)}
              {row("Address", ivr.patient_address1)}
              {row("City/State/Zip", [ivr.patient_city, ivr.patient_state, ivr.patient_zip].filter(Boolean).join(", "))}

              <div style={{ marginTop: 12, fontWeight: 950, fontSize: 13 }}>Insurance</div>
              {row("Primary Insurance", ivr.primary_insurance)}
              {row("Primary Policy", ivr.primary_policy)}
              {row("Secondary Insurance", ivr.secondary_insurance)}
              {row("Secondary Policy", ivr.secondary_policy)}

              <div style={{ marginTop: 12, fontWeight: 950, fontSize: 13 }}>Facility / Service</div>
              {row("Facility Name", ivr.facility_name)}
              {row("Facility NPI", ivr.facility_npi)}
              {row("Facility Tax ID", ivr.facility_tax_id)}
              {row("Facility Address", ivr.facility_address1)}
              {row("Facility City/State/Zip", [ivr.facility_city, ivr.facility_state, ivr.facility_zip].filter(Boolean).join(", "))}
              {row("Place of Service", ivr.place_of_service)}
              {row("DOS", ivr.dos)}

              <div style={{ marginTop: 12, fontWeight: 950, fontSize: 13 }}>Product / Codes</div>
              {row("Product", ivr.product)}
              {row("Q Code", ivr.qcode)}
              {row("Product Size", ivr.product_size)}
              {row("Units (cm²)", ivr.units_cm2)}
              {row("ICD-10 Codes", ivr.icd10_codes)}
              {row("CPT Codes", ivr.cpt_codes)}

              <div style={{ marginTop: 12, fontWeight: 950, fontSize: 13 }}>Recipients</div>
              {row("Result Emails", ivr.result_emails)}
              {row("Distributor Email", ivr.distributor_email)}

              <div style={{ marginTop: 12, fontWeight: 950, fontSize: 13 }}>Provider</div>
              {row("Provider Profile ID", ivr.provider_profile_id)}
              {row("Provider Name", ivr.provider_name)}
              {row("Provider NPI", ivr.provider_npi)}
              {row("Provider Tax ID", ivr.provider_tax_id)}
              {row("Provider PTAN", ivr.provider_ptan)}
              {row("Provider Address", ivr.provider_address1)}
              {row("Provider City/State/Zip", [ivr.provider_city, ivr.provider_state, ivr.provider_zip].filter(Boolean).join(", "))}
              {row("Office Contact", ivr.office_contact_name)}
              {row("Office Phone", [ivr.office_phone, ivr.office_phone_ext ? `ext ${ivr.office_phone_ext}` : ""].filter(Boolean).join(" "))}
              {row("Office Fax", ivr.office_fax)}

              <div style={{ marginTop: 12, fontWeight: 950, fontSize: 13 }}>Notes</div>
              {row("Notes", ivr.notes)}
            </div>
          </div>
        </div>

        {/* RIGHT (no Quick Summary) */}
        <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
          {/* Files */}
          <div style={card()}>
            <div style={cardHeader()}>
              <div style={cardTitle()}>Files</div>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Non-additional ({nonAdditionalFiles.length})</div>
            </div>
            <div style={cardBody()}>
              {nonAdditionalFiles.length === 0 ? (
                <div style={{ opacity: 0.75, fontSize: 13 }}>No files uploaded (other than additional-info attachments).</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {nonAdditionalFiles.map((f: any) => (
                    <div
                      key={f.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "center",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "rgba(0,0,0,0.08)",
                        borderRadius: 14,
                        padding: 10,
                        minWidth: 0,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 950, fontSize: 13 }}>{safeStr(f.file_type) || "FILE"}</div>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>{fmtDateTime(f.created_at)}</div>
                      </div>

                      <Link href={`/admin/ivr/${ivr.id}/download/${f.id}`} style={{ fontWeight: 950, whiteSpace: "nowrap" }}>
                        Download →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Verification history */}
          <div style={card()}>
            <div style={cardHeader()}>
              <div style={cardTitle()}>Verification Results</div>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>{(verifs ?? []).length} total</div>
            </div>
            <div style={cardBody()}>
              {(verifs ?? []).length === 0 ? (
                <div style={{ opacity: 0.75, fontSize: 13 }}>No verifications yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {(verifs ?? []).map((v: any) => {
                    const pdfReady = Boolean(v.pdf_object_path);
                    const pdfHref = pdfReady
                      ? `/admin/ivr/${encodeURIComponent(ivr.id)}/verification/${encodeURIComponent(v.id)}/pdf`
                      : null;

                    return (
                      <div
                        key={v.id}
                        style={{
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderColor: "rgba(0,0,0,0.08)",
                          borderRadius: 14,
                          padding: 10,
                          minWidth: 0,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 950, fontSize: 13 }}>{fmtDateTime(v.created_at)}</div>
                            <div style={{ fontSize: 12, opacity: 0.8 }}>
                              To: {safeStr(v.notify_to) || "—"}
                              {Array.isArray(v.notify_cc) && v.notify_cc.length ? ` · CC: ${v.notify_cc.join(", ")}` : ""}
                            </div>
                          </div>

                          {pdfHref ? (
                            <a href={pdfHref} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 950, whiteSpace: "nowrap" }}>
                              PDF →
                            </a>
                          ) : (
                            <span style={{ fontSize: 12, opacity: 0.75, fontWeight: 900, whiteSpace: "nowrap" }}>No PDF</span>
                          )}
                        </div>

                        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                          Verification ID: <code>{shortId(v.id)}</code>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>PHI Notice: Authorized use only.</div>
        </div>
      </div>
    </main>
  );
}
