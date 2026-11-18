"use client";

import Link from "next/link";
import React from "react";
import { AdminProviderIntelligenceReportModal } from "./AdminProviderIntelligenceReportModal";
import type {
  AdminRepAttention,
  AdminTeamDashboardPayload,
} from "@/lib/surgical-sales/admin/adminTeamDashboardTypes";
import type { AdminTeamDashboardPeriodKey } from "@/lib/surgical-sales/admin/adminTeamDashboardPeriod";

type PeriodKey = AdminTeamDashboardPeriodKey;
type DashboardTab = "revenue" | "reps" | "providers";
type IntelFilter = "all" | "signals" | "empty" | "stale";

const PERIOD_OPTIONS: Array<{ key: PeriodKey; label: string }> = [
  { key: "month", label: "This month" },
  { key: "30d", label: "Last 30 days" },
  { key: "quarter", label: "This quarter" },
];

const FUNNEL_COLORS: Record<string, { accent: string; soft: string }> = {
  discovery: { accent: "#3b82f6", soft: "rgba(59,130,246,0.12)" },
  observation: { accent: "#8b5cf6", soft: "rgba(139,92,246,0.12)" },
  evaluation: { accent: "#f59e0b", soft: "rgba(245,158,11,0.14)" },
  commitment: { accent: "#10b981", soft: "rgba(16,185,129,0.12)" },
  outcomes: { accent: "#06b6d4", soft: "rgba(6,182,212,0.12)" },
};

const TAB_OPTIONS: Array<{ key: DashboardTab; label: string }> = [
  { key: "revenue", label: "Revenue" },
  { key: "reps", label: "Rep activity" },
  { key: "providers", label: "Provider intelligence" },
];

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1240, margin: "0 auto", display: "grid", gap: 20, paddingBottom: 40 },
  hero: {
    borderRadius: 22,
    overflow: "hidden",
    border: "1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border))",
    background:
      "radial-gradient(900px 240px at 18% 8%, color-mix(in srgb, var(--brand-600) 38%, transparent), transparent 58%)," +
      "linear-gradient(180deg, #061225, #050b16)",
    boxShadow: "var(--shadow-1)",
    color: "rgba(255,255,255,0.92)",
  },
  heroInner: { padding: "22px 24px 20px", display: "grid", gap: 16 },
  heroKicker: {
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.55)",
  },
  heroTitle: { margin: "6px 0 0", fontSize: 30, fontWeight: 950, letterSpacing: "-0.04em", lineHeight: 1.05 },
  heroSub: { margin: "8px 0 0", fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.68)", maxWidth: 560 },
  section: {
    borderRadius: 18,
    border: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))",
    background: "var(--surface)",
    boxShadow: "0 1px 0 rgba(0,0,0,0.03)",
    overflow: "hidden",
  },
  sectionHead: {
    padding: "14px 18px",
    borderBottom: "1px solid color-mix(in srgb, var(--border) 80%, transparent)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  sectionTitle: { margin: 0, fontSize: 15, fontWeight: 950, letterSpacing: "-0.02em" },
  sectionBody: { padding: 16 },
  tabBar: {
    display: "flex",
    gap: 6,
    padding: 6,
    borderRadius: 16,
    border: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))",
    background: "var(--surface)",
    width: "fit-content",
    maxWidth: "100%",
    flexWrap: "wrap",
  },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function money(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
}

function moneyTrend(value: number, prior: number): { glyph: string; tone: string; label: string } {
  const diff = value - prior;
  if (prior === 0 && value === 0) return { glyph: "—", tone: "var(--muted)", label: "flat" };
  if (diff > 0) return { glyph: "↑", tone: "#059669", label: `+${money(diff)}` };
  if (diff < 0) return { glyph: "↓", tone: "#dc2626", label: `−${money(Math.abs(diff))}` };
  return { glyph: "→", tone: "var(--muted)", label: "flat" };
}

