"use client";

import Link from "next/link";
import { OperationsReadinessBlock, OperationsTacticalChips } from "@/components/sales/operations/OperationsQueueParts";
import { organizationPathwayIntelligenceSectionLabel } from "@/lib/surgical-sales/pathwayStageIntelligenceLabels";
import {
  buildOrganizationDirectoryReadinessSummary,
  deriveOrganizationOpsStatus,
  deriveOrganizationTacticalActions,
  organizationDisplayName,
  organizationLocationLine,
  organizationStageLabel,
  organizationUpcomingLabel,
  type OrganizationDirectoryRow,
} from "@/lib/surgical-sales/organizationDirectoryOperations";

export function OrganizationsOperationsMobileRow({ org }: { org: OrganizationDirectoryRow }) {
  const status = deriveOrganizationOpsStatus(org);
  const detailHref = `/portal/sales/accounts/${encodeURIComponent(org.id)}`;
  const readiness = buildOrganizationDirectoryReadinessSummary(org);
  const actions = deriveOrganizationTacticalActions(org);

  return (
    <li className={`ops-queue-mobile-row ops-queue-mobile-row--${status}`}>
      <div className="ops-queue-mobile-top">
        <div className="ops-queue-col">
          <span className="ops-queue-identity-name">
            <Link href={detailHref}>{organizationDisplayName(org)}</Link>
          </span>
          <span className="ops-queue-identity-sub">{organizationLocationLine(org)}</span>
        </div>
        <Link href={detailHref} className="ops-queue-open-link" data-surgical-press>
          Open
        </Link>
      </div>
      <div className="ops-queue-mobile-meta">
        <span className="ops-queue-stage">{organizationStageLabel(org)}</span>
        <span className="ops-queue-meta-compact">{organizationUpcomingLabel(org)}</span>
      </div>
      <OperationsReadinessBlock
        summary={readiness}
        intelligenceSectionLabel={organizationPathwayIntelligenceSectionLabel()}
      />
      <OperationsTacticalChips actions={actions} />
    </li>
  );
}
