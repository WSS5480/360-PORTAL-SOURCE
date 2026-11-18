/**
 * Unified operational readiness — procedural motion gates from seven field-authentic pillars.
 * No numeric CRM scores; verdicts are procedural and medically grounded.
 */

import { normalizeSalesStage, type SalesStage } from "@/lib/sales/stages";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  buildProviderObservationFeasibilitySummary,
  type ProviderObservationFeasibilitySummary,
} from "@/lib/surgical-sales/buildProviderObservationFeasibilitySummary";
import { buildProviderRelationshipOperationalMaturity } from "@/lib/surgical-sales/buildProviderRelationshipOperationalMaturity";
import { buildProviderOverviewQualitativeReadiness } from "@/lib/surgical-sales/providerOverviewQualitativeReadiness";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { learningGapForField } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import {
  deriveIntelligenceSectionConfidence,
  type IntelligenceSectionConfidence,
} from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import {
  intelligenceCaptureHasSignal,
  parseIntelligenceCaptureValue,
} from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import {
  resolveProviderCommercialWorkflowStage,
  type ProviderCommercialWorkflowStage,
} from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import { buildProtectFieldTimeAssessment } from "@/lib/surgical-sales/buildProtectFieldTimeAssessment";
import type { ProtectFieldTimeAssessment } from "@/lib/surgical-sales/buildProtectFieldTimeAssessment";
import { PROVIDER_OPS_TERM } from "@/lib/surgical-sales/providerOverviewVocabulary";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import {
  buildProviderOperationalReadinessEngine,
  type OperationalReadinessVerdict,
} from "@/lib/surgical-sales/buildProviderOperationalReadinessEngine";
import {
  OPERATIONAL_READINESS_ENGINE_KICKER,
  OPERATIONAL_READINESS_ENGINE_TITLE,
} from "@/lib/surgical-sales/providerOperationalReadinessVocabulary";

export const OPERATIONAL_READINESS_FRAMEWORK_TITLE = "Operational readiness";
export const OPERATIONAL_READINESS_FRAMEWORK_KICKER =
  "Procedural gates for observation, evaluation, and commercialization — derived from OR access, workflow, relationship, and field execution signals.";

export const OPERATIONAL_READINESS_PILLAR_IDS = [
  "or_access_maturity",
  "workflow_intelligence",
  "relationship_mapping",
  "procedural_alignment",
  "scheduling_clarity",
  "vendor_pathway",
  "commercialization_influence",
] as const;

export type OperationalReadinessPillarId = (typeof OPERATIONAL_READINESS_PILLAR_IDS)[number];

export type OperationalReadinessPillarPosture = "validated" | "forming" | "thin" | "blocked";

export type OperationalReadinessPillarAssessment = {
  id: OperationalReadinessPillarId;
  label: string;
  posture: OperationalReadinessPillarPosture;
  postureLabel: string;
  scanLine: string;
  blockers: string[];
  proceduralNote: string | null;
  primarySectionId: ProviderIntelligenceSectionId;
};

export const OPERATIONAL_MOTION_IDS = ["observation", "evaluation", "commercialization"] as const;

export type OperationalMotionId = (typeof OPERATIONAL_MOTION_IDS)[number];

export type OperationalMotionVerdict = "ready" | "approaching" | "not_ready" | "blocked";

export type OperationalMotionReadiness = {
  motion: OperationalMotionId;
  label: string;
  verdict: OperationalMotionVerdict;
  verdictLabel: string;
  headline: string;
  interpretation: string;
  tone: "success" | "warn" | "neutral" | "blocked";
  guidingPillars: OperationalReadinessPillarId[];
  blockers: string[];
  safeToProceed: boolean;
  proceduralChecks: string[];
};

export type ProviderOperationalReadinessFramework = {
  title: string;
  kicker: string;
  /** Unified field verdict — canonical readiness output. */
  verdict: OperationalReadinessVerdict;
  pillars: OperationalReadinessPillarAssessment[];
  motions: OperationalMotionReadiness[];
  primaryFocusMotion: OperationalMotionId;
  fieldGuidance: string;
  protectFieldTime: ProtectFieldTimeAssessment;
};

const PILLAR_LABELS: Record<OperationalReadinessPillarId, string> = {
  or_access_maturity: "OR access maturity",
  workflow_intelligence: "Workflow intelligence",
  relationship_mapping: "Relationship mapping",
  procedural_alignment: "Procedural alignment",
  scheduling_clarity: "Scheduling clarity",
  vendor_pathway: "Vendor pathway",
  commercialization_influence: "Commercialization influence",
};

