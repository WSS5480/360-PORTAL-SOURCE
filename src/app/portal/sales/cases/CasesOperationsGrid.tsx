"use client";

import Link from "next/link";
import { OperationsReadinessBlock, OperationsTacticalChips } from "@/components/sales/operations/OperationsQueueParts";
import { caseMissionBoardIntelligenceSectionLabel } from "@/app/portal/sales/cases/surgicalCasesListMobileHelpers";
import type { EnrichedSurgicalCaseListItem } from "@/lib/surgical-sales/enrichSurgicalCasesForList";
import {
  buildCaseDirectoryReadinessSummary,
  caseDisplayTitle,
  caseProcedureLine,
  caseScheduleLine,
  deriveCaseOpsStatus,
  deriveCaseTacticalActions,
} from "@/lib/surgical-sales/caseDirectoryOperations";
import { deriveMissionBoardStage } from "@/app/portal/sales/cases/surgicalCasesListMobileHelpers";
import { formatSurgicalCaseStatus } from "@/lib/surgical-sales/labels";

function OperationsRow({ c }: { c: EnrichedSurgicalCaseListItem }) {
  const status = deriveCaseOpsStatus(c);
  const detailHref = `/portal/sales/cases/${encodeURIComponent(c.id)}`;
  const readiness = buildCaseDirectoryReadinessSummary(c);
  const actions = deriveCaseTacticalActions(c);

  return (
    <div className={`ops-queue-row ops-queue-row--${status}`} role="row">
      <div className="ops-queue-col" role="cell">
        <span className="ops-queue-identity-name">
          <Link href={detailHref}>{caseDisplayTitle(c)}</Link>
        </span>
        <span className="ops-queue-identity-sub">{c.account_name || "Organization not set"}</span>
        <span className="ops-queue-identity-sub">{c.surgeon_display || "Surgeon not set"}</span>
        <span className="ops-queue-stage">{formatSurgicalCaseStatus(c.status)}</span>
      </div>
      <div className="ops-queue-col" role="cell">
        <OperationsReadinessBlock
          summary={readiness}
          intelligenceSectionLabel={caseMissionBoardIntelligenceSectionLabel(deriveMissionBoardStage(c))}
        />
        <span className="ops-queue-meta-line">{caseProcedureLine(c)}</span>
      </div>
      <div className="ops-queue-col ops-queue-col--right" role="cell">
        <span className="ops-queue-meta-compact">{caseScheduleLine(c)}</span>
        <OperationsTacticalChips actions={actions} />
      </div>
    </div>
  );
}

export function CasesOperationsGrid({ cases }: { cases: EnrichedSurgicalCaseListItem[] }) {
  return (
    <div
      className="ops-queue-panel"
      id="case-view-panel-operations"
      role="tabpanel"
      aria-labelledby="case-view-tab-operations"
    >
      <div className="ops-queue-table" role="table" aria-label="Cases operations board">
        <div className="ops-queue-head" role="row">
          <div role="columnheader">Case</div>
          <div role="columnheader">Execution readiness</div>
          <div role="columnheader">Coordination</div>
        </div>
        <div className="ops-queue-body">
          {cases.map((c) => (
            <OperationsRow key={c.id} c={c} />
          ))}
        </div>
      </div>
    </div>
  );
}
