/**
 * Intelligence tab — one dominant operational story (guided hierarchy).
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  buildProviderFieldCommandBriefing,
  type ProviderFieldCommandBriefing,
} from "@/lib/surgical-sales/buildProviderFieldCommandBriefing";
import {
  buildProviderFieldTimeRisk,
  type ProviderFieldTimeRisk,
  type ProviderFieldTimeRiskTone,
} from "@/lib/surgical-sales/buildProviderFieldTimeRisk";
import {
  buildIntelligenceWorkspaceSummary,
  type IntelligenceWorkspaceSummary,
} from "@/lib/surgical-sales/buildIntelligenceWorkspaceSummary";
import {
  buildProviderNextDiscoveryPriorities,
  type NextDiscoveryPriority,
} from "@/lib/surgical-sales/buildProviderNextDiscoveryPriorities";
import {
  buildProviderOverviewStageProgression,
  type ProviderOverviewStageProgression,
} from "@/lib/surgical-sales/buildProviderOverviewStageProgression";
import {
  buildProviderOverviewQualitativeReadiness,
} from "@/lib/surgical-sales/providerOverviewQualitativeReadiness";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import {
  PROVIDER_COMMERCIAL_WORKFLOW_STAGE_MISSION,
  resolveProviderCommercialWorkflowStage,
  type ProviderCommercialWorkflowStage,
} from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import {
  buildProviderIntelligenceMaturitySnapshot,
  PROVIDER_INTELLIGENCE_MATURITY_LABELS,
} from "@/lib/surgical-sales/providerIntelligenceMaturity";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import {
  operationalCloseGapLabel,
  operationalFieldActionLabel,
  operationalReviewAccountLabel,
} from "@/lib/surgical-sales/providerOperationalActionLabels";
import {
  PROVIDER_OVERVIEW_MATURITY_LABELS,
  PROVIDER_OVERVIEW_WORKFLOW_LABELS,
} from "@/lib/surgical-sales/providerOverviewVocabulary";

export const PROVIDER_INTELLIGENCE_STORY_LAYER_LABELS = {
  operationalState: "Current account understanding",
  deploymentRisk: "Biggest risk",
  leverageAction: "Highest-impact next step",
  unlocksNext: "What this helps clarify",
  supporting: "Account details",
} as const;

export type ProviderIntelligenceStoryTone = "neutral" | "brand" | "success" | "caution" | "warn" | "danger";

export type ProviderIntelligenceStoryCta = {
  label: string;
  sectionId: ProviderIntelligenceSectionId;
  dbKey?: string;
};

export type ProviderIntelligenceOperationalStory = {
  laneLabel: string;
  workflowStage: ProviderCommercialWorkflowStage;
  workflowStageLabel: string;
  maturityStageLabel: string;
  operationalState: {
    label: string;
    headline: string;
    scan: string;
    tone: ProviderIntelligenceStoryTone;
  };
  deploymentRisk: {
    label: string;
    headline: string;
    scan: string;
    tone: ProviderIntelligenceStoryTone;
    cta: ProviderIntelligenceStoryCta | null;
  };
  leverageAction: {
    label: string;
    headline: string;
    scan: string;
    tone: ProviderIntelligenceStoryTone;
    cta: ProviderIntelligenceStoryCta;
  };
  unlocksNext: {
    label: string;
    headline: string;
    scan: string;
  } | null;
  secondaryMissions: NextDiscoveryPriority[];
  briefing: ProviderFieldCommandBriefing;
  fieldTimeRisk: ProviderFieldTimeRisk;
  stageProgression: ProviderOverviewStageProgression | null;
  workspace: IntelligenceWorkspaceSummary;
};

function storyToneFromFieldRisk(tone: ProviderFieldTimeRiskTone): ProviderIntelligenceStoryTone {
  if (tone === "danger") return "danger";
  if (tone === "warn") return "warn";
  if (tone === "caution") return "caution";
  if (tone === "success") return "success";
  return "neutral";
}

function buildOperationalStateScan(input: {
  commercialStage: ProviderCommercialWorkflowStage;
  overallConfidenceLabel: string;
  maturityStageLabel: string;
}): string {
  return scanLine(
    `${input.maturityStageLabel} · ${input.overallConfidenceLabel} · ${PROVIDER_COMMERCIAL_WORKFLOW_STAGE_MISSION[input.commercialStage]}`,
    96,
  );
}

function buildDeploymentRiskLayer(input: {
  fieldTimeRisk: ProviderFieldTimeRisk;
  briefing: ProviderFieldCommandBriefing;
}): ProviderIntelligenceOperationalStory["deploymentRisk"] {
  const topOpen = input.briefing.openRisks[0];
  const riskTone = storyToneFromFieldRisk(input.fieldTimeRisk.tone);

  if (
    input.fieldTimeRisk.state === "high_wasted_field_risk" ||
    input.fieldTimeRisk.state === "requires_remote_validation_first"
  ) {
    return {
      label: PROVIDER_INTELLIGENCE_STORY_LAYER_LABELS.deploymentRisk,
      headline: input.fieldTimeRisk.stateLabel,
      scan: scanLine(input.fieldTimeRisk.guidanceScan, 88),
      tone: riskTone,
      cta: input.fieldTimeRisk.primaryDbKey
        ? {
            label: operationalFieldActionLabel(input.fieldTimeRisk.primaryDbKey),
            sectionId: input.fieldTimeRisk.primarySectionId,
            dbKey: input.fieldTimeRisk.primaryDbKey,
          }
        : topOpen
          ? {
              label: operationalCloseGapLabel(topOpen.dbKey),
              sectionId: topOpen.sectionId,
              dbKey: topOpen.dbKey,
            }
          : null,
    };
  }

  if (topOpen) {
    return {
      label: PROVIDER_INTELLIGENCE_STORY_LAYER_LABELS.deploymentRisk,
      headline: topOpen.label,
      scan: scanLine(topOpen.operationalImpact, 88),
      tone: "warn",
      cta: {
        label: operationalCloseGapLabel(topOpen.dbKey),
        sectionId: topOpen.sectionId,
        dbKey: topOpen.dbKey,
      },
    };
  }

  return {
    label: PROVIDER_INTELLIGENCE_STORY_LAYER_LABELS.deploymentRisk,
    headline: input.fieldTimeRisk.stateLabel,
    scan: scanLine(input.fieldTimeRisk.stateScan, 88),
    tone: input.fieldTimeRisk.state === "efficient_field_target" ? "success" : "neutral",
    cta: null,
  };
}

function buildLeverageActionLayer(input: {
  priorities: NextDiscoveryPriority[];
  briefing: ProviderFieldCommandBriefing;
  commercialStage: ProviderCommercialWorkflowStage;
}): ProviderIntelligenceOperationalStory["leverageAction"] {
  const top = input.priorities.find((p) => p.id !== "refresh") ?? input.priorities[0];

  if (top && top.id !== "refresh") {
    return {
      label: PROVIDER_INTELLIGENCE_STORY_LAYER_LABELS.leverageAction,
      headline: top.missionTitle,
      scan: scanLine(top.expectedOutcome || top.rationale, 88),
      tone: top.urgency === "critical" ? "danger" : top.urgency === "high" ? "warn" : "brand",
      cta: {
        label: top.captureLabel,
        sectionId: top.sectionId,
        dbKey: top.dbKey,
      },
    };
  }

  const fallback = input.briefing.nextFieldAction;
  const open = input.briefing.openRisks[0];
  return {
    label: PROVIDER_INTELLIGENCE_STORY_LAYER_LABELS.leverageAction,
    headline: fallback,
    scan: scanLine(PROVIDER_COMMERCIAL_WORKFLOW_STAGE_MISSION[input.commercialStage], 88),
    tone: "brand",
    cta: open
      ? {
          label: operationalCloseGapLabel(open.dbKey),
          sectionId: open.sectionId,
          dbKey: open.dbKey,
        }
      : {
          label: operationalReviewAccountLabel(),
          sectionId: "observation_readiness",
        },
  };
}

function buildUnlocksLayer(input: {
  briefing: ProviderFieldCommandBriefing;
  progression: ProviderOverviewStageProgression | null;
  topPriority: NextDiscoveryPriority | undefined;
}): ProviderIntelligenceOperationalStory["unlocksNext"] {
  if (input.briefing.unlocksNextStage) {
    const progressionHeadline = input.progression?.nextStageLabel;
    return {
      label: PROVIDER_INTELLIGENCE_STORY_LAYER_LABELS.unlocksNext,
      headline: progressionHeadline ?? "Next maturity gate",
      scan: input.briefing.unlocksNextStage,
    };
  }

  if (input.topPriority?.unlockValue) {
    return {
      label: PROVIDER_INTELLIGENCE_STORY_LAYER_LABELS.unlocksNext,
      headline: input.progression?.nextStageLabel ?? "Operational unlock",
      scan: scanLine(input.topPriority.unlockValue, 72),
    };
  }

  return null;
}

export function buildProviderIntelligenceOperationalStory(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  specialty?: string | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  recommendedNextStep?: string;
}): ProviderIntelligenceOperationalStory | null {
  if (!input.planning) return null;

  const relationshipStage = String(
    input.relationshipStage ?? input.contact.provider_relationship_stage ?? "prospect",
  )
    .trim()
    .toLowerCase();

  const workspace = buildIntelligenceWorkspaceSummary({
    contact: input.contact,
    planning: input.planning,
    specialty: input.specialty,
    relationshipStage,
    engagements: input.engagements,
    opportunities: input.opportunities,
    cases: input.cases,
  });

  if (!workspace) return null;

  const commercialStage = workspace.workflowStage;
  const readinessIndicators = buildProviderOverviewQualitativeReadiness({
    contact: input.contact,
    relationshipStage,
    commercialStage,
    engagements: input.engagements,
    opportunities: input.opportunities,
  });

  const maturity = workspace.maturity;
  const maturityStageLabel =
    PROVIDER_OVERVIEW_MATURITY_LABELS[maturity.stage] ??
    PROVIDER_INTELLIGENCE_MATURITY_LABELS[maturity.stage] ??
    workspace.maturityStageLabel;

  const commercialWorkflowLabel =
    PROVIDER_OVERVIEW_WORKFLOW_LABELS[commercialStage] ?? workspace.workflowStageLabel;

  const stageProgression = buildProviderOverviewStageProgression(maturity);
  const laneLabel = `${maturityStageLabel} · ${commercialWorkflowLabel}`;

  const fieldTimeRisk = buildProviderFieldTimeRisk({
    contact: input.contact,
    relationshipStage,
    commercialStage,
    engagements: input.engagements,
    readinessIndicators,
  });

  const recommendedNextStep =
    input.recommendedNextStep?.trim() ||
    "Validate OR access pathway before scheduling observation.";

  const briefing = buildProviderFieldCommandBriefing({
    contact: input.contact,
    planning: input.planning,
    commercialStage,
    laneLabel,
    recommendedNextStep,
    progression: stageProgression,
    fieldTimeRisk,
    maxOpenRisks: 3,
    maxValidated: 2,
  });

  const priorities = buildProviderNextDiscoveryPriorities({
    contact: input.contact,
    planning: input.planning,
    specialty: input.specialty,
    relationshipStage,
    engagements: input.engagements,
    opportunities: input.opportunities,
    cases: input.cases,
  }).filter((p) => p.priorityScore > 0);

  const topPriority = priorities.find((p) => p.id !== "refresh") ?? priorities[0];
  const secondaryMissions = priorities
    .filter((p) => p.id !== topPriority?.id && p.id !== "refresh")
    .slice(0, 2);

  const operationalStateTone: ProviderIntelligenceStoryTone =
    fieldTimeRisk.tone === "danger"
      ? "danger"
      : fieldTimeRisk.tone === "warn"
        ? "warn"
        : fieldTimeRisk.tone === "success"
          ? "success"
          : "brand";

  return {
    laneLabel,
    workflowStage: commercialStage,
    workflowStageLabel: commercialWorkflowLabel,
    maturityStageLabel,
    operationalState: {
      label: PROVIDER_INTELLIGENCE_STORY_LAYER_LABELS.operationalState,
      headline: scanLine(briefing.fieldCommand, 80),
      scan: buildOperationalStateScan({
        commercialStage,
        overallConfidenceLabel: workspace.overallConfidenceLabel,
        maturityStageLabel,
      }),
      tone: operationalStateTone,
    },
    deploymentRisk: buildDeploymentRiskLayer({ fieldTimeRisk, briefing }),
    leverageAction: buildLeverageActionLayer({
      priorities,
      briefing,
      commercialStage,
    }),
    unlocksNext: buildUnlocksLayer({ briefing, progression: stageProgression, topPriority }),
    secondaryMissions,
    briefing,
    fieldTimeRisk,
    stageProgression,
    workspace,
  };
}
