/**
 * Provider overview — controlled operational vocabulary.
 *
 * Use these terms consistently across overview UI, builders, and tests.
 * Avoid generic CRM language (pipeline, opportunity stage, notes) and
 * do not mix synonyms (e.g. "commercialization" vs "commercial influence").
 *
 * Canonical terms:
 * - OR access
 * - Observation pathway
 * - Commercial influence
 * - Workflow intelligence
 * - Scheduling authority
 * - Credentialing pathway
 * - Operational readiness
 * - Field execution risk
 */

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { ProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import type { ProviderIntelligenceMaturityStage } from "@/lib/surgical-sales/providerIntelligenceMaturity";
/** Canonical operational terms (single source of truth for copy) */
export const PROVIDER_OPS_TERM = {
  orAccess: "OR access",
  observationPathway: "Observation pathway",
  commercialInfluence: "Commercial influence",
  workflowIntelligence: "Workflow intelligence",
  schedulingAuthority: "Scheduling authority",
  credentialingPathway: "Credentialing pathway",
  operationalReadiness: "Workflow visibility",
  fieldExecutionRisk: "Field readiness",
  protectFieldTime: "Protect field time",
  orEnvironment: "OR environment",
  surgeonRelationship: "Surgeon relationship",
  fieldExecution: "Field execution",
  operationallyValidated: "Operationally validated",
  partiallyMapped: "Partially mapped",
  emergingOperationalUnderstanding: "Emerging operational understanding",
  deploymentReady: "Deployment ready",
  unresolved: "Needs validation",
  executionRisk: "Execution risk",
  discoveryIncomplete: "Discovery still developing",
  signalCoverage: "Signal coverage",
  openOperationalGaps: "Open operational gaps",
  fieldCommand: "Field command",
} as const;

/** Overview briefing chrome */
export const PROVIDER_OVERVIEW_DASHBOARD_ARIA = "Field deployment briefing";

export const PROVIDER_OVERVIEW_PLATFORM_EYEBROW = "Field command center";

export const PROVIDER_DEPLOYMENT_BRIEFING_TITLE = "Field deployment briefing";
export const PROVIDER_DEPLOYMENT_BRIEFING_KICKER = "Pre-deployment · protect scarce field execution time";

export const PROVIDER_DEPLOYMENT_QUESTIONS = {
  or_entry: "Can we realistically get into this OR?",
  field_time_risk: "What threatens field time?",
  must_validate: "What still must be validated?",
  next_move: "What is the next best operational move?",
} as const;

export const PROVIDER_DEPLOYMENT_DIRECTIVE_LABEL = "Field directive";

/** Compact validated positives on overview */
export const PROVIDER_OVERVIEW_CONFIRMED_SO_FAR_TITLE = "Confirmed so far";

/** @deprecated Use PROVIDER_OVERVIEW_CONFIRMED_SO_FAR_TITLE */
export const PROVIDER_OVERVIEW_KNOWN_SO_FAR_TITLE = PROVIDER_OVERVIEW_CONFIRMED_SO_FAR_TITLE;

/** Deployment resolution path — primary CTA on overview */
export const PROVIDER_OVERVIEW_DEPLOYMENT_RESOLUTION_LABELS = {
  panelAria: "Path to reduce deployment operational risk",
  clearsBlocker: "Addresses",
  nextBestMove: "Next best move",
  whyItMatters: "Why it matters",
  bestSource: "Best source",
} as const;

/** Latest field intelligence — live bullets on overview */
export const PROVIDER_OVERVIEW_LATEST_FIELD_INTELLIGENCE_TITLE = "Latest field intelligence";

/** @deprecated Use PROVIDER_OVERVIEW_LATEST_FIELD_INTELLIGENCE_TITLE */
export const PROVIDER_OVERVIEW_ACCOUNT_NOTES_TITLE = PROVIDER_OVERVIEW_LATEST_FIELD_INTELLIGENCE_TITLE;

export const PROVIDER_OVERVIEW_ACCOUNT_NOTE_SECTIONS = {
  workflow: "Workflow insights",
  relationship: "Relationship insights",
  observation: "Observation readiness",
} as const;

export const PROVIDER_OVERVIEW_NOTES_LABELS = {
  summary: "Summary",
  operationalNotes: "Operational notes",
  latestDiscoveries: "Latest discoveries",
  outstandingUnknowns: "Still to confirm",
} as const;

/** Field command briefing (detail panels) */
export const PROVIDER_OVERVIEW_COMMAND_TITLE = PROVIDER_OPS_TERM.fieldCommand;
export const PROVIDER_OVERVIEW_COMMAND_ARIA = PROVIDER_DEPLOYMENT_BRIEFING_TITLE;

export const PROVIDER_FIELD_COMMAND_DIRECTIVE_LABEL = PROVIDER_OPS_TERM.fieldCommand;
export const PROVIDER_FIELD_COMMAND_VALIDATED_LABEL = "Validated";
export const PROVIDER_FIELD_COMMAND_OPEN_RISKS_LABEL = "Open risks";
export const PROVIDER_FIELD_COMMAND_UNLOCKS_LABEL = "Pathway gate";
export const PROVIDER_FIELD_COMMAND_NEXT_ACTION_LABEL = "Next field action";

export const PROVIDER_FIELD_COMMAND_VALIDATED_EMPTY = "None on file";
export const PROVIDER_FIELD_COMMAND_OPEN_RISKS_EMPTY = "None flagged";

export const PROVIDER_OVERVIEW_FINDING_ENABLES = "Unlocks next";
export const PROVIDER_OVERVIEW_FINDING_BLOCKER = "Open item";
export const PROVIDER_OVERVIEW_FINDING_STATUS = "Status";

export {
  PROVIDER_OVERVIEW_OPERATIONAL_IMPACT_LABEL,
  providerOperationalImpactForField,
} from "@/lib/surgical-sales/providerOperationalImpact";

export const PROVIDER_OVERVIEW_SIGNAL_NEXT_ACTION = "Next field action";
export const PROVIDER_OVERVIEW_READINESS_HEADING = "Workflow visibility";

export { PROVIDER_INTEL_PATHWAY_MATURITY_HEADING as PROVIDER_OVERVIEW_PROGRESSION_CONFIDENCE_HEADING } from "@/lib/surgical-sales/providerOperationalMaturityVocabulary";

export const PROVIDER_OVERVIEW_VALIDATED_INTELLIGENCE_KICKER =
  "Validated vs emerging signals by operational area";

/** Commercial workflow lane — procedural motion (not CRM pipeline stage) */
export const PROVIDER_OVERVIEW_WORKFLOW_LABELS: Record<ProviderCommercialWorkflowStage, string> = {
  early_discovery: "Access mapping",
  observation: PROVIDER_OPS_TERM.observationPathway,
  evaluation: "Product evaluation",
  adoption: "Procedural adoption",
};

/** Intelligence maturity — overview display */
export const PROVIDER_OVERVIEW_MATURITY_LABELS: Record<ProviderIntelligenceMaturityStage, string> = {
  early_discovery: "Early discovery",
  operationally_qualified: "Access mapping",
  observation_ready: "Observation validated",
  evaluation_active: "Evaluation-ready",
  adoption_building: "Adoption building",
  strategic_account: "Field-ready account",
};

export function providerOverviewProgressionHeading(nextStageLabel: string): string {
  return `Unlock ${nextStageLabel}`;
}

/** Signal ledger (known / unknown by operational area) */
export const PROVIDER_OVERVIEW_DISCOVERY_TITLE = "Signal ledger";
export const PROVIDER_OVERVIEW_DISCOVERY_KICKER = "Confirmed vs still open by area";
export const PROVIDER_OVERVIEW_DISCOVERY_COMPACT_KICKER =
  "Area ledger — capture open signals before deployment";

export function providerOverviewDiscoveryPulseLabel(knownCount: number, unknownCount: number): string {
  return `${knownCount}V · ${unknownCount}O`;
}

export function providerOverviewValidatedOpenHeading(count: number, variant: "validated" | "open"): string {
  const prefix = variant === "validated" ? "Validated" : "Open";
  return count > 0 ? `${prefix} (${count})` : prefix;
}

export const PROVIDER_OVERVIEW_KNOWN_HEADING = "Validated";
export const PROVIDER_OVERVIEW_UNKNOWN_HEADING = "Open";

/** Priority captures before deployment */
export const PROVIDER_OVERVIEW_STRATEGY_TITLE = "Priority captures";
export const PROVIDER_OVERVIEW_STRATEGY_KICKER = (count: number) =>
  count === 1 ? "1 capture before you deploy" : `${count} captures before you deploy`;
export const PROVIDER_OVERVIEW_STRATEGY_EMPTY_KICKER = "No priority captures flagged";
export const PROVIDER_OVERVIEW_SIGNAL_UNLOCK = PROVIDER_OVERVIEW_FINDING_ENABLES;
export const PROVIDER_OVERVIEW_CAPTURE_ACTION = "Log update";

/** Field execution */
export const PROVIDER_OVERVIEW_FIELD_EXECUTION_TITLE = PROVIDER_OPS_TERM.fieldExecution;
export const PROVIDER_OVERVIEW_FIELD_EXECUTION_KICKER = "OR time allocation";

/** Field execution risk (field time risk panel) */
export const PROVIDER_OVERVIEW_FIELD_EXECUTION_RISK_TITLE = "Field readiness";
export const PROVIDER_OVERVIEW_FIELD_EXECUTION_RISK_KICKER = "Guidance for your next field touch";

export const PROVIDER_OVERVIEW_FIELD_EXECUTION_RISK_INPUT_LABELS = {
  coordinator_mapped: `${PROVIDER_OPS_TERM.schedulingAuthority} mapped`,
  or_access_known: `${PROVIDER_OPS_TERM.orAccess} known`,
  relationship_maturity: PROVIDER_OPS_TERM.surgeonRelationship,
  workflow_intelligence: PROVIDER_OPS_TERM.workflowIntelligence,
  scheduling_clarity: `${PROVIDER_OPS_TERM.schedulingAuthority} clarity`,
  observation_feasibility: `${PROVIDER_OPS_TERM.orAccess} allowance`,
} as const;

/** Execution blockers */
export const PROVIDER_OVERVIEW_EXECUTION_BLOCKERS_TITLE = "Open items to confirm";
export const PROVIDER_OVERVIEW_EXECUTION_BLOCKERS_KICKER = "Capture before you book OR time";
export const PROVIDER_OVERVIEW_EXECUTION_BLOCKERS_CLEAR = "No hard stops on file.";
export const PROVIDER_OVERVIEW_SIGNAL_BLOCKER = "Open item";
export const PROVIDER_OVERVIEW_SIGNAL_RESOLVE = "Resolve";

/** OR entry checklist */
export const PROVIDER_OVERVIEW_OBS_FEASIBILITY_TITLE = "OR entry checklist";
export const PROVIDER_OVERVIEW_OBS_READINESS_KICKER = "Confirm before you book OR time";
export const PROVIDER_OVERVIEW_OBS_READINESS_VALIDATED_LABEL = "Validated requirements";
export const PROVIDER_OVERVIEW_OBS_READINESS_BLOCKING_LABEL = "Open pre-visit gates";
export const PROVIDER_OVERVIEW_OBS_READINESS_NEXT_VALIDATIONS_LABEL = "Next validations to confirm";
export const PROVIDER_OVERVIEW_OBS_READINESS_SAFE_TO_SCHEDULE_LABEL = "Safe to schedule?";
export const PROVIDER_OVERVIEW_OBS_READINESS_BEFORE_BOOKING_LABEL = "Before booking, confirm:";
export const PROVIDER_OVERVIEW_OBS_READINESS_VALIDATED_EMPTY = "No requirements validated yet.";
export const PROVIDER_OVERVIEW_OBS_READINESS_BLOCKING_EMPTY = "No hard operational risks on file.";
export const PROVIDER_OVERVIEW_OBS_READINESS_NEXT_EMPTY = "Core validations captured.";

/** OR readiness input rows (feasibility engine) */
export const PROVIDER_OVERVIEW_OBS_INPUT_LABELS = {
  observationAllowed: `${PROVIDER_OPS_TERM.orAccess} allowance`,
  credentialingPathway: PROVIDER_OPS_TERM.credentialingPathway,
  schedulingAuthority: PROVIDER_OPS_TERM.schedulingAuthority,
  orAccessGates: `${PROVIDER_OPS_TERM.orAccess} gates`,
  targetCaseTypes: "Target case types",
  schedulingRhythm: "Scheduling rhythm",
} as const;

export const PROVIDER_OVERVIEW_OBS_VALIDATION_FIELD_LABELS: Record<string, string> = {
  provider_observation_coordinator_contact: `${PROVIDER_OPS_TERM.schedulingAuthority} contact`,
  provider_observation_cadence_preference: `${PROVIDER_OPS_TERM.schedulingAuthority} rhythm`,
  provider_observation_best_days_case_types: "Posting window / case days",
  provider_ideal_observation_cases: PROVIDER_OVERVIEW_OBS_INPUT_LABELS.targetCaseTypes,
  provider_observation_credentialing_needed: PROVIDER_OPS_TERM.credentialingPathway,
  provider_observation_access_path: PROVIDER_OVERVIEW_OBS_INPUT_LABELS.orAccessGates,
  provider_observation_feasibility: PROVIDER_OVERVIEW_OBS_INPUT_LABELS.observationAllowed,
};

/** Discovery scan — short labels for open signals */
export const PROVIDER_OVERVIEW_DISCOVERY_UNKNOWN_SHORT: Partial<Record<string, string>> = {
  provider_observation_feasibility: PROVIDER_OVERVIEW_OBS_INPUT_LABELS.observationAllowed,
  provider_observation_credentialing_needed: PROVIDER_OPS_TERM.credentialingPathway,
  provider_ideal_observation_cases: "Target observation cases",
  provider_observation_access_path: PROVIDER_OVERVIEW_OBS_INPUT_LABELS.orAccessGates,
  provider_observation_coordinator_contact: `${PROVIDER_OPS_TERM.schedulingAuthority} contact`,
  provider_observation_cadence_preference: PROVIDER_OVERVIEW_OBS_VALIDATION_FIELD_LABELS.provider_observation_cadence_preference,
  provider_observation_best_days_case_types: "Posting window",
  provider_first_observation_questions: "Observation hypotheses",
  provider_procedure_focus: "Procedure focus",
  provider_technique_preferences: "Surgical modality",
  provider_technique_detail: "Technique detail",
  provider_workflow_pain_points: "Workflow friction",
  provider_case_volume_estimate: "Case volume",
  provider_or_team_dynamics: PROVIDER_OPS_TERM.orEnvironment,
  provider_credentialing_status: PROVIDER_OPS_TERM.credentialingPathway,
  provider_current_vendors: "Incumbent vendors",
  provider_support_expectations: "Support expectations",
  provider_communication_style: "Communication style",
  provider_responsiveness: "Office response time",
  influence_level: "Who influences cases",
  provider_decision_maker_status: "Who approves evaluations",
  provider_champion_potential: "Internal vendor support",
  provider_follow_up_approach: "Follow-up between visits",
  provider_evaluation_openness: "Trial willingness",
  provider_competitive_products: "Competitive landscape",
  provider_dissatisfaction_areas: "Dissatisfaction signals",
  provider_preference_card_signals: "Preference-card friction",
};

/** Qualitative operational readiness dimensions */
export const PROVIDER_OVERVIEW_READINESS_DIMENSION_LABELS = {
  observation_readiness: PROVIDER_OPS_TERM.orAccess,
  commercial_influence: PROVIDER_OPS_TERM.commercialInfluence,
  workflow_understanding: PROVIDER_OPS_TERM.workflowIntelligence,
  relationship_maturity: PROVIDER_OPS_TERM.surgeonRelationship,
} as const;

/** Mission control readiness strip — compact dimension names */
export const PROVIDER_OVERVIEW_READINESS_DIMENSION_SHORT = PROVIDER_OVERVIEW_READINESS_DIMENSION_LABELS;

/** Next field touch */
export const PROVIDER_OVERVIEW_FIELD_TOUCH_TITLE = "Next field touch";
export const PROVIDER_OVERVIEW_FIELD_TOUCH_KICKER_EMPTY = "No OR touch scheduled";
export const PROVIDER_OVERVIEW_SCHEDULE_FIELD_TOUCH = "Schedule field touch";

export const PROVIDER_OVERVIEW_SIGNAL_PROCEDURE_STAKES = "Procedure stakes";
export const PROVIDER_OVERVIEW_SIGNAL_FIELD_OBJECTIVE = "Field objective";
export const PROVIDER_OVERVIEW_SIGNAL_OR_READINESS = PROVIDER_OPS_TERM.operationalReadiness;
export const PROVIDER_OVERVIEW_SIGNAL_PREP_STATUS = "Visit prep";
export const PROVIDER_OVERVIEW_SIGNAL_INTELLIGENCE_GAP = "Open signal";

/** Motion indicators */
export const PROVIDER_OVERVIEW_MOTION_INDICATORS_TITLE = "Motion indicators";

/** Recent activity */
export const PROVIDER_OVERVIEW_RECENT_MOTION_TITLE = "Recent OR and field motion";
export const PROVIDER_OVERVIEW_OBSERVATION_HISTORY_TITLE = "Observation pathway log";
export const PROVIDER_OVERVIEW_FIELD_TOUCH_HISTORY_TITLE = "Field touch history";

/** Record */
export const PROVIDER_OVERVIEW_RECORD_TITLE = "Account record";
export const PROVIDER_OVERVIEW_DEPLOYMENT_DETAIL_TITLE = "Deployment detail";

/** Quick actions */
/** Default when no top open field is known — prefer contextual label from contact. */
export const PROVIDER_OVERVIEW_ACTION_CAPTURE = "Confirm open field items";
export const PROVIDER_OVERVIEW_ACTION_SCHEDULE_TOUCH = "Book next OR touch";
export const PROVIDER_OVERVIEW_ACTION_LOG_CASE = "Log procedure case";
export const PROVIDER_OVERVIEW_ACTION_MORE = "More";
export const PROVIDER_OVERVIEW_ACTION_FEWER = "Fewer";

export const PROVIDER_OVERVIEW_LINK_INTELLIGENCE = "Signal capture →";
export const PROVIDER_OVERVIEW_LINK_OPEN_INTELLIGENCE = PROVIDER_OPS_TERM.openOperationalGaps;

/** Operational area labels (intelligence sections on overview) */
export const PROVIDER_OVERVIEW_OPERATIONAL_AREA_LABELS: Record<
  ProviderIntelligenceSectionId,
  string
> = {
  observation_readiness: PROVIDER_OPS_TERM.orAccess,
  clinical_workflow: PROVIDER_OPS_TERM.workflowIntelligence,
  or_environment: PROVIDER_OPS_TERM.orEnvironment,
  relationship_intelligence: PROVIDER_OPS_TERM.surgeonRelationship,
  commercial_signals: PROVIDER_OPS_TERM.commercialInfluence,
};
