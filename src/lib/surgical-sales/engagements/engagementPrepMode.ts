import { normalizeSalesStage, type SalesStage } from "@/lib/sales/stages";
import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import {
  resolveEngagementPreparationContextState,
  type EngagementPreparationContextState,
} from "@/lib/surgical-sales/engagements/engagementPreparationContextState";
import {
  hasExplicitPrepProductFocus,
  resolveExplicitPrepProductLine,
} from "@/lib/surgical-sales/engagements/introCallProductAlignment";
import {
  introCallSpecialtyKey,
  type IntroCallSpecialtyKey,
} from "@/lib/surgical-sales/engagements/introCallPreparationContent";
import type { PreparationSpecializationTier } from "@/lib/surgical-sales/engagements/engagementPreparationSpecialization";
import type { PrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";
import type { PreCallPlanProductLine } from "@/lib/surgical-sales/preCallPlanTemplateTypes";

/** Explicit rep-selected prep mode — one mode drives all generated prep. */
export type EngagementPrepMode =
  | "general_discovery"
  | "specialty_workflow_discovery"
  | "product_exploration"
  | "observation_qualification"
  | "evaluation_preparation"
  | "live_case_support";

export const ENGAGEMENT_PREP_MODES: EngagementPrepMode[] = [
  "general_discovery",
  "specialty_workflow_discovery",
  "product_exploration",
  "observation_qualification",
  "evaluation_preparation",
  "live_case_support",
];

export type EngagementPrepModeDefinition = {
  mode: EngagementPrepMode;
  label: string;
  summary: string;
  requires_product: boolean;
};

export const ENGAGEMENT_PREP_MODE_DEFINITIONS: readonly EngagementPrepModeDefinition[] = [
  {
    mode: "general_discovery",
    label: "General Discovery",
    summary: "Product-neutral workflow discovery — procedural flow, access, and evaluation fit.",
    requires_product: false,
  },
  {
    mode: "specialty_workflow_discovery",
    label: "Specialty Workflow Discovery",
    summary: "Specialty-specific procedure and OR workflow habits before product alignment.",
    requires_product: false,
  },
  {
    mode: "product_exploration",
    label: "Product Exploration",
    summary: "Single-product workflow fit — procedure questions and talking points for the selected focus only.",
    requires_product: true,
  },
  {
    mode: "observation_qualification",
    label: "Observation Qualification",
    summary: "Qualify whether observation access is realistic and what must be true before scheduling.",
    requires_product: false,
  },
  {
    mode: "evaluation_preparation",
    label: "Evaluation Preparation",
    summary: "Evaluation case profile, conversion path, adoption barriers, and workflow signals.",
    requires_product: true,
  },
  {
    mode: "live_case_support",
    label: "Live Case Support",
    summary: "In-case and post-case support logistics, OR coordination, and adoption path.",
    requires_product: true,
  },
] as const;

export type EngagementPrepModeInput = {
  engagementType: string;
  prepMode?: EngagementPrepMode | "" | null;
  productLine?: string | null;
  opportunityId?: string | null;
  opportunityStage?: string | null;
  caseId?: string | null;
  providerSpecialty?: string | null;
  providerRelationshipStage?: string | null;
  knownIntelligence?: PrepareKnownIntelligence;
};

export type EngagementPrepGenerationFlags = {
  prep_mode: EngagementPrepMode;
  intentional_product_focus: boolean;
  product_line: PreCallPlanProductLine | "";
  effective_specialty_key: ReturnType<typeof introCallSpecialtyKey>;
  prep_context_state: EngagementPreparationContextState;
  use_product_bundle: boolean;
  include_generic_discovery_core: boolean;
  include_generic_talking_core: boolean;
  include_specialty_generic_pool: boolean;
  include_specialty_workflow_focus: boolean;
  include_prep_context_extras: boolean;
  include_observation_goals: boolean;
  include_commercialization_signals: boolean;
  product_prep_tier: PreparationSpecializationTier;
};

export type EngagementPrepModeUiFlags = {
  show_mode_banner: boolean;
  show_product_focus_selector: boolean;
  show_workflow_hint: boolean;
  show_discovery_focus_panel: boolean;
  show_specialty_guidance_panel: boolean;
  show_objective: boolean;
  show_discovery_questions: boolean;
  show_talking_points: boolean;
  show_observation_goals: boolean;
  show_workflow_signals: boolean;
  show_success_outcomes: boolean;
  show_product_overlays: boolean;
};

export type EngagementPrepModeView = {
  mode: EngagementPrepMode;
  label: string;
  summary: string;
  product_line: PreCallPlanProductLine | "";
  generation: EngagementPrepGenerationFlags;
  ui: EngagementPrepModeUiFlags;
};

const EVALUATION_STAGES = new Set<SalesStage>([
  "clinical_validation",
  "evaluation_planned",
  "evaluation_active",
]);

const PRODUCT_LABEL: Record<PreCallPlanProductLine, string> = {
  ACSIS: "ACSIS",
  BioTissue: "BioTissue",
  Merakris: "Merakris",
  TelaBio: "TelaBio",
  "Skeletal Dynamics": "Skeletal Dynamics",
  Endolumik: "Endolumik",
};

/** When product focus is intentional, specialty follows the product — not the provider's unrelated specialty. */
export function dominantSpecialtyKeyForProduct(
  productLine: PreCallPlanProductLine,
): IntroCallSpecialtyKey {
  switch (productLine) {
    case "BioTissue":
    case "Merakris":
      return "wound_care";
    case "Skeletal Dynamics":
      return "orthopedics";
    case "ACSIS":
    case "TelaBio":
    case "Endolumik":
      return "general_surgery";
    default:
      return "default";
  }
}

export function resolveEffectiveSpecialtyKeyForPrep(input: {
  productLine?: PreCallPlanProductLine | "";
  providerSpecialty?: string | null;
  intentionalProductFocus?: boolean;
  prepMode?: EngagementPrepMode | "" | null;
}): IntroCallSpecialtyKey {
  if (input.intentionalProductFocus && input.productLine) {
    return dominantSpecialtyKeyForProduct(input.productLine);
  }
  const mode = normalizeEngagementPrepMode(input.prepMode);
  if (mode === "specialty_workflow_discovery") {
    return introCallSpecialtyKey(input.providerSpecialty);
  }
  return "default";
}

/** True when prep should stay product-neutral (generic discovery pools only). */
export function isBroadWorkflowDiscoveryPrep(flags: EngagementPrepGenerationFlags): boolean {
  return (
    flags.include_generic_discovery_core &&
    !flags.use_product_bundle &&
    !flags.include_specialty_generic_pool
  );
}

export function coerceEngagementPrepMode(
  mode: EngagementPrepMode,
  input: EngagementPrepModeInput,
): EngagementPrepMode {
  if (engagementPrepModeRequiresProduct(mode) && !resolveExplicitPrepProductLine(input.productLine)) {
    return "general_discovery";
  }
  return mode;
}

export function engagementPrepModeRequiresProduct(mode: EngagementPrepMode): boolean {
  return ENGAGEMENT_PREP_MODE_DEFINITIONS.find((d) => d.mode === mode)?.requires_product ?? false;
}

export function normalizeEngagementPrepMode(raw: string | null | undefined): EngagementPrepMode | "" {
  const key = String(raw ?? "").trim() as EngagementPrepMode;
  return (ENGAGEMENT_PREP_MODES as readonly string[]).includes(key) ? key : "";
}

function inferPrepModeFromPipeline(input: EngagementPrepModeInput): EngagementPrepMode | null {
  const product = resolveExplicitPrepProductLine(input.productLine);
  const hasCase = Boolean(String(input.caseId ?? "").trim());
  const stage = normalizeSalesStage(input.opportunityStage);

  const pipelineState = resolveEngagementPreparationContextState({
    engagementType: input.engagementType,
    productLine: input.productLine,
    opportunityId: input.opportunityId,
    opportunityStage: input.opportunityStage,
    caseId: input.caseId,
    providerRelationshipStage: input.providerRelationshipStage,
  });

  if (pipelineState === "observation_support" && product) {
    return "live_case_support";
  }
  if (pipelineState === "evaluation_planning" && product) {
    return "evaluation_preparation";
  }
  if (hasCase && product) {
    return "live_case_support";
  }
  if (stage && EVALUATION_STAGES.has(stage) && product) {
    return "evaluation_preparation";
  }
  if (product) {
    return "product_exploration";
  }
  return null;
}

/** Resolved mode for generators — explicit selection, else pipeline inference, else general discovery. */
export function resolveSuggestedEngagementPrepMode(input: EngagementPrepModeInput): EngagementPrepMode {
  const explicit = normalizeEngagementPrepMode(input.prepMode);
  if (explicit) return coerceEngagementPrepMode(explicit, input);
  const inferred = inferPrepModeFromPipeline(input);
  return coerceEngagementPrepMode(inferred ?? "general_discovery", input);
}

/** First-load wizard default — pipeline-aware; never auto-selects specialty from CRM profile. */
export function resolveDefaultWizardPrepMode(input: EngagementPrepModeInput): EngagementPrepMode {
  return resolveSuggestedEngagementPrepMode(input);
}

function prepContextStateForMode(mode: EngagementPrepMode): EngagementPreparationContextState {
  switch (mode) {
    case "general_discovery":
    case "specialty_workflow_discovery":
      return "discovery";
    case "product_exploration":
      return "product_exploration";
    case "observation_qualification":
      return "discovery";
    case "evaluation_preparation":
      return "evaluation_planning";
    case "live_case_support":
      return "observation_support";
    default:
      return "discovery";
  }
}

function generationFlagsForMode(
  mode: EngagementPrepMode,
  input: EngagementPrepModeInput,
): EngagementPrepGenerationFlags {
  const productLine = resolveExplicitPrepProductLine(input.productLine);
  const intentional = hasExplicitPrepProductFocus(input.productLine);
  const prep_context_state = prepContextStateForMode(mode);
  const effective_specialty_key = resolveEffectiveSpecialtyKeyForPrep({
    productLine,
    providerSpecialty: input.providerSpecialty,
    intentionalProductFocus: intentional && engagementPrepModeRequiresProduct(mode),
    prepMode: mode,
  });

  const base = {
    prep_mode: mode,
    intentional_product_focus: intentional && engagementPrepModeRequiresProduct(mode),
    product_line: engagementPrepModeRequiresProduct(mode) ? productLine : "",
    effective_specialty_key,
    prep_context_state,
  };

  switch (mode) {
    case "general_discovery":
      return {
        ...base,
        use_product_bundle: false,
        include_generic_discovery_core: true,
        include_generic_talking_core: true,
        include_specialty_generic_pool: false,
        include_specialty_workflow_focus: false,
        include_prep_context_extras: false,
        include_observation_goals: false,
        include_commercialization_signals: false,
        product_prep_tier: "low",
      };
    case "specialty_workflow_discovery":
      return {
        ...base,
        use_product_bundle: false,
        include_generic_discovery_core: false,
        include_generic_talking_core: false,
        include_specialty_generic_pool: true,
        include_specialty_workflow_focus: true,
        include_prep_context_extras: false,
        include_observation_goals: false,
        include_commercialization_signals: false,
        product_prep_tier: "medium",
      };
    case "product_exploration":
      return {
        ...base,
        intentional_product_focus: Boolean(productLine),
        product_line: productLine,
        use_product_bundle: Boolean(productLine),
        include_generic_discovery_core: false,
        include_generic_talking_core: false,
        include_specialty_generic_pool: false,
        include_specialty_workflow_focus: false,
        include_prep_context_extras: true,
        include_observation_goals: false,
        include_commercialization_signals: false,
        product_prep_tier: "medium",
      };
    case "observation_qualification":
      return {
        ...base,
        use_product_bundle: false,
        include_generic_discovery_core: true,
        include_generic_talking_core: true,
        include_specialty_generic_pool: false,
        include_specialty_workflow_focus: false,
        include_prep_context_extras: false,
        include_observation_goals: true,
        include_commercialization_signals: false,
        product_prep_tier: "medium",
      };
    case "evaluation_preparation":
      return {
        ...base,
        intentional_product_focus: Boolean(productLine),
        product_line: productLine,
        use_product_bundle: Boolean(productLine),
        include_generic_discovery_core: false,
        include_generic_talking_core: false,
        include_specialty_generic_pool: false,
        include_specialty_workflow_focus: false,
        include_prep_context_extras: true,
        include_observation_goals: false,
        include_commercialization_signals: true,
        product_prep_tier: "high",
      };
    case "live_case_support":
      return {
        ...base,
        intentional_product_focus: Boolean(productLine),
        product_line: productLine,
        use_product_bundle: Boolean(productLine),
        include_generic_discovery_core: false,
        include_generic_talking_core: false,
        include_specialty_generic_pool: false,
        include_specialty_workflow_focus: false,
        include_prep_context_extras: true,
        include_observation_goals: true,
        include_commercialization_signals: true,
        product_prep_tier: "high",
      };
    default:
      return generationFlagsForMode("general_discovery", input);
  }
}

function uiFlagsForMode(mode: EngagementPrepMode): EngagementPrepModeUiFlags {
  const isIntro = true;
  switch (mode) {
    case "general_discovery":
      return {
        show_mode_banner: isIntro,
        show_product_focus_selector: isIntro,
        show_workflow_hint: isIntro,
        show_discovery_focus_panel: isIntro,
        show_specialty_guidance_panel: false,
        show_objective: isIntro,
        show_discovery_questions: isIntro,
        show_talking_points: isIntro,
        show_observation_goals: false,
        show_workflow_signals: false,
        show_success_outcomes: false,
        show_product_overlays: false,
      };
    case "specialty_workflow_discovery":
      return {
        show_mode_banner: isIntro,
        show_product_focus_selector: isIntro,
        show_workflow_hint: false,
        show_discovery_focus_panel: false,
        show_specialty_guidance_panel: isIntro,
        show_objective: isIntro,
        show_discovery_questions: isIntro,
        show_talking_points: isIntro,
        show_observation_goals: false,
        show_workflow_signals: false,
        show_success_outcomes: false,
        show_product_overlays: false,
      };
    case "product_exploration":
      return {
        show_mode_banner: isIntro,
        show_product_focus_selector: isIntro,
        show_workflow_hint: false,
        show_discovery_focus_panel: false,
        show_specialty_guidance_panel: false,
        show_objective: isIntro,
        show_discovery_questions: isIntro,
        show_talking_points: isIntro,
        show_observation_goals: false,
        show_workflow_signals: false,
        show_success_outcomes: false,
        show_product_overlays: isIntro,
      };
    case "observation_qualification":
      return {
        show_mode_banner: isIntro,
        show_product_focus_selector: isIntro,
        show_workflow_hint: false,
        show_discovery_focus_panel: false,
        show_specialty_guidance_panel: false,
        show_objective: isIntro,
        show_discovery_questions: isIntro,
        show_talking_points: isIntro,
        show_observation_goals: isIntro,
        show_workflow_signals: false,
        show_success_outcomes: false,
        show_product_overlays: false,
      };
    case "evaluation_preparation":
      return {
        show_mode_banner: isIntro,
        show_product_focus_selector: isIntro,
        show_workflow_hint: false,
        show_discovery_focus_panel: false,
        show_specialty_guidance_panel: false,
        show_objective: isIntro,
        show_discovery_questions: isIntro,
        show_talking_points: isIntro,
        show_observation_goals: false,
        show_workflow_signals: isIntro,
        show_success_outcomes: isIntro,
        show_product_overlays: false,
      };
    case "live_case_support":
      return {
        show_mode_banner: isIntro,
        show_product_focus_selector: isIntro,
        show_workflow_hint: false,
        show_discovery_focus_panel: false,
        show_specialty_guidance_panel: false,
        show_objective: isIntro,
        show_discovery_questions: isIntro,
        show_talking_points: isIntro,
        show_observation_goals: isIntro,
        show_workflow_signals: isIntro,
        show_success_outcomes: false,
        show_product_overlays: false,
      };
    default:
      return uiFlagsForMode("general_discovery");
  }
}

export function buildEngagementPrepModeView(input: EngagementPrepModeInput): EngagementPrepModeView {
  const mode = resolveSuggestedEngagementPrepMode(input);
  const def = ENGAGEMENT_PREP_MODE_DEFINITIONS.find((d) => d.mode === mode)!;
  const generation = generationFlagsForMode(mode, input);
  const product_line = generation.product_line;
  const label =
    product_line && engagementPrepModeRequiresProduct(mode)
      ? `${def.label} · ${PRODUCT_LABEL[product_line]}`
      : def.label;
  const summary =
    product_line && engagementPrepModeRequiresProduct(mode)
      ? `${def.summary} Product focus: ${PRODUCT_LABEL[product_line]}.`
      : def.summary;

  return {
    mode,
    label,
    summary,
    product_line,
    generation,
    ui: uiFlagsForMode(mode),
  };
}

/** @deprecated Use EngagementPrepGenerationFlags */
export type DominantPrepGenerationFlags = EngagementPrepGenerationFlags;

/** Legacy resolver — maps to explicit prep mode generation flags. */
export function resolvePrepGenerationFlags(input: {
  dominantPrep?: EngagementPrepGenerationFlags;
  prepMode?: EngagementPrepMode | "";
  productLine?: PreCallPlanProductLine | "";
  providerSpecialty?: string | null;
  prepContextState?: EngagementPreparationContextState;
  prepSpecializationTier?: PreparationSpecializationTier;
  intentionalProductFocus?: boolean;
  engagementType?: string;
  opportunityId?: string | null;
  opportunityStage?: string | null;
  caseId?: string | null;
}): EngagementPrepGenerationFlags {
  if (input.dominantPrep) return input.dominantPrep;

  const mode = resolveSuggestedEngagementPrepMode({
    engagementType: input.engagementType ?? "intro_call",
    prepMode: input.prepMode,
    productLine: input.productLine,
    opportunityId: input.opportunityId,
    opportunityStage: input.opportunityStage,
    caseId: input.caseId,
    providerSpecialty: input.providerSpecialty,
  });

  return generationFlagsForMode(mode, {
    engagementType: input.engagementType ?? "intro_call",
    prepMode: mode,
    productLine: input.productLine,
    providerSpecialty: input.providerSpecialty,
    opportunityId: input.opportunityId,
    opportunityStage: input.opportunityStage,
    caseId: input.caseId,
  });
}
