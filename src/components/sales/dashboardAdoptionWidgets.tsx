"use client";

import Link from "next/link";
import React from "react";
import { crmListRowCardStyle } from "@/components/sales/crmUi";
import { SalesPanel, sc } from "@/components/sales/salesCommandUi";
import type {
  DashboardAdoptionWidgets,
  DashboardFollowUpItem,
  DashboardOppWidgetItem,
  DashboardProviderProspectItem,
} from "@/lib/sales/buildDashboardAdoptionWidgets";
import { adoptionWidgetStageChip } from "@/lib/sales/buildDashboardAdoptionWidgets";
import { salesStageStyle } from "@/lib/sales/stages";

const denseRow: React.CSSProperties = {
  ...crmListRowCardStyle,
  padding: "6px 9px",
  fontSize: 12,
  lineHeight: 1.35,
};

function OppDenseRow({ item, meta }: { item: DashboardOppWidgetItem; meta?: React.ReactNode }) {
  const st = salesStageStyle(item.stage);
  const href = `/portal/sales/opportunities/${encodeURIComponent(item.id)}`;
  const provider = item.physician_name?.trim() || "No provider";
  const product = item.product_line?.trim();

  return (
    <li style={denseRow}>
      <Link
        href={href}
        style={{
          display: "flex",
          alignItems: "center",
          minHeight: 44,
          fontWeight: 750,
          color: "var(--foreground)",
          textDecoration: "none",
        }}
      >
        <span style={{ display: "flex", flex: 1, minWidth: 0, alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 12 }}>{provider}</span>
            <span style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", marginTop: 1 }}>
              {item.account_name}
              {product ? ` · ${product}` : ""}
            </span>
          </span>
          <span
            style={{
              flexShrink: 0,
              fontSize: 11,
              fontWeight: 800,
              padding: "2px 6px",
              borderRadius: 999,
              background: st.bg,
              color: st.fg,
              border: `1px solid ${st.border}`,
            }}
          >
            {adoptionWidgetStageChip(item.stage)}
          </span>
        </span>
      </Link>
      {item.next_action ? (
        <div style={{ marginTop: 3, fontSize: 11, color: "var(--brand-700)", fontWeight: 650 }}>Next: {item.next_action}</div>
      ) : null}
      {meta}
    </li>
  );
}

function FollowUpRow({ item }: { item: DashboardFollowUpItem }) {
  return (
    <OppDenseRow
      item={item}
      meta={
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 3 }}>
          {item.reasons.map((r) => (
            <span
              key={r}
              style={{
                fontSize: 11,
                fontWeight: 750,
                padding: "1px 6px",
                borderRadius: 999,
                border: "1px solid color-mix(in srgb, #d97706 28%, var(--border))",
                color: "#b45309",
                background: "color-mix(in srgb, #f59e0b 10%, var(--surface))",
              }}
            >
              {r}
            </span>
          ))}
        </div>
      }
    />
  );
}

function ProviderProspectRow({ item }: { item: DashboardProviderProspectItem }) {
  const href = `/portal/sales/providers/${encodeURIComponent(item.id)}`;
  return (
    <li style={denseRow}>
      <Link
        href={href}
        style={{ display: "inline-flex", alignItems: "center", minHeight: 44, fontWeight: 750, color: "var(--foreground)", textDecoration: "none" }}
      >
        {item.display_name}
      </Link>
      <div style={{ marginTop: 2, fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
        {item.organization_name || "No organization"}
        {" · "}
        <Link
          href={`/portal/sales/opportunities?new=1&provider_id=${encodeURIComponent(item.id)}`}
          style={{ ...sc.linkBrand, fontSize: 11, fontWeight: 700 }}
        >
          Start opportunity →
        </Link>
      </div>
    </li>
  );
}

function WidgetEmpty({ body, href, label }: { body: string; href: string; label: string }) {
  return (
    <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", lineHeight: 1.45 }}>
      {body}{" "}
      <Link href={href} style={{ ...sc.linkBrand, fontWeight: 700 }}>
        {label}
      </Link>
    </p>
  );
}

export type UpcomingEngagementRow = {
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

function EngagementDenseRow({ row, whenLabel }: { row: UpcomingEngagementRow; whenLabel: string }) {
  const label = row.title?.trim() || row.engagement_type_label;
  const planLabel = row.pre_call_complete
    ? "Plan complete"
    : row.pre_call_filled > 0
      ? `Plan ${row.pre_call_filled}/${row.pre_call_total}`
      : "Plan not started";

  return (
    <li style={denseRow}>
      <Link
        href={`/portal/sales/engagements/${encodeURIComponent(row.id)}`}
        style={{ fontWeight: 750, color: "var(--foreground)", textDecoration: "none" }}
      >
        {label}
      </Link>
      <div style={{ marginTop: 2, fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
        {whenLabel}
        {" · "}
        <Link
          href={`/portal/sales/providers/${encodeURIComponent(row.provider_id)}`}
          style={{ color: "var(--brand-700)", textDecoration: "none", fontWeight: 700 }}
        >
          {row.provider_name}
        </Link>
        {row.organization_name ? ` · ${row.organization_name}` : ""}
      </div>
      <div style={{ marginTop: 3, display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)" }}>{row.status_label}</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            padding: "1px 6px",
            borderRadius: 999,
            color: row.pre_call_complete ? "#166534" : "var(--brand-700)",
            border: `1px solid ${row.pre_call_complete ? "color-mix(in srgb, var(--success) 28%, var(--border))" : "color-mix(in srgb, var(--brand-600) 18%, var(--border))"}`,
          }}
        >
          {planLabel}
        </span>
      </div>
    </li>
  );
}

function WidgetList({ children }: { children: React.ReactNode }) {
  return <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}>{children}</ul>;
}

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 800,
        padding: "1px 7px",
        borderRadius: 999,
        background: "color-mix(in srgb, var(--brand-600) 12%, var(--surface))",
        color: "var(--brand-700)",
        border: "1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border))",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {count}
    </span>
  );
}

function HeaderLinks({ count, links }: { count: number; links: Array<{ href: string; label: string }> }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <CountBadge count={count} />
      {links.map((l) => (
        <Link key={l.href} href={l.href} style={{ ...sc.linkBrandAction, fontSize: 11 }}>
          {l.label}
        </Link>
      ))}
    </div>
  );
}

