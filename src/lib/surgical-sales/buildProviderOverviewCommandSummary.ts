/**
 * Compact operational command summary for provider overview (field-ops dashboard).
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderCommercialMomentumTone } from "@/lib/surgical-sales/providerCommercialMomentum";
import type { ProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import {
  buildProviderOverviewQualitativeReadiness,
  type ProviderOverviewReadinessIndicator,
} from "@/lib/surgical-sales/providerOverviewQualitativeReadiness";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import {
  buildProviderOverviewStageProgression,
  type ProviderOverviewStageProgression,
} from "@/lib/surgical-sales/buildProviderOverviewStageProgression";
import { buildProviderIntelligenceMaturitySnapshot } from "@/lib/surgical-sales/providerIntelligenceMaturity";
import {
  PROVIDER_OVERVIEW_MATURITY_LABELS,
  PROVIDER_OVERVIEW_WORKFLOW_LABELS,
} from "@/lib/surgical-sales/providerOverviewVocabulary";
import {
  buildProviderFieldCommandBriefing,
  type ProviderFieldCommandBriefing,
} from "@/lib/surgical-sales/buildProviderFieldCommandBriefing";
import {
  buildProviderFieldTimeRisk,
  type ProviderFieldTimeRisk,
} from "@/lib/surgical-sales/buildProviderFieldTimeRisk";
import {
  buildProviderProgressionConfidence,
  type ProviderProgressionConfidenceIndicator,
} from "@/lib/surgical-sales/buildProviderProgressionConfidence";
import type { ProviderFieldDeploymentBriefing } from "@/lib/surgical-sales/buildProviderFieldDeploymentBriefing";

export type ProviderOverviewCommandSummary = {
  maturityStage: string;
  commercialWorkflowLabel: string;
  stageProgression: ProviderOverviewStageProgression | null;
  readinessIndicators: ProviderOverviewReadinessIndicator[];
  recommendedNextStep: string;
  recommendedNextStepScan: string;
  briefing: ProviderFieldCommandBriefing;
  fieldTimeRisk: ProviderFieldTimeRisk;
  progressionConfidence: ProviderProgressionConfidenceIndicator[];
  tone: ProviderCommercialMomentumTone;
  /** Four-question deployment briefing — attached in narrative builder when gaps/feasibility exist. */
  deployment?: ProviderFieldDeploymentBriefing;
};

export function buildProviderOverviewCommandSummary(input: {
  contact: Record<string, unknown>;
  relationshipStage: string;
  planning?: ProviderPlanningCompletion | null;
  commercialStage: ProviderCommercialWorkflowStage;
  stageLabel: string;
  recommendedNextStep: string;
  tone: ProviderCommercialMomentumTone;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
}): ProviderOverviewCommandSummary {
  const readinessIndicators = buildProviderOverviewQualitativeReadiness({
    contact: input.contact,
    relationshipStage: input.relationshipStage,
    commercialStage: input.commercialStage,
    engagements: input.engagements,
    opportunities: input.opportunities,
  });

  const recommendedNextStep =
    input.recommendedNextStep.trim() ||
    "Schedule the next touch and capture intelligence from the conversation.";

  const maturity = buildProviderIntelligenceMaturitySnapshot({
    contact: input.contact,
    planning: input.planning,
    relationshipStage: input.relationshipStage,
    opportunities: input.opportunities,
    engagements: input.engagements,
    cases: input.cases,
  });

  const maturityStage = PROVIDER_OVERVIEW_MATURITY_LABELS[maturity.stage] ?? maturity.stageLabel;
  const commercialWorkflowLabel =
    PROVIDER_OVERVIEW_WORKFLOW_LABELS[input.commercialStage] ?? input.stageLabel;
  const stageProgression = buildProviderOverviewStageProgression(maturity);

  const laneLabel = `${maturityStage} · ${commercialWorkflowLabel}`;

  const fieldTimeRisk = buildProviderFieldTimeRisk({
    contact: input.contact,
    relationshipStage: input.relationshipStage,
    commercialStage: input.commercialStage,
    engagements: input.engagements,
    readinessIndicators,
  });

  const progressionConfidence = buildProviderProgressionConfidence({
    contact: input.contact,
    relationshipStage: input.relationshipStage,
    commercialStage: input.commercialStage,
    engagements: input.engagements,
    opportunities: input.opportunities,
    cases: input.cases,
    readinessIndicators,
  });

  const briefing = buildProviderFieldCommandBriefing({
    contact: input.contact,
    planning: input.planning,
    commercialStage: input.commercialStage,
    laneLabel,
    recommendedNextStep,
    progression: stageProgression,
    fieldTimeRisk,
  });

  return {
    maturityStage,
    commercialWorkflowLabel,
    stageProgression,
    readinessIndicators,
    recommendedNextStep,
    recommendedNextStepScan: scanLine(recommendedNextStep, 88),
    briefing,
    fieldTimeRisk,
    progressionConfidence,
    tone: input.tone,
  };
}