const PILLAR_SECTIONS: Record<OperationalReadinessPillarId, ProviderIntelligenceSectionId> = {
  or_access_maturity: "observation_readiness",
  workflow_intelligence: "clinical_workflow",
  relationship_mapping: "relationship_intelligence",
  procedural_alignment: "clinical_workflow",
  scheduling_clarity: "observation_readiness",
  vendor_pathway: "or_environment",
  commercialization_influence: "commercial_signals",
};

const POSTURE_LABELS: Record<OperationalReadinessPillarPosture, string> = {
  validated: "Validated on file",
  forming: "Forming — confirm before high-stakes moves",
  thin: "Not yet mapped for field use",
  blocked: "Not ready for this motion yet",
};

const MOTION_LABELS: Record<OperationalMotionId, string> = {
  observation: "Observation",
  evaluation: "Evaluation",
  commercialization: "Commercialization effort",
};

const VERDICT_LABELS: Record<OperationalMotionVerdict, string> = {
  ready: "Ready to proceed",
  approaching: "Approaching readiness",
  not_ready: "Still developing — build foundation first",
  blocked: "Gates to confirm — validate before deploying",
};

const CONFIDENCE_RANK: Record<IntelligenceSectionConfidence, number> = {
  unknown: 0,
  partial: 1,
  confirmed: 2,
  validated: 3,
};

const EVALUATION_OPPORTUNITY_STAGES = new Set<SalesStage>([
  "clinical_validation",
  "evaluation_planned",
  "evaluation_active",
  "outcome_review",
]);

const ADOPTION_OPPORTUNITY_STAGES = new Set<SalesStage>([
  "preference_card_progress",
  "adoption_expanding",
  "won",
]);

function fieldText(contact: Record<string, unknown>, dbKey: string): string {
  return String(contact[dbKey] ?? "").trim();
}

function fieldToken(contact: Record<string, unknown>, dbKey: string): string | null {
  const raw = fieldText(contact, dbKey);
  if (!raw) return null;
  const parsed = parseIntelligenceCaptureValue(dbKey, raw);
  return parsed.token ?? parsed.tokens[0] ?? null;
}

function hasSignal(contact: Record<string, unknown>, dbKey: string): boolean {
  return fieldHasIntelligenceSignal(dbKey, fieldText(contact, dbKey));
}

function confidenceToPosture(confidence: IntelligenceSectionConfidence): OperationalReadinessPillarPosture {
  if (confidence === "validated") return "validated";
  if (confidence === "confirmed") return "forming";
  if (confidence === "partial") return "forming";
  return "thin";
}

function pillarBlockers(
  contact: Record<string, unknown>,
  sectionId: ProviderIntelligenceSectionId,
  dbKeys: string[],
  max = 2,
): string[] {
  const lines: string[] = [];
  for (const dbKey of dbKeys) {
    const gap = learningGapForField(dbKey, sectionId, contact);
    if (gap?.phrase) lines.push(gap.phrase);
    if (lines.length >= max) break;
  }
  return lines;
}

function opportunitiesInStages(
  opportunities: Array<Record<string, unknown>> | undefined,
  stages: Set<SalesStage>,
): boolean {
  return (opportunities ?? []).some((o) => {
    const stage = normalizeSalesStage(String(o.stage || ""));
    return stage != null && stages.has(stage);
  });
}

