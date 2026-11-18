"use client";

import Link from "next/link";
import React from "react";
import type { AdminProviderPreviewPayload } from "@/lib/surgical-sales/admin/adminProviderPreviewTypes";
import { AdminProviderIntelligenceReportModal } from "../../team-dashboard/AdminProviderIntelligenceReportModal";

export default function AdminProviderPreviewClient({ providerId }: { providerId: string }) {
  const [preview, setPreview] = React.useState<AdminProviderPreviewPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [showReport, setShowReport] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/sales/providers/${encodeURIComponent(providerId)}`, { cache: "no-store" });
        const j = await res.json();
        if (!j.ok) {
          setErr(j.error || "Failed to load provider");
          return;
        }
        setPreview(j.preview);
        setErr(null);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Request failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [providerId]);

  if (loading) {
    return <div style={{ padding: 24, color: "var(--muted)" }}>Loading provider…</div>;
  }

  if (err || !preview) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
        <p style={{ color: "rgb(153,27,27)", fontWeight: 700 }}>{err || "Provider not found"}</p>
        <Link href="/admin/sales/team-dashboard" style={{ color: "var(--brand-700)", fontWeight: 800 }}>
          ← Back to team dashboard
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gap: 18, paddingBottom: 40 }}>
      <div
        style={{
          borderRadius: 18,
          padding: "18px 20px",
          border: "1px solid color-mix(in srgb, var(--brand-600) 14%, var(--border))",
          background:
            "radial-gradient(900px 220px at 12% 0%, color-mix(in srgb, var(--brand-600) 20%, transparent), transparent 58%), var(--surface)",
        }}
      >
        <Link href="/admin/sales/team-dashboard" style={{ fontSize: 12, fontWeight: 800, color: "var(--brand-700)", textDecoration: "none" }}>
          ← Team dashboard
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>
              Read-only admin view
            </div>
            <h1 style={{ margin: "6px 0 0", fontSize: 28, fontWeight: 950, letterSpacing: "-0.03em" }}>{preview.provider.display_name}</h1>
            <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 14, fontWeight: 700 }}>
              {preview.provider.organization_name} · Rep {preview.provider.rep_name} · {preview.provider.stage_label}
              {preview.provider.specialty ? ` · ${preview.provider.specialty}` : ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
            <button
              type="button"
              onClick={() => setShowReport(true)}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border))",
                background: "var(--brand-050)",
                color: "var(--brand-800)",
                fontWeight: 900,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Admin report
            </button>
          </div>
        </div>
      </div>

      <section style={panelStyle}>
        <h2 style={panelTitleStyle}>Intelligence dossier</h2>
        <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: 13 }}>{preview.dossier.subtitle}</p>
        {!preview.dossier.has_any_knowledge ? (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>No accumulated intelligence sections yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {preview.dossier.sections.map((section) => (
              <div key={section.id} style={{ padding: 14, borderRadius: 14, border: "1px solid var(--border)", background: "color-mix(in srgb, var(--brand-050) 20%, var(--surface))" }}>
                <div style={{ fontWeight: 950, fontSize: 14 }}>{section.label}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{section.purpose}</div>
                {section.known.length > 0 ? (
                  <ul style={{ margin: "10px 0 0", paddingLeft: 18, display: "grid", gap: 6 }}>
                    {section.known.map((row) => (
                      <li key={`${section.id}-${row.label}`} style={{ fontSize: 13, lineHeight: 1.45 }}>
                        <strong>{row.label}:</strong> {row.value}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--muted)" }}>Nothing captured in this area yet.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        <section style={panelStyle}>
          <h2 style={panelTitleStyle}>Cases ({preview.cases.length})</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {preview.cases.slice(0, 12).map((c) => (
              <div key={c.id} style={{ fontSize: 13, padding: "8px 10px", borderRadius: 10, background: "rgba(0,0,0,0.02)", border: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 900 }}>{c.case_number}</div>
                <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>
                  {c.case_date?.slice(0, 10) ?? "—"} · {c.case_type ?? "case"} · {c.status} · {c.rep_name}
                </div>
              </div>
            ))}
            {preview.cases.length === 0 ? <p style={{ color: "var(--muted)", fontSize: 13 }}>No cases linked.</p> : null}
          </div>
        </section>

        <section style={panelStyle}>
          <h2 style={panelTitleStyle}>Engagements ({preview.engagements.length})</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {preview.engagements.slice(0, 10).map((e) => (
              <div key={e.id} style={{ fontSize: 13, padding: "8px 10px", borderRadius: 10, background: "rgba(0,0,0,0.02)", border: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 900 }}>{e.type_label}</div>
                <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>
                  {e.date_label ?? "—"} · {e.status_label} · {e.rep_name}
                </div>
              </div>
            ))}
            {preview.engagements.length === 0 ? <p style={{ color: "var(--muted)", fontSize: 13 }}>No engagements linked.</p> : null}
          </div>
        </section>
      </div>

      {showReport ? (
        <AdminProviderIntelligenceReportModal
          providerId={providerId}
          providerName={preview.provider.display_name}
          onClose={() => setShowReport(false)}
        />
      ) : null}
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))",
  background: "var(--surface)",
  padding: 18,
};

const panelTitleStyle: React.CSSProperties = {
  margin: "0 0 10px",
  fontSize: 15,
  fontWeight: 950,
  letterSpacing: "-0.02em",
};
