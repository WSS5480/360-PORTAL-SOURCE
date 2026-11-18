/**
 * Field time risk — synthesizes procedural inputs to guide OR / field visit allocation.
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
import {
  deriveIntelligenceSectionConfidence,
  type IntelligenceSectionConfidence,
} from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import {
  buildProviderOverviewQualitativeReadiness,
  type ProviderOverviewOperationalState,
  type ProviderOverviewReadinessIndicator,
} from "@/lib/surgical-sales/providerOverviewQualitativeReadiness";
import type { ProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import {
  parseIntelligenceCaptureValue,
} from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import {
  PROVIDER_FIELD_TIME_RISK_INPUT_LABELS,
  PROVIDER_FIELD_TIME_RISK_INPUT_STATUS_LABELS,
  PROVIDER_FIELD_TIME_RISK_KICKER,
  PROVIDER_FIELD_TIME_RISK_STATE_GUIDANCE,
  PROVIDER_FIELD_TIME_RISK_STATE_LABELS,
  PROVIDER_FIELD_TIME_RISK_TITLE,
  type ProviderFieldTimeRiskInputId,
  type ProviderFieldTimeRiskInputStatus,
  type ProviderFieldTimeRiskState,
} from "@/lib/surgical-sales/providerFieldTimeRiskVocabulary";
import {
  composeFieldTimeRiskNarrative,
  type FieldTimeRiskComposedNarrative,
} from "@/lib/surgical-sales/providerFieldTimeRiskNarratives";

export type { FieldTimeRiskComposedNarrative };

export type {
  ProviderFieldTimeRiskState,
  ProviderFieldTimeRiskInputId,
  ProviderFieldTimeRiskInputStatus,
} from "@/lib/surgical-sales/providerFieldTimeRiskVocabulary";

export type ProviderFieldTimeRiskTone = "success" | "caution" | "warn" | "danger";

export type ProviderFieldTimeRiskInput = {
  id: ProviderFieldTimeRiskInputId;
  label: string;
  status: ProviderFieldTimeRiskInputStatus;
  statusLabel: string;
  scan: string;
  sectionId: ProviderIntelligenceSectionId;
  dbKey?: string;
};

import {
  buildProtectFieldTimeAssessment,
  type ProtectFieldTimeAssessment,
} from "@/lib/surgical-sales/buildProtectFieldTimeAssessment";

export type ProviderFieldTimeRiskCore = {
  title: string;
  kicker: string;
  state: ProviderFieldTimeRiskState;
  stateLabel: string;
  stateScan: string;
  guidance: string;
  guidanceScan: string;
  tone: ProviderFieldTimeRiskTone;
  /** Predictive field-time narrative — primary UI surface. */
  narrative: FieldTimeRiskComposedNarrative;
  /** Weighted readiness score for sorting / diagnostics. */
  score: number;
  inputs: ProviderFieldTimeRiskInput[];
  primarySectionId: ProviderIntelligenceSectionId;
  primaryDbKey?: string;
};

export type ProviderFieldTimeRisk = ProviderFieldTimeRiskCore & {
  protectFieldTime: ProtectFieldTimeAssessment;
};

const ACCESS_BLOCKER_PATTERNS =
  /\b(block|denied|restricted|committee|gate|not allowed|no vendor|limited access|credentialing required)\b/i;

const FIELD_HEAVY_TYPES = new Set([
  "or_visit",
  "or_observation",
  "observation_request",
  "product_demo",
  "office_visit_360",
]);

const OBSERVATION_RELATIONSHIP_STAGES = new Set([
  "observation_requested",
  "observation_scheduled",
]);

const STATUS_SCORE: Record<ProviderFieldTimeRiskInputStatus, number> = {
  strong: 2,
  partial: 1,
  open: 0,
  blocking: -3,
};

const STATE_TONE: Record<ProviderFieldTimeRiskState, ProviderFieldTimeRiskTone> = {
  efficient_field_target: "success",
  worth_exploratory_visit: "caution",
  requires_remote_validation_first: "warn",
  high_wasted_field_risk: "danger",
};

function fieldText(contact: Record<string, unknown>, dbKey: string): string {
  return String(contact[dbKey] ?? "").trim();
}

function isAccessPathwayBlocked(contact: Record<string, unknown>): boolean {
  const raw = fieldText(contact, "provider_observation_feasibility");
  if (raw) {
    const parsed = parseIntelligenceCaptureValue("provider_observation_feasibility", raw);
    const token = parsed.token ?? parsed.tokens[0] ?? null;
    if (token && ["restricted", "not_allowed", "no", "blocked"].includes(token)) return true;
    if (/\b(not allowed|no observation|restricted)\b/i.test(raw)) return true;
  }
  return ACCESS_BLOCKER_PATTERNS.test(fieldText(contact, "provider_observation_access_path"));
}