function assessOrAccessMaturity(
  contact: Record<string, unknown>,
  observationSummary: ProviderObservationFeasibilitySummary,
): OperationalReadinessPillarAssessment {
  const sectionConfidence = deriveIntelligenceSectionConfidence("observation_readiness", contact)
    .confidence;
  const allowanceToken = fieldToken(contact, "provider_observation_feasibility");
  const accessRestricted =
    allowanceToken === "restricted" ||
    observationSummary.verdictId === "blockers_identified" ||
    observationSummary.inputs.some(
      (i) => i.id === "observation_allowed" && i.status === "restrictive",
    );

  let posture: OperationalReadinessPillarPosture;
  if (accessRestricted) {
    posture = "blocked";
  } else if (
    observationSummary.verdictId === "likely_feasible" &&
    sectionConfidence === "validated"
  ) {
    posture = "validated";
  } else if (
    observationSummary.verdictId === "likely_feasible" ||
    observationSummary.verdictId === "feasible_with_restrictions" ||
    sectionConfidence === "confirmed"
  ) {
    posture = "forming";
  } else if (sectionConfidence === "partial" || intelligenceCaptureHasSignal(
    "provider_observation_feasibility",
    fieldText(contact, "provider_observation_feasibility"),
  )) {
    posture = "forming";
  } else {
    posture = "thin";
  }

  const blockers =
    posture === "blocked"
      ? observationSummary.blockingUnknowns.map((r) => r.label).slice(0, 2)
      : pillarBlockers(contact, "observation_readiness", [
          "provider_observation_feasibility",
          "provider_observation_access_path",
        ]);

  return {
    id: "or_access_maturity",
    label: PILLAR_LABELS.or_access_maturity,
    posture,
    postureLabel: POSTURE_LABELS[posture],
    scanLine: scanLine(observationSummary.verdictScan, 96),
    blockers,
    proceduralNote:
      posture === "validated"
        ? `${PROVIDER_OPS_TERM.orAccess} allowance and access path are validated for OR entry.`
        : posture === "blocked"
          ? "Observation allowance or access gates block OR entry until cleared."
          : null,
    primarySectionId: PILLAR_SECTIONS.or_access_maturity,
  };
}

function assessWorkflowUnderstanding(contact: Record<string, unknown>): OperationalReadinessPillarAssessment {
  const confidence = deriveIntelligenceSectionConfidence("clinical_workflow", contact).confidence;
  const hasPain = hasSignal(contact, "provider_workflow_pain_points");
  const hasVolume = hasSignal(contact, "provider_case_volume_estimate");
  let posture = confidenceToPosture(confidence);
  if (posture === "thin" && (hasPain || hasVolume)) posture = "forming";

  return {
    id: "workflow_intelligence",
    label: PILLAR_LABELS.workflow_intelligence,
    posture,
    postureLabel: POSTURE_LABELS[posture],
    scanLine:
      posture === "validated"
        ? "Turnover, setup, and case-flow signals are validated for this service line."
        : posture === "forming"
          ? "Workflow picture forming — confirm friction and volume before trial design."
          : `${PROVIDER_OPS_TERM.workflowIntelligence} not yet mapped for this account.`,
    blockers: pillarBlockers(contact, "clinical_workflow", [
      "provider_workflow_pain_points",
      "provider_or_team_dynamics",
      "provider_case_volume_estimate",
    ]),
    proceduralNote:
      posture === "validated" ? "Enough workflow intelligence to align observation and evaluation targets." : null,
    primarySectionId: PILLAR_SECTIONS.workflow_intelligence,
  };
}

function assessRelationshipStrength(contact: Record<string, unknown>): OperationalReadinessPillarAssessment {
  const maturity = buildProviderRelationshipOperationalMaturity(contact);
  const confidence = deriveIntelligenceSectionConfidence("relationship_intelligence", contact).confidence;
  const restrictive = maturity.indicators.filter((i) => i.status === "restrictive").length;
  const unknown = maturity.openCount;

  let posture: OperationalReadinessPillarPosture;
  if (restrictive >= 2 || maturity.tone === "blocked") {
    posture = "blocked";
  } else if (confidence === "validated" || maturity.documentedCount >= 4) {
    posture = "validated";
  } else if (confidence === "confirmed" || maturity.documentedCount >= 2) {
    posture = "forming";
  } else if (confidence === "partial" || maturity.documentedCount >= 1) {
    posture = "forming";
  } else {
    posture = "thin";
  }

  return {
    id: "relationship_mapping",
    label: PILLAR_LABELS.relationship_mapping,
    posture,
    postureLabel: POSTURE_LABELS[posture],
    scanLine: scanLine(maturity.headline, 96),
    blockers: pillarBlockers(contact, "relationship_intelligence", [
      "provider_communication_style",
      "provider_responsiveness",
      "influence_level",
    ]),
    proceduralNote:
      posture === "blocked"
        ? "Restrictive engagement or scheduler signals — rebuild access before high-stakes moves."
        : null,
    primarySectionId: PILLAR_SECTIONS.relationship_mapping,
  };
}

