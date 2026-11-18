"use client";

import Link from "next/link";
import React from "react";
import { QuickAddSurgicalCasePanel } from "@/components/sales/QuickAddSurgicalCasePanel";
import { SalesCmdLink, SalesCommandPage, SalesMetricCard, SalesPanel, sc } from "@/components/sales/salesCommandUi";
import { formatSurgicalCaseStatus } from "@/lib/surgical-sales/labels";
import { formatEngagementWhenLabel } from "@/lib/surgical-sales/engagements/engagementScheduleDisplay";
import { userFacingError } from "@/lib/errors/userFacingError";

type DashboardJson = {
  ok: boolean;
  metrics?: {
    open_deal_count?: number;
    overdue_task_count?: number;
  };
  error?: string;
};

type UpcomingEngagement = {
  id: string;
  title?: string | null;
  engagement_type_label: string;
  status_label: string;
  provider_id: string;
  provider_name: string;
  organization_name?: string | null;
  engagement_date?: string | null;
  scheduled_at?: string | null;
  pre_call_filled: number;
  pre_call_total: number;
  pre_call_complete: boolean;
};

type UpcomingCase = {
  id: string;
  case_number: string;
  account_name: string;
  provider_name?: string | null;
  case_date?: string | null;
  case_time?: string | null;
  procedure_type?: string | null;
  status: string;
  case_type?: string | null;
};

type SurgicalDashJson = {
  ok: boolean;
  upcoming_this_week?: number;
  cases_needing_documents?: number;
  completed_this_month?: number;
  cases_this_month?: number;
  upcoming_engagements?: UpcomingEngagement[];
  upcoming_cases?: UpcomingCase[];
  operational?: {
    upcoming_48h: number;
    active_accounts: number;
    surgeons_engaged_month: number;
    no_surgeon: number;
    docs_needed_cases: number;
  };
  execution?: {
    cases_needing_action: number;
    observation_debrief_pending: number;
    follow_up_unscheduled: number;
  };
  error?: string;
};

const DASH_CTA = {
  createCase: { href: "/portal/sales/cases/new", label: "Add case" },
  addProvider: { href: "/portal/sales/providers/new", label: "Add provider" },
  newEngagement: { href: "/portal/sales/engagements/new", label: "Add engagement" },
  cases: { href: "/portal/sales/cases", label: "View cases" },
  providers: { href: "/portal/sales/providers", label: "View providers" },
} as const;