function indicatorState(
  indicators: ProviderOverviewReadinessIndicator[],
  id: ProviderOverviewReadinessIndicator["id"],
): ProviderOverviewOperationalState | null {
  return indicators.find((i) => i.id === id)?.state ?? null;
}

function readinessToInputStatus(
  state: ProviderOverviewOperationalState | null,
): ProviderFieldTimeRiskInputStatus {
  if (!state || state === "emerging") return "open";
  if (state === "partially_validated") return "partial";
  return "strong";
}

function confidenceToInputStatus(confidence: IntelligenceSectionConfidence): ProviderFieldTimeRiskInputStatus {
  if (confidence === "unknown") return "open";
  if (confidence === "partial") return "partial";
  return "strong";
}

function buildInput(
  id: ProviderFieldTimeRiskInputId,
  status: ProviderFieldTimeRiskInputStatus,
  scan: string,
  sectionId: ProviderIntelligenceSectionId,
  dbKey?: string,
): ProviderFieldTimeRiskInput {
  return {
    id,
    label: PROVIDER_FIELD_TIME_RISK_INPUT_LABELS[id],
    status,
    statusLabel: PROVIDER_FIELD_TIME_RISK_INPUT_STATUS_LABELS[status],
    scan: scanLine(scan, 52),
    sectionId,
    dbKey,
  };
}

function assessCoordinator(contact: Record<string, unknown>): ProviderFieldTimeRiskInput {
  const id = "coordinator_mapped";
  const dbKey = "provider_observation_coordinator_contact";
  const gap = learningGapForField(dbKey, "observation_readiness", contact);
  const text = fieldText(contact, dbKey);
  if (gap?.state === "unknown") {
    return buildInput(id, "open", "OR coordinator not identified", "observation_readiness", dbKey);
  }
  if (gap || !fieldHasIntelligenceSignal(dbKey, text)) {
    return buildInput(id, "partial", "Coordinator contact partial", "observation_readiness", dbKey);
  }
  return buildInput(id, "strong", "Coordinator contact captured", "observation_readiness", dbKey);
}

function assessOrAccess(contact: Record<string, unknown>): ProviderFieldTimeRiskInput {
  const id = "or_access_known";
  if (isAccessPathwayBlocked(contact)) {
    return buildInput(
      id,
      "blocking",
      "OR access gates or allowance blocked",
      "observation_readiness",
      "provider_observation_access_path",
    );
  }
  const accessGap = learningGapForField(
    "provider_observation_access_path",
    "observation_readiness",
    contact,
  );
  const feasibilityGap = learningGapForField(
    "provider_observation_feasibility",
    "observation_readiness",
    contact,
  );
  if (accessGap?.state === "unknown" || feasibilityGap?.state === "unknown") {
    return buildInput(id, "open", "Access path or allowance not confirmed", "observation_readiness");
  }
  if (accessGap || feasibilityGap) {
    return buildInput(id, "partial", "Access captured with restrictions", "observation_readiness");
  }
  return buildInput(id, "strong", "OR access pathway documented", "observation_readiness");
}

function assessRelationship(
  indicators: ProviderOverviewReadinessIndicator[],
): ProviderFieldTimeRiskInput {
  const state = indicatorState(indicators, "relationship_maturity");
  const status = readinessToInputStatus(state);
  const scan =
    status === "strong"
      ? "Surgeon relationship supports field motion"
      : status === "partial"
        ? "Relationship warming — test responsiveness"
        : "Relationship still thin for heavy OR time";
  return buildInput("relationship_maturity", status, scan, "relationship_intelligence", "relationship_strength");
}

function assessWorkflow(contact: Record<string, unknown>): ProviderFieldTimeRiskInput {
  const confidence = deriveIntelligenceSectionConfidence("clinical_workflow", contact).confidence;
  const status = confidenceToInputStatus(confidence);
  const hasProcedure =
    fieldHasIntelligenceSignal("provider_procedure_focus", fieldText(contact, "provider_procedure_focus")) ||
    fieldHasIntelligenceSignal(
      "provider_technique_preferences",
      fieldText(contact, "provider_technique_preferences"),
    );
  const effectiveStatus =
    status === "strong" && !hasProcedure
      ? "partial"
      : status === "open" && hasProcedure
        ? "partial"
        : status;
  const scan =
    effectiveStatus === "strong"
      ? "Procedure workflow mapped"
      : effectiveStatus === "partial"
        ? "Workflow partially documented"
        : "Workflow not mapped for field visits";
  return buildInput("workflow_intelligence", effectiveStatus, scan, "clinical_workflow", "provider_procedure_focus");
}