function assessProceduralAlignment(contact: Record<string, unknown>): OperationalReadinessPillarAssessment {
  const procedure = hasSignal(contact, "provider_procedure_focus");
  const technique = hasSignal(contact, "provider_technique_preferences");
  const idealCases = hasSignal(contact, "provider_ideal_observation_cases");
  const clinical = deriveIntelligenceSectionConfidence("clinical_workflow", contact).confidence;

  let posture: OperationalReadinessPillarPosture;
  if (clinical === "validated" && procedure && technique) {
    posture = "validated";
  } else if (procedure && (technique || idealCases)) {
    posture = "forming";
  } else if (procedure || technique) {
    posture = "forming";
  } else {
    posture = "thin";
  }

  return {
    id: "procedural_alignment",
    label: PILLAR_LABELS.procedural_alignment,
    posture,
    postureLabel: POSTURE_LABELS[posture],
    scanLine:
      posture === "validated"
        ? "Procedure mix, technique, and target cases align for observation and evaluation planning."
        : posture === "forming"
          ? "Procedural anchors captured — validate modality mix and ideal cases in-room."
          : "High-volume procedure mix and target cases not yet confirmed on file.",
    blockers: pillarBlockers(contact, "clinical_workflow", [
      "provider_procedure_focus",
      "provider_technique_preferences",
      "provider_ideal_observation_cases",
    ]),
    proceduralNote: null,
    primarySectionId: PILLAR_SECTIONS.procedural_alignment,
  };
}

function assessSchedulingClarity(
  contact: Record<string, unknown>,
  observationSummary: ProviderObservationFeasibilitySummary,
): OperationalReadinessPillarAssessment {
  const coordinator = observationSummary.inputs.find((i) => i.id === "coordinator_identified");
  const cadence = observationSummary.inputs.find((i) => i.id === "scheduling_cadence");
  const coordinatorKnown = coordinator?.status === "clear" || coordinator?.status === "known";
  const cadenceKnown = cadence?.status === "clear" || cadence?.status === "known";
  const hasIdeal = hasSignal(contact, "provider_ideal_observation_cases");

  let posture: OperationalReadinessPillarPosture;
  if (coordinatorKnown && cadenceKnown && hasIdeal) {
    posture = "validated";
  } else if (coordinatorKnown && (cadenceKnown || hasIdeal)) {
    posture = "forming";
  } else if (coordinatorKnown || cadenceKnown) {
    posture = "forming";
  } else {
    posture = "thin";
  }

  return {
    id: "scheduling_clarity",
    label: PILLAR_LABELS.scheduling_clarity,
    posture,
    postureLabel: POSTURE_LABELS[posture],
    scanLine:
      posture === "validated"
        ? `${PROVIDER_OPS_TERM.schedulingAuthority}, cadence, and target cases are on file.`
        : posture === "forming"
          ? "Scheduling picture forming — confirm posting window and coordinator handoff."
          : "No validated OR scheduling owner or cadence on file.",
    blockers: pillarBlockers(contact, "observation_readiness", [
      "provider_observation_coordinator_contact",
      "provider_observation_cadence_preference",
      "provider_ideal_observation_cases",
    ]),
    proceduralNote: null,
    primarySectionId: PILLAR_SECTIONS.scheduling_clarity,
  };
}

function assessVendorPathway(contact: Record<string, unknown>): OperationalReadinessPillarAssessment {
  const orEnv = deriveIntelligenceSectionConfidence("or_environment", contact).confidence;
  const commercial = deriveIntelligenceSectionConfidence("commercial_signals", contact).confidence;
  const weakest =
    CONFIDENCE_RANK[orEnv] <= CONFIDENCE_RANK[commercial] ? orEnv : commercial;
  const credRestricted =
    fieldToken(contact, "provider_credentialing_status") === "blocked" ||
    fieldToken(contact, "provider_observation_credentialing_needed") === "blocked";

  let posture: OperationalReadinessPillarPosture = credRestricted
    ? "blocked"
    : confidenceToPosture(weakest);
  if (posture === "thin" && (hasSignal(contact, "provider_current_vendors") || hasSignal(contact, "provider_credentialing_status"))) {
    posture = "forming";
  }

  return {
    id: "vendor_pathway",
    label: PILLAR_LABELS.vendor_pathway,
    posture,
    postureLabel: POSTURE_LABELS[posture],
    scanLine:
      posture === "validated"
        ? `${PROVIDER_OPS_TERM.credentialingPathway} and incumbent vendor rules are validated.`
        : posture === "blocked"
          ? "Credentialing or vendor access blocks in-room support until cleared."
          : posture === "forming"
            ? "Vendor and credentialing path forming — confirm before rep-heavy case days."
            : "Incumbent vendor access rules and credentialing path not validated in the field.",
    blockers: pillarBlockers(contact, "or_environment", [
      "provider_credentialing_status",
      "provider_current_vendors",
      "provider_support_expectations",
    ]),
    proceduralNote: null,
    primarySectionId: PILLAR_SECTIONS.vendor_pathway,
  };
}

