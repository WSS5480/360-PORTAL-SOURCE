"use client";

import Link from "next/link";
import React from "react";
import type { AdminProviderIntelligenceReport } from "@/lib/surgical-sales/admin/adminProviderPreviewTypes";

export function AdminProviderIntelligenceReportModal({
  providerId,
  providerName,
  onClose,
}: {
  providerId: string;
  providerName: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [report, setReport] = React.useState<AdminProviderIntelligenceReport | null>(null);
  const [usedAi, setUsedAi] = React.useState(false);

  React.useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/admin/sales/providers/${encodeURIComponent(providerId)}/intelligence-report`, {
          method: "POST",
          cache: "no-store",
          signal: ac.signal,
        });
        const j = await res.json();
        if (!j.ok) {
          setErr(j.error || "Failed to generate report");
          return;
        }
        setReport(j.report);
        setUsedAi(Boolean(j.used_ai));
      } catch (e) {
        if ((e as { name?: string }).name === "AbortError") return;
        setErr(e instanceof Error ? e.message : "Request failed");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [providerId]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-provider-report-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(6,18,37,0.55)",
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 100%)",
          maxHeight: "min(88vh, 900px)",
          overflow: "auto",
          borderRadius: 18,
          border: "1px solid color-mix(in srgb, var(--brand-600) 14%, var(--border))",
          background: "var(--surface)",
          boxShadow: "var(--shadow-1)",
        }}
      >
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
            background:
              "radial-gradient(700px 180px at 10% 0%, color-mix(in srgb, var(--brand-600) 16%, transparent), transparent 60%)",
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>
              Admin intelligence report
            </div>
            <h2 id="admin-provider-report-title" style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 950, letterSpacing: "-0.03em" }}>
              {providerName}
            </h2>
            {loading || !report ? (
              <div style={{ marginTop: 6, fontSize: 11, fontWeight: 800, color: "var(--muted)" }}>Generating intelligence summary…</div>
            ) : usedAi ? (
              <div style={{ marginTop: 6, fontSize: 11, fontWeight: 800, color: "var(--brand-700)" }}>AI summary from captured intelligence</div>
            ) : (
              <div style={{ marginTop: 6, fontSize: 11, fontWeight: 800, color: "var(--muted)" }}>Rules-based summary (AI unavailable)</div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid var(--border)",
              background: "var(--surface)",
              borderRadius: 10,
              width: 34,
              height: 34,
              cursor: "pointer",
              fontWeight: 900,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div style={{ padding: 20, display: "grid", gap: 16 }}>
          {loading ? <p style={{ color: "var(--muted)", margin: 0 }}>Reading all intelligence and drafting report…</p> : null}
          {err ? (
            <div role="alert" style={{ color: "rgb(153,27,27)", fontWeight: 700, fontSize: 13 }}>
              {err}
            </div>
          ) : null}

          {report ? (
            <>
              <section>
                <div style={{ fontSize: 18, fontWeight: 950, letterSpacing: "-0.02em", lineHeight: 1.35 }}>{report.headline}</div>
                <p style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.6, color: "color-mix(in srgb, var(--foreground) 82%, black)" }}>
                  {report.summary}
                </p>
              </section>

              <ReportBlock title="What we know" items={report.what_we_know} />
              {report.friction_or_risks.length > 0 ? (
                <ReportBlock title="Friction or risks" items={report.friction_or_risks} tone="warn" />
              ) : null}
              <section>
                <h3 style={sectionTitleStyle}>Commercial outlook</h3>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>{report.commercial_outlook}</p>
              </section>
              <ReportBlock title="Recommended manager actions" items={report.manager_actions} tone="action" />
            </>
          ) : null}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingTop: 4 }}>
            <Link
              href={`/admin/sales/providers/${encodeURIComponent(providerId)}`}
              style={{
                padding: "9px 14px",
                borderRadius: 12,
                background: "var(--brand-050)",
                border: "1px solid color-mix(in srgb, var(--brand-600) 20%, var(--border))",
                color: "var(--brand-800)",
                fontWeight: 900,
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              Open read-only provider file →
            </Link>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "9px 14px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                fontWeight: 800,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 8px",
  fontSize: 12,
  fontWeight: 950,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--muted)",
};

function ReportBlock({
  title,
  items,
  tone = "neutral",
}: {
  title: string;
  items: string[];
  tone?: "neutral" | "warn" | "action";
}) {
  const bg =
    tone === "warn"
      ? "rgba(245,158,11,0.08)"
      : tone === "action"
        ? "rgba(16,185,129,0.08)"
        : "rgba(0,0,0,0.02)";
  const border =
    tone === "warn"
      ? "rgba(245,158,11,0.18)"
      : tone === "action"
        ? "rgba(16,185,129,0.18)"
        : "color-mix(in srgb, var(--foreground) 8%, var(--border))";

  return (
    <section style={{ padding: 14, borderRadius: 14, border: `1px solid ${border}`, background: bg }}>
      <h3 style={sectionTitleStyle}>{title}</h3>
      <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
        {items.map((item) => (
          <li key={item} style={{ fontSize: 14, lineHeight: 1.5 }}>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