function assessScheduling(contact: Record<string, unknown>): ProviderFieldTimeRiskInput {
  const keys = [
    "provider_observation_coordinator_contact",
    "provider_observation_cadence_preference",
    "provider_observation_best_days_case_types",
  ] as const;
  let captured = 0;
  let open = 0;
  for (const dbKey of keys) {
    const gap = learningGapForField(dbKey, "observation_readiness", contact);
    if (gap?.state === "unknown") open += 1;
    else if (!gap && fieldHasIntelligenceSignal(dbKey, fieldText(contact, dbKey))) captured += 1;
  }
  if (open >= 2) {
    return buildInput(
      "scheduling_clarity",
      "open",
      "Posting cadence and case window unknown",
      "observation_readiness",
      "provider_observation_cadence_preference",
    );
  }
  if (captured >= 2) {
    return buildInput("scheduling_clarity", "strong", "Scheduling pathway documented", "observation_readiness");
  }
  if (captured >= 1 || open === 1) {
    return buildInput("scheduling_clarity", "partial", "Some scheduling signals captured", "observation_readiness");
  }
  return buildInput(
    "scheduling_clarity",
    "open",
    "Scheduling cadence not mapped",
    "observation_readiness",
    "provider_observation_cadence_preference",
  );
}

export function observationFeasibilityAllowed(contact: Record<string, unknown>): boolean {
  const dbKey = "provider_observation_feasibility";
  const raw = fieldText(contact, dbKey);
  if (!fieldHasIntelligenceSignal(dbKey, raw)) return false;
  if (isAccessPathwayBlocked(contact)) return false;
  const parsed = parseIntelligenceCaptureValue(dbKey, raw);
  const token = parsed.token ?? parsed.tokens[0] ?? null;
  if (token === "easy" || token === "credentialing_required") return true;
  if (token === "restricted" || token === "not_allowed" || token === "no" || token === "blocked") {
    return false;
  }
  if (/\b(not allowed|no observation)\b/i.test(raw)) return false;
  if (/\ballowed\b/i.test(raw)) return true;
  return observationIsAllowed(contact);
}

function assessObservationFeasibility(contact: Record<string, unknown>): ProviderFieldTimeRiskInput {
  const dbKey = "provider_observation_feasibility";
  if (isAccessPathwayBlocked(contact)) {
    return buildInput(
      "observation_feasibility",
      "blocking",
      "Observation not feasible on current access rules",
      "observation_readiness",
      dbKey,
    );
  }
  const allowed = observationFeasibilityAllowed(contact);
  const feasibilityGap = learningGapForField(dbKey, "observation_readiness", contact);
  const raw = fieldText(contact, dbKey);
  const parsed = parseIntelligenceCaptureValue(dbKey, raw);
  const token = parsed.token ?? parsed.tokens[0] ?? null;

  if (token === "restricted" || token === "not_allowed" || /\b(not allowed|no observation)\b/i.test(raw)) {
    return buildInput(
      "observation_feasibility",
      "blocking",
      "Observation allowance not confirmed",
      "observation_readiness",
      dbKey,
    );
  }
  if (feasibilityGap?.state === "unknown") {
    return buildInput(
      "observation_feasibility",
      "open",
      "Observation allowance unknown",
      "observation_readiness",
      dbKey,
    );
  }
  if (allowed) {
    return buildInput("observation_feasibility", "strong", "Observation feasible on current signals", "observation_readiness");
  }
  if (feasibilityGap) {
    return buildInput("observation_feasibility", "partial", "Feasibility captured with caveats", "observation_readiness");
  }
  return buildInput(
    "observation_feasibility",
    "open",
    "Observation feasibility not established",
    "observation_readiness",
    dbKey,
  );
}

