"use client";



import Link from "next/link";

import { caseStatusBadgeStyle } from "@/components/sales/crmUi";

import { CASE_BOARD_PRIORITY_INSIGHT_EMPTY } from "@/lib/surgical-sales/buildCaseBoardPriorityInsight";

import type { EnrichedSurgicalCaseListItem } from "@/lib/surgical-sales/enrichSurgicalCasesForList";

import {

  buildSurgicalCaseBoardCardView,

  caseListRowNeedsAttention,

  type CaseBoardCardMetricPill,

} from "./surgicalCasesListMobileHelpers";



function BoardCardMetricPills({

  pills,

  emptyLabel,

  sectionLabel,

}: {

  pills: CaseBoardCardMetricPill[];

  emptyLabel: string;

  sectionLabel: string;

}) {

  if (pills.length === 0) {

    return <p className="cases-board-card-metrics-empty">{emptyLabel}</p>;

  }



  return (

    <div className="cases-board-card-metrics" aria-label={sectionLabel}>

      {pills.map((pill) => (

        <span key={pill.id} className="cases-board-card-metric-pill" data-metric-id={pill.id}>

          {pill.text}

        </span>

      ))}

    </div>

  );

}



export function SurgicalCasesBoardCard({ c }: { c: EnrichedSurgicalCaseListItem }) {

  const detailHref = `/portal/sales/cases/${encodeURIComponent(c.id)}`;

  const needsAttention = caseListRowNeedsAttention(c);

  const view = buildSurgicalCaseBoardCardView(c);

  const actionLabel = view.nextRecommendedAction;



  return (

    <li

      className="cases-board-card"

      data-case-type={view.caseBoardKind}

      data-needs-attention={needsAttention ? "true" : undefined}

    >

      <Link

        href={detailHref}

        className="cases-board-card-link"

        data-surgical-press

        aria-label={`Open case for ${view.providerName}`}

      >

        <div className="cases-board-card-body">

        <header className="cases-board-card-header">

          <p className="cases-board-card-provider" title={view.providerName}>

            {view.providerName}

          </p>

          <p className="cases-board-card-procedure" title={view.procedureLabel}>

            {view.procedureLabel}

          </p>

          <p className="cases-board-card-facility" title={view.facilityName}>

            {view.facilityName}

          </p>

          <p className="cases-board-card-date" title={view.dateLine}>

            {view.dateLine}

          </p>

        </header>



        <div className="cases-board-card-status-row">

          <span

            className="cases-board-card-status-badge"

            data-status-kind={view.caseBoardKind === "product_support" ? "support_readiness" : "observation_status"}

            style={caseStatusBadgeStyle(c.status)}

          >

            {view.statusLabel}

          </span>

        </div>



        <div className="cases-board-card-priority-insight" aria-label={view.insightSectionLabel}>

          <span className="cases-board-card-priority-insight-label">{view.insightSectionLabel}</span>

          <p

            className="cases-board-card-priority-insight-value"

            data-empty={view.priorityInsight === CASE_BOARD_PRIORITY_INSIGHT_EMPTY ? "true" : undefined}

            title={`${view.priorityInsight} · Source: ${view.priorityInsightSourceLabel}`}

          >

            {view.priorityInsight}

          </p>

          <span

            className="cases-board-card-priority-insight-source"

            title={view.priorityInsightSourceField ? `Source field: ${view.priorityInsightSourceField}` : undefined}

          >

            Source: {view.priorityInsightSourceLabel}

          </span>

        </div>



        <div className="cases-board-card-metrics-section">

          <span className="cases-board-card-metrics-label">{view.metricsSectionLabel}</span>

          <BoardCardMetricPills

            pills={view.metricPills}

            emptyLabel={view.metricsEmptyLabel}

            sectionLabel={view.metricsSectionLabel}

          />

        </div>



        <span className="cases-board-card-cta" aria-hidden="true">

          {actionLabel}

        </span>

        </div>

      </Link>

    </li>

  );

}


