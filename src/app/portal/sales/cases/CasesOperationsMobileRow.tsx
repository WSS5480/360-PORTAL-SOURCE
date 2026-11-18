"use client";

import Link from "next/link";
import { OperationsReadinessBlock, OperationsTacticalChips } from "@/components/sales/operations/OperationsQueueParts";
import {
  caseMissionBoardIntelligenceSectionLabel,
  deriveMissionBoardStage,
} from "@/app/portal/sales/cases/surgicalCasesListMobileHelpers";
import type { EnrichedSurgicalCaseListItem } from "@/lib/surgical-sales/enrichSurgicalCasesForList";
import {
  buildCaseDirectoryReadinessSummary,
  caseDisplayTitle,
  caseProcedureLine,
  caseScheduleLine,
  deriveCaseOpsStatus,
  deriveCaseTacticalActions,
} from "@/lib/surgical-sales/caseDirectoryOperations";
import { formatSurgicalCaseStatus } from "@/lib/surgical-sales/labels";

export function CasesOperationsMobileRow({ c }: { c: EnrichedSurgicalCaseListItem }) {
  const status = deriveCaseOpsStatus(c);
  const detailHref = `/portal/sales/cases/${encodeURIComponent(c.id)}`;
  const readiness = buildCaseDirectoryReadinessSummary(c);
  const actions = deriveCaseTacticalActions(c);

  return (
    <li className={`ops-queue-mobile-row ops-queue-mobile-row--${status}`}>
      <div className="ops-queue-mobile-top">
        <div className="ops-queue-col">
          <span className="ops-queue-identity-name">
            <Link href={detailHref}>{caseDisplayTitle(c)}</Link>
          </span>
          <span className="ops-queue-identity-sub">{c.account_name || "—"} · {c.surgeon_display || "—"}</span>
        </div>
        <Link href={detailHref} className="ops-queue-open-link" data-surgical-press>
          Open
        </Link>
      </div>
      <div className="ops-queue-mobile-meta">
        <span className="ops-queue-stage">{formatSurgicalCaseStatus(c.status)}</span>
        <span className="ops-queue-meta-compact">{caseScheduleLine(c)}</span>
      </div>
      <span className="ops-queue-meta-line">{caseProcedureLine(c)}</span>
      <OperationsReadinessBlock
        summary={readiness}
        intelligenceSectionLabel={caseMissionBoardIntelligenceSectionLabel(deriveMissionBoardStage(c))}
      />
      <OperationsTacticalChips actions={actions} />
    </li>
  );
}
