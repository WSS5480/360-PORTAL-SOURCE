"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { SalesCmdLink, SalesCommandPage, SalesMetricCard, SalesPanel, sc } from "@/components/sales/salesCommandUi";
import { userFacingError } from "@/lib/errors/userFacingError";
import type { RevenuePipelineCaseRow, RevenuePipelineSummary } from "@/lib/surgical-sales/caseRevenuePipeline";
import type { RevenuePipelineScope } from "@/lib/surgical-sales/revenuePipelineScope";

type PipelineJson = {
  ok: boolean;
  scope?: RevenuePipelineScope;
  can_view_team?: boolean;
  summary?: RevenuePipelineSummary;
  upcoming_cases?: RevenuePipelineCaseRow[];
  booked_cases?: RevenuePipelineCaseRow[];
  error?: string;
};

function money(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
}

function fmtDate(ymd: string | null): string {
  if (!ymd) return "Date TBD";
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function sourceLabel(row: RevenuePipelineCaseRow): string | null {
  if (row.revenue_source === "actual") return "Actual";
  if (row.revenue_source === "expected") return "From case estimate";
  return "Add revenue on the case";
}

function CaseRevenueRow({ row, showRep }: { row: RevenuePipelineCaseRow; showRep: boolean }) {
  const title = row.account_name || row.case_number || "Untitled case";
  const meta = [
    showRep ? row.sales_rep_display : null,
    row.surgeon_display,
    row.product_name || row.procedure_type,
    fmtDate(row.case_date),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="sales-rev-pipe-row">
      <Link href={row.href}>
        <span>
          <strong>{title}</strong>
          <small>{meta}</small>
        </span>
        <em>
          <b>{row.amount > 0 ? money(row.amount) : "—"}</b>
          <small>{sourceLabel(row)}</small>
        </em>
      </Link>
    </li>
  );
}

export default function SalesRevenuePipelineClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedScope = searchParams.get("scope");
  const [busy, setBusy] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [canViewTeam, setCanViewTeam] = React.useState(false);
  const [scope, setScope] = React.useState<RevenuePipelineScope>("mine");
  const [summary, setSummary] = React.useState<RevenuePipelineSummary | null>(null);
  const [upcoming, setUpcoming] = React.useState<RevenuePipelineCaseRow[]>([]);
  const [booked, setBooked] = React.useState<RevenuePipelineCaseRow[]>([]);
  const [bookedScope, setBookedScope] = React.useState<"month" | "quarter" | "ytd">("month");

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setBusy(true);
      setErr(null);
      try {
        const qs =
          requestedScope === "mine" || requestedScope === "team" ? `?scope=${requestedScope}` : "";
        const res = await fetch(`/api/portal/sales/revenue-pipeline${qs}`, { cache: "no-store" });
        const j = (await res.json()) as PipelineJson;
        if (!j.ok) throw new Error(j.error || "");
        if (cancelled) return;
        setCanViewTeam(j.can_view_team === true);
        setScope(j.scope === "team" ? "team" : "mine");
        setSummary(j.summary ?? null);
        setUpcoming(j.upcoming_cases ?? []);
        setBooked(j.booked_cases ?? []);
      } catch (e) {
        if (!cancelled) setErr(userFacingError(e, "We could not load your pipeline. Please try again."));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestedScope]);

  const setPipelineScope = (next: RevenuePipelineScope) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("scope", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const qStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
  const quarterStart = `${year}-${String(qStartMonth).padStart(2, "0")}-01`;
  const yearStart = `${year}-01-01`;

  const bookedFiltered = booked.filter((row) => {
    const d = row.case_date;
    if (!d) return bookedScope === "ytd";
    if (bookedScope === "month") return d >= monthStart && d <= today;
    if (bookedScope === "quarter") return d >= quarterStart && d <= today;
    return d >= yearStart && d <= today;
  });

  const teamView = canViewTeam && scope === "team";

  return (
    <SalesCommandPage
      title="Pipeline"
      subtitle={
        teamView
          ? "Booked and upcoming revenue for you and the reps on your roster. Per-case estimates fill booked automatically when a case is completed."
          : "Booked revenue from completed cases, plus expected revenue still on the calendar. Per-case estimates fill booked automatically when a case is completed."
      }
      actions={
        canViewTeam ? (
          <div className="sales-rev-pipe-scopes sales-rev-pipe-view-toggle" role="tablist" aria-label="Pipeline view">
            {(
              [
                ["mine", "My pipeline"],
                ["team", "Team"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={scope === id}
                className={`sales-rev-pipe-scope${scope === id ? " sales-rev-pipe-scope--active" : ""}`}
                onClick={() => setPipelineScope(id)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : undefined
      }
    >
      <div className="sales-rev-pipe-page">
        {err ? <div style={sc.alertError}>{err}</div> : null}
        {busy ? <div style={{ color: "var(--muted)", fontWeight: 650 }}>Loading pipeline…</div> : null}

        {!busy && !err && summary ? (
          <>
            <section className="sales-rev-pipe-metrics" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
              <SalesMetricCard
                label={teamView ? "Team booked this month" : "Booked this month"}
                value={money(summary.booked_month)}
                hint={`${summary.booked_month_case_count} completed`}
              />
              <SalesMetricCard label={teamView ? "Team booked this quarter" : "Booked this quarter"} value={money(summary.booked_quarter)} />
              <SalesMetricCard label={teamView ? "Team booked YTD" : "Booked YTD"} value={money(summary.booked_ytd)} />
              <SalesMetricCard
                label={teamView ? "Team upcoming" : "Upcoming pipeline"}
                value={money(summary.upcoming)}
                hint={`${summary.upcoming_case_count} scheduled`}
              />
            </section>

            {summary.missing_revenue_count > 0 ? (
              <p className="sales-rev-pipe-hint">
                {summary.missing_revenue_count === 1
                  ? "1 case is missing a revenue amount."
                  : `${summary.missing_revenue_count} cases are missing a revenue amount.`}{" "}
                Open the case and enter Revenue per case so it rolls into these totals.
              </p>
            ) : null}

            <div className="sales-rev-pipe-grid">
              <SalesPanel
                title="Upcoming pipeline"
                density="compact"
                description={
                  teamView
                    ? "Scheduled cases on your roster. Totals use the expected amount on each case."
                    : "Scheduled cases. Totals use the expected amount on each case."
                }
              >
                {upcoming.length === 0 ? (
                  <div className="sales-rev-pipe-empty">
                    <strong>No upcoming revenue cases</strong>
                    <p>Product support cases on the calendar with an expected amount show here.</p>
                    <SalesCmdLink href="/portal/sales/cases/new?case_type=product_support" variant="primary">
                      Add case
                    </SalesCmdLink>
                  </div>
                ) : (
                  <ul className="sales-rev-pipe-list">
                    {upcoming.map((row) => (
                      <CaseRevenueRow key={row.id} row={row} showRep={teamView} />
                    ))}
                  </ul>
                )}
              </SalesPanel>

              <SalesPanel
                title="Booked revenue"
                density="compact"
                description="Completed cases. Uses actual if entered, otherwise the case estimate."
              >
                <div className="sales-rev-pipe-scopes" role="tablist" aria-label="Booked period">
                  {(
                    [
                      ["month", "This month"],
                      ["quarter", "Quarter"],
                      ["ytd", "YTD"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={bookedScope === id}
                      className={`sales-rev-pipe-scope${bookedScope === id ? " sales-rev-pipe-scope--active" : ""}`}
                      onClick={() => setBookedScope(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {bookedFiltered.length === 0 ? (
                  <div className="sales-rev-pipe-empty">
                    <strong>No booked revenue in this period</strong>
                    <p>When you complete a case, its per-case revenue populates this list automatically.</p>
                    <Link href="/portal/sales/cases" style={sc.linkBrandAction}>
                      View cases →
                    </Link>
                  </div>
                ) : (
                  <ul className="sales-rev-pipe-list">
                    {bookedFiltered.map((row) => (
                      <CaseRevenueRow key={row.id} row={row} showRep={teamView} />
                    ))}
                  </ul>
                )}
              </SalesPanel>
            </div>
          </>
        ) : null}
      </div>
    </SalesCommandPage>
  );
}
