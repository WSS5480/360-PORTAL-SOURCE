/**
 * Progressive intelligence capture — adaptive interview flows per section.
 */

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { PROVIDER_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/providerIntelligenceFields";
import { ORGANIZATION_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/organizationIntelligenceFields";
import { ORGANIZATION_INTELLIGENCE_SECTION_FIELD_ORDER } from "@/lib/surgical-sales/organizationIntelligenceArchitecture";
import { wizardFieldFromIntelligenceDef } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import {
  fieldHasIntelligenceSignal,
  sectionDeepFieldsUnlocked,
} from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import type { IntelligenceSectionConfidence } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import { intelligenceGapStateLabel } from "@/lib/surgical-sales/providerIntelligenceGapVocabulary";
import {
  formatIntelligenceCaptureSummaryChip,
  parseIntelligenceCaptureValue,
} from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import type { WizardFieldConfig } from "@/lib/surgical-sales/providerWizardFields";
import {
  applyFieldWhyItMattersToPrompts,
  intelligenceFieldWhyItMatters,
} from "@/lib/surgical-sales/providerIntelligenceCaptureGuidance";
import { intelligenceContextualCaptureCta } from "@/lib/surgical-sales/providerIntelligenceContextualCtas";
import {
  discoveryLaneForField,
  isIntelligenceFieldAppropriateForStakeholder,
  stakeholderDiscoveryPrompt,
  type IntelligenceDiscoveryStakeholder,
} from "@/lib/surgical-sales/providerIntelligenceStakeholderDiscovery";
import { operationalObservationAccessPrompt } from "@/lib/surgical-sales/providerIntelligenceDiscoveryRouting";
import { isVendorFootprintDiscoveryVisibleForMaturityStage } from "@/lib/surgical-sales/providerIntelligenceDiscoveryRouting";
import type { ProviderIntelligenceMaturityStage } from "@/lib/surgical-sales/providerIntelligenceMaturity";

const FIELD_DEF_BY_KEY = new Map(PROVIDER_INTELLIGENCE_FIELD_DEFS.map((f) => [f.dbKey, f]));
const ORG_FIELD_DEF_BY_KEY = new Map(ORGANIZATION_INTELLIGENCE_FIELD_DEFS.map((f) => [f.dbKey, f]));

export type ProgressiveCaptureContext = Record<string, unknown>;

export type ProgressiveCaptureStep = {
  dbKey: string;
  field: WizardFieldConfig;
  prompt: string;
  whyItMatters?: string;
  progressBeat?: string;
  helper?: string;
  answered: boolean;
};

export type GuidedDiscoveryCaptureItem = {
  dbKey: string;
  label: string;
  chip: string;
};

export type GuidedDiscoverySessionSummary = {
  captured: GuidedDiscoveryCaptureItem[];
  skipped: { dbKey: string; phrase: string }[];
};

type FlowStepDef = {
  dbKey: string;
  prompt: string;
  whyItMatters?: string;
  helper?: string;
  progressBeat?: string;
  /** When false, step is omitted from the active flow. */
  isActive?: (ctx: ProgressiveCaptureContext) => boolean;
};

export type ProgressiveDiscoveryPrompt = {
  prompt: string;
  whyItMatters?: string;
  helper?: string;
  progressBeat?: string;
};

export const GUIDED_DISCOVERY_PHASE_LABELS: Record<ProviderIntelligenceSectionId, string> = {
  observation_readiness: "Qualifying observation path",
  clinical_workflow: "Mapping clinical workflow",
  or_environment: "Mapping OR access workflow",
  relationship_intelligence: "Mapping influence and engagement",
  commercial_signals: "Qualifying commercial path",
};

const PROGRESSIVE_DISCOVERY_PROMPTS_BASE: Record<string, ProgressiveDiscoveryPrompt> = {
  provider_observation_feasibility: {
    prompt: "Is observation allowed with outside vendors here?",
    progressBeat: "Observation allowance",
  },
  provider_observation_coordinator_contact: {
    prompt: "Who coordinates observation scheduling?",
    progressBeat: "Scheduling owner",
  },
  provider_ideal_observation_cases: {
    prompt: "Which cases are worth observing first?",
    progressBeat: "Target cases",
  },
  provider_observation_credentialing_needed: {
    prompt: "What needs to happen before a vendor can observe?",
    progressBeat: "Pre-observation steps",
  },
  provider_observation_access_path: {
    prompt: "How does observation access work here?",
    progressBeat: "Observation access",
  },
  provider_observation_cadence_preference: {
    prompt: "How often can observation realistically happen?",
    progressBeat: "Observation cadence",
  },
  provider_observation_best_days_case_types: {
    prompt: "How far in advance are observation requests usually handled?",
    progressBeat: "Lead time",
  },
  provider_first_observation_questions: {
    prompt: "What must be validated on the first observation?",
    progressBeat: "First-case hypotheses",
  },
  provider_procedure_focus: {
    prompt: "Which procedures drive most of this provider's volume?",
    progressBeat: "Procedure mix",
  },
  provider_technique_preferences: {
    prompt: "What is their primary surgical approach?",
    progressBeat: "Modality",
  },
  provider_technique_detail: {
    prompt: "Any technique or positioning preferences that affect setup?",
    progressBeat: "Technique detail",
  },
  provider_workflow_pain_points: {
    prompt: "Where does workflow friction show up in the OR?",
    progressBeat: "Workflow friction",
  },
  provider_case_volume_estimate: {
    prompt: "What does weekly volume and case mix look like?",
    progressBeat: "Volume signal",
  },
  provider_or_team_dynamics: {
    prompt: "What makes OR workflow smoother or harder on case days?",
    progressBeat: "OR workflow rhythm",
  },
  provider_credentialing_status: {
    prompt: "What vendor approval path is required before reps can be in the room?",
    progressBeat: "Approval path",
  },
  provider_current_vendors: {
    prompt: "Which vendors are active in their cases today?",
    progressBeat: "Vendors in cases",
  },
  provider_support_expectations: {
    prompt: "What in-room support does the provider expect?",
    progressBeat: "Support level",
  },
  provider_communication_style: {
    prompt: "How should updates reach this provider between visits?",
    progressBeat: "Rep interaction model",
  },
  provider_responsiveness: {
    prompt: "How fast does the office call back between case days?",
    progressBeat: "Office response time",
  },
  influence_level: {
    prompt: "Who shapes technique and workflow choices on their cases?",
    progressBeat: "Clinical influence",
  },
  provider_decision_maker_status: {
    prompt: "Who approves evaluations and preference-card changes?",
    progressBeat: "Who approves evaluations",
  },
  provider_champion_potential: {
    prompt: "Would anyone inside push for a new vendor if the product fits?",
    progressBeat: "Internal vendor support",
  },
  provider_follow_up_approach: {
    prompt: "How should reps stay in touch between case days?",
    progressBeat: "Between-visit follow-up",
  },
  provider_evaluation_openness: {
    prompt: "Would they run a real product evaluation — and when?",
    progressBeat: "Trial willingness",
  },
  provider_competitive_products: {
    prompt: "What systems are entrenched in their cases today?",
    progressBeat: "Competitive landscape",
  },
  provider_dissatisfaction_areas: {
    prompt: "Where are they frustrated with current vendors or workflow?",
    progressBeat: "Friction points",
  },
  provider_preference_card_signals: {
    prompt: "What blocks movement on the preference card?",
    progressBeat: "Preference card path",
  },
};

export const PROGRESSIVE_DISCOVERY_PROMPTS: Record<string, ProgressiveDiscoveryPrompt> =
  applyFieldWhyItMattersToPrompts(PROGRESSIVE_DISCOVERY_PROMPTS_BASE);

export function formatGuidedDiscoveryProgress(
  sectionId: ProviderIntelligenceSectionId,
  questionIndex: number,
  questionsRemaining: number,
): string {
  const phase = GUIDED_DISCOVERY_PHASE_LABELS[sectionId];
  if (questionsRemaining <= 1) {
    return `${phase} — last open question`;
  }
  return `${phase} — question ${questionIndex + 1} · ${questionsRemaining} open`;
}

function observationFeasibilityToken(ctx: ProgressiveCaptureContext): string | null {
  const raw = String(ctx.provider_observation_feasibility ?? "").trim();
  if (!raw) return null;
  const parsed = parseIntelligenceCaptureValue("provider_observation_feasibility", raw);
  return parsed.token ?? parsed.tokens[0] ?? null;
}

export function observationIsAllowed(ctx: ProgressiveCaptureContext): boolean {
  return observationFeasibilityToken(ctx) === "easy";
}

export function observationFeasibilityResolved(ctx: ProgressiveCaptureContext): boolean {
  return fieldHasIntelligenceSignal(
    "provider_observation_feasibility",
    ctx.provider_observation_feasibility as string | null | undefined,
  );
}

function promptFor(dbKey: string): ProgressiveDiscoveryPrompt {
  const custom = PROGRESSIVE_DISCOVERY_PROMPTS[dbKey];
  const def = FIELD_DEF_BY_KEY.get(dbKey) ?? ORG_FIELD_DEF_BY_KEY.get(dbKey);
  const operationalPrompt = operationalObservationAccessPrompt(dbKey);
  if (custom) {
    return { ...custom, prompt: operationalPrompt ?? custom.prompt };
  }
  return {
    prompt: def
      ? `${intelligenceContextualCaptureCta(dbKey)} — what is known so far?`
      : `${intelligenceContextualCaptureCta(dbKey)}?`,
    whyItMatters: intelligenceFieldWhyItMatters(dbKey) ?? def?.helper,
    helper: def?.helper,
  };
}

function fieldConfigFor(dbKey: string): WizardFieldConfig | null {
  const def = FIELD_DEF_BY_KEY.get(dbKey) ?? ORG_FIELD_DEF_BY_KEY.get(dbKey);
  if (!def) return null;
  return wizardFieldFromIntelligenceDef(def);
}

function organizationDiscoveryStepActive(dbKey: string, ctx: ProgressiveCaptureContext): boolean {
  if (dbKey === "provider_observation_access_path" || dbKey === "provider_observation_credentialing_needed") {
    return observationFeasibilityResolved(ctx);
  }
  if (dbKey === "provider_observation_coordinator_contact") {
    return observationIsAllowed(ctx);
  }
  if (dbKey === "provider_observation_best_days_case_types") {
    return observationFeasibilityResolved(ctx);
  }
  return true;
}

/** Facility-scoped discovery steps (not in provider-only section order). */
export function buildOrganizationDiscoveryCaptureSteps(
  contact: ProgressiveCaptureContext,
  options?: {
    includeAnswered?: boolean;
    discoveryStakeholder?: IntelligenceDiscoveryStakeholder;
  },
): ProgressiveCaptureStep[] {
  const ctx = { ...contact };
  const stakeholder = options?.discoveryStakeholder ?? "unspecified";
  const steps: ProgressiveCaptureStep[] = [];

  for (const keys of Object.values(ORGANIZATION_INTELLIGENCE_SECTION_FIELD_ORDER)) {
    for (const dbKey of keys) {
      if (!organizationDiscoveryStepActive(dbKey, ctx)) continue;
      if (
        stakeholder !== "unspecified" &&
        !isIntelligenceFieldAppropriateForStakeholder(dbKey, stakeholder)
      ) {
        continue;
      }

      const field = fieldConfigFor(dbKey);
      if (!field) continue;
      const answered = fieldHasIntelligenceSignal(dbKey, ctx[dbKey] as string | null | undefined);
      if (answered && !options?.includeAnswered) continue;

      const tailored = stakeholder !== "unspecified" ? stakeholderDiscoveryPrompt(dbKey, stakeholder) : null;
      const base = promptFor(dbKey);
      steps.push({
        dbKey,
        field,
        prompt: tailored?.prompt ?? base.prompt,
        whyItMatters: tailored?.whyItMatters ?? base.whyItMatters ?? base.helper,
        progressBeat: tailored?.progressBeat ?? base.progressBeat,
        helper: tailored?.helper ?? base.helper,
        answered,
      });
    }
  }

  return steps;
}

const OBSERVATION_FLOW: FlowStepDef[] = [
  {
    dbKey: "provider_observation_feasibility",
    ...promptFor("provider_observation_feasibility"),
  },
  {
    dbKey: "provider_observation_access_path",
    ...promptFor("provider_observation_access_path"),
    isActive: (ctx) => observationFeasibilityResolved(ctx),
  },
  {
    dbKey: "provider_observation_credentialing_needed",
    ...promptFor("provider_observation_credentialing_needed"),
    isActive: (ctx) => observationFeasibilityResolved(ctx),
  },
  {
    dbKey: "provider_observation_coordinator_contact",
    ...promptFor("provider_observation_coordinator_contact"),
    isActive: (ctx) => observationIsAllowed(ctx),
  },
  {
    dbKey: "provider_observation_best_days_case_types",
    ...promptFor("provider_observation_best_days_case_types"),
    isActive: (ctx) => observationFeasibilityResolved(ctx),
  },
  {
    dbKey: "provider_ideal_observation_cases",
    ...promptFor("provider_ideal_observation_cases"),
    isActive: (ctx) => observationIsAllowed(ctx),
  },
  {
    dbKey: "provider_observation_cadence_preference",
    ...promptFor("provider_observation_cadence_preference"),
    isActive: (ctx) => observationIsAllowed(ctx),
  },
  {
    dbKey: "provider_first_observation_questions",
    ...promptFor("provider_first_observation_questions"),
    isActive: (ctx) =>
      observationIsAllowed(ctx) &&
      sectionDeepFieldsUnlocked("observation_readiness", ctx, undefined),
  },
];

const CLINICAL_FLOW: FlowStepDef[] = [
  { dbKey: "provider_procedure_focus", ...promptFor("provider_procedure_focus") },
  { dbKey: "provider_technique_preferences", ...promptFor("provider_technique_preferences") },
  {
    dbKey: "provider_technique_detail",
    ...promptFor("provider_technique_detail"),
    isActive: (ctx) =>
      fieldHasIntelligenceSignal(
        "provider_procedure_focus",
        ctx.provider_procedure_focus as string | null | undefined,
      ) ||
      fieldHasIntelligenceSignal(
        "provider_technique_preferences",
        ctx.provider_technique_preferences as string | null | undefined,
      ),
  },
  {
    dbKey: "provider_workflow_pain_points",
    ...promptFor("provider_workflow_pain_points"),
    isActive: (ctx) =>
      sectionDeepFieldsUnlocked("clinical_workflow", ctx, undefined),
  },
  {
    dbKey: "provider_case_volume_estimate",
    ...promptFor("provider_case_volume_estimate"),
    isActive: (ctx) =>
      sectionDeepFieldsUnlocked("clinical_workflow", ctx, undefined),
  },
];

const OR_ENVIRONMENT_FLOW: FlowStepDef[] = [
  "provider_credentialing_status",
  "provider_or_team_dynamics",
  "provider_support_expectations",
].map((dbKey) => ({ dbKey, ...promptFor(dbKey) }));

const RELATIONSHIP_FLOW: FlowStepDef[] = [
  "provider_communication_style",
  "provider_responsiveness",
  "influence_level",
  "provider_decision_maker_status",
  "provider_champion_potential",
  "provider_follow_up_approach",
].map((dbKey) => ({ dbKey, ...promptFor(dbKey) }));

const COMMERCIAL_FLOW: FlowStepDef[] = [
  { dbKey: "provider_evaluation_openness", ...promptFor("provider_evaluation_openness") },
  {
    dbKey: "provider_current_vendors",
    ...promptFor("provider_current_vendors"),
    isActive: (ctx) =>
      fieldHasIntelligenceSignal(
        "provider_evaluation_openness",
        ctx.provider_evaluation_openness as string | null | undefined,
      ),
  },
  {
    dbKey: "provider_competitive_products",
    ...promptFor("provider_competitive_products"),
    isActive: (ctx) =>
      fieldHasIntelligenceSignal(
        "provider_evaluation_openness",
        ctx.provider_evaluation_openness as string | null | undefined,
      ),
  },
  {
    dbKey: "provider_dissatisfaction_areas",
    ...promptFor("provider_dissatisfaction_areas"),
    isActive: (ctx) =>
      sectionDeepFieldsUnlocked("commercial_signals", ctx, undefined),
  },
  {
    dbKey: "provider_preference_card_signals",
    ...promptFor("provider_preference_card_signals"),
    isActive: (ctx) =>
      sectionDeepFieldsUnlocked("commercial_signals", ctx, undefined),
  },
];

const SECTION_FLOWS: Record<ProviderIntelligenceSectionId, FlowStepDef[]> = {
  observation_readiness: OBSERVATION_FLOW,
  clinical_workflow: CLINICAL_FLOW,
  or_environment: OR_ENVIRONMENT_FLOW,
  relationship_intelligence: RELATIONSHIP_FLOW,
  commercial_signals: COMMERCIAL_FLOW,
};

function resolveFlowSteps(
  flow: FlowStepDef[],
  ctx: ProgressiveCaptureContext,
): FlowStepDef[] {
  return flow.filter((step) => (step.isActive ? step.isActive(ctx) : true));
}

export function buildProgressiveCaptureSteps(
  sectionId: ProviderIntelligenceSectionId,
  contact: ProgressiveCaptureContext,
  options?: {
    /** Include steps that already have a captured signal (for review navigation). */
    includeAnswered?: boolean;
    sectionConfidence?: IntelligenceSectionConfidence;
    discoveryStakeholder?: IntelligenceDiscoveryStakeholder;
    maturityStage?: ProviderIntelligenceMaturityStage;
  },
): ProgressiveCaptureStep[] {
  const flow = SECTION_FLOWS[sectionId] ?? [];
  const ctx = { ...contact };
  const stakeholder = options?.discoveryStakeholder ?? "unspecified";
  const activeDefs = resolveFlowSteps(flow, ctx);
  const steps: ProgressiveCaptureStep[] = [];

  for (const def of activeDefs) {
    if (
      stakeholder !== "unspecified" &&
      !isIntelligenceFieldAppropriateForStakeholder(def.dbKey, stakeholder)
    ) {
      continue;
    }
    if (
      options?.maturityStage &&
      !isVendorFootprintDiscoveryVisibleForMaturityStage(def.dbKey, options.maturityStage)
    ) {
      continue;
    }

    const field = fieldConfigFor(def.dbKey);
    if (!field) continue;
    const answered = fieldHasIntelligenceSignal(def.dbKey, ctx[def.dbKey] as string | null | undefined);
    if (answered && !options?.includeAnswered) continue;

    const promptStakeholder =
      stakeholder !== "unspecified" ? stakeholder : discoveryLaneForField(def.dbKey);
    const tailored = promptStakeholder
      ? stakeholderDiscoveryPrompt(def.dbKey, promptStakeholder)
      : null;

    steps.push({
      dbKey: def.dbKey,
      field,
      prompt: tailored?.prompt ?? def.prompt,
      whyItMatters: tailored?.whyItMatters ?? def.whyItMatters ?? def.helper,
      progressBeat: tailored?.progressBeat ?? def.progressBeat,
      helper: tailored?.helper ?? def.helper,
      answered,
    });
  }

  return steps;
}

export function initialProgressiveStepIndex(
  steps: ProgressiveCaptureStep[],
  emphasizeDbKey?: string | null,
): number {
  if (emphasizeDbKey) {
    const idx = steps.findIndex((s) => s.dbKey === emphasizeDbKey);
    if (idx >= 0) return idx;
  }
  const firstOpen = steps.findIndex((s) => !s.answered);
  return firstOpen >= 0 ? firstOpen : 0;
}

export function progressiveCaptureComplete(steps: ProgressiveCaptureStep[]): boolean {
  return steps.length > 0 && steps.every((s) => s.answered);
}

/** Recompute steps after an answer — branching may add/remove follow-ups. */
export function refreshProgressiveCaptureSteps(
  sectionId: ProviderIntelligenceSectionId,
  contact: ProgressiveCaptureContext,
  currentDbKey: string,
  options?: {
    sectionConfidence?: IntelligenceSectionConfidence;
    discoveryStakeholder?: IntelligenceDiscoveryStakeholder;
  },
): ProgressiveCaptureStep[] {
  return buildProgressiveCaptureSteps(sectionId, contact, {
    includeAnswered: true,
    ...options,
  });
}

/** Summarize signals captured or skipped during a guided discovery pass. */
export function buildGuidedDiscoverySessionSummary(
  sectionId: ProviderIntelligenceSectionId,
  baseline: ProgressiveCaptureContext,
  current: ProgressiveCaptureContext,
  skippedDbKeys: readonly string[],
): GuidedDiscoverySessionSummary {
  const flow = SECTION_FLOWS[sectionId] ?? [];
  const defs = resolveFlowSteps(flow, { ...current });
  const captured: GuidedDiscoveryCaptureItem[] = [];

  for (const def of defs) {
    const before = baseline[def.dbKey];
    const after = current[def.dbKey];
    const hadBefore = fieldHasIntelligenceSignal(
      def.dbKey,
      before as string | null | undefined,
    );
    const hasAfter = fieldHasIntelligenceSignal(def.dbKey, after as string | null | undefined);
    if (!hadBefore && hasAfter) {
      const label = FIELD_DEF_BY_KEY.get(def.dbKey)?.label ?? def.dbKey;
      const chip =
        formatIntelligenceCaptureSummaryChip(def.dbKey, after as string) ??
        String(after).trim().slice(0, 80);
      captured.push({ dbKey: def.dbKey, label, chip });
    }
  }

  const skipped = skippedDbKeys.map((dbKey) => ({
    dbKey,
    phrase: intelligenceGapStateLabel(dbKey, "unknown"),
  }));

  return { captured, skipped };
}