function assessCommercializationInfluence(input: {
  contact: Record<string, unknown>;
  commercialStage: ProviderCommercialWorkflowStage;
  opportunities?: Array<Record<string, unknown>>;
}): OperationalReadinessPillarAssessment {
  const commercialConf = deriveIntelligenceSectionConfidence("commercial_signals", input.contact)
    .confidence;
  const evalOpen = hasSignal(input.contact, "provider_evaluation_openness");
  const competitive = hasSignal(input.contact, "provider_competitive_products");
  const champion = hasSignal(input.contact, "provider_champion_potential");
  const preference = hasSignal(input.contact, "provider_preference_card_signals");
  const decisionMaker = hasSignal(input.contact, "provider_decision_maker_status");
  const inEvalOpp = opportunitiesInStages(input.opportunities, EVALUATION_OPPORTUNITY_STAGES);
  const inAdoptionOpp = opportunitiesInStages(input.opportunities, ADOPTION_OPPORTUNITY_STAGES);

  let posture: OperationalReadinessPillarPosture;
  if (commercialConf === "validated" && (champion || preference) && (evalOpen || inEvalOpp)) {
    posture = "validated";
  } else if (
    input.commercialStage === "adoption" ||
    inAdoptionOpp ||
    (evalOpen && competitive && champion)
  ) {
    posture = "forming";
  } else if (evalOpen || competitive || champion || decisionMaker || commercialConf !== "unknown") {
    posture = "forming";
  } else {
    posture = "thin";
  }

  return {
    id: "commercialization_influence",
    label: PILLAR_LABELS.commercialization_influence,
    posture,
    postureLabel: POSTURE_LABELS[posture],
    scanLine:
      posture === "validated"
        ? `${PROVIDER_OPS_TERM.commercialInfluence} validated — evaluation posture and champion path on file.`
        : posture === "forming"
          ? "Commercial path forming — confirm evaluation appetite, incumbents, and who moves trials forward."
          : `${PROVIDER_OPS_TERM.commercialInfluence} not mapped — do not assume evaluation or expansion appetite.`,
    blockers: pillarBlockers(input.contact, "commercial_signals", [
      "provider_evaluation_openness",
      "provider_competitive_products",
      "provider_champion_potential",
      "provider_decision_maker_status",
    ]),
    proceduralNote: null,
    primarySectionId: PILLAR_SECTIONS.commercialization_influence,
  };
}

function resolveObservationMotion(
  pillars: OperationalReadinessPillarAssessment[],
  observationSummary: ProviderObservationFeasibilitySummary,
): OperationalMotionReadiness {
  const orAccess = pillars.find((p) => p.id === "or_access_maturity")!;
  const scheduling = pillars.find((p) => p.id === "scheduling_clarity")!;
  const fieldExec = pillars.find((p) => p.id === "commercialization_influence")!;

  const guidingPillars: OperationalReadinessPillarId[] = [
    "or_access_maturity",
    "scheduling_clarity",
    "procedural_alignment",
    "workflow_intelligence",
    "commercialization_influence",
  ];

  let verdict: OperationalMotionVerdict;
  let tone: OperationalMotionReadiness["tone"];
  let safeToProceed: boolean;

  if (orAccess.posture === "blocked" || observationSummary.verdictId === "blockers_identified") {
    verdict = "blocked";
    tone = "blocked";
    safeToProceed = false;
  } else if (
    observationSummary.verdictId === "likely_feasible" &&
    orAccess.posture === "validated" &&
    scheduling.posture !== "thin"
  ) {
    verdict = "ready";
    tone = "success";
    safeToProceed = observationSummary.safeToSchedule.answer === "yes";
  } else if (
    observationSummary.verdictId === "feasible_with_restrictions" ||
    (orAccess.posture === "forming" && scheduling.posture === "forming")
  ) {
    verdict = "approaching";
    tone = "warn";
    safeToProceed = false;
  } else if (observationSummary.verdictId === "too_early" || orAccess.posture === "thin") {
    verdict = "not_ready";
    tone = "neutral";
    safeToProceed = false;
  } else {
    verdict = "approaching";
    tone = "warn";
    safeToProceed = false;
  }

  const blockers = [
    ...orAccess.blockers,
    ...scheduling.blockers,
    ...(fieldExec.posture === "blocked" ? fieldExec.blockers : []),
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);

  const headline =
    verdict === "ready"
      ? "OR observation can proceed when posting window is confirmed."
      : verdict === "blocked"
        ? "Do not schedule OR observation until access gates are cleared."
        : verdict === "approaching"
          ? "Observation is approaching — confirm credentialing and scheduling before travel."
          : "Map OR access allowance and scheduling authority before field allocation.";

  return {
    motion: "observation",
    label: MOTION_LABELS.observation,
    verdict,
    verdictLabel: VERDICT_LABELS[verdict],
    headline: scanLine(headline, 120),
    interpretation: scanLine(observationSummary.operationalInterpretation, 140),
    tone,
    guidingPillars,
    blockers,
    safeToProceed,
    proceduralChecks: observationSummary.beforeBookingConfirm.slice(0, 4),
  };
}

