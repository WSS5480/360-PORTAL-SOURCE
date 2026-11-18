"use client";

import Link from "next/link";
import React from "react";
import {
  ClosedVsQuotaChart,
  CumulativeRunRateChart,
  TerritoryMixDonut,
  TerritoryStackChart,
} from "./BiotissueRevenueCharts";
import { userFacingError } from "@/lib/errors/userFacingError";
import {
  buildProductLineChartPoints,
  DEFAULT_PRODUCT_LINE_REVENUE_LINE,
  PRODUCT_LINE_REVENUE_MIGRATION,
  productLineTerritoryTotals,
  type ProductLineMonthView,
  type ProductLineQuarterView,
  type ProductLineYearView,
} from "@/lib/surgical-sales/productLineRevenue";

type PageTab = "scorecard" | "entry";

function money(n: number | null | undefined, cents = false): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(n);
}

function moneyCompact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1000) {
    const k = abs / 1000;
    const digits = k >= 100 ? 0 : 1;
    return `${sign}$${k.toFixed(digits).replace(/\.0$/, "")}k`;
  }
  return `${sign}${money(abs)}`;
}

function pct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

function sourceLabel(source: ProductLineMonthView["source"]): string {
  if (source === "import") return "From spreadsheet";
  if (source === "manual") return "Entered here";
  if (source === "derived") return "From cases";
  return "Not entered";
}

function quarterStatusCopy(q: ProductLineQuarterView): string {
  if (q.status === "hit") return `Hit · ${pct(q.attainment)}`;
  if (q.status === "missed") return `Missed · ${pct(q.attainment)}`;
  if (q.status === "in_play" && q.remainingToHit != null) {
    return q.remainingToHit === 0 ? "On track for 35%" : `${moneyCompact(q.remainingToHit)} to 35%`;
  }
  if (q.status === "no_quota") return "Closed, no quota";
  return "Not entered";
}

function quarterIsaCopy(q: ProductLineQuarterView): string {
  if (q.commissionRate != null && q.commissionEstimate != null) {
    return `${Math.round(q.commissionRate * 100)}% · ${money(q.commissionEstimate, true)}`;
  }
  if (q.status === "in_play") return "Unscored until hit or quarter close";
  return "—";
}