function formatCaseWhen(caseDate?: string | null, caseTime?: string | null): string {
  if (!caseDate) return "Date TBD";
  const d = new Date(`${caseDate}T12:00:00Z`);
  const dateLabel = Number.isFinite(d.getTime())
    ? d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
    : caseDate;
  if (!caseTime) return dateLabel;
  const [hh, mm] = caseTime.split(":");
  const h = Number(hh);
  const m = Number(mm ?? "0");
  if (!Number.isFinite(h) || !Number.isFinite(m)) return dateLabel;
  const time = new Date(Date.UTC(2000, 0, 1, h, m)).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dateLabel} · ${time}`;
}

function formatEngagementWhen(e: UpcomingEngagement): string {
  return formatEngagementWhenLabel({
    engagement_date: e.engagement_date ?? null,
    scheduled_at: e.scheduled_at ?? null,
  });
}

function EmptyState({
  title,
  body,
  actions,
}: {
  title: string;
  body: string;
  actions: ReadonlyArray<{ href: string; label: string }>;
}) {
  return (
    <div className="sales-overview-empty" role="status">
      <strong>{title}</strong>
      <p>{body}</p>
      <div>
        {actions.map((a) => (
          <Link key={`${a.href}-${a.label}`} href={a.href} style={sc.btnGhost}>
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function OverviewRow({
  href,
  title,
  meta,
  badge,
}: {
  href: string;
  title: string;
  meta: React.ReactNode;
  badge?: string;
}) {
  return (
    <li className="sales-overview-row">
      <Link href={href}>
        <span>
          <strong>{title}</strong>
          <small>{meta}</small>
        </span>
        {badge ? <em>{badge}</em> : null}
      </Link>
    </li>
  );
}

function ActionPanel({
  title,
  body,
  primary,
  secondary,
  children,
}: {
  title: string;
  body: string;
  primary: React.ReactNode;
  secondary: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <SalesPanel title={title} description={body} density="compact">
      <div className="sales-overview-action-panel">
        <div className="sales-overview-action-links">
          {primary}
          {secondary}
        </div>
        <div className="sales-overview-mini-kpis">{children}</div>
      </div>
    </SalesPanel>
  );
}

export default function SalesDashboardContent() {
  const [dash, setDash] = React.useState<DashboardJson | null>(null);
  const [surg, setSurg] = React.useState<SurgicalDashJson | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = React.useState(false);
  const [surgicalReloadTick, setSurgicalReloadTick] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setErr(null);
      try {
        const [dashRes, surgRes] = await Promise.all([
          fetch("/api/portal/sales/dashboard", { cache: "no-store" }),
          fetch("/api/portal/sales/surgical-dashboard", { cache: "no-store" }),
        ]);
        const dashJson = (await dashRes.json()) as DashboardJson;
        const surgJson = (await surgRes.json()) as SurgicalDashJson;
        if (cancelled) return;
        setDash(dashJson);
        setSurg(surgJson);
        if (!dashJson.ok) setErr(dashJson.error || "Could not load sales dashboard");
        else if (!surgJson.ok) setErr(surgJson.error || "Could not load surgical dashboard");
      } catch (e) {
        if (!cancelled) setErr(userFacingError(e, "Could not load dashboard"));
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [surgicalReloadTick]);

  const upcomingEngagements = surg?.upcoming_engagements ?? [];
  const upcomingCases = surg?.upcoming_cases ?? [];
  const op = surg?.operational;
  const execution = surg?.execution;
  const metrics = dash?.metrics;

  const actions = (
    <>
      <SalesCmdLink href={DASH_CTA.addProvider.href} variant="secondary">
        {DASH_CTA.addProvider.label}
      </SalesCmdLink>
      <button type="button" onClick={() => setQuickAddOpen(true)} style={sc.btnPrimary}>
        {DASH_CTA.createCase.label}
      </button>
    </>
  );

  return (
    <SalesCommandPage
      title="Sales command overview"
      subtitle="A simple starting point for the next cases, provider touches, and field work."
      actions={actions}
      kicker="Sales Command"
      density="tight"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
.sales-overview-page {
  min-width: 0;
}
@media (max-width: 1024px) {
  body:has(.sales-mobile-action-bar-shell) .sales-overview-page {
    padding-bottom: calc(68px + env(safe-area-inset-bottom, 0px));
  }
}
.surgical-cmd-header {
  position: relative;
  overflow: hidden;
  padding: clamp(16px, 3vw, 22px);
  border-radius: 26px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  background:
    radial-gradient(680px 220px at 0% -18%, color-mix(in srgb, var(--brand-600) 16%, transparent), transparent 64%),
    radial-gradient(520px 220px at 100% 0%, color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 14%, transparent), transparent 62%),
    radial-gradient(360px 180px at 58% 0%, color-mix(in srgb, #8b5cf6 9%, transparent), transparent 62%),
    linear-gradient(160deg, color-mix(in srgb, var(--surface) 94%, white) 0%, color-mix(in srgb, var(--surface-2) 70%, var(--surface)) 100%);
  box-shadow:
    0 20px 54px color-mix(in srgb, var(--crm-navy, var(--foreground)) 10%, transparent),
    inset 0 1px 0 color-mix(in srgb, white 78%, transparent);
}
.surgical-cmd-header::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(115deg, transparent 0 34%, color-mix(in srgb, white 18%, transparent) 45%, transparent 56%),
    repeating-linear-gradient(-12deg, transparent 0 18px, color-mix(in srgb, var(--brand-600) 3%, transparent) 18px 19px);
  opacity: 0.42;
  pointer-events: none;
}
.surgical-cmd-header::after {
  content: "";
  position: absolute;
  right: clamp(16px, 4vw, 44px);
  bottom: -40px;
  width: 150px;
  height: 150px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 34% 30%, color-mix(in srgb, white 80%, transparent) 0 10%, transparent 11%),
    linear-gradient(145deg, color-mix(in srgb, var(--brand-600) 22%, transparent), color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 18%, transparent));
  opacity: 0.38;
  filter: blur(1px);
  pointer-events: none;
}
.surgical-cmd-header > * {
  position: relative;
  z-index: 1;
}
.surgical-cmd-header-main h1 {
  text-wrap: balance;
}
.sales-overview-shell {
  display: grid;
  gap: 16px;
  position: relative;
}
.sales-overview-kpis {
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr;
}
@media (min-width: 480px) {
  .sales-overview-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 780px) {
  .sales-overview-kpis {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
.sales-overview-two {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;
}
@media (min-width: 980px) {
  .sales-overview-two {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}
.sales-overview-list {
  display: grid;
  gap: 9px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.sales-overview-kpis > a,
.sales-overview-kpis > div {
  position: relative;
  overflow: hidden;
  border-radius: 18px !important;
  border-color: color-mix(in srgb, var(--brand-600) 18%, var(--border)) !important;
  background:
    radial-gradient(220px 90px at 14% 0%, color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 16%, transparent), transparent 66%),
    radial-gradient(180px 90px at 94% 20%, color-mix(in srgb, #8b5cf6 10%, transparent), transparent 62%),
    linear-gradient(155deg, color-mix(in srgb, var(--surface) 92%, white) 0%, color-mix(in srgb, var(--brand-600) 5%, var(--surface)) 100%) !important;
  padding: 13px 14px 14px !important;
  box-shadow:
    0 12px 30px color-mix(in srgb, var(--crm-navy, var(--foreground)) 8%, transparent),
    inset 0 1px 0 color-mix(in srgb, white 74%, transparent) !important;
}
.sales-overview-kpis > a::after,
.sales-overview-kpis > div::after {
  content: "";
  position: absolute;
  inset: auto 12px 10px auto;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 34% 30%, color-mix(in srgb, white 90%, transparent) 0 18%, transparent 19%),
    linear-gradient(145deg, color-mix(in srgb, var(--brand-600) 22%, transparent), color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 18%, transparent));
  opacity: 0.42;
  pointer-events: none;
}
.sales-overview-two > section {
  position: relative;
  overflow: hidden;
  border-radius: 22px !important;
  border-color: color-mix(in srgb, var(--brand-600) 14%, var(--border)) !important;
  background:
    radial-gradient(520px 160px at 0% -10%, color-mix(in srgb, var(--brand-600) 10%, transparent), transparent 62%),
    radial-gradient(420px 150px at 100% 0%, color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 9%, transparent), transparent 60%),
    linear-gradient(160deg, color-mix(in srgb, var(--surface) 96%, white) 0%, color-mix(in srgb, var(--surface-2) 54%, var(--surface)) 100%) !important;
  padding: 14px !important;
  box-shadow:
    0 16px 42px color-mix(in srgb, var(--crm-navy, var(--foreground)) 9%, transparent),
    inset 0 1px 0 color-mix(in srgb, white 74%, transparent) !important;
}
.sales-overview-two > section::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: linear-gradient(90deg, var(--brand-600), var(--crm-cyan-bright, #22d3ee), #8b5cf6);
  opacity: 0.84;
  pointer-events: none;
}
.sales-overview-row a {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  padding: 12px 13px 12px 14px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 12%, var(--border));
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--surface) 93%, white) 0%, color-mix(in srgb, var(--brand-600) 3%, var(--surface)) 100%);
  color: inherit;
  text-decoration: none;
  box-shadow: 0 7px 18px color-mix(in srgb, var(--foreground) 4%, transparent);
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
}
.sales-overview-row a > div:first-child {
  min-width: 0;
  flex: 1 1 auto;
}
.sales-overview-row span {
  overflow-wrap: anywhere;
  word-break: break-word;
}
.sales-overview-row a::before {
  content: "";
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--brand-600), var(--crm-cyan-bright, #22d3ee));
  opacity: 0.72;
}
@media (hover: hover) and (pointer: fine) {
  .sales-overview-row a:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--brand-600) 30%, var(--border));
    box-shadow: 0 14px 30px color-mix(in srgb, var(--brand-600) 10%, transparent);
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--surface) 91%, white) 0%, color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 6%, var(--surface)) 100%);
  }
}
.sales-overview-row strong {
  display: block;
  font-size: 13.5px;
  letter-spacing: -0.02em;
  color: var(--foreground);
}
.sales-overview-row small {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  line-height: 1.35;
  color: var(--muted);
  font-weight: 600;
}
.sales-overview-row em {
  flex: 0 0 auto;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 25%, var(--border));
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--brand-600) 10%, var(--surface)), color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 8%, var(--surface)));
  color: var(--brand-700);
  font-size: 11px;
  font-style: normal;
  font-weight: 800;
  padding: 4px 9px;
  white-space: nowrap;
  box-shadow: inset 0 1px 0 color-mix(in srgb, white 72%, transparent);
}
.sales-overview-empty {
  border-radius: 16px;
  border: 1px dashed color-mix(in srgb, var(--brand-600) 34%, var(--border));
  background:
    radial-gradient(360px 130px at 50% 0%, color-mix(in srgb, var(--brand-600) 10%, transparent), transparent 64%),
    color-mix(in srgb, var(--brand-600) 4%, var(--surface));
  padding: 14px;
}
.sales-overview-empty strong {
  display: block;
  font-size: 13px;
  color: var(--foreground);
}
.sales-overview-empty p {
  margin: 5px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--muted);
}
.sales-overview-empty div {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.sales-overview-action-panel {
  display: grid;
  gap: 12px;
}
.sales-overview-action-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.sales-overview-mini-kpis {
  display: grid;
  gap: 9px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.sales-overview-mini-kpi {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 12%, var(--border));
  background:
    radial-gradient(120px 70px at 100% 0%, color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 12%, transparent), transparent 62%),
    color-mix(in srgb, var(--surface-2) 50%, var(--surface));
  padding: 11px;
  box-shadow: inset 0 1px 0 color-mix(in srgb, white 68%, transparent);
}
.sales-overview-mini-kpi strong {
  display: block;
  font-size: 21px;
  line-height: 1;
  color: color-mix(in srgb, var(--foreground) 88%, var(--brand-700));
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.035em;
}
.sales-overview-mini-kpi span {
  display: block;
  margin-top: 5px;
  font-size: 11px;
  color: var(--muted);
  font-weight: 650;
}
@media (max-width: 560px) {
  .surgical-cmd-header {
    border-radius: 20px;
    padding: 16px;
  }
  .sales-overview-mini-kpis {
    grid-template-columns: 1fr;
  }
  .sales-overview-row a {
    flex-direction: column;
    gap: 8px;
  }
  .sales-overview-row em {
    align-self: flex-start;
  }
}
`,
        }}
      />

      {err ? (
        <div role="alert" style={sc.alertError}>
          {err}
        </div>
      ) : null}

      <div className="sales-overview-shell sales-overview-page">
        <section className="sales-overview-kpis" aria-label="Sales overview KPIs">
          <SalesMetricCard
            size="compact"
            label="Upcoming cases"
            value={surg ? String(surg.upcoming_this_week ?? 0) : "—"}
            hint="Scheduled or confirmed this week"
            href="/portal/sales/cases"
          />
          <SalesMetricCard
            size="compact"
            label="Upcoming engagements"
            value={surg ? String(upcomingEngagements.length) : "—"}
            hint="Calls, visits, and observations"
            href="/portal/sales/engagements"
          />
          <SalesMetricCard
            size="compact"
            label="Providers engaged"
            value={op ? String(op.surgeons_engaged_month ?? 0) : "—"}
            hint="Distinct providers this month"
            href="/portal/sales/providers"
          />
          <SalesMetricCard
            size="compact"
            tone={(execution?.cases_needing_action ?? 0) > 0 ? "caution" : "default"}
            label="Needs action"
            value={execution ? String(execution.cases_needing_action ?? 0) : "—"}
            hint="Debriefs, follow-ups, or readiness"
            href="/portal/sales/cases"
          />
        </section>

        <div className="sales-overview-two">
          <SalesPanel
            title="Upcoming engagements"
            description="Pre-call plans and provider touches coming up next."
            density="compact"
            headerExtra={
              <Link href="/portal/sales/engagements" style={sc.linkBrandAction}>
                View all
              </Link>
            }
          >
            {upcomingEngagements.length === 0 ? (
              <EmptyState
                title="No upcoming engagements"
                body="Add the next provider call, visit, or observation so prep has a home."
                actions={[DASH_CTA.newEngagement, DASH_CTA.addProvider]}
              />
            ) : (
              <ul className="sales-overview-list">
                {upcomingEngagements.slice(0, 6).map((e) => {
                  const title = e.title?.trim() || e.engagement_type_label;
                  const planLabel = e.pre_call_complete
                    ? "Plan complete"
                    : e.pre_call_filled > 0
                      ? `Plan ${e.pre_call_filled}/${e.pre_call_total}`
                      : "Plan not started";
                  return (
                    <OverviewRow
                      key={e.id}
                      href={`/portal/sales/engagements/${encodeURIComponent(e.id)}`}
                      title={title}
                      meta={
                        <>
                          {formatEngagementWhen(e)} · {e.provider_name}
                          {e.organization_name ? ` · ${e.organization_name}` : ""}
                        </>
                      }
                      badge={planLabel}
                    />
                  );
                })}
              </ul>
            )}
          </SalesPanel>

          <SalesPanel
            title="Upcoming cases"
            description="Scheduled and confirmed cases to prepare for."
            density="compact"
            headerExtra={
              <Link href="/portal/sales/cases" style={sc.linkBrandAction}>
                View all
              </Link>
            }
          >
            {upcomingCases.length === 0 ? (
              <EmptyState
                title="No upcoming cases"
                body="Add a case when a procedure, observation, or product support date is known."
                actions={[DASH_CTA.createCase, DASH_CTA.cases]}
              />
            ) : (
              <ul className="sales-overview-list">
                {upcomingCases.slice(0, 6).map((c) => (
                  <OverviewRow
                    key={c.id}
                    href={`/portal/sales/cases/${encodeURIComponent(c.id)}`}
                    title={`${c.case_number}${c.procedure_type ? ` · ${c.procedure_type}` : ""}`}
                    meta={
                      <>
                        {formatCaseWhen(c.case_date, c.case_time)} · {c.provider_name || "No provider"} · {c.account_name}
                      </>
                    }
                    badge={formatSurgicalCaseStatus(c.status)}
                  />
                ))}
              </ul>
            )}
          </SalesPanel>
        </div>

        <div className="sales-overview-two">
          <ActionPanel
            title="Add case"
            body="Capture the next scheduled case quickly, then fill in products and details as they become known."
            primary={
              <button type="button" onClick={() => setQuickAddOpen(true)} style={sc.btnPrimary}>
                Quick add case
              </button>
            }
            secondary={
              <SalesCmdLink href={DASH_CTA.cases.href} variant="secondary">
                {DASH_CTA.cases.label}
              </SalesCmdLink>
            }
          >
            <div className="sales-overview-mini-kpi">
              <strong>{op ? String(op.upcoming_48h ?? 0) : "—"}</strong>
              <span>Cases in next 48 hours</span>
            </div>
            <div className="sales-overview-mini-kpi">
              <strong>{surg ? String(surg.cases_needing_documents ?? 0) : "—"}</strong>
              <span>Need documents</span>
            </div>
            <div className="sales-overview-mini-kpi">
              <strong>{surg ? String(surg.completed_this_month ?? 0) : "—"}</strong>
              <span>Completed this month</span>
            </div>
            <div className="sales-overview-mini-kpi">
              <strong>{surg ? String(surg.cases_this_month ?? 0) : "—"}</strong>
              <span>Total cases this month</span>
            </div>
          </ActionPanel>

          <ActionPanel
            title="Add provider"
            body="Start a provider record before linking engagements, cases, and follow-up work."
            primary={
              <SalesCmdLink href={DASH_CTA.addProvider.href} variant="primary">
                {DASH_CTA.addProvider.label}
              </SalesCmdLink>
            }
            secondary={
              <SalesCmdLink href={DASH_CTA.providers.href} variant="secondary">
                {DASH_CTA.providers.label}
              </SalesCmdLink>
            }
          >
            <div className="sales-overview-mini-kpi">
              <strong>{op ? String(op.surgeons_engaged_month ?? 0) : "—"}</strong>
              <span>Providers with cases this month</span>
            </div>
            <div className="sales-overview-mini-kpi">
              <strong>{op ? String(op.no_surgeon ?? 0) : "—"}</strong>
              <span>Active cases missing provider</span>
            </div>
            <div className="sales-overview-mini-kpi">
              <strong>{op ? String(op.active_accounts ?? 0) : "—"}</strong>
              <span>Active organizations</span>
            </div>
            <div className="sales-overview-mini-kpi">
              <strong>{metrics?.open_deal_count != null ? String(metrics.open_deal_count) : "—"}</strong>
              <span>Open opportunities</span>
            </div>
          </ActionPanel>
        </div>
      </div>

      <QuickAddSurgicalCasePanel
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onCreated={() => setSurgicalReloadTick((t) => t + 1)}
      />
    </SalesCommandPage>
  );
}
