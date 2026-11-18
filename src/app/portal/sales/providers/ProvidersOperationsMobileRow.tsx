"use client";

import { OperationsQueueClickableMobileRow } from "@/components/sales/operations/OperationsQueueClickableRow";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { providerDirectoryLinks, providerDisplayName } from "@/lib/surgical-sales/providerDirectoryLinks";
import {
  deriveProviderMissionNextAction,
  deriveProviderOperationsUpcomingLabel,
  deriveProviderOpsPriority,
  deriveProviderRelationshipPathwayStageLabel,
  PROVIDER_OPS_PRIORITY_LABEL,
} from "@/lib/surgical-sales/providerDirectoryOperations";

export function ProvidersOperationsMobileRow({ provider: p }: { provider: ProviderDirectoryRow }) {
  const { detailHref } = providerDirectoryLinks(p);
  const priority = deriveProviderOpsPriority(p);
  const name = providerDisplayName(p);
  const org = p.primary_organization_name || "No organization";
  const stage = deriveProviderRelationshipPathwayStageLabel(p);
  const nextAction = deriveProviderMissionNextAction(p);
  const upcoming = deriveProviderOperationsUpcomingLabel(p);
  const hasUpcoming = upcoming !== "None scheduled";
  const priorityLabel = PROVIDER_OPS_PRIORITY_LABEL[priority];

  return (
    <OperationsQueueClickableMobileRow
      href={detailHref}
      ariaLabel={`Open provider profile for ${name}`}
      className={`providers-ops-mobile-row providers-ops-mobile-row--${priority}`}
    >
      <div className="providers-ops-mobile-line providers-ops-mobile-line--title">
        <span className="providers-ops-provider-name">{name}</span>
        <span className={`providers-ops-priority-text providers-ops-priority-text--${priority}`}>
          {priorityLabel}
        </span>
      </div>
      <div className="providers-ops-mobile-line providers-ops-mobile-line--org">
        <span className="providers-ops-mobile-org">{org}</span>
        <span className="providers-ops-stage-pill">{stage}</span>
      </div>
      <div className="providers-ops-mobile-line providers-ops-mobile-line--next">
        <span className="providers-ops-mobile-next-action">{nextAction}</span>
      </div>
      <div className="providers-ops-mobile-line providers-ops-mobile-line--meta">
        <span className="providers-ops-mobile-k">Upcoming</span>
        <span className={hasUpcoming ? "providers-ops-mobile-upcoming" : "providers-ops-mobile-upcoming--none"}>
          {upcoming}
        </span>
      </div>
    </OperationsQueueClickableMobileRow>
  );
}
