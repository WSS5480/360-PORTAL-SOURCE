import { INTRO_CALL_TEMPLATE_ACSIS } from "@/lib/surgical-sales/engagements/introCallTemplates/introCallTemplate.acsis";
import { INTRO_CALL_TEMPLATE_BIOTISSUE } from "@/lib/surgical-sales/engagements/introCallTemplates/introCallTemplate.biotissue";
import { INTRO_CALL_TEMPLATE_ENDOLUMIK } from "@/lib/surgical-sales/engagements/introCallTemplates/introCallTemplate.endolumik";
import { INTRO_CALL_TEMPLATE_GENERIC } from "@/lib/surgical-sales/engagements/introCallTemplates/introCallTemplate.generic";
import { INTRO_CALL_TEMPLATE_MERAKRIS } from "@/lib/surgical-sales/engagements/introCallTemplates/introCallTemplate.merakris";
import { INTRO_CALL_TEMPLATE_SKELETAL_DYNAMICS } from "@/lib/surgical-sales/engagements/introCallTemplates/introCallTemplate.skeletalDynamics";
import { INTRO_CALL_TEMPLATE_TELABIO } from "@/lib/surgical-sales/engagements/introCallTemplates/introCallTemplate.telabio";
import type {
  IntroCallPrepTemplate,
  IntroCallProductFocus,
} from "@/lib/surgical-sales/engagements/introCallTemplates/introCallTemplate.types";

export type {
  IntroCallPrepTemplate,
  IntroCallProductFocus,
} from "@/lib/surgical-sales/engagements/introCallTemplates/introCallTemplate.types";

export const INTRO_CALL_TEMPLATES_BY_FOCUS: Record<IntroCallProductFocus, IntroCallPrepTemplate> = {
  generic: INTRO_CALL_TEMPLATE_GENERIC,
  acsis: INTRO_CALL_TEMPLATE_ACSIS,
  biotissue: INTRO_CALL_TEMPLATE_BIOTISSUE,
  merakris: INTRO_CALL_TEMPLATE_MERAKRIS,
  endolumik: INTRO_CALL_TEMPLATE_ENDOLUMIK,
  telabio: INTRO_CALL_TEMPLATE_TELABIO,
  skeletalDynamics: INTRO_CALL_TEMPLATE_SKELETAL_DYNAMICS,
};

export function getIntroCallTemplate(focus: IntroCallProductFocus): IntroCallPrepTemplate {
  return INTRO_CALL_TEMPLATES_BY_FOCUS[focus];
}

/** @deprecated Use INTRO_CALL_TEMPLATES_BY_FOCUS — builder map for legacy callers */
export const introCallTemplates = {
  generic: () => INTRO_CALL_TEMPLATE_GENERIC,
  acsis: () => INTRO_CALL_TEMPLATE_ACSIS,
  biotissue: () => INTRO_CALL_TEMPLATE_BIOTISSUE,
  merakris: () => INTRO_CALL_TEMPLATE_MERAKRIS,
  endolumik: () => INTRO_CALL_TEMPLATE_ENDOLUMIK,
  telabio: () => INTRO_CALL_TEMPLATE_TELABIO,
  skeletalDynamics: () => INTRO_CALL_TEMPLATE_SKELETAL_DYNAMICS,
} as const;