function resolveState(input: {
  score: number;
  inputs: ProviderFieldTimeRiskInput[];
  commercialStage: ProviderCommercialWorkflowStage;
  relationshipStage: string;
  engagements: ProviderEngagementSummary[];
  indicators: ProviderOverviewReadinessIndicator[];
}): ProviderFieldTimeRiskState {
  const blockingCount = input.inputs.filter((i) => i.status === "blocking").length;
  const openCount = input.inputs.filter((i) => i.status === "open").length;
  const strongCount = input.inputs.filter((i) => i.status === "strong").length;

  const coordinator = input.inputs.find((i) => i.id === "coordinator_mapped")!;
  const access = input.inputs.find((i) => i.id === "or_access_known")!;
  const scheduling = input.inputs.find((i) => i.id === "scheduling_clarity")!;
  const feasibility = input.inputs.find((i) => i.id === "observation_feasibility")!;

  const completedEngagements = input.engagements.filter(
    (e) => String(e.status || "").toLowerCase() === "completed",
  ).length;
  const upcomingFieldHeavy = input.engagements.some(
    (e) =>
      isUpcomingEngagementStatus(e.status) &&
      FIELD_HEAVY_TYPES.has(String(e.engagement_type || "").toLowerCase()),
  );

  if (blockingCount > 0 || access.status === "blocking" || feasibility.status === "blocking") {
    return "high_wasted_field_risk";
  }

  if (
    input.score >= 6 &&
    strongCount >= 2 &&
    access.status !== "open" &&
    feasibility.status !== "open" &&
    coordinator.status !== "open"
  ) {
    return "efficient_field_target";
  }

  if (
    input.commercialStage === "early_discovery" &&
    strongCount <= 1 &&
    openCount >= 3 &&
    completedEngagements === 0 &&
    !upcomingFieldHeavy
  ) {
    return "high_wasted_field_risk";
  }

  if (
    coordinator.status === "open" &&
    scheduling.status === "open" &&
    access.status === "open" &&
    strongCount <= 1 &&
    (input.commercialStage === "observation" ||
      OBSERVATION_RELATIONSHIP_STAGES.has(input.relationshipStage.trim().toLowerCase()))
  ) {
    return "high_wasted_field_risk";
  }

  const needsRemoteValidation =
    coordinator.status !== "strong" || scheduling.status === "open" || upcomingFieldHeavy;

  if (needsRemoteValidation && input.score < 7) {
    if (input.score >= 6 && strongCount >= 2 && access.status !== "open") {
      return "worth_exploratory_visit";
    }
    return "requires_remote_validation_first";
  }

  if (input.score >= 5 && input.score < 7) {
    const relationship = indicatorState(input.indicators, "relationship_maturity");
    if (relationship === "partially_validated" || relationship === "operationally_viable") {
      return "worth_exploratory_visit";
    }
  }

  if (input.score <= 3 || openCount >= 4) {
    return "high_wasted_field_risk";
  }

  return "requires_remote_validation_first";
}

function primaryGap(inputs: ProviderFieldTimeRiskInput[]): {
  sectionId: ProviderIntelligenceSectionId;
  dbKey?: string;
} {
  const priority: ProviderFieldTimeRiskInputId[] = [
    "or_access_known",
    "observation_feasibility",
    "coordinator_mapped",
    "scheduling_clarity",
    "workflow_intelligence",
    "relationship_maturity",
  ];
  for (const id of priority) {
    const row = inputs.find((i) => i.id === id);
    if (row && (row.status === "blocking" || row.status === "open")) {
      return { sectionId: row.sectionId, dbKey: row.dbKey };
    }
  }
  return { sectionId: "observation_readiness" };
}

export function buildProviderFieldTimeRisk(input: {
  contact: Record<string, unknown>;
  relationshipStage: string;
  commercialStage: ProviderCommercialWorkflowStage;
  engagements?: ProviderEngagementSummary[];
  readinessIndicators?: ProviderOverviewReadinessIndicator[];
}): ProviderFieldTimeRisk {
  const indicators =
    input.readinessIndicators ??
    buildProviderOverviewQualitativeReadiness({
      contact: input.contact,
      relationshipStage: input.relationshipStage,
      commercialStage: input.commercialStage,
      engagements: input.engagements,
    });

  const engagements = input.engagements ?? [];
  const inputs: ProviderFieldTimeRiskInput[] = [
    assessCoordinator(input.contact),
    assessOrAccess(input.contact),
    assessRelationship(indicators),
    assessWorkflow(input.contact),
    assessScheduling(input.contact),
    assessObservationFeasibility(input.contact),
  ];

  const score = inputs.reduce((sum, row) => sum + STATUS_SCORE[row.status], 0);
  const state = resolveState({
    score,
    inputs,
    commercialStage: input.commercialStage,
    relationshipStage: input.relationshipStage,
    engagements,
    indicators,
  });

  const guidance = PROVIDER_FIELD_TIME_RISK_STATE_GUIDANCE[state];
  const gap = primaryGap(inputs);
  const narrative = composeFieldTimeRiskNarrative({
    state,
    inputs: inputs.map((row) => ({ id: row.id, status: row.status })),
    contact: input.contact,
  });

  const core = {
    title: PROVIDER_FIELD_TIME_RISK_TITLE,
    kicker: PROVIDER_FIELD_TIME_RISK_KICKER,
    state,
    stateLabel: narrative.tierLabel,
    stateScan: scanLine(narrative.tierLabel, 48),
    guidance,
    guidanceScan: scanLine(narrative.whyFieldTimeFails, 96),
    tone: STATE_TONE[state],
    narrative,
    score,
    inputs,
    primarySectionId: gap.sectionId,
    primaryDbKey: gap.dbKey,
  };

  const protectFieldTime = buildProtectFieldTimeAssessment({
    contact: input.contact,
    relationshipStage: input.relationshipStage,
    commercialStage: input.commercialStage,
    engagements: input.engagements,
    fieldTimeRisk: core,
  });

  return {
    ...core,
    protectFieldTime,
  };
}
