/**
 * Rep-facing maturity guidance — informational depth scoring only.
 * Does not gate sales pathway stage advancement (see pathwayProgressionPolicy).
 */

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type {
  MaturityCriterionStatus,
  ProviderIntelligenceMaturitySnapshot,
  ProviderIntelligenceMaturityStage,
} from "@/lib/surgical-sales/providerIntelligenceMaturity";
import {
  PROVIDER_OVERVIEW_MATURITY_LABELS,
  providerOverviewProgressionHeading,
} from "@/lib/surgical-sales/providerOverviewVocabulary";

export type ProviderOverviewStageProgressionItem = {
  id: string;
  label: string;
  /** Short scan label for overview checklist. */
  scanLabel: string;
  met: boolean;
  sectionId?: ProviderIntelligenceSectionId;
};

export type ProviderOverviewStageProgression = {
  stageLabel: string;
  nextStageLabel: string;
  heading: string;
  progressPercent: number;
  items: ProviderOverviewStageProgressionItem[];
};

/** Field-rep scan labels keyed by next maturity stage and criterion id. */
const PROGRESSION_SCAN_LABELS: Partial<
  Record<ProviderIntelligenceMaturityStage, Partial<Record<string, string>>>
> = {
  operationally_qualified: {
    procedure_focus: "Confirm workflow fit",
    modality: "Map modality preferences",
    influence: "Map commercial influence",
    engagement_style: "Know surgeon engagement style",
  },
  observation_ready: {
    observation_allowed: "Validate OR access",
    credentialing_understood: "Understand credentialing path",
    coordinator_identified: "Identify coordinator",
    target_procedures: "Map target procedures",
  },
  evaluation_active: {
    evaluation_openness: "Confirm trial willingness",
    competitive_landscape: "Map competitive landscape",
    decision_path: "Map decision path or champion",
  },
  adoption_building: {
    preference_card: "Understand preference-card path",
    champion: "Assess champion potential",
  },
  strategic_account: {
    workflow_validated: "Validate clinical workflow",
    observation_durable: "Confirm observation readiness",
    commercial_validated: "Validate commercial path",
  },
};

function scanLabelFor(
  nextStage: ProviderIntelligenceMaturityStage,
  criterion: MaturityCriterionStatus,
): string {
  return (
    PROGRESSION_SCAN_LABELS[nextStage]?.[criterion.id] ??
    criterion.label.replace(/\s+captured$|\s+mapped$|\s+known$|\s+understood$|\s+identified$|\s+assessed$/i, "")
  );
}

function toProgressionItem(
  nextStage: ProviderIntelligenceMaturityStage,
  criterion: MaturityCriterionStatus,
): ProviderOverviewStageProgressionItem {
  return {
    id: criterion.id,
    label: criterion.label,
    scanLabel: scanLabelFor(nextStage, criterion),
    met: criterion.met,
    sectionId: criterion.sectionId,
  };
}

export function buildProviderOverviewStageProgression(
  maturity: ProviderIntelligenceMaturitySnapshot,
): ProviderOverviewStageProgression | null {
  if (!maturity.nextStage || !maturity.nextStageLabel || maturity.nextStageCriteria.length === 0) {
    return null;
  }

  const nextStage = maturity.nextStage;

  const nextStageLabel =
    PROVIDER_OVERVIEW_MATURITY_LABELS[nextStage] ?? maturity.nextStageLabel;

  return {
    stageLabel: PROVIDER_OVERVIEW_MATURITY_LABELS[maturity.stage] ?? maturity.stageLabel,
    nextStageLabel,
    heading: providerOverviewProgressionHeading(nextStageLabel),
    progressPercent: maturity.progressToNextPercent,
    items: maturity.nextStageCriteria.map((c) => toProgressionItem(nextStage, c)),
  };
}