export function DashboardAdoptionWidgetsGrid({
  widgets,
  upcomingEngagements,
  formatEngagementWhen,
}: {
  widgets: DashboardAdoptionWidgets | null;
  upcomingEngagements: UpcomingEngagementRow[];
  formatEngagementWhen: (row: UpcomingEngagementRow) => string;
}) {
  const w = widgets;

  return (
    <section className="sales-dash-adoption-grid" aria-label="Adoption operations">
      <SalesPanel
        title="Active evaluations"
        density="compact"
        headerExtra={
          <HeaderLinks
            count={w?.active_evaluations.count ?? 0}
            links={[{ href: "/portal/sales/opportunities?stage=evaluation_active", label: "All →" }]}
          />
        }
      >
        {!w || w.active_evaluations.items.length === 0 ? (
          <WidgetEmpty
            body="No opportunities in evaluation planned or active."
            href="/portal/sales/opportunities?stage=evaluation_planned"
            label="View pipeline"
          />
        ) : (
          <WidgetList>
            {w.active_evaluations.items.map((item) => (
              <OppDenseRow key={item.id} item={item} />
            ))}
          </WidgetList>
        )}
      </SalesPanel>

      <SalesPanel
        title="Opportunities needing follow-up"
        density="compact"
        headerExtra={
          <HeaderLinks
            count={w?.needing_follow_up.count ?? 0}
            links={[{ href: "/portal/sales/opportunities?cold=1", label: "Cold →" }]}
          />
        }
      >
        {!w || w.needing_follow_up.items.length === 0 ? (
          <WidgetEmpty body="No open opportunities flagged for follow-up." href="/portal/sales/opportunities" label="Pipeline" />
        ) : (
          <WidgetList>
            {w.needing_follow_up.items.map((item) => (
              <FollowUpRow key={item.id} item={item} />
            ))}
          </WidgetList>
        )}
      </SalesPanel>

      <SalesPanel
        title="Preference card progress"
        density="compact"
        headerExtra={
          <HeaderLinks
            count={w?.preference_card_progress.count ?? 0}
            links={[{ href: "/portal/sales/opportunities?stage=preference_card_progress", label: "All →" }]}
          />
        }
      >
        {!w || w.preference_card_progress.items.length === 0 ? (
          <WidgetEmpty
            body="No opportunities in preference card progress."
            href="/portal/sales/opportunities?stage=preference_card_progress"
            label="View stage"
          />
        ) : (
          <WidgetList>
            {w.preference_card_progress.items.map((item) => (
              <OppDenseRow key={item.id} item={item} />
            ))}
          </WidgetList>
        )}
      </SalesPanel>

      <SalesPanel
        title="Prospects without opportunity"
        density="compact"
        description="New provider prospects with no related evaluation."
        headerExtra={
          <HeaderLinks
            count={w?.provider_prospects_without_opportunity.count ?? 0}
            links={[{ href: "/portal/sales/providers?opportunity_linked=no", label: "All →" }]}
          />
        }
      >
        {!w || w.provider_prospects_without_opportunity.items.length === 0 ? (
          <WidgetEmpty
            body="No prospect providers without an opportunity."
            href="/portal/sales/providers/new"
            label="Add provider"
          />
        ) : (
          <WidgetList>
            {w.provider_prospects_without_opportunity.items.map((item) => (
              <ProviderProspectRow key={item.id} item={item} />
            ))}
          </WidgetList>
        )}
      </SalesPanel>

      <SalesPanel
        title="Upcoming engagements"
        density="compact"
        headerExtra={
          <HeaderLinks
            count={upcomingEngagements.length}
            links={[{ href: "/portal/sales/engagements/new", label: "New →" }]}
          />
        }
      >
        {upcomingEngagements.length === 0 ? (
          <WidgetEmpty
            body="No planned engagements on the calendar."
            href="/portal/sales/engagements/new"
            label="Schedule engagement"
          />
        ) : (
          <WidgetList>
            {upcomingEngagements.slice(0, 8).map((e) => (
              <EngagementDenseRow key={e.id} row={e} whenLabel={formatEngagementWhen(e)} />
            ))}
          </WidgetList>
        )}
      </SalesPanel>
    </section>
  );
}
