"use client";

import Link from "next/link";
import { salesStageLabel, salesStageStyle, type SalesStage } from "@/lib/sales/stages";
import type { OpportunityListRow } from "./opportunitiesListMobileHelpers";
import { getPrimaryProductLine } from "./opportunitiesListMobileHelpers";

export type OpportunityMobileCardProps = {
  opp: OpportunityListRow;
  nextActionLabel: string | null;
  lastActivityLabel: string;
  onAddNote: () => void;
  onAddEngagement: () => void;
  onAddCase: () => void;
};

export function OpportunityMobileCard({
  opp,
  nextActionLabel,
  lastActivityLabel,
  onAddNote,
  onAddEngagement,
  onAddCase,
}: OpportunityMobileCardProps) {
  const detailHref = `/portal/sales/opportunities/${encodeURIComponent(opp.id)}`;
  const st = salesStageStyle(opp.stage);
  const productLine = getPrimaryProductLine(opp);
  const providerLabel = String(opp.physician_name || "").trim() || "No provider linked";
  const casesCount = typeof opp.linked_cases_count === "number" ? opp.linked_cases_count : 0;
  const engagementsCount = typeof opp.linked_engagements_count === "number" ? opp.linked_engagements_count : 0;

  return (
    <article className="opp-mobile-card">
      <Link href={detailHref} className="opp-mobile-card-main" data-surgical-press>
        <div className="opp-mobile-card-head">
          <div className="opp-mobile-card-title-block">
            <div className="opp-mobile-card-provider">{providerLabel}</div>
            <div className="opp-mobile-card-org">{opp.account_name}</div>
          </div>
          <span
            className="opp-mobile-card-stage"
            style={{ background: st.bg, color: st.fg, borderColor: st.border }}
          >
            {salesStageLabel(opp.stage)}
          </span>
        </div>

        <div className="opp-mobile-card-product">{productLine}</div>

        {nextActionLabel ? (
          <div className="opp-mobile-card-next">
            <span className="opp-mobile-card-next-label">Next action</span>
            <span className="opp-mobile-card-next-value">{nextActionLabel}</span>
          </div>
        ) : null}

        <div className="opp-mobile-card-metrics">
          <span>
            <strong>{casesCount}</strong> {casesCount === 1 ? "case" : "cases"}
          </span>
          <span>
            <strong>{engagementsCount}</strong> {engagementsCount === 1 ? "engagement" : "engagements"}
          </span>
          <span className="opp-mobile-card-activity">{lastActivityLabel}</span>
        </div>
      </Link>

      <div className="opp-mobile-card-actions">
        <Link href={detailHref} className="opp-mobile-card-action" data-surgical-press>
          Open
        </Link>
        <button type="button" className="opp-mobile-card-action" onClick={onAddNote}>
          Add note
        </button>
        <button type="button" className="opp-mobile-card-action" onClick={onAddEngagement}>
          Add engagement
        </button>
        <button type="button" className="opp-mobile-card-action opp-mobile-card-action--accent" onClick={onAddCase}>
          Add case
        </button>
      </div>
    </article>
  );
}

/** @deprecated Use OpportunityMobileCard — kept for type re-exports during migration */
export type OpportunityRowData = OpportunityListRow & { stage: SalesStage };