function resolveEvaluationMotion(
  pillars: OperationalReadinessPillarAssessment[],
  observationMotion: OperationalMotionReadiness,
  input: {
    contact: Record<string, unknown>;
    commercialStage: ProviderCommercialWorkflowStage;
    opportunities?: Array<Record<string, unknown>>;
  },
): OperationalMotionReadiness {
  const workflow = pillars.find((p) => p.id === "workflow_intelligence")!;
  const procedural = pillars.find((p) => p.id === "procedural_alignment")!;
  const relationship = pillars.find((p) => p.id === "relationship_mapping")!;
  const vendor = pillars.find((p) => p.id === "vendor_pathway")!;
  const qualitative = buildProviderOverviewQualitativeReadiness({
    contact: input.contact,
    relationshipStage: String(input.contact.provider_relationship_stage ?? "prospect"),
    commercialStage: input.commercialStage,
    opportunities: input.opportunities,
  });
  const commercial = qualitative.find((i) => i.id === "commercial_influence");

  const guidingPillars: OperationalReadinessPillarId[] = [
    "procedural_alignment",
    "workflow_intelligence",
    "relationship_mapping",
    "vendor_pathway",
    "or_access_maturity",
  ];

  let verdict: OperationalMotionVerdict;
  let tone: OperationalMotionReadiness["tone"];

  if (observationMotion.verdict === "blocked") {
    verdict = "blocked";
    tone = "blocked";
  } else if (
    (commercial?.state === "evaluation_active" || opportunitiesInStages(input.opportunities, EVALUATION_OPPORTUNITY_STAGES)) &&
    procedural.posture !== "thin" &&
    workflow.posture !== "thin" &&
    relationship.posture !== "thin" &&
    vendor.posture !== "blocked"
  ) {
    verdict =
      procedural.posture === "validated" && workflow.posture === "validated" ? "ready" : "approaching";
    tone = verdict === "ready" ? "success" : "warn";
  } else if (
    observationMotion.verdict === "ready" ||
    observationMotion.verdict === "approaching"
  ) {
    if (procedural.posture === "validated" && relationship.posture !== "thin") {
      verdict = "approaching";
      tone = "warn";
    } else {
      verdict = "not_ready";
      tone = "neutral";
    }
  } else {
    verdict = "not_ready";
    tone = "neutral";
  }

  const blockers = [
    ...(observationMotion.verdict === "not_ready" || observationMotion.verdict === "blocked"
      ? ["Complete observation access mapping before opening evaluation."]
      : []),
    ...procedural.blockers,
    ...vendor.blockers,
  ]
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 4);

  const headline =
    verdict === "ready"
      ? "Evaluation motion is procedurally supported — align trials to documented blockers."
      : verdict === "blocked"
        ? "Evaluation blocked until OR observation gates clear."
        : verdict === "approaching"
          ? "Evaluation approaching — validate procedure fit and adoption authority."
          : "Establish observation and procedural baseline before evaluation field work.";

  return {
    motion: "evaluation",
    label: MOTION_LABELS.evaluation,
    verdict,
    verdictLabel: VERDICT_LABELS[verdict],
    headline: scanLine(headline, 120),
    interpretation: scanLine(
      commercial?.context ??
        "Pressure-test product fit against documented workflow and competitive posture.",
      140,
    ),
    tone,
    guidingPillars,
    blockers,
    safeToProceed: verdict === "ready",
    proceduralChecks: [
      "Confirm evaluation appetite and conversion blockers with the surgeon.",
      "Map who advances trials — not just who is friendly in the hallway.",
      ...(procedural.posture !== "validated"
        ? ["Validate procedure mix and technique before SKU selection."]
        : []),
    ].slice(0, 4),
  };
}

