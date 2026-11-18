"use client";

import Link from "next/link";
import type { AccountIntelligence } from "@/lib/surgical-sales/accountIntelligence";

function fmtDate(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

function fmtMoney(n: number) {
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

type Appearance = "portal" | "admin";

export function SurgicalAccountIntelligencePanel({
  intel,
  appearance,
  caseHref,
  footnote,
}: {
  intel: AccountIntelligence | null;
  appearance: Appearance;
  caseHref?: (caseId: string) => string;
  footnote: string;
}) {
  const muted = appearance === "portal" ? "var(--muted)" : "#64748b";
  const fg = appearance === "portal" ? "var(--foreground)" : "#0f172a";
  const border = appearance === "portal" ? "color-mix(in srgb, var(--foreground) 8%, var(--border))" : "rgba(0,0,0,0.08)";
  const insightBg =
    appearance === "portal" ? "color-mix(in srgb, var(--brand-600) 6%, var(--surface))" : "rgba(14, 165, 233, 0.06)";
  const insightBorder = appearance === "portal" ? "color-mix(in srgb, var(--brand-600) 18%, var(--border))" : "rgba(14, 165, 233, 0.22)";

  if (!intel) {
    return (
      <div style={{ fontSize: 14, color: muted }}>
        Organization intelligence is temporarily unavailable. Refresh the page or try again later.
      </div>
    );
  }

  const rev = fmtMoney(intel.revenue_estimate_expected_total);
  const linkColor = appearance === "portal" ? "var(--brand-700)" : "#0369a1";

  return (
    <div className="org-intel-panel" style={{ display: "grid", gap: 16 }}>
      <p style={{ margin: 0, fontSize: 13, color: muted, lineHeight: 1.5 }}>{footnote}</p>

      <div
        className="org-intel-metrics"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 12,
        }}
      >
        <MetricTile label="Total cases" value={String(intel.total_cases)} fg={fg} border={border} />
        <MetricTile label="Last case (on/before today)" value={fmtDate(intel.last_case_date)} fg={fg} border={border} />
        <MetricTile
          label="Top surgeon"
          value={intel.top_surgeon ? intel.top_surgeon.name : "—"}
          sub={intel.top_surgeon ? `${intel.top_surgeon.case_count} cases` : undefined}
          fg={fg}
          border={border}
        />
        <MetricTile label="Upcoming cases" value={String(intel.upcoming_case_count)} fg={fg} border={border} />
        <MetricTile label="Revenue estimate" value={rev ?? "—"} sub={rev ? "Sum of expected revenue" : undefined} fg={fg} border={border} />
      </div>

      {intel.cases_by_product.length > 0 ? (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: muted, marginBottom: 8 }}>
            Cases by product
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {intel.cases_by_product.map((row) => (
              <span
                key={row.product_id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: `1px solid ${border}`,
                  fontSize: 13,
                  color: fg,
                  fontWeight: 650,
                }}
              >
                <span style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</span>
                <span style={{ color: muted, fontWeight: 800 }}>{row.count}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {intel.upcoming_cases.length > 0 ? (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: muted, marginBottom: 8 }}>
            Upcoming cases
          </div>
          <div className="org-intel-upcoming-cards">
            {intel.upcoming_cases.map((c) => (
              <div key={c.id} className="org-intel-upcoming-card">
                <div className="org-intel-upcoming-card-row">
                  <span className="org-intel-upcoming-card-label">Case</span>
                  <span style={{ fontWeight: 800 }}>
                    {caseHref ? (
                      <Link href={caseHref(c.id)} style={{ color: linkColor, fontWeight: 800 }}>
                        {c.case_number}
                      </Link>
                    ) : (
                      c.case_number
                    )}
                  </span>
                </div>
                <div className="org-intel-upcoming-card-row">
                  <span className="org-intel-upcoming-card-label">Date</span>
                  <span>{fmtDate(c.case_date)}</span>
                </div>
                <div className="org-intel-upcoming-card-row">
                  <span className="org-intel-upcoming-card-label">Status</span>
                  <span>{c.status}</span>
                </div>
                <div className="org-intel-upcoming-card-row">
                  <span className="org-intel-upcoming-card-label">Product</span>
                  <span>{c.product_name ?? "—"}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ border: `1px solid ${border}`, borderRadius: 10, overflow: "hidden" }} className="org-intel-upcoming-table">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: `1px solid ${border}`, background: appearance === "admin" ? "rgba(0,0,0,0.02)" : undefined }}>
                  <th style={{ padding: 10, color: muted, fontWeight: 800 }}>Case</th>
                  <th style={{ padding: 10, color: muted, fontWeight: 800 }}>Date</th>
                  <th style={{ padding: 10, color: muted, fontWeight: 800 }}>Status</th>
                  <th style={{ padding: 10, color: muted, fontWeight: 800 }}>Product</th>
                </tr>
              </thead>
              <tbody>
                {intel.upcoming_cases.map((c) => (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${border}` }}>
                    <td style={{ padding: 10, fontWeight: 750 }}>
                      {caseHref ? (
                        <Link href={caseHref(c.id)} style={{ color: linkColor, fontWeight: 800 }}>
                          {c.case_number}
                        </Link>
                      ) : (
                        c.case_number
                      )}
                    </td>
                    <td style={{ padding: 10 }}>{fmtDate(c.case_date)}</td>
                    <td style={{ padding: 10 }}>{c.status}</td>
                    <td style={{ padding: 10 }}>{c.product_name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {intel.upcoming_case_count > intel.upcoming_cases.length ? (
            <p style={{ fontSize: 12, color: muted, margin: "10px 0 0" }}>
              Showing the next {intel.upcoming_cases.length} of {intel.upcoming_case_count} upcoming.
            </p>
          ) : null}
        </div>
      ) : null}

      {intel.insights.length > 0 ? (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: muted, marginBottom: 8 }}>
            Insights
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8, color: fg, fontSize: 14, lineHeight: 1.45 }}>
            {intel.insights.map((t) => (
              <li
                key={t}
                style={{
                  padding: "10px 12px",
                  marginLeft: -4,
                  listStylePosition: "outside",
                  borderRadius: 10,
                  background: insightBg,
                  border: `1px solid ${insightBorder}`,
                }}
              >
                {t}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function MetricTile({
  label,
  value,
  sub,
  fg,
  border,
}: {
  label: string;
  value: string;
  sub?: string;
  fg: string;
  border: string;
}) {
  return (
    <div style={{ padding: "12px 14px", borderRadius: 12, border: `1px solid ${border}` }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748b", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 850, color: fg, lineHeight: 1.25 }}>{value}</div>
      {sub ? <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{sub}</div> : null}
    </div>
  );
}