function trendMeta(value: number, prior: number): { glyph: string; tone: string; label: string } {
  const diff = value - prior;
  if (prior === 0 && value === 0) return { glyph: "—", tone: "var(--muted)", label: "flat" };
  if (diff > 0) return { glyph: "↑", tone: "#059669", label: `+${diff}` };
  if (diff < 0) return { glyph: "↓", tone: "#dc2626", label: `${diff}` };
  return { glyph: "→", tone: "var(--muted)", label: "flat" };
}

function attentionPill(attention: AdminRepAttention) {
  if (!attention) {
    return <span style={{ color: "var(--muted)", fontSize: 12 }}>Clear</span>;
  }
  const map: Record<Exclude<AdminRepAttention, null>, { label: string; bg: string; border: string; color: string }> = {
    low_activity: {
      label: "Low activity",
      bg: "rgba(234,179,8,0.12)",
      border: "rgba(234,179,8,0.28)",
      color: "rgb(146,64,14)",
    },
    doc_risk: {
      label: "Doc risk",
      bg: "rgba(220,38,38,0.10)",
      border: "rgba(220,38,38,0.22)",
      color: "rgb(153,27,27)",
    },
    stale_providers: {
      label: "Stale intel",
      bg: "rgba(99,102,241,0.12)",
      border: "rgba(99,102,241,0.24)",
      color: "rgb(67,56,202)",
    },
  };
  const tone = map[attention];
  return (
    <span
      style={{
        display: "inline-flex",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 900,
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        color: tone.color,
        whiteSpace: "nowrap",
      }}
    >
      {tone.label}
    </span>
  );
}

function PeriodPill({
  active,
  label,
  onClick,
  dark,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  dark?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 999,
        border: "1px solid",
        borderColor: active
          ? dark
            ? "rgba(255,255,255,0.35)"
            : "color-mix(in srgb, var(--brand-600) 30%, var(--border))"
          : dark
            ? "rgba(255,255,255,0.14)"
            : "var(--border)",
        background: active
          ? dark
            ? "rgba(255,255,255,0.14)"
            : "var(--brand-050)"
          : dark
            ? "rgba(255,255,255,0.04)"
            : "var(--surface)",
        color: dark ? "rgba(255,255,255,0.92)" : "var(--foreground)",
        fontWeight: 800,
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function FilterPill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "7px 12px",
        borderRadius: 999,
        border: "1px solid",
        borderColor: active ? "color-mix(in srgb, var(--brand-600) 28%, var(--border))" : "var(--border)",
        background: active ? "var(--brand-050)" : "transparent",
        fontWeight: 800,
        fontSize: 12,
        cursor: "pointer",
        color: active ? "var(--brand-800)" : "var(--foreground)",
      }}
    >
      {label}
    </button>
  );
}

