import {
  getIntroCallTemplate,
  introCallTemplates,
  type IntroCallPrepTemplate,
  type IntroCallProductFocus,
} from "@/lib/surgical-sales/engagements/introCallTemplates";
import { resolveExplicitPrepProductLine } from "@/lib/surgical-sales/engagements/introCallProductAlignment";
import { isIntroCallProductPrepEnabled } from "@/lib/surgical-sales/engagements/introCallProductContext";
import { formatIntroCallBulletList } from "@/lib/surgical-sales/engagements/introCallTemplates/introCallTemplate.shared";
import type { PreCallPlanProductLine } from "@/lib/surgical-sales/preCallPlanTemplateTypes";

export type { IntroCallPrepTemplate, IntroCallProductFocus } from "@/lib/surgical-sales/engagements/introCallTemplates";

/** Wizard section title — 360 Medical Pre-call Planning Tool */
export const INTRO_CALL_PREP_SECTION_TITLE = "Intro Call Pre-call Plan";

export const INTRO_CALL_PREP_BANNER_GENERIC =
  "Generic intro call — focused on procedure fit, workflow, access, and observation.";

export function introCallPrepBannerProduct(productLine: PreCallPlanProductLine): string {
  return `Product-focused intro call — tailored to ${productLine}.`;
}

export { introCallTemplates };

export type IntroCallPrepTemplateInput = {
  /** @deprecated Templates are static; specialty does not alter product copy */
  providerSpecialty?: string | null;
};

const PRODUCT_LINE_TO_FOCUS: Record<PreCallPlanProductLine, IntroCallProductFocus> = {
  ACSIS: "acsis",
  BioTissue: "biotissue",
  Merakris: "merakris",
  Endolumik: "endolumik",
  TelaBio: "telabio",
  "Skeletal Dynamics": "skeletalDynamics",
};

const FOCUS_TO_PRODUCT_LINE: Record<Exclude<IntroCallProductFocus, "generic">, PreCallPlanProductLine> = {
  acsis: "ACSIS",
  biotissue: "BioTissue",
  merakris: "Merakris",
  endolumik: "Endolumik",
  telabio: "TelaBio",
  skeletalDynamics: "Skeletal Dynamics",
};

export function resolveIntroCallProductFocus(input: {
  productLine?: string | null;
  intentionalProductFocus?: boolean;
}): IntroCallProductFocus {
  if (!input.intentionalProductFocus) return "generic";
  const line = resolveExplicitPrepProductLine(input.productLine);
  if (!line) return "generic";
  return PRODUCT_LINE_TO_FOCUS[line] ?? "generic";
}

export function introCallProductFocusLabel(focus: IntroCallProductFocus): string {
  if (focus === "generic") return "portfolio discovery";
  return FOCUS_TO_PRODUCT_LINE[focus];
}

export function buildIntroCallPrepTemplate(input: {
  productFocus: IntroCallProductFocus;
  /** @deprecated Ignored — templates are hardcoded per product */
  providerSpecialty?: string | null;
}): IntroCallPrepTemplate {
  return getIntroCallTemplate(input.productFocus);
}

/** @deprecated Prefer buildIntroCallPrepTemplate — kept for existing generators */
export type IntroCallOfficialPreCallPlan = {
  mode: "generic" | "product";
  productLine: PreCallPlanProductLine | "";
  smartObjective: string;
  impactOpening: string;
  probes: readonly string[];
  toolsResources: string;
  valueHypothesis: string;
  plannedClose: string;
  observationGoals: readonly string[];
  suggestedFollowUp: readonly string[];
};

export function templateToLegacyPlan(
  template: IntroCallPrepTemplate,
  focus: IntroCallProductFocus,
): IntroCallOfficialPreCallPlan {
  const productLine = focus === "generic" ? ("" as const) : FOCUS_TO_PRODUCT_LINE[focus];
  return {
    mode: focus === "generic" ? "generic" : "product",
    productLine,
    smartObjective: template.smartObjective,
    impactOpening: template.impactOpeningStatement,
    probes: template.probesInformationToGather,
    toolsResources: template.toolsResources,
    valueHypothesis: template.valueHypothesis,
    plannedClose: template.plannedCloseNextStep,
    observationGoals: template.observationGoals,
    suggestedFollowUp: template.suggestedFollowUp,
  };
}

export function buildIntroCallOfficialPreCallPlan(input: {
  productLine?: string | null;
  intentionalProductFocus?: boolean;
  prepSpecializationTier?: "low" | "medium" | "high";
  /** @deprecated Ignored */
  providerSpecialty?: string | null;
}): IntroCallOfficialPreCallPlan {
  const productLine = resolveExplicitPrepProductLine(input.productLine);
  const productEnabled = isIntroCallProductPrepEnabled(
    productLine,
    input.prepSpecializationTier,
    Boolean(input.intentionalProductFocus),
  );
  const focus = resolveIntroCallProductFocus({
    productLine: productEnabled ? input.productLine : null,
    intentionalProductFocus: productEnabled && Boolean(input.intentionalProductFocus),
  });
  const template = buildIntroCallPrepTemplate({ productFocus: focus });
  return templateToLegacyPlan(template, focus);
}

/** Product names that must not appear in generic (no product) generated prep. */
export const INTRO_CALL_FORBIDDEN_PRODUCT_TERMS =
  /\b(hernia|bariatric|acsis|endolumik|biotissue|merakris|dermacyte|telabio|skeletal dynamics|ventral|incisional|mesh|bougie|foregut|biologic graft|extremity fixation|limb salvage|fascial reinforcement)\b/i;

export function shouldUseIntroCallOfficialTemplates(input: {
  engagementType: string;
  prepContextState?: string | null;
  intentionalProductFocus?: boolean;
  productLine?: string | null;
}): boolean {
  if (input.engagementType !== "intro_call") return false;
  const state = String(input.prepContextState ?? "discovery");
  if (state === "evaluation_planning" || state === "observation_support") return false;
  return true;
}

export function formatIntroCallProbesForField(probes: readonly string[]): string {
  return formatIntroCallBulletList(probes);
}