function resolveCommercializationMotion(
  pillars: OperationalReadinessPillarAssessment[],
  evaluationMotion: OperationalMotionReadiness,
  input: {
    contact: Record<string, unknown>;
    commercialStage: ProviderCommercialWorkflowStage;
    opportunities?: Array<Record<string, unknown>>;
  },
): OperationalMotionReadiness {
  const relationship = pillars.find((p) => p.id === "relationship_mapping")!;
  const vendor = pillars.find((p) => p.id === "vendor_pathway")!;
  const fieldExec = pillars.find((p) => p.id === "commercialization_influence")!;
  const qualitative = buildProviderOverviewQualitativeReadiness({
    contact: input.contact,
    relationshipStage: String(input.contact.provider_relationship_stage ?? "prospect"),
    commercialStage: input.commercialStage,
    opportunities: input.opportunities,
  });
  const commercial = qualitative.find((i) => i.id === "commercial_influence");
  const hasAdoption = opportunitiesInStages(input.opportunities, ADOPTION_OPPORTUNITY_STAGES);

  const guidingPillars: OperationalReadinessPillarId[] = [
    "relationship_mapping",
    "vendor_pathway",
    "commercialization_influence",
    "procedural_alignment",
  ];

  let verdict: OperationalMotionVerdict;
  let tone: OperationalMotionReadiness["tone"];

  if (evaluationMotion.verdict === "blocked") {
    verdict = "blocked";
    tone = "blocked";
  } else if (
    (commercial?.state === "adoption_building" || hasAdoption || input.commercialStage === "adoption") &&
    relationship.posture !== "thin" &&
    fieldExec.posture !== "blocked"
  ) {
    verdict =
      relationship.posture === "validated" && vendor.posture !== "thin" ? "ready" : "approaching";
    tone = verdict === "ready" ? "success" : "warn";
  } else if (evaluationMotion.verdict === "ready" || evaluationMotion.verdict === "approaching") {
    verdict = hasSignal(input.contact, "provider_champion_potential") ? "approaching" : "not_ready";
    tone = verdict === "approaching" ? "warn" : "neutral";
  } else {
    verdict = "not_ready";
    tone = "neutral";
  }

  const blockers = [
    ...(evaluationMotion.verdict === "not_ready"
      ? ["Evaluation foundation still developing — commercialization follows validated trials."]
      : []),
    ...fieldExec.blockers,
    ...relationship.blockers,
  ]
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 4);

  const headline =
    verdict === "ready"
      ? "Commercialization effort is supported — focus on preference-card progress and case conversion."
      : verdict === "blocked"
        ? "Commercialization blocked by evaluation or access gates."
        : verdict === "approaching"
          ? "Commercialization approaching — confirm champion and vendor clearance for adoption work."
          : "Complete evaluation and champion mapping before preference-card and expansion work.";

  return {
    motion: "commercialization",
    label: MOTION_LABELS.commercialization,
    verdict,
    verdictLabel: VERDICT_LABELS[verdict],
    headline: scanLine(headline, 120),
    interpretation: scanLine(
      commercial?.context ??
        "Convert supported cases into preference-card progress with disciplined expansion.",
      140,
    ),
    tone,
    guidingPillars,
    blockers,
    safeToProceed: verdict === "ready",
    proceduralChecks: [
      "Align in-room support and vendor rules before preference-card meetings.",
      "Track supported cases against documented competitive displacement.",
      ...(relationship.posture !== "validated"
        ? ["Confirm scheduler and staff follow-through before expansion visits."]
        : []),
    ].slice(0, 4),
  };
}

function primaryFocusMotion(
  commercialStage: ProviderCommercialWorkflowStage,
  motions: OperationalMotionReadiness[],
): OperationalMotionId {
  const stageDefault: Record<ProviderCommercialWorkflowStage, OperationalMotionId> = {
    early_discovery: "observation",
    observation: "observation",
    evaluation: "evaluation",
    adoption: "commercialization",
  };
  const preferred = stageDefault[commercialStage];
  const motion = motions.find((m) => m.motion === preferred);
  if (motion && motion.verdict !== "ready") return preferred;
  const blocked = motions.find((m) => m.verdict === "blocked");
  if (blocked) return blocked.motion;
  const notReady = motions.find((m) => m.verdict === "not_ready" || m.verdict === "approaching");
  return notReady?.motion ?? preferred;
}

