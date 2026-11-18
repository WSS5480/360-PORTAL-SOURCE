// src/app/admin/ivr/[ivrId]/verification/page.tsx
import Link from "next/link";
import React from "react";
import { requireIvrTeamOrAdmin } from "@/lib/auth/requireIvrTeamOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import CoverageSummaryTemplate from "./CoverageSummaryTemplate";
import VerificationDecisionSync from "./VerificationDecisionSync";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 10px",
    borderRadius: 8,
    border: "1px solid rgba(0,0,0,0.2)",
    fontSize: 14,
    background: "var(--surface)",
  };
}
function labelStyle(): React.CSSProperties {
  return { fontSize: 12, fontWeight: 900, opacity: 0.8, marginBottom: 6 };
}
function section(title: string, children: React.ReactNode) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: 12,
        border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: 10,
        background: "var(--surface)",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>{title}</div>
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function joinList(v: unknown): string {
  if (Array.isArray(v))
    return v
      .filter(Boolean)
      .map((x) => safeStr(x).trim())
      .filter(Boolean)
      .join(", ");
  return safeStr(v);
}

type IvrRow = Record<string, unknown>;
type VerificationRow = {
  id: string;
  created_at: string;
  notify_to: string | null;
  notify_cc: string[] | null;
  results: unknown;
  pdf_bucket: string | null;
  pdf_object_path: string | null;
};

type Results = Record<string, unknown>;

function pickText(results: Results, key: string, fallback: unknown): string {
  const v = results[key];
  const s = safeStr(v).trim();
  if (s) return s;
  return safeStr(fallback).trim();
}

/**
 * ✅ Supports legacy keys without breaking existing behavior.
 * Use this when a field may have been stored under multiple names historically.
 */
function pickTextAny(results: Results, keys: string[], fallback: unknown): string {
  for (const k of keys) {
    const s = safeStr(results[k]).trim();
    if (s) return s;
  }
  return safeStr(fallback).trim();
}

function pickList(results: Results, key: string, fallback: unknown): string {
  const v = results[key];
  const fromResults = joinList(v).trim();
  if (fromResults) return fromResults;
  return joinList(fallback).trim();
}

