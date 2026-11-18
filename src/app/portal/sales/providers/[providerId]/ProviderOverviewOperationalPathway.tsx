"use client";

import type {
  ProviderOverviewStageRequirementsModel,
  StageRequirementRow,
  WorkflowRowAction,
} from "@/lib/surgical-sales/buildProviderOverviewStageRequirementsView";
import { PROVIDER_OVERVIEW_BRIEFING_LABEL } from "@/lib/surgical-sales/providerOverviewBriefingCopy";
import { ProviderOverviewReadinessCard } from "./ProviderOverviewReadinessCard";
import { OpsReadinessSectionIcon } from "./providerOverviewOpsIcons";

function LegacyRequirementRow({ row }: { row: StageRequirementRow }) {
  return (
    <li className="pov-ops-legacy-row">
      <span className="pov-ops-legacy-row__label">{row.label}</span>
      <span className="pov-ops-legacy-row__marker" aria-hidden>
        {row.marker}
      </span>
    </li>
  );
}

export function ProviderOverviewOperationalPathway({
  requirements,
  intelligenceHref,
  discoveryMappingHref,
  onWorkflowAction,
}: {
  requirements: ProviderOverviewStageRequirementsModel;
  intelligenceHref: string;
  discoveryMappingHref?: string;
  onWorkflowAction?: (action: WorkflowRowAction) => void;
}) {
  const hasDiscoveryGroups = requirements.discoveryIntelligenceGroups.length > 0;
  const hasAccess = requirements.accessWorkflow.length > 0;
  const hasClinical = requirements.clinicalValidation.length > 0;

  if (!hasDiscoveryGroups && !hasAccess && !hasClinical) return null;

  return (
    <section
      className="pov-ops-pathway"
      aria-label={PROVIDER_OVERVIEW_BRIEFING_LABEL.operationalReadiness}
      data-testid="pov-stage-requirements"
    >
      <header className="pov-ops-pathway__head">
        <span className="pov-ops-pathway__icon" aria-hidden>
          <OpsReadinessSectionIcon size={18} />
        </span>
        <h2 className="pov-ops-pathway__title">
          {PROVIDER_OVERVIEW_BRIEFING_LABEL.operationalReadiness}
        </h2>
      </header>

      {hasDiscoveryGroups ? (
        <div className="pov-ops-readiness-grid">
          {requirements.discoveryIntelligenceGroups.map((group) => (
            <ProviderOverviewReadinessCard
              key={group.id}
              group={group}
              intelligenceHref={intelligenceHref}
              discoveryMappingHref={discoveryMappingHref}
              onAction={onWorkflowAction}
            />
          ))}
        </div>
      ) : null}

      {!hasDiscoveryGroups && hasAccess ? (
        <div className="pov-ops-pathway__section">
          <h3 className="pov-ops-pathway__section-title">
            {PROVIDER_OVERVIEW_BRIEFING_LABEL.accessWorkflow}
          </h3>
          <ul className="pov-ops-legacy-rows">
            {requirements.accessWorkflow.map((row) => (
              <LegacyRequirementRow key={row.id} row={row} />
            ))}
          </ul>
        </div>
      ) : null}

      {!hasDiscoveryGroups && hasClinical ? (
        <div className="pov-ops-pathway__section pov-ops-pathway__section--clinical">
          <h3 className="pov-ops-pathway__section-title">
            {PROVIDER_OVERVIEW_BRIEFING_LABEL.clinicalValidation}
          </h3>
          <ul className="pov-ops-legacy-rows">
            {requirements.clinicalValidation.map((row) => (
              <LegacyRequirementRow key={row.id} row={row} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