function fieldGuidanceLine(
  focus: OperationalMotionId,
  motion: OperationalMotionReadiness,
  verdict: OperationalReadinessVerdict,
  protectFieldTime: ProtectFieldTimeAssessment,
): string {
  const nextPart = verdict.nextVerdictLabel
    ? `Next: ${verdict.nextVerdictLabel}. `
    : "";
  const protectPrefix =
    protectFieldTime.posture === "clear_to_deploy"
      ? `${PROVIDER_OPS_TERM.protectFieldTime}: ${protectFieldTime.postureLabel}. `
      : `${PROVIDER_OPS_TERM.protectFieldTime} — ${protectFieldTime.postureLabel}. `;

  if (verdict.blockers.length > 0) {
    return `${verdict.label} — ${scanLine(verdict.blockers[0]!, 72)}. ${nextPart}${protectPrefix}${MOTION_LABELS[focus]}: ${motion.headline}`;
  }
  return `${verdict.label}. ${scanLine(verdict.scan, 88)} ${nextPart}${protectPrefix}Focus: ${MOTION_LABELS[focus]}.`;
}

export function buildProviderOperationalReadinessFramework(input: {
  contact: Record<string, unknown>;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
}): ProviderOperationalReadinessFramework {
  const contact = input.contact;
  const relationshipStage = String(
    input.relationshipStage ?? contact.provider_relationship_stage ?? "prospect",
  )
    .trim()
    .toLowerCase();
  const commercialStage = resolveProviderCommercialWorkflowStage({
    relationshipStage,
    opportunities: input.opportunities,
    cases: input.cases,
    engagements: input.engagements,
  });
  const engagements = input.engagements ?? [];
  const observationSummary = buildProviderObservationFeasibilitySummary({
    contact,
    commercialStage,
  });

  const protectFieldTime = buildProtectFieldTimeAssessment({
    contact,
    relationshipStage,
    commercialStage,
    engagements,
  });

  const pillars: OperationalReadinessPillarAssessment[] = [
    assessOrAccessMaturity(contact, observationSummary),
    assessWorkflowUnderstanding(contact),
    assessRelationshipStrength(contact),
    assessProceduralAlignment(contact),
    assessSchedulingClarity(contact, observationSummary),
    assessVendorPathway(contact),
    assessCommercializationInfluence({
      contact,
      commercialStage,
      opportunities: input.opportunities,
    }),
  ];

  const observationMotion = resolveObservationMotion(pillars, observationSummary);
  const evaluationMotion = resolveEvaluationMotion(pillars, observationMotion, {
    contact,
    commercialStage,
    opportunities: input.opportunities,
  });
  const commercializationMotion = resolveCommercializationMotion(pillars, evaluationMotion, {
    contact,
    commercialStage,
    opportunities: input.opportunities,
  });

  const motions = [observationMotion, evaluationMotion, commercializationMotion];
  const focus = primaryFocusMotion(commercialStage, motions);
  const focusMotion = motions.find((m) => m.motion === focus) ?? observationMotion;

  const engine = buildProviderOperationalReadinessEngine({
    inputs: pillars,
    observationSummary,
    commercialStage,
    protectFieldTime,
    opportunities: input.opportunities,
  });

  return {
    title: OPERATIONAL_READINESS_ENGINE_TITLE,
    kicker: OPERATIONAL_READINESS_ENGINE_KICKER,
    verdict: engine.verdict,
    pillars: engine.inputs,
    motions,
    primaryFocusMotion: focus,
    fieldGuidance: fieldGuidanceLine(focus, focusMotion, engine.verdict, protectFieldTime),
    protectFieldTime,
  };
}

export type { OperationalReadinessVerdict } from "@/lib/surgical-sales/buildProviderOperationalReadinessEngine";
export {
  buildProviderOperationalReadinessEngine,
  resolveOperationalReadinessVerdict,
  verdictRank,
} from "@/lib/surgical-sales/buildProviderOperationalReadinessEngine";
export type { OperationalReadinessVerdictId } from "@/lib/surgical-sales/providerOperationalReadinessVocabulary";