function uniqEmails(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const s = (raw || "").trim().toLowerCase();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function yyyyMMdd(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function defaultGoodThroughISO(today = new Date()): string {
  const y = today.getFullYear();
  return `${y}-12-31`;
}

function defaultRerunOnISO(today = new Date()): string {
  const y = today.getFullYear() + 1;
  return `${y}-01-01`;
}

// for templates you may want display like 12/31/2025
function isoToMDY(iso: string): string {
  const s = String(iso || "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;
  const [, y, mm, dd] = m;
  return `${Number(mm)}/${Number(dd)}/${y}`;
}

export default async function AdminIvrVerificationPage(props: {
  params: Promise<{ ivrId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireIvrTeamOrAdmin();

  const { ivrId } = await props.params;

  const sp = props.searchParams ? await props.searchParams : {};
  const flash = typeof (sp as any)?.flash === "string" ? String((sp as any).flash) : "";
  const err = typeof (sp as any)?.err === "string" ? String((sp as any).err) : "";

  if (!ivrId || !UUID_RE.test(ivrId)) {
    return (
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>Verification Results</h1>
        <p style={{ color: "crimson" }}>Invalid IVR id.</p>
        <Link href="/admin/ivr">← Back</Link>
      </div>
    );
  }

  const supabase = createSupabaseAdminClient() as unknown as {
    from: (table: string) => any;
  };

  const { data: ivr } = await supabase.from("ivr_requests").select("*").eq("id", ivrId).single();
  const ivrRow = (ivr || null) as IvrRow | null;

  if (!ivrRow) {
    return (
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>Verification Results</h1>
        <p style={{ color: "crimson" }}>IVR not found.</p>
        <Link href="/admin/ivr">← Back</Link>
      </div>
    );
  }

  const { data: latest } = await supabase
    .from("ivr_insurance_verifications")
    .select("*")
    .eq("ivr_request_id", ivrId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestRow = (latest || null) as unknown as VerificationRow | null;
  const results = ((latestRow?.results ?? {}) as unknown as Results) || {};

  const today = new Date();
  const todayStr = yyyyMMdd(today);

  /**
   * ✅ Provider name robustness:
   * - results might have provider_name OR provider (legacy)
   * - ivr_requests might have provider_name OR provider (depending on schema evolution)
   */
  const providerFallbackFromIvr =
    safeStr(ivrRow["provider_name"]).trim() ||
    safeStr(ivrRow["provider"]).trim() ||
    safeStr(ivrRow["provider_full_name"]).trim() ||
    "";

  const goodThroughDefault = pickTextAny(results, ["good_through", "verification_good_through"], defaultGoodThroughISO(today));
  const rerunOnDefault = pickTextAny(results, ["rerun_on", "re_run_on", "verification_rerun_on"], defaultRerunOnISO(today));

  const defaults = {
    patient_first_name: pickText(results, "patient_first_name", ivrRow["patient_first_name"]),
    patient_last_name: pickText(results, "patient_last_name", ivrRow["patient_last_name"]),
    patient_dob: pickText(results, "patient_dob", ivrRow["patient_dob"]),

    // ✅ key fix: pull provider from multiple potential keys
    provider_name: pickTextAny(results, ["provider_name", "provider", "provider_full_name"], providerFallbackFromIvr),

    facility_name: pickTextAny(results, ["facility_name", "facility"], ivrRow["facility_name"]),
    product: pickText(results, "product", ivrRow["product"]),
    qcode: pickText(results, "qcode", ivrRow["qcode"]),
    units_cm2: pickText(results, "units_cm2", ivrRow["units_cm2"]),

    dos: pickText(results, "dos", ivrRow["dos"]),
    place_of_service: pickText(results, "place_of_service", ivrRow["place_of_service"]),

    icd10_codes: pickList(results, "icd10_codes", ivrRow["icd10_codes"]),
    cpt_codes: pickList(results, "cpt_codes", ivrRow["cpt_codes"]),

    primary_insurance: pickText(results, "primary_insurance", ivrRow["primary_insurance"]),
    secondary_insurance: pickText(results, "secondary_insurance", ivrRow["secondary_insurance"]),

    header_date: pickText(results, "header_date", todayStr),
    header_status: pickText(results, "header_status", "COMPLETED"),

    coverage_summary: safeStr((results as any).coverage_summary || ""),

    // ✅ actually use computed defaults (previously your inputs used results only)
    good_through: goodThroughDefault,
    rerun_on: rerunOnDefault,
  };

  const currentStatus = safeStr(ivrRow["status"]).toUpperCase();
  const decisionDefault = currentStatus === "DENIED" ? "DENIED" : "COMPLETED";

  const ivrResultEmails = Array.isArray(ivrRow["result_emails"])
    ? (ivrRow["result_emails"] as unknown[]).map(safeStr)
    : [];
  const distEmail = safeStr(ivrRow["distributor_email"]);
  const combined = uniqEmails([...ivrResultEmails, distEmail]);

  const notifyToDefault = safeStr(latestRow?.notify_to) || combined[0] || "";
  const notifyCcDefault =
    Array.isArray(latestRow?.notify_cc) && latestRow?.notify_cc?.length
      ? latestRow.notify_cc.join(", ")
      : combined.slice(1).join(", ");

  const hasPdf = Boolean(latestRow?.pdf_object_path);
  const previewHref = `/api/admin/ivr/${encodeURIComponent(ivrId)}/verification-pdf`;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900 }}>Verification Results</h1>
          <p style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>
            Step 1: Generate PDF • Step 2: Preview • Step 3: Send Email
          </p>
          {err ? <div style={{ marginTop: 8, color: "crimson", fontWeight: 900 }}>{err}</div> : null}
          {flash ? <div style={{ marginTop: 8, color: "var(--success)", fontWeight: 900 }}>{flash}</div> : null}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href={`/admin/ivr/${ivrId}`} style={{ fontSize: 13 }}>
            ← Back to IVR
          </Link>
        </div>
      </div>

      {section(
        "IVR Snapshot (current values)",
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>
          <div>
            <b>Patient:</b> {safeStr(ivrRow["patient_first_name"])} {safeStr(ivrRow["patient_last_name"])} ·{" "}
            <b>DOB:</b> {safeStr(ivrRow["patient_dob"])}
          </div>
          <div>
            <b>Provider:</b>{" "}
            {safeStr(ivrRow["provider_name"]) || safeStr(ivrRow["provider"]) || safeStr(ivrRow["provider_full_name"])} ·{" "}
            <b>Facility:</b> {safeStr(ivrRow["facility_name"])}
          </div>
          <div>
            <b>Product:</b> {safeStr(ivrRow["product"])} · <b>Q Code:</b> {safeStr(ivrRow["qcode"])} ·{" "}
            <b>Units (cm²):</b> {safeStr(ivrRow["units_cm2"])}
          </div>
          <div>
            <b>POS:</b> {safeStr(ivrRow["place_of_service"])} · <b>DOS:</b> {safeStr(ivrRow["dos"])}
          </div>
          <div>
            <b>ICD-10:</b> {joinList(ivrRow["icd10_codes"])}
          </div>
          <div>
            <b>CPT:</b> {joinList(ivrRow["cpt_codes"])}
          </div>
        </div>
      )}

      <form method="post" action={`/admin/ivr/${ivrId}/verification/submit`} style={{ marginTop: 14 }}>
        <VerificationDecisionSync />

        {section(
          "Decision (required)",
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ width: 260 }}>
              <div style={labelStyle()}>Approve / Deny</div>
              <select name="ivr_status" defaultValue={decisionDefault} style={inputStyle()} required>
                <option value="COMPLETED">Approved (Completed)</option>
                <option value="DENIED">Denied</option>
              </select>
            </div>

            <div style={{ width: 220 }}>
              <div style={labelStyle()}>PDF Date</div>
              <input type="date" name="header_date" defaultValue={defaults.header_date} style={inputStyle()} required />
            </div>
          </div>
        )}

        {section(
          "Recipients (required for sending later)",
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 320 }}>
                <div style={labelStyle()}>Notify To (required)</div>
                <input name="notify_to" defaultValue={notifyToDefault} style={inputStyle()} required />
              </div>
              <div style={{ flex: 1, minWidth: 320 }}>
                <div style={labelStyle()}>CC list (comma/newline)</div>
                <textarea
                  name="notify_cc"
                  defaultValue={notifyCcDefault}
                  rows={3}
                  style={{ ...inputStyle(), resize: "vertical" }}
                />
                <div style={{ marginTop: 6, fontSize: 11, color: "var(--muted)", opacity: 0.9 }}>
                  <strong>BAA required:</strong> All recipients (To and CC) must have a Business Associate Agreement on file. This email contains PHI.
                </div>
              </div>
            </div>
          </div>
        )}

        {section(
          "Editable Snapshot (required fields shown on PDF)",
          <>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={labelStyle()}>Patient First Name *</div>
                <input name="patient_first_name" defaultValue={defaults.patient_first_name} style={inputStyle()} required />
              </div>

              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={labelStyle()}>Patient Last Name *</div>
                <input name="patient_last_name" defaultValue={defaults.patient_last_name} style={inputStyle()} required />
              </div>

              <div style={{ width: 220 }}>
                <div style={labelStyle()}>DOB *</div>
                <input type="date" name="patient_dob" defaultValue={defaults.patient_dob} style={inputStyle()} required />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
              <div style={{ flex: 1, minWidth: 320 }}>
                <div style={labelStyle()}>Provider *</div>
                <input name="provider_name" defaultValue={defaults.provider_name} style={inputStyle()} required />
              </div>

              <div style={{ flex: 1, minWidth: 320 }}>
                <div style={labelStyle()}>Facility *</div>
                <input name="facility_name" defaultValue={defaults.facility_name} style={inputStyle()} required />
              </div>

              <div style={{ flex: 1, minWidth: 320 }}>
                <div style={labelStyle()}>Product *</div>
                <input name="product" defaultValue={defaults.product} style={inputStyle()} required />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
              <div style={{ width: 220 }}>
                <div style={labelStyle()}>DOS</div>
                <input type="date" name="dos" defaultValue={defaults.dos} style={inputStyle()} />
              </div>

              <div style={{ width: 220 }}>
                <div style={labelStyle()}>POS *</div>
                <input name="place_of_service" defaultValue={defaults.place_of_service} style={inputStyle()} required />
              </div>

              <div style={{ flex: 1, minWidth: 320 }}>
                <div style={labelStyle()}>ICD-10 Codes (comma/newline) *</div>
                <textarea
                  name="icd10_codes"
                  defaultValue={defaults.icd10_codes}
                  rows={2}
                  style={{ ...inputStyle(), resize: "vertical" }}
                  required
                />
              </div>

              <div style={{ flex: 1, minWidth: 320 }}>
                <div style={labelStyle()}>CPT Codes (comma/newline) *</div>
                <textarea
                  name="cpt_codes"
                  defaultValue={defaults.cpt_codes}
                  rows={2}
                  style={{ ...inputStyle(), resize: "vertical" }}
                  required
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
              <div style={{ width: 220 }}>
                <div style={labelStyle()}>HCPCS Q Code *</div>
                <input name="qcode" defaultValue={defaults.qcode} style={inputStyle()} required />
              </div>

              <div style={{ width: 220 }}>
                <div style={labelStyle()}>Units (SQ CM)</div>
                <input name="units_cm2" defaultValue={defaults.units_cm2} style={inputStyle()} />
              </div>

              <div style={{ flex: 1, minWidth: 320 }}>
                <div style={labelStyle()}>Primary Insurance *</div>
                <input name="primary_insurance" defaultValue={defaults.primary_insurance} style={inputStyle()} required />
              </div>

              <div style={{ flex: 1, minWidth: 320 }}>
                <div style={labelStyle()}>Secondary Insurance</div>
                <input name="secondary_insurance" defaultValue={defaults.secondary_insurance} style={inputStyle()} />
              </div>
            </div>

            <input type="hidden" name="__normalize_lists" value="1" />
          </>
        )}

        {section(
          "Primary Insurance (ALL required)",
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={labelStyle()}>Insurance Name *</div>
              <input
                name="p_name"
                defaultValue={pickText(results, "p_name", ivrRow["primary_insurance"])}
                style={inputStyle()}
                required
              />
            </div>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={labelStyle()}>Results *</div>
              <input name="p_results" defaultValue={safeStr((results as any).p_results)} style={inputStyle()} required />
            </div>

            <div style={{ width: 240 }}>
              <div style={labelStyle()}>Deductible *</div>
              <input name="p_deductible" defaultValue={safeStr((results as any).p_deductible)} style={inputStyle()} required />
            </div>
            <div style={{ width: 240 }}>
              <div style={labelStyle()}>Deductible Met *</div>
              <input
                name="p_deductible_met"
                defaultValue={safeStr((results as any).p_deductible_met)}
                style={inputStyle()}
                required
              />
            </div>

            <div style={{ width: 240 }}>
              <div style={labelStyle()}>Out-of-pocket *</div>
              <input name="p_oop" defaultValue={safeStr((results as any).p_oop)} style={inputStyle()} required />
            </div>
            <div style={{ width: 240 }}>
              <div style={labelStyle()}>Out-of-pocket Met *</div>
              <input name="p_oop_met" defaultValue={safeStr((results as any).p_oop_met)} style={inputStyle()} required />
            </div>

            <div style={{ width: 240 }}>
              <div style={labelStyle()}>Co-pay *</div>
              <input name="p_copay" defaultValue={safeStr((results as any).p_copay)} style={inputStyle()} required />
            </div>
            <div style={{ width: 240 }}>
              <div style={labelStyle()}>Co-insurance *</div>
              <input
                name="p_coinsurance"
                defaultValue={safeStr((results as any).p_coinsurance)}
                style={inputStyle()}
                required
              />
            </div>
          </div>
        )}

        {section(
          "Secondary Insurance (optional)",
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={labelStyle()}>Insurance Name</div>
              <input
                name="s_name"
                defaultValue={pickText(results, "s_name", ivrRow["secondary_insurance"])}
                style={inputStyle()}
              />
            </div>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={labelStyle()}>Results</div>
              <input name="s_results" defaultValue={safeStr((results as any).s_results)} style={inputStyle()} />
            </div>

            <div style={{ width: 240 }}>
              <div style={labelStyle()}>Deductible</div>
              <input name="s_deductible" defaultValue={safeStr((results as any).s_deductible)} style={inputStyle()} />
            </div>
            <div style={{ width: 240 }}>
              <div style={labelStyle()}>Deductible Met</div>
              <input
                name="s_deductible_met"
                defaultValue={safeStr((results as any).s_deductible_met)}
                style={inputStyle()}
              />
            </div>

            <div style={{ width: 240 }}>
              <div style={labelStyle()}>Out-of-pocket</div>
              <input name="s_oop" defaultValue={safeStr((results as any).s_oop)} style={inputStyle()} />
            </div>
            <div style={{ width: 240 }}>
              <div style={labelStyle()}>Out-of-pocket Met</div>
              <input name="s_oop_met" defaultValue={safeStr((results as any).s_oop_met)} style={inputStyle()} />
            </div>

            <div style={{ width: 240 }}>
              <div style={labelStyle()}>Co-pay</div>
              <input name="s_copay" defaultValue={safeStr((results as any).s_copay)} style={inputStyle()} />
            </div>
            <div style={{ width: 240 }}>
              <div style={labelStyle()}>Co-insurance</div>
              <input name="s_coinsurance" defaultValue={safeStr((results as any).s_coinsurance)} style={inputStyle()} />
            </div>
          </div>
        )}

        {section(
          "Coverage Summary (no PHI in email body)",
          <>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ width: 220 }}>
                <div style={labelStyle()}>Verification good through</div>
                <input type="date" name="good_through" defaultValue={defaults.good_through} style={inputStyle()} />
              </div>

              <div style={{ width: 220 }}>
                <div style={labelStyle()}>Re-run benefits on</div>
                <input type="date" name="rerun_on" defaultValue={defaults.rerun_on} style={inputStyle()} />
              </div>
            </div>

            <div style={{ marginTop: 10, ...labelStyle() }}>Coverage Summary Results</div>

            <CoverageSummaryTemplate
              name="coverage_summary"
              defaultValue={safeStr((results as any).coverage_summary)}
              rows={6}
              style={{ ...inputStyle(), resize: "vertical" }}
              vars={{
                product_name: safeStr(defaults.product),
                qcode: safeStr(ivrRow["qcode"]),
                units_cm2: safeStr(ivrRow["units_cm2"]),
                good_through: isoToMDY(defaults.good_through),
                rerun_on: isoToMDY(defaults.rerun_on),
              }}
            />
          </>
        )}

        <div style={{ marginTop: 14 }}>
          <button
            type="submit"
            name="mode"
            value="generate"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
              background: "#111",
              color: "white",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Step 1: Generate PDF
          </button>
        </div>

        {section(
          "Preview & Send",
          <>
            {hasPdf ? (
              <>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <a
                    href={previewHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,0.18)",
                      background: "var(--surface)",
                      fontWeight: 950,
                      textDecoration: "none",
                      color: "var(--brand-700)",
                    }}
                  >
                    Step 2: Preview PDF ↗
                  </a>

                  <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>
                    Latest PDF is available. Review it, then send email.
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <button
                    type="submit"
                    name="mode"
                    value="send"
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,0.2)",
                      background: "var(--brand-700)",
                      color: "white",
                      fontWeight: 950,
                      cursor: "pointer",
                    }}
                  >
                    Step 3: Send Email (attach PDF)
                  </button>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                    Uses recipients from the form above. Update To/CC before sending if needed.
                  </div>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, opacity: 0.8 }}>No verification PDF yet. Generate the PDF first (Step 1).</div>
            )}
          </>
        )}
      </form>
    </div>
  );
}