function parseDollars(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (cleaned === "") return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

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
  heroSub: { margin: "8px 0 0", fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.68)", maxWidth: 640 },
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
  sectionCaption: { margin: "4px 0 0", fontSize: 12, color: "var(--muted)", fontWeight: 700 },
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

export default function AdminBiotissueRevenueClient() {
  const [year, setYear] = React.useState(2026);
  const [tab, setTab] = React.useState<PageTab>("scorecard");
  const [view, setView] = React.useState<ProductLineYearView | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [needsMigration, setNeedsMigration] = React.useState(false);
  const [savingMonth, setSavingMonth] = React.useState<number | null>(null);
  const [drafts, setDrafts] = React.useState<Record<number, { rgv: string; laredo: string }>>({});

  const load = React.useCallback(async (nextYear: number) => {
    setLoading(true);
    setErr(null);
    setNeedsMigration(false);
    try {
      const res = await fetch(
        `/api/admin/sales/product-line-revenue?productLine=${encodeURIComponent(DEFAULT_PRODUCT_LINE_REVENUE_LINE)}&year=${nextYear}`,
        { cache: "no-store" },
      );
      const j = await res.json();
      if (!j.ok) {
        setView(null);
        setNeedsMigration(j.needs_migration === true);
        setErr(j.error || "Failed to load");
        return;
      }
      const next = j.view as ProductLineYearView;
      setView(next);
      const nextDrafts: Record<number, { rgv: string; laredo: string }> = {};
      for (const month of next.months) {
        nextDrafts[month.month] = {
          rgv: month.rgv == null ? "" : String(month.rgv),
          laredo: month.laredo == null ? "" : String(month.laredo),
        };
      }
      setDrafts(nextDrafts);
    } catch (e) {
      setView(null);
      setErr(userFacingError(e, "Could not load BioTissue revenue."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load(year);
  }, [load, year]);

  async function saveMonth(month: ProductLineMonthView) {
    const draft = drafts[month.month] ?? { rgv: "", laredo: "" };
    const rgv = parseDollars(draft.rgv);
    const laredo = parseDollars(draft.laredo);
    if (rgv == null || laredo == null) {
      setErr("Enter RGV and Laredo as dollar amounts (0 is allowed).");
      return;
    }
    setSavingMonth(month.month);
    setErr(null);
    try {
      const res = await fetch("/api/admin/sales/product-line-revenue", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productLine: DEFAULT_PRODUCT_LINE_REVENUE_LINE,
          year,
          month: month.month,
          rgv,
          laredo,
        }),
      });
      const j = await res.json();
      if (!j.ok) {
        setNeedsMigration(j.needs_migration === true);
        setErr(j.error || "Save failed");
        return;
      }
      const next = j.view as ProductLineYearView;
      setView(next);
      setDrafts((prev) => ({
        ...prev,
        [month.month]: {
          rgv: String(rgv),
          laredo: String(laredo),
        },
      }));
    } catch (e) {
      setErr(userFacingError(e, "Could not save that month."));
    } finally {
      setSavingMonth(null);
    }
  }

  const years = view?.availableYears?.length ? view.availableYears : [2025, 2026];
  const liveQuarter = view?.quarters.find((q) => q.status === "in_play") ?? null;
  const chartPoints = view ? buildProductLineChartPoints(view) : [];
  const mix = view ? productLineTerritoryTotals(view) : { rgv: 0, laredo: 0 };
  const pace =
    view?.quotaThroughEntered && view.quotaThroughEntered > 0 ? view.closed / view.quotaThroughEntered : null;
  const mixTotal = mix.rgv + mix.laredo;

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={styles.heroKicker}>Sales admin · Manufacturer scorecard</div>
              <h1 style={styles.heroTitle}>BioTissue revenue</h1>
              <p style={styles.heroSub}>
                Closed sales vs quota for RGV and Laredo. These are manufacturer monthly totals, not surgical cases.{" "}
                <Link href="/admin/sales/team-dashboard" style={{ color: "rgba(165,243,252,0.95)", fontWeight: 800 }}>
                  Case expected/actual is on Team dashboard
                </Link>
                .
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
              {years.map((y) => (
                <YearPill key={y} active={year === y} label={String(y)} onClick={() => setYear(y)} />
              ))}
            </div>
          </div>
          {loading ? (
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 700 }}>
              {view ? "Refreshing…" : "Loading…"}
            </span>
          ) : null}
        </div>
      </div>

      <div role="tablist" aria-label="BioTissue revenue views" style={styles.tabBar}>
        <TabButton active={tab === "scorecard"} label="Scorecard" onClick={() => setTab("scorecard")} />
        <TabButton active={tab === "entry"} label="Enter actuals" onClick={() => setTab("entry")} />
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
          {needsMigration ? (
            <div style={{ marginTop: 6, fontWeight: 650 }}>
              Run <code>{PRODUCT_LINE_REVENUE_MIGRATION}</code> in the SQL editor, then refresh.
            </div>
          ) : null}
        </div>
      ) : null}

      {loading && !view ? (
        <div style={{ ...styles.section, padding: 32, textAlign: "center", color: "var(--muted)" }}>
          Loading BioTissue numbers…
        </div>
      ) : null}

      {view && tab === "scorecard" ? (
        <>
          <section style={styles.section}>
            <div style={styles.sectionBody}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
                <StatCard label={`${view.year} closed`} value={moneyCompact(view.closed)} hint={money(view.closed)} />
                <StatCard
                  label="Pace vs entered quota"
                  value={pct(pace)}
                  hint={
                    view.quotaThroughEntered != null
                      ? `${money(view.closed)} of ${money(view.quotaThroughEntered)}`
                      : "No quota on entered months"
                  }
                  tone={pace == null ? undefined : pace >= 1 ? "up" : "down"}
                />
                <StatCard
                  label={
                    view.varianceThroughEntered == null
                      ? "Vs quota"
                      : view.varianceThroughEntered >= 0
                        ? "Ahead of quota"
                        : "Behind quota"
                  }
                  value={
                    view.varianceThroughEntered == null ? "—" : moneyCompact(Math.abs(view.varianceThroughEntered))
                  }
                  hint={view.quota != null ? `Full-year quota ${money(view.quota)}` : undefined}
                  tone={
                    view.varianceThroughEntered == null
                      ? undefined
                      : view.varianceThroughEntered >= 0
                        ? "up"
                        : "down"
                  }
                />
                <StatCard
                  label={liveQuarter ? `${liveQuarter.id} remaining for 35%` : "Live quarter"}
                  value={liveQuarter?.remainingToHit != null ? moneyCompact(liveQuarter.remainingToHit) : "—"}
                  hint={
                    liveQuarter
                      ? `${money(liveQuarter.closed)} of ${money(liveQuarter.quota)} · miss 25%, hit 35%`
                      : "No quarter currently in play"
                  }
                  tone={liveQuarter ? "warn" : undefined}
                />
              </div>
            </div>
          </section>

          {liveQuarter && liveQuarter.quota != null && liveQuarter.quota > 0 ? (
            <section style={styles.section}>
              <div style={styles.sectionHead}>
                <div>
                  <h2 style={styles.sectionTitle}>Live quarter · {liveQuarter.label}</h2>
                  <p style={styles.sectionCaption}>
                    {quarterStatusCopy(liveQuarter)}. Hit 100% of the quarter quota and the whole quarter true-up is
                    35%.
                  </p>
                </div>
              </div>
              <div style={styles.sectionBody}>
                <QuarterProgress closed={liveQuarter.closed} quota={liveQuarter.quota} />
              </div>
            </section>
          ) : null}

          {chartPoints.length > 0 ? (
            <>
              <section style={styles.section}>
                <div style={styles.sectionHead}>
                  <div>
                    <h2 style={styles.sectionTitle}>Closed vs monthly quota</h2>
                    <p style={styles.sectionCaption}>
                      Manufacturer closed dollars vs assigned quota · entered months only · {view.year}
                    </p>
                  </div>
                </div>
                <div style={styles.sectionBody}>
                  <ClosedVsQuotaChart points={chartPoints} />
                </div>
              </section>

              <section style={styles.section}>
                <div style={styles.sectionHead}>
                  <div>
                    <h2 style={styles.sectionTitle}>YTD run rate vs quota</h2>
                    <p style={styles.sectionCaption}>
                      Cumulative closed vs cumulative quota through entered months · {view.year}
                    </p>
                  </div>
                </div>
                <div style={styles.sectionBody}>
                  <CumulativeRunRateChart points={chartPoints} />
                </div>
              </section>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 20,
                }}
              >
                <section style={styles.section}>
                  <div style={styles.sectionHead}>
                    <div>
                      <h2 style={styles.sectionTitle}>Territory mix by month</h2>
                      <p style={styles.sectionCaption}>Stacked closed dollars · RGV vs Laredo · {view.year}</p>
                    </div>
                  </div>
                  <div style={styles.sectionBody}>
                    <TerritoryStackChart points={chartPoints} />
                  </div>
                </section>
                <section style={styles.section}>
                  <div style={styles.sectionHead}>
                    <div>
                      <h2 style={styles.sectionTitle}>YTD mix</h2>
                      <p style={styles.sectionCaption}>
                        RGV {mixTotal > 0 ? pct(mix.rgv / mixTotal) : "—"} · Laredo{" "}
                        {mixTotal > 0 ? pct(mix.laredo / mixTotal) : "—"}
                      </p>
                    </div>
                  </div>
                  <div style={styles.sectionBody}>
                    <TerritoryMixDonut rgv={mix.rgv} laredo={mix.laredo} />
                    <div style={{ display: "flex", gap: 14, justifyContent: "center", fontSize: 12, fontWeight: 800 }}>
                      <span style={{ color: "#0b7285" }}>RGV {moneyCompact(mix.rgv)}</span>
                      <span style={{ color: "#c2410c" }}>Laredo {moneyCompact(mix.laredo)}</span>
                    </div>
                  </div>
                </section>
              </div>
            </>
          ) : (
            <section style={styles.section}>
              <div style={{ ...styles.sectionBody, color: "var(--muted)", fontWeight: 700 }}>
                No closed months entered for {view.year} yet. Use Enter actuals to add RGV and Laredo totals.
              </div>
            </section>
          )}

          <section style={styles.section}>
            <div style={styles.sectionHead}>
              <div>
                <h2 style={styles.sectionTitle}>Quarter scoreboard</h2>
                <p style={styles.sectionCaption}>
                  ISA: miss the quarter at 25%; hit 100% of quarterly quota at 35% back to dollar one
                </p>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "color-mix(in srgb, var(--brand-050) 55%, var(--surface))" }}>
                    {["Quarter", "Closed", "Quota", "Status", "ISA"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 14px",
                          fontWeight: 900,
                          color: "var(--muted)",
                          fontSize: 11,
                          textAlign: h === "Quarter" || h === "Status" || h === "ISA" ? "left" : "right",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {view.quarters.map((q, index) => (
                    <tr
                      key={q.id}
                      style={{
                        borderTop: "1px solid color-mix(in srgb, var(--border) 75%, transparent)",
                        background:
                          q.status === "in_play"
                            ? "color-mix(in srgb, var(--brand-050) 40%, var(--surface))"
                            : index % 2 === 0
                              ? "var(--surface)"
                              : "color-mix(in srgb, var(--brand-050) 12%, var(--surface))",
                      }}
                    >
                      <td style={{ padding: "12px 14px", fontWeight: 900 }}>{q.label}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 900 }}>{money(q.closed)}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700 }}>{money(q.quota)}</td>
                      <td
                        style={{
                          padding: "12px 14px",
                          fontWeight: 800,
                          color:
                            q.status === "hit"
                              ? "#047857"
                              : q.status === "missed"
                                ? "#b91c1c"
                                : q.status === "in_play"
                                  ? "#b45309"
                                  : "var(--muted)",
                        }}
                      >
                        {quarterStatusCopy(q)}
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--muted)", fontWeight: 700 }}>{quarterIsaCopy(q)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      {view && tab === "entry" ? (
        <section style={styles.section}>
          <div style={styles.sectionHead}>
            <div>
              <h2 style={styles.sectionTitle}>Enter monthly actuals</h2>
              <p style={styles.sectionCaption}>
                RGV and Laredo manufacturer totals for {view.year}. Save a month when you have an update. Blank is
                not the same as $0.
              </p>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "color-mix(in srgb, var(--brand-050) 55%, var(--surface))" }}>
                  {["Month", "Quota", "RGV", "Laredo", "Closed", "Vs quota", "Source", ""].map((h) => (
                    <th
                      key={h || "save"}
                      style={{
                        padding: "10px 14px",
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
                {view.months.map((month, index) => {
                  const draft = drafts[month.month] ?? { rgv: "", laredo: "" };
                  const dirty =
                    String(month.rgv ?? "") !== draft.rgv.trim() || String(month.laredo ?? "") !== draft.laredo.trim();
                  return (
                    <tr
                      key={month.month}
                      style={{
                        borderTop: "1px solid color-mix(in srgb, var(--border) 75%, transparent)",
                        background: month.isCurrent
                          ? "color-mix(in srgb, var(--brand-050) 55%, transparent)"
                          : index % 2 === 0
                            ? "var(--surface)"
                            : "color-mix(in srgb, var(--brand-050) 12%, var(--surface))",
                      }}
                    >
                      <td style={{ padding: "10px 14px", fontWeight: 800 }}>
                        {month.label}
                        {month.isCurrent ? (
                          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>This month</div>
                        ) : null}
                      </td>
                      <td style={{ padding: "10px 14px", fontWeight: 700 }}>{money(month.quota)}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <MoneyInput
                          value={draft.rgv}
                          ariaLabel={`${month.label} RGV`}
                          onChange={(value) =>
                            setDrafts((prev) => ({ ...prev, [month.month]: { ...draft, rgv: value } }))
                          }
                        />
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <MoneyInput
                          value={draft.laredo}
                          ariaLabel={`${month.label} Laredo`}
                          onChange={(value) =>
                            setDrafts((prev) => ({ ...prev, [month.month]: { ...draft, laredo: value } }))
                          }
                        />
                      </td>
                      <td style={{ padding: "10px 14px", fontWeight: 800 }}>{money(month.closed)}</td>
                      <td
                        style={{
                          padding: "10px 14px",
                          fontWeight: 800,
                          color:
                            month.variance == null
                              ? "var(--muted)"
                              : month.variance >= 0
                                ? "rgb(4, 120, 87)"
                                : "rgb(185, 28, 28)",
                        }}
                      >
                        {month.variance == null
                          ? "—"
                          : `${month.variance >= 0 ? "+" : "−"}${money(Math.abs(month.variance)).replace("$", "")}`}
                      </td>
                      <td style={{ padding: "10px 14px", color: "var(--muted)", fontWeight: 700 }}>
                        {sourceLabel(month.source)}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>
                        <button
                          type="button"
                          disabled={savingMonth === month.month || !dirty}
                          onClick={() => void saveMonth(month)}
                          style={{
                            padding: "7px 12px",
                            borderRadius: 8,
                            border: "1px solid var(--border)",
                            background: dirty ? "var(--brand-050)" : "transparent",
                            fontWeight: 800,
                            fontSize: 12,
                            cursor: dirty ? "pointer" : "default",
                            opacity: dirty ? 1 : 0.45,
                          }}
                        >
                          {savingMonth === month.month ? "Saving…" : "Save"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function YearPill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 999,
        border: "1px solid",
        borderColor: active ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.14)",
        background: active ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.04)",
        color: "rgba(255,255,255,0.92)",
        fontWeight: 800,
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
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
      }}
    >
      {label}
    </button>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "up" | "down" | "warn";
}) {
  const color = tone === "up" ? "#047857" : tone === "down" ? "#b91c1c" : tone === "warn" ? "#b45309" : undefined;
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
      <div style={{ marginTop: 6, fontSize: 28, fontWeight: 950, letterSpacing: "-0.03em", color }}>{value}</div>
      {hint ? <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, lineHeight: 1.4 }}>{hint}</div> : null}
    </div>
  );
}

function QuarterProgress({ closed, quota }: { closed: number; quota: number }) {
  const share = quota > 0 ? closed / quota : 0;
  const width = `${Math.min(100, Math.max(0, share * 100))}%`;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
        <span>
          {money(closed)} closed of {money(quota)}
        </span>
        <span style={{ color: share >= 1 ? "#047857" : "var(--muted)" }}>{pct(share)}</span>
      </div>
      <div
        style={{
          height: 12,
          borderRadius: 999,
          background: "color-mix(in srgb, var(--foreground) 8%, var(--surface))",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width,
            height: "100%",
            background: share >= 1 ? "#047857" : "var(--brand-600)",
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}

function MoneyInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <input
      aria-label={ariaLabel}
      inputMode="decimal"
      value={value}
      placeholder="—"
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: 110,
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid var(--border)",
        fontWeight: 700,
      }}
    />
  );
}
