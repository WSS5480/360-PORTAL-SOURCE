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

function statusLabel(status: ReturnType<typeof deriveOrganizationOpsStatus>): string {
  if (status === "blocked") return "Needs attention";
  if (status === "advancing") return "Advancing";
  return "On track";
}

function OperationsRow({ org }: { org: OrganizationDirectoryRow }) {
  const status = deriveOrganizationOpsStatus(org);
  const detailHref = `/portal/sales/accounts/${encodeURIComponent(org.id)}`;
  const readiness = buildOrganizationDirectoryReadinessSummary(org);
  const actions = deriveOrganizationTacticalActions(org);

  return (
    <div className={`ops-queue-row ops-queue-row--${status}`} role="row">
      <div className="ops-queue-col" role="cell">
        <span className="ops-queue-identity-name">
          <Link href={detailHref}>{organizationDisplayName(org)}</Link>
        </span>
        <span className="ops-queue-identity-sub">{organizationLocationLine(org)}</span>
        <span className="ops-queue-stage-row">
          <span className={`ops-queue-status-dot ops-queue-status-dot--${status}`} aria-hidden />
          <span className="ops-queue-stage">{organizationStageLabel(org)}</span>
          <span className={`ops-queue-status-pill ops-queue-status-pill--${status}`}>{statusLabel(status)}</span>
        </span>
      </div>
      <div className="ops-queue-col" role="cell">
        <OperationsReadinessBlock
          summary={readiness}
          intelligenceSectionLabel={organizationPathwayIntelligenceSectionLabel()}
        />
      </div>
      <div className="ops-queue-col ops-queue-col--right" role="cell">
        <span className="ops-queue-meta-compact">{organizationUpcomingLabel(org)}</span>
        <OperationsTacticalChips actions={actions} />
      </div>
    </div>
  );
}

export function OrganizationsOperationsGrid({ organizations }: { organizations: OrganizationDirectoryRow[] }) {
  const blocked = organizations.filter((org) => deriveOrganizationOpsStatus(org) === "blocked").length;
  const advancing = organizations.filter((org) => deriveOrganizationOpsStatus(org) === "advancing").length;
  const scheduled = organizations.filter((org) => (org.upcoming_case_count ?? 0) > 0).length;

  return (
    <div
      className="ops-queue-panel"
      id="organization-view-panel-operations"
      role="tabpanel"
      aria-labelledby="organization-view-tab-operations"
    >
      <div className="ops-queue-summary">
        <div>
          <h2 className="ops-queue-summary-title">Operations queue</h2>
          <p className="ops-queue-summary-sub">Facility readiness, open gaps, and next execution moves.</p>
        </div>
        <div className="ops-queue-summary-metrics" aria-label="Operations queue summary">
          <span>{organizations.length} total</span>
          {blocked > 0 ? <span>{blocked} need attention</span> : null}
          {advancing > 0 ? <span>{advancing} advancing</span> : null}
          {scheduled > 0 ? <span>{scheduled} scheduled</span> : null}
        </div>
      </div>
      <div className="ops-queue-table" role="table" aria-label="Organizations operations queue">
        <div className="ops-queue-head" role="row">
          <div role="columnheader">Organization</div>
          <div role="columnheader">Facility readiness</div>
          <div role="columnheader">Execution</div>
        </div>
        <div className="ops-queue-body">
          {organizations.map((org) => (
            <OperationsRow key={org.id} org={org} />
          ))}
        </div>
      </div>
    </div>
  );
}
