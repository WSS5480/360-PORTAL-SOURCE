/**
 * Field efficiency intelligence — synthesizes account signals to guide rep time allocation.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  isUpcomingEngagementStatus,
  pickNextUpcomingEngagement,
} from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { learningGapForField } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { observationIsAllowed } from "@/lib/surgical-sales/providerIntelligenceProgressiveCapture";
import { parseIntelligenceCaptureValue } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import type { ProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import type {
  ProviderOverviewOperationalState,
  ProviderOverviewReadinessIndicator,
} from "@/lib/surgical-sales/providerOverviewQualitativeReadiness";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import {
  buildProviderFieldTimeRisk,
  type ProviderFieldTimeRisk,
  type ProviderFieldTimeRiskState,
} from "@/lib/surgical-sales/buildProviderFieldTimeRisk";

import { PROVIDER_OVERVIEW_FIELD_EXECUTION_TITLE as PROVIDER_FIELD_EFFICIENCY_TITLE } from "@/lib/surgical-sales/providerOverviewVocabulary";

export { PROVIDER_FIELD_EFFICIENCY_TITLE };
export type { ProviderFieldTimeRisk };

export type ProviderFieldEffortPosture =
  | "invest_field"
  | "hold_field"
  | "map_first"
  | "protect_field";

export type ProviderFieldEfficiencySignalId =
  | "high_observation_potential"
  | "too_early_for_field_visit"
  | "relationship_progressing_quickly"
  | "access_pathway_blocked"
  | "requires_coordinator_mapping"
  | "evaluation_field_focus"
  | "workflow_mapping_before_demo"
  | "steady_field_account";

const POSTURE_LABELS: Record<ProviderFieldEffortPosture, string> = {
  invest_field: "Invest field time",
  hold_field: "Hold field time",
  map_first: "Map workflow intelligence first",
  protect_field: "Protect field time",
};

const ACCESS_BLOCKER_PATTERNS =
  /\b(block|denied|restricted|committee|gate|not allowed|no vendor|limited access|credentialing required)\b/i;

const OBSERVATION_RELATIONSHIP_STAGES = new Set([
  "observation_requested",
  "observation_scheduled",
]);

const FIELD_HEAVY_UPCOMING_TYPES = new Set([
  "or_visit",
  "or_observation",
  "observation_request",
  "product_demo",
  "office_visit_360",
]);

export type ProviderFieldEfficiencySignal = {
  id: ProviderFieldEfficiencySignalId;
  headline: string;
  guidance: string;
  posture: ProviderFieldEffortPosture;
  postureLabel: string;
  rationale: string;
  sources: string[];
  priority: number;
  sectionId?: ProviderIntelligenceSectionId;
  dbKey?: string;
};

export type ProviderFieldEfficiencyIntelligence = {
  title: string;
  fieldTimeRisk: ProviderFieldTimeRisk;
  primary: ProviderFieldEfficiencySignal;
  supporting: ProviderFieldEfficiencySignal[];
  allocationScan: string;
};

const FIELD_TIME_RISK_TO_POSTURE: Record<ProviderFieldTimeRiskState, ProviderFieldEffortPosture> = {
  efficient_field_target: "invest_field",
  worth_exploratory_visit: "invest_field",
  requires_remote_validation_first: "map_first",
  high_wasted_field_risk: "hold_field",
};

const FIELD_TIME_RISK_TO_SIGNAL_ID: Record<ProviderFieldTimeRiskState, ProviderFieldEfficiencySignalId> = {
  efficient_field_target: "high_observation_potential",
  worth_exploratory_visit: "relationship_progressing_quickly",
  requires_remote_validation_first: "requires_coordinator_mapping",
  high_wasted_field_risk: "too_early_for_field_visit",
};

function primaryFromFieldTimeRisk(risk: ProviderFieldTimeRisk): ProviderFieldEfficiencySignal {
  return signal({
    id: FIELD_TIME_RISK_TO_SIGNAL_ID[risk.state],
    headline: risk.stateLabel,
    guidance: risk.guidance,
    posture: FIELD_TIME_RISK_TO_POSTURE[risk.state],
    sources: risk.inputs.map((row) => row.label),
    priority: 100,
    sectionId: risk.primarySectionId,
    dbKey: risk.primaryDbKey,
  });
}

function fieldText(contact: Record<string, unknown>, dbKey: string): string {
  return String(contact[dbKey] ?? "").trim();
}

function feasibilityToken(contact: Record<string, unknown>): string | null {
  const raw = fieldText(contact, "provider_observation_feasibility");
  if (!raw) return null;
  const parsed = parseIntelligenceCaptureValue("provider_observation_feasibility", raw);
  return parsed.token ?? parsed.tokens[0] ?? null;
}

function isAccessPathwayBlocked(contact: Record<string, unknown>): boolean {
  const token = feasibilityToken(contact);
  if (token && ["restricted", "not_allowed", "no", "blocked"].includes(token)) return true;
  const feasibilityText = fieldText(contact, "provider_observation_feasibility");
  if (/\b(not allowed|no observation|restricted)\b/i.test(feasibilityText)) return true;
  const accessText = fieldText(contact, "provider_observation_access_path");
  return ACCESS_BLOCKER_PATTERNS.test(accessText);
}

function indicatorState(
  indicators: ProviderOverviewReadinessIndicator[],
  id: ProviderOverviewReadinessIndicator["id"],
): ProviderOverviewOperationalState | null {
  return indicators.find((i) => i.id === id)?.state ?? null;
}

function engagementProgression(engagements: ProviderEngagementSummary[]) {
  const completed = engagements.filter((e) => String(e.status || "").toLowerCase() === "completed");
  const upcoming = engagements.filter((e) => isUpcomingEngagementStatus(e.status));
  const next = pickNextUpcomingEngagement(engagements);
  const nextType = next ? String(next.engagement_type || "").toLowerCase() : null;

  return {
    completedCount: completed.length,
    upcomingCount: upcoming.length,
    hasObservationHistory: engagements.some((e) =>
      ["observation_request", "or_visit", "or_observation"].includes(
        String(e.engagement_type || "").toLowerCase(),
      ),
    ),
    upcomingFieldHeavy: upcoming.some((e) =>
      FIELD_HEAVY_UPCOMING_TYPES.has(String(e.engagement_type || "").toLowerCase()),
    ),
    nextIsFieldHeavy: nextType ? FIELD_HEAVY_UPCOMING_TYPES.has(nextType) : false,
    nextIsDemo: nextType === "product_demo" || nextType === "office_visit_360",
  };
}

function signal(
  partial: Omit<ProviderFieldEfficiencySignal, "postureLabel" | "rationale"> & { rationale?: string },
): ProviderFieldEfficiencySignal {
  return {
    ...partial,
    rationale: partial.rationale ?? partial.guidance,
    postureLabel: POSTURE_LABELS[partial.posture],
  };
}

function detectAccessPathwayBlocked(contact: Record<string, unknown>): ProviderFieldEfficiencySignal | null {
  if (!isAccessPathwayBlocked(contact)) return null;
  const feasibilityCaptured = fieldHasIntelligenceSignal(
    "provider_observation_feasibility",
    fieldText(contact, "provider_observation_feasibility"),
  );

  return signal({
    id: "access_pathway_blocked",
    headline: "Access details open",
    guidance: feasibilityCaptured
      ? "Hold OR days until access gates clear."
      : "Map access pathway before any field time.",
    posture: "hold_field",
    sources: ["Observation readiness", "Workflow intelligence"],
    priority: 92,
    sectionId: "observation_readiness",
    dbKey: "provider_observation_access_path",
  });
}

function detectRequiresCoordinatorMapping(
  contact: Record<string, unknown>,
  commercialStage: ProviderCommercialWorkflowStage,
  relationshipStage: string,
): ProviderFieldEfficiencySignal | null {
  if (isAccessPathwayBlocked(contact)) return null;

  const observationPathActive =
    observationIsAllowed(contact) ||
    commercialStage === "observation" ||
    OBSERVATION_RELATIONSHIP_STAGES.has(relationshipStage.trim().toLowerCase());

  if (!observationPathActive) return null;

  const coordinatorGap = learningGapForField(
    "provider_observation_coordinator_contact",
    "observation_readiness",
    contact,
  );
  if (!coordinatorGap) return null;

  return signal({
    id: "requires_coordinator_mapping",
    headline: "Requires coordinator mapping first",
    guidance: "Map coordinator contact before travel or OR time.",
    posture: "map_first",
    sources: ["Observation readiness", "Engagement progression"],
    priority: 86,
    sectionId: "observation_readiness",
    dbKey: "provider_observation_coordinator_contact",
  });
}

function detectTooEarlyForFieldVisit(
  contact: Record<string, unknown>,
  commercialStage: ProviderCommercialWorkflowStage,
  indicators: ProviderOverviewReadinessIndicator[],
  progression: ReturnType<typeof engagementProgression>,
): ProviderFieldEfficiencySignal | null {
  if (commercialStage !== "early_discovery") return null;
  if (isAccessPathwayBlocked(contact)) return null;

  const observation = indicatorState(indicators, "observation_readiness");
  const workflow = indicatorState(indicators, "workflow_understanding");
  const relationship = indicatorState(indicators, "relationship_maturity");

  const thinAccount =
    observation === "emerging" &&
    workflow === "emerging" &&
    (relationship === "emerging" || relationship === "partially_validated");

  if (!thinAccount) return null;
  if (progression.completedCount > 0 && progression.hasObservationHistory) return null;
  if (progression.upcomingFieldHeavy) return null;

  return signal({
    id: "too_early_for_field_visit",
    headline: "Too early for OR time",
    guidance: "Phone and intelligence first — skip OR and demo days.",
    posture: "hold_field",
    sources: [
      "Engagement progression",
      "Observation readiness",
      "Workflow intelligence",
      "Relationship maturity",
    ],
    priority: 82,
    sectionId: "clinical_workflow",
    dbKey: "provider_primary_procedures",
  });
}

function detectHighObservationPotential(
  contact: Record<string, unknown>,
  commercialStage: ProviderCommercialWorkflowStage,
  relationshipStage: string,
  indicators: ProviderOverviewReadinessIndicator[],
): ProviderFieldEfficiencySignal | null {
  if (isAccessPathwayBlocked(contact)) return null;

  const observation = indicatorState(indicators, "observation_readiness");
  const rel = relationshipStage.trim().toLowerCase();
  const coordinatorMapped = !learningGapForField(
    "provider_observation_coordinator_contact",
    "observation_readiness",
    contact,
  );

  const observationReady =
    observation === "observation_ready" ||
    (observation === "operationally_viable" && observationIsAllowed(contact) && coordinatorMapped) ||
    (observation === "partially_validated" &&
      observationIsAllowed(contact) &&
      coordinatorMapped &&
      commercialStage === "observation");

  if (!observationReady) return null;
  if (commercialStage === "early_discovery" && !OBSERVATION_RELATIONSHIP_STAGES.has(rel)) {
    if (!observationIsAllowed(contact)) return null;
  }

  return signal({
    id: "high_observation_potential",
    headline: "High observation yield",
    guidance: "Prioritize observation scheduling and aligned field time.",
    posture: "invest_field",
    sources: ["Observation readiness", "Engagement progression", "Relationship maturity"],
    priority: 78,
    sectionId: "observation_readiness",
    dbKey: "provider_observation_feasibility",
  });
}

function detectRelationshipProgressingQuickly(
  indicators: ProviderOverviewReadinessIndicator[],
  progression: ReturnType<typeof engagementProgression>,
): ProviderFieldEfficiencySignal | null {
  const relationship = indicatorState(indicators, "relationship_maturity");
  if (relationship !== "partially_validated" && relationship !== "operationally_viable") {
    return null;
  }

  const motion =
    progression.completedCount >= 2 ||
    (progression.completedCount >= 1 && progression.upcomingCount >= 1);

  if (!motion) return null;

  return signal({
    id: "relationship_progressing_quickly",
    headline: "Surgeon access advancing",
    guidance: "Stack the next dated touch while momentum is warm.",
    posture: "invest_field",
    sources: ["Engagement progression", "Relationship maturity"],
    priority: 74,
    sectionId: "relationship_intelligence",
    dbKey: "relationship_strength",
  });
}

function detectWorkflowMappingBeforeDemo(
  indicators: ProviderOverviewReadinessIndicator[],
  progression: ReturnType<typeof engagementProgression>,
): ProviderFieldEfficiencySignal | null {
  if (!progression.nextIsDemo && !progression.upcomingFieldHeavy) return null;

  const workflow = indicatorState(indicators, "workflow_understanding");
  if (workflow !== "emerging" && workflow !== "partially_validated") return null;

  return signal({
    id: "workflow_mapping_before_demo",
    headline: "Map procedure workflow before demo",
    guidance: "Document workflow pain before the scheduled demo visit.",
    posture: "map_first",
    sources: ["Workflow intelligence", "Engagement progression"],
    priority: 68,
    sectionId: "clinical_workflow",
    dbKey: "provider_primary_procedures",
  });
}

function detectEvaluationFieldFocus(
  commercialStage: ProviderCommercialWorkflowStage,
  indicators: ProviderOverviewReadinessIndicator[],
  progression: ReturnType<typeof engagementProgression>,
): ProviderFieldEfficiencySignal | null {
  if (commercialStage !== "evaluation") return null;

  const commercial = indicatorState(indicators, "commercial_influence");
  if (commercial !== "evaluation_active" && commercial !== "operationally_viable") return null;

  return signal({
    id: "evaluation_field_focus",
    headline: "Evaluation active — narrow OR focus",
    guidance: "Field time only for trial cases and named blockers.",
    posture: "protect_field",
    sources: ["Commercial influence", "Workflow intelligence", "Engagement progression"],
    priority: 64,
    sectionId: "commercial_signals",
    dbKey: "provider_evaluation_openness",
  });
}

function defaultSteadyFieldAccount(
  commercialStage: ProviderCommercialWorkflowStage,
  indicators: ProviderOverviewReadinessIndicator[],
  progression: ReturnType<typeof engagementProgression>,
): ProviderFieldEfficiencySignal {
  const posture: ProviderFieldEffortPosture =
    progression.upcomingCount > 0 ? "protect_field" : "invest_field";

  return signal({
    id: "steady_field_account",
    headline: "Steady procedural account",
    guidance:
      progression.upcomingCount > 0
        ? "Match field time to the scheduled touch and prep."
        : "Schedule the next touch before more field coverage.",
    posture,
    sources: [
      "Engagement progression",
      "Observation readiness",
      "Workflow intelligence",
      "Relationship maturity",
    ],
    priority: 40,
  });
}

function allocationScanFromPrimary(primary: ProviderFieldEfficiencySignal): string {
  return `${primary.postureLabel} · ${primary.headline}`;
}

export function buildProviderFieldEfficiencyIntelligence(input: {
  contact: Record<string, unknown>;
  relationshipStage: string;
  commercialStage: ProviderCommercialWorkflowStage;
  engagements: ProviderEngagementSummary[];
  readinessIndicators: ProviderOverviewReadinessIndicator[];
}): ProviderFieldEfficiencyIntelligence {
  const fieldTimeRisk = buildProviderFieldTimeRisk({
    contact: input.contact,
    relationshipStage: input.relationshipStage,
    commercialStage: input.commercialStage,
    engagements: input.engagements,
    readinessIndicators: input.readinessIndicators,
  });

  const progression = engagementProgression(input.engagements);

  const candidates = [
    detectAccessPathwayBlocked(input.contact),
    detectRequiresCoordinatorMapping(
      input.contact,
      input.commercialStage,
      input.relationshipStage,
    ),
    detectTooEarlyForFieldVisit(
      input.contact,
      input.commercialStage,
      input.readinessIndicators,
      progression,
    ),
    detectHighObservationPotential(
      input.contact,
      input.commercialStage,
      input.relationshipStage,
      input.readinessIndicators,
    ),
    detectRelationshipProgressingQuickly(input.readinessIndicators, progression),
    detectWorkflowMappingBeforeDemo(input.readinessIndicators, progression),
    detectEvaluationFieldFocus(
      input.commercialStage,
      input.readinessIndicators,
      progression,
    ),
  ].filter(Boolean) as ProviderFieldEfficiencySignal[];

  const sorted = [...candidates].sort((a, b) => b.priority - a.priority);
  const primary = primaryFromFieldTimeRisk(fieldTimeRisk);

  const supporting = sorted
    .filter((s) => s.id !== primary.id && s.headline !== primary.headline)
    .slice(0, 2);

  return {
    title: PROVIDER_FIELD_EFFICIENCY_TITLE,
    fieldTimeRisk,
    primary,
    supporting,
    allocationScan: `${fieldTimeRisk.stateLabel} · ${scanLine(fieldTimeRisk.guidance, 40)}`,
  };
}