function DashboardTabBar({
  tab,
  onChange,
  counts,
}: {
  tab: DashboardTab;
  onChange: (next: DashboardTab) => void;
  counts: { reps: number; providers: number };
}) {
  return (
    <div role="tablist" aria-label="Team dashboard sections" style={styles.tabBar}>
      {TAB_OPTIONS.map((opt) => {
        const active = tab === opt.key;
        const count = opt.key === "reps" ? counts.reps : opt.key === "providers" ? counts.providers : null;
        return (
          <button
            key={opt.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.key)}
            style={{
              padding: "9px 14px",
              borderRadius: 12,
              border: "1px solid",
              borderColor: active ? "color-mix(in srgb, var(--brand-600) 30%, var(--border))" : "transparent",
              background: active ? "var(--brand-050)" : "transparent",
              color: active ? "var(--brand-800)" : "var(--foreground)",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {opt.label}
            {count !== null ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  color: active ? "var(--brand-800)" : "var(--muted)",
                  background: active ? "white" : "color-mix(in srgb, var(--foreground) 6%, var(--surface))",
                  border: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))",
                  borderRadius: 999,
                  padding: "1px 7px",
                }}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function intelSummary(provider: AdminTeamDashboardPayload["providers"][number]): string {
  if (provider.is_stale) return "Stale";
  if (provider.has_signals) return "On file";
  if (provider.case_count > 0) return "Cases only";
  return "Empty";
}

export default function AdminTeamDashboardClient() {
  const [period, setPeriod] = React.useState<PeriodKey>("month");
  const [tab, setTab] = React.useState<DashboardTab>("revenue");
  const [dashboard, setDashboard] = React.useState<AdminTeamDashboardPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [repFilter, setRepFilter] = React.useState("all");
  const [stageFilter, setStageFilter] = React.useState("all");
  const [providerFilter, setProviderFilter] = React.useState("all");
  const [intelFilter, setIntelFilter] = React.useState<IntelFilter>("all");
  const [reportProvider, setReportProvider] = React.useState<{ id: string; name: string } | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/sales/team-dashboard?period=${period}`, { cache: "no-store" });
      const j = await res.json();
      if (!j.ok) {
        setErr(j.error || "Failed to load dashboard");
        return;
      }
      setDashboard(j.dashboard);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [period]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const reps = dashboard?.reps ?? [];
  const providerOptions = React.useMemo(() => {
    const rows = [...(dashboard?.providers ?? [])].sort((a, b) => a.display_name.localeCompare(b.display_name));
    return rows;
  }, [dashboard?.providers]);

  const providers = React.useMemo(() => {
    const rows = dashboard?.providers ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((p) => {
      if (providerFilter !== "all" && p.contact_id !== providerFilter) return false;
      if (repFilter !== "all" && p.rep_user_id !== repFilter) return false;
      if (stageFilter !== "all" && p.funnel_stage_id !== stageFilter) return false;
      if (intelFilter === "signals" && !p.has_signals) return false;
      if (intelFilter === "empty" && p.has_signals) return false;
      if (intelFilter === "stale" && !p.is_stale) return false;
      if (!q) return true;
      return (
        p.display_name.toLowerCase().includes(q) ||
        p.organization_name.toLowerCase().includes(q) ||
        p.rep_name.toLowerCase().includes(q)
      );
    });
  }, [dashboard?.providers, search, providerFilter, repFilter, stageFilter, intelFilter]);

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={styles.heroKicker}>Surgical sales · Manager view</div>
              <h1 style={styles.heroTitle}>Team dashboard</h1>
              <p style={styles.heroSub}>
                Case revenue first, then rep activity and provider intelligence.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
              {PERIOD_OPTIONS.map((opt) => (
                <PeriodPill
                  key={opt.key}
                  active={period === opt.key}
                  label={opt.label}
                  dark
                  onClick={() => setPeriod(opt.key)}
                />
              ))}
            </div>
          </div>

          {dashboard ? (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "rgba(255,255,255,0.55)",
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                {dashboard.period.label} · {dashboard.period.start} – {dashboard.period.end}
              </span>
              {dashboard.read_model_enabled ? (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    color: "#a5f3fc",
                    padding: "5px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(165,243,252,0.22)",
                    background: "rgba(6,182,212,0.12)",
                  }}
                >
                  UF intelligence active
                </span>
              ) : null}
              {loading ? (
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 700 }}>Refreshing…</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {err ? (
        <div
          role="alert"
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            background: "rgba(220,38,38,0.08)",
            border: "1px solid rgba(220,38,38,0.2)",
            color: "rgb(153,27,27)",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {err}
        </div>
      ) : null}

      {loading && !dashboard ? (
        <div style={{ ...styles.section, padding: 32, textAlign: "center", color: "var(--muted)" }}>Loading dashboard…</div>
      ) : null}

      {dashboard ? (
        <>
          <DashboardTabBar
            tab={tab}
            onChange={setTab}
            counts={{ reps: reps.length, providers: dashboard.providers.length }}
          />

          {tab === "revenue" && (
            <>
              <section style={styles.section}>
            <div style={styles.sectionHead}>
              <div>
                <h2 style={styles.sectionTitle}>Case revenue</h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>
                  Expected and actual dollars reps entered on cases in {dashboard.period.label.toLowerCase()}. This is
                  not the BioTissue manufacturer closed-sales tracker.{" "}
                  <Link href="/admin/sales/biotissue-revenue" style={{ color: "var(--brand-700)", fontWeight: 800 }}>
                    Open BioTissue revenue
                  </Link>
                </p>
              </div>
            </div>
            <div style={styles.sectionBody}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <RevenueStat
                  label="Expected"
                  value={money(dashboard.case_revenue.expected)}
                  hint={`${dashboard.case_revenue.cases_with_expected} of ${dashboard.case_revenue.cases_in_period} cases have expected`}
                  trend={moneyTrend(dashboard.case_revenue.expected, dashboard.case_revenue.prior_expected)}
                />
                <RevenueStat
                  label="Actual"
                  value={money(dashboard.case_revenue.actual)}
                  hint={`${dashboard.case_revenue.cases_with_actual} of ${dashboard.case_revenue.cases_in_period} cases have actual`}
                  trend={moneyTrend(dashboard.case_revenue.actual, dashboard.case_revenue.prior_actual)}
                />
                <RevenueStat
                  label="Still estimated"
                  value={money(Math.max(0, dashboard.case_revenue.expected - dashboard.case_revenue.actual))}
                  hint={
                    dashboard.case_revenue.product_support_missing_expected > 0
                      ? `${dashboard.case_revenue.product_support_missing_expected} product-support case${dashboard.case_revenue.product_support_missing_expected === 1 ? "" : "s"} missing expected`
                      : "Expected entered minus actual entered"
                  }
                />
              </div>
            </div>
          </section>

          <section style={styles.section}>
            <div style={styles.sectionHead}>
              <div>
                <h2 style={styles.sectionTitle}>Case activity</h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>
                  Capture volume for {dashboard.period.label.toLowerCase()}
                </p>
              </div>
            </div>
            <div style={styles.sectionBody}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
                {dashboard.kpis.map((kpi) => {
                  const trend = trendMeta(kpi.value, kpi.prior_value);
                  return (
                    <div
                      key={kpi.id}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 14,
                        border: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))",
                        background: "linear-gradient(180deg, color-mix(in srgb, var(--surface) 92%, white), var(--surface))",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>{kpi.label}</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
                        <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: "-0.03em" }}>{kpi.value}</div>
                        <span style={{ fontSize: 12, fontWeight: 900, color: trend.tone }}>
                          {trend.glyph} {trend.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, lineHeight: 1.4 }}>{kpi.hint}</div>
                    </div>
                  );
                })}
              </div>
            </div>
              </section>
            </>
          )}

          {tab === "reps" && (
            <section style={styles.section}>
            <div style={styles.sectionHead}>
              <h2 style={styles.sectionTitle}>Rep activity</h2>
              <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>Sorted by composite score</span>
            </div>
            {reps.length === 0 ? (
              <div style={{ ...styles.sectionBody, color: "var(--muted)", fontSize: 14 }}>
                No internal sales reps configured.{" "}
                <Link href="/admin/users" style={{ color: "var(--brand-700)", fontWeight: 800 }}>
                  Manage users
                </Link>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "color-mix(in srgb, var(--brand-050) 55%, var(--surface))" }}>
                      {["", "Rep", "Expected", "Actual", "Sched", "Done", "Obs", "Product", "Debrief", "Notes", "Gaps", "Stale", "Attention"].map((h) => (
                        <th
                          key={h || "rank"}
                          style={{
                            padding: "10px 12px",
                            fontWeight: 900,
                            color: "var(--muted)",
                            fontSize: 11,
                            textAlign: h === "" ? "center" : "left",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reps.map((rep, index) => (
                      <tr
                        key={rep.user_id}
                        style={{
                          borderTop: "1px solid color-mix(in srgb, var(--border) 75%, transparent)",
                          background: index % 2 === 0 ? "var(--surface)" : "color-mix(in srgb, var(--brand-050) 18%, var(--surface))",
                        }}
                      >
                        <td style={{ padding: "10px 8px", textAlign: "center", color: "var(--muted)", fontWeight: 900, width: 36 }}>
                          {index + 1}
                        </td>
                        <td style={{ padding: "10px 12px", minWidth: 180 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span
                              aria-hidden
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 10,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 12,
                                fontWeight: 950,
                                background: "var(--brand-050)",
                                border: "1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border))",
                                color: "var(--brand-800)",
                              }}
                            >
                              {initials(rep.display_name)}
                            </span>
                            <div>
                              <div style={{ fontWeight: 900 }}>{rep.display_name}</div>
                              {rep.email ? (
                                <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>{rep.email}</div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 900, whiteSpace: "nowrap" }}>
                          {money(rep.metrics.expected_revenue)}
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 950, color: "#047857", whiteSpace: "nowrap" }}>
                          {money(rep.metrics.actual_revenue)}
                        </td>
                        <td style={{ padding: "10px 12px" }}>{rep.metrics.scheduled}</td>
                        <td style={{ padding: "10px 12px" }}>{rep.metrics.completed}</td>
                        <td style={{ padding: "10px 12px" }}>{rep.metrics.observations}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 950, color: "#047857" }}>{rep.metrics.supported_product_cases}</td>
                        <td style={{ padding: "10px 12px" }}>{rep.metrics.debriefs}</td>
                        <td style={{ padding: "10px 12px" }}>{rep.metrics.notes_30d}</td>
                        <td style={{ padding: "10px 12px", color: rep.metrics.doc_gaps > 0 ? "#b45309" : undefined, fontWeight: rep.metrics.doc_gaps > 0 ? 900 : undefined }}>
                          {rep.metrics.doc_gaps}
                        </td>
                        <td style={{ padding: "10px 12px", color: rep.metrics.stale_providers > 0 ? "#4338ca" : undefined, fontWeight: rep.metrics.stale_providers > 0 ? 900 : undefined }}>
                          {rep.metrics.stale_providers}
                        </td>
                        <td style={{ padding: "10px 12px" }}>{attentionPill(rep.attention)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </section>
          )}

          {tab === "providers" && (
            <section style={styles.section}>
            <div style={styles.sectionHead}>
              <div>
                <h2 style={styles.sectionTitle}>Provider intelligence roster</h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>
                  {providers.length} shown · use Admin report for manager briefing
                </p>
              </div>
            </div>
            <div style={{ ...styles.sectionBody, display: "grid", gap: 10, borderBottom: "1px solid color-mix(in srgb, var(--border) 80%, transparent)" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)", fontSize: 13, minWidth: 200, maxWidth: 280 }}
                >
                  <option value="all">All providers</option>
                  {providerOptions.map((p) => (
                    <option key={p.contact_id} value={p.contact_id}>
                      {p.display_name}
                    </option>
                  ))}
                </select>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, org, rep"
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    fontSize: 13,
                    minWidth: 180,
                    flex: "1 1 180px",
                  }}
                />
                <select
                  value={repFilter}
                  onChange={(e) => setRepFilter(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)", fontSize: 13 }}
                >
                  <option value="all">All reps</option>
                  {reps.map((rep) => (
                    <option key={rep.user_id} value={rep.user_id}>
                      {rep.display_name}
                    </option>
                  ))}
                </select>
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)", fontSize: 13 }}
                >
                  <option value="all">All stages</option>
                  {dashboard.pathway_funnel.map((seg) => (
                    <option key={seg.stage_id} value={seg.stage_id}>
                      {seg.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <FilterPill active={intelFilter === "all"} label="All" onClick={() => setIntelFilter("all")} />
                <FilterPill active={intelFilter === "signals"} label="Has signals" onClick={() => setIntelFilter("signals")} />
                <FilterPill active={intelFilter === "empty"} label="Empty" onClick={() => setIntelFilter("empty")} />
                <FilterPill active={intelFilter === "stale"} label="Stale (60d+)" onClick={() => setIntelFilter("stale")} />
              </div>
            </div>

            {providers.length === 0 ? (
              <div style={{ ...styles.sectionBody, color: "var(--muted)", fontSize: 14 }}>No providers match the current filters.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "color-mix(in srgb, var(--brand-050) 55%, var(--surface))" }}>
                      {["Provider", "Organization", "Rep", "Stage", "Cases", "Last case", "Intel", ""].map((h) => (
                        <th
                          key={h || "actions"}
                          style={{
                            padding: "8px 12px",
                            fontWeight: 900,
                            color: "var(--muted)",
                            fontSize: 11,
                            textAlign: "left",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {providers.map((p, index) => {
                      const stageColor = FUNNEL_COLORS[p.funnel_stage_id] ?? FUNNEL_COLORS.discovery;
                      const intel = intelSummary(p);
                      return (
                        <tr
                          key={p.contact_id}
                          style={{
                            borderTop: "1px solid color-mix(in srgb, var(--border) 75%, transparent)",
                            background: index % 2 === 0 ? "var(--surface)" : "color-mix(in srgb, var(--brand-050) 10%, var(--surface))",
                          }}
                        >
                          <td style={{ padding: "8px 12px", fontWeight: 900, whiteSpace: "nowrap" }}>{p.display_name}</td>
                          <td style={{ padding: "8px 12px", color: "var(--muted)", fontWeight: 700, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>
                            {p.organization_name}
                          </td>
                          <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>{p.rep_name}</td>
                          <td style={{ padding: "8px 12px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                padding: "2px 8px",
                                borderRadius: 999,
                                fontSize: 10,
                                fontWeight: 900,
                                background: stageColor.soft,
                                border: `1px solid ${stageColor.accent}33`,
                                color: stageColor.accent,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {p.stage_label}
                            </span>
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>{p.case_count}</td>
                          <td style={{ padding: "8px 12px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                            {p.last_case_date ? p.last_case_date.slice(0, 10) : "—"}
                          </td>
                          <td style={{ padding: "8px 12px", whiteSpace: "nowrap", color: p.is_stale ? "#4338ca" : undefined, fontWeight: p.is_stale ? 900 : 700 }}>
                            {intel}
                          </td>
                          <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                              <Link
                                href={p.portal_href}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: 11,
                                  fontWeight: 900,
                                  color: "var(--brand-700)",
                                  textDecoration: "none",
                                  padding: "4px 8px",
                                  borderRadius: 8,
                                  border: "1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border))",
                                  background: "var(--brand-050)",
                                }}
                              >
                                View
                              </Link>
                              <button
                                type="button"
                                onClick={() => setReportProvider({ id: p.contact_id, name: p.display_name })}
                                style={{
                                  fontSize: 11,
                                  fontWeight: 900,
                                  color: "var(--brand-800)",
                                  padding: "4px 8px",
                                  borderRadius: 8,
                                  border: "1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border))",
                                  background: "white",
                                  cursor: "pointer",
                                }}
                              >
                                Report
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            </section>
          )}
        </>
      ) : null}

      {reportProvider ? (
        <AdminProviderIntelligenceReportModal
          providerId={reportProvider.id}
          providerName={reportProvider.name}
          onClose={() => setReportProvider(null)}
        />
      ) : null}
    </div>
  );
}

function RevenueStat({
  label,
  value,
  hint,
  trend,
}: {
  label: string;
  value: string;
  hint: string;
  trend?: { glyph: string; tone: string; label: string };
}) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 14,
        border: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))",
        background: "var(--surface)",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
        <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: "-0.03em" }}>{value}</div>
        {trend ? (
          <span style={{ fontSize: 12, fontWeight: 900, color: trend.tone }}>
            {trend.glyph} {trend.label}
          </span>
        ) : null}
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, lineHeight: 1.4 }}>{hint}</div>
    </div>
  );
}
