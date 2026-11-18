"use client";

import Link from "next/link";
import React from "react";
import { ScMobileListHeaderRow } from "@/components/sales/ScMobileListHeaderRow";
import { sc } from "@/components/sales/salesCommandUi";
import { OPPORTUNITY_UI, adoptionInitiativeCountLabel } from "@/lib/sales/opportunityUiLabels";
import { OpportunityMobileCard } from "./OpportunityMobileRow";
import {
  filterOpportunitiesByMobileSegment,
  filterOpportunitiesBySearch,
  formatLastActivityLabel,
  MOBILE_OPPORTUNITY_LIST_SEGMENTS,
  type MobileOpportunityListSegmentId,
  type OpportunityListRow,
} from "./opportunitiesListMobileHelpers";

type FeedTask = { id: string; opportunity_id: string; title: string; due_date: string };

export function OpportunitiesMobileList({
  rows,
  loading,
  err,
  feedTasks,
  lastActivityByOpp,
  onOpenCreate,
  onAddNote,
  onRefresh,
}: {
  rows: OpportunityListRow[];
  loading: boolean;
  err: string | null;
  feedTasks: FeedTask[];
  lastActivityByOpp: Map<string, string>;
  onOpenCreate: () => void;
  onAddNote: (opp: OpportunityListRow) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = React.useState("");
  const [segment, setSegment] = React.useState<MobileOpportunityListSegmentId>("all");

  const taskByOpp = React.useMemo(() => {
    const m = new Map<string, FeedTask>();
    for (const t of feedTasks) {
      const key = String(t.opportunity_id || "");
      if (!key) continue;
      const cur = m.get(key);
      if (!cur || String(t.due_date) < String(cur.due_date)) m.set(key, t);
    }
    return m;
  }, [feedTasks]);

  const visibleRows = React.useMemo(() => {
    const segmented = filterOpportunitiesByMobileSegment(rows, segment);
    return filterOpportunitiesBySearch(segmented, search);
  }, [rows, segment, search]);

  function buildEngagementHref(opp: OpportunityListRow) {
    const p = new URLSearchParams();
    p.set("opportunity_id", opp.id);
    if (opp.account_id) p.set("organization_id", String(opp.account_id));
    if (opp.surgeon_contact_id) p.set("provider_id", String(opp.surgeon_contact_id));
    return `/portal/sales/engagements/new?${p.toString()}`;
  }

  function buildCaseHref(opp: OpportunityListRow) {
    const p = new URLSearchParams({ opportunity_id: opp.id });
    if (opp.account_id) p.set("account_id", String(opp.account_id));
    if (opp.surgeon_contact_id) p.set("surgeon_contact_id", String(opp.surgeon_contact_id));
    return `/portal/sales/cases/new?${p.toString()}`;
  }

  return (
    <div className="opp-mobile-list-root">
      <div className="sc-mobile-list-sticky-shell">
        <header className="sc-mobile-list-header">
          <ScMobileListHeaderRow
            title={OPPORTUNITY_UI.navListTitle}
            countLabel={loading ? "Loading…" : adoptionInitiativeCountLabel(visibleRows.length)}
            actions={
              <>
                <Link href="/portal/sales" className="sc-mobile-list-tool-btn" style={{ textDecoration: "none" }}>
                  Dashboard
                </Link>
                <button type="button" onClick={onOpenCreate} className="sc-mobile-list-tool-btn" style={{ fontFamily: "inherit" }}>
                  {OPPORTUNITY_UI.createButtonShort}
                </button>
              </>
            }
          />
          <div className="opp-mobile-search-wrap">
            <input
              type="search"
              className="opp-mobile-search"
              placeholder="Search provider, organization, product…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search opportunities"
            />
          </div>
          <div className="opp-mobile-segments" role="tablist" aria-label="Stage filters">
            {MOBILE_OPPORTUNITY_LIST_SEGMENTS.map((s) => {
              const active = segment === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`opp-mobile-segment${active ? " opp-mobile-segment--active" : ""}`}
                  onClick={() => setSegment(s.id)}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </header>
      </div>

      <div className="sc-mobile-list-body opp-mobile-list-body">
        {err ? (
          <div role="alert" style={sc.alertError}>
            {err}
            <button type="button" style={{ ...sc.btnGhost, marginTop: 8 }} onClick={() => onRefresh()}>
              Retry
            </button>
          </div>
        ) : null}

        {loading ? (
          <p className="opp-mobile-empty">Loading opportunities…</p>
        ) : rows.length === 0 ? (
          <div className="opp-mobile-empty-block">
            <p>{OPPORTUNITY_UI.emptyDescription}</p>
            <button type="button" style={sc.btnPrimary} onClick={onOpenCreate}>
              {OPPORTUNITY_UI.emptyListCta}
            </button>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="opp-mobile-empty-block">
            <p>Nothing matches this filter.</p>
            <button
              type="button"
              style={sc.btnSecondary}
              onClick={() => {
                setSearch("");
                setSegment("all");
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="opp-mobile-card-list">
            {visibleRows.map((o) => {
              const nextTask = taskByOpp.get(o.id);
              const nextFromField = String(o.next_action || "").trim();
              const nextActionLabel = nextFromField
                ? nextFromField
                : nextTask
                  ? nextTask.title
                  : null;
              const lastIso = lastActivityByOpp.get(o.id) || o.updated_at || "";
              return (
                <OpportunityMobileCard
                  key={o.id}
                  opp={o}
                  nextActionLabel={nextActionLabel}
                  lastActivityLabel={formatLastActivityLabel(lastIso)}
                  onAddNote={() => onAddNote(o)}
                  onAddEngagement={() => {
                    window.location.href = buildEngagementHref(o);
                  }}
                  onAddCase={() => {
                    window.location.href = buildCaseHref(o);
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
