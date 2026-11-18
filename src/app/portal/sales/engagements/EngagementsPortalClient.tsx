"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React from "react";
import { SalesCommandNativeListShell } from "@/components/sales/SalesCommandNativeListShell";
import { SalesCommandPage, SalesCmdLink, sc } from "@/components/sales/salesCommandUi";
import { buildEngagementHubHref } from "@/lib/surgical-sales/engagements/engagementLifecycle";
import {
  engagementNotesHaveTacticalDebrief,
  formatEngagementTabPrepStatus,
  formatEngagementTabWhen,
  PROVIDER_ENGAGEMENT_TAB_OPEN_LABEL,
} from "@/lib/surgical-sales/engagements/providerEngagementTabDisplay";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { isUpcomingEngagementStatus } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { userFacingError } from "@/lib/errors/userFacingError";

const OBSERVATION_ENGAGEMENT_TYPES = new Set(["observation_request", "or_visit", "or_observation"]);

type EngagementListRow = ProviderEngagementSummary & {
  provider_label?: string;
  organization_label?: string | null;
};

function filterByLane(rows: EngagementListRow[], lane: string | null): EngagementListRow[] {
  if (lane === "observations") {
    return rows.filter((r) => {
      const type = String(r.engagement_type || "");
      const status = String(r.status || "");
      return (
        OBSERVATION_ENGAGEMENT_TYPES.has(type) &&
        (isUpcomingEngagementStatus(status) || status === "in_progress")
      );
    });
  }
  if (lane === "debriefs") {
    return rows.filter((r) => {
      const status = String(r.status || "").toLowerCase();
      return (
        (status === "in_progress" || status === "completed") &&
        !engagementNotesHaveTacticalDebrief(r.notes)
      );
    });
  }
  return rows;
}

export default function EngagementsPortalClient() {
  const searchParams = useSearchParams();
  const lane = searchParams.get("lane");
  const [rows, setRows] = React.useState<EngagementListRow[]>([]);
  const [busy, setBusy] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setBusy(true);
      setErr(null);
      try {
        const res = await fetch("/api/portal/sales/engagements", { cache: "no-store" });
        const j = (await res.json()) as { ok?: boolean; error?: string; engagements?: EngagementListRow[] };
        if (!j.ok) throw new Error(j.error || "");
        if (!cancelled) setRows(j.engagements || []);
      } catch (e: unknown) {
        if (!cancelled) setErr(userFacingError(e, "We could not load engagements. Please try again."));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = filterByLane(rows, lane);
  const pageTitle =
    lane === "observations" ? "Observations" : lane === "debriefs" ? "Debriefs" : "Engagements";
  const pageSubtitle =
    lane === "observations"
      ? "Active observation requests and OR visits in your field queue."
      : lane === "debriefs"
        ? "Touches that still need a tactical debrief captured."
        : "Index of field engagements — open a record to prepare or run the touch.";

  const headerActions = (
    <SalesCmdLink href="/portal/sales/engagements/new" variant="primary">
      New engagement
    </SalesCmdLink>
  );

  return (
    <SalesCommandPage
      title={pageTitle}
      subtitle={pageSubtitle}
      omitBuiltInHeader
      nativeLayout
      actions={null}
    >
      <SalesCommandNativeListShell
        title={pageTitle}
        countLabel={busy ? undefined : `${visible.length}`}
        headerActions={headerActions}
      >
        <div className="engagements-portal-root">
          {err ? <p style={{ color: "var(--danger)" }}>{err}</p> : null}
          {busy ? (
            <p className="engagements-portal-loading" style={{ color: "var(--muted)" }}>
              Loading…
            </p>
          ) : null}
          {!busy && visible.length === 0 ? (
            <p className="engagements-portal-empty" style={{ color: "var(--muted)" }}>
              {lane === "observations"
                ? "No open observations in queue."
                : lane === "debriefs"
                  ? "No pending debriefs — you're caught up on field capture."
                  : "No engagements yet. Start one to plan a call, meeting, office visit, or observation request."}
            </p>
          ) : null}
          {!busy && visible.length > 0 ? (
            <>
              <ul className="engagements-portal-mobile-only" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
                {visible.map((row) => {
                  const prepStatus = formatEngagementTabPrepStatus(row);
                  const detailHref = buildEngagementHubHref(row.id);
                  return (
                    <li key={row.id}>
                      <Link
                        href={detailHref}
                        className="sc-native-task-row"
                        style={{
                          display: "grid",
                          gap: 4,
                          padding: "12px 14px",
                          borderRadius: 14,
                          border: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))",
                          background: "#fff",
                          textDecoration: "none",
                          color: "inherit",
                          minHeight: 44,
                        }}
                      >
                        <strong style={{ fontSize: 14, fontWeight: 750 }}>{row.engagement_type_label}</strong>
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>{formatEngagementTabWhen(row)}</span>
                        <span style={{ fontSize: 12 }}>
                          {row.status_label}
                          {prepStatus ? ` · ${prepStatus}` : ""}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--muted)", overflowWrap: "anywhere" }}>
                          {row.provider_label || "—"}
                        </span>
                        <span style={{ ...sc.linkBrand, fontSize: 13, marginTop: 2 }}>{PROVIDER_ENGAGEMENT_TAB_OPEN_LABEL}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="engagements-portal-table-wrap engagements-portal-desktop-only" style={{ overflowX: "auto" }}>
                <table className="engagements-portal-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                      <th style={{ padding: "10px 8px" }}>Type</th>
                      <th style={{ padding: "10px 8px" }}>Date</th>
                      <th style={{ padding: "10px 8px" }}>Status</th>
                      <th style={{ padding: "10px 8px" }}>Preparation</th>
                      <th style={{ padding: "10px 8px" }}>Provider</th>
                      <th style={{ padding: "10px 8px" }} />
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((row) => {
                      const prepStatus = formatEngagementTabPrepStatus(row);
                      const detailHref = buildEngagementHubHref(row.id);
                      return (
                        <tr key={row.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td data-label="Type" style={{ padding: "10px 8px" }}>
                            {row.engagement_type_label}
                          </td>
                          <td data-label="Date" style={{ padding: "10px 8px" }}>
                            {formatEngagementTabWhen(row)}
                          </td>
                          <td data-label="Status" style={{ padding: "10px 8px" }}>
                            {row.status_label}
                          </td>
                          <td data-label="Preparation" style={{ padding: "10px 8px" }}>
                            {prepStatus}
                          </td>
                          <td data-label="Provider" style={{ padding: "10px 8px", color: "var(--muted)" }}>
                            {row.provider_label || "—"}
                          </td>
                          <td data-label="Action" style={{ padding: "10px 8px" }}>
                            <Link href={detailHref} style={sc.linkBrand}>
                              {PROVIDER_ENGAGEMENT_TAB_OPEN_LABEL}
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      </SalesCommandNativeListShell>
    </SalesCommandPage>
  );
}
