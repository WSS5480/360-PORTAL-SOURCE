import {
  applyConversationFocusToTemplatePreview,
  INTRO_CALL_CONVERSATION_FOCUS_OPTIONS,
  type IntroCallConversationFocusId,
} from "@/lib/surgical-sales/engagements/introCallConversationFocus";
import { INTRO_CALL_TEMPLATES_BY_FOCUS } from "@/lib/surgical-sales/engagements/introCallTemplates";
import type { IntroCallTemplateState } from "@/lib/surgical-sales/engagements/introCallTemplateState";
import { resolveExplicitPrepProductLine } from "@/lib/surgical-sales/engagements/introCallProductAlignment";
import {
  preparationReadinessGapChipLabel,
  preparationReadinessMissingSignals,
  type PreparationReadiness,
} from "@/lib/surgical-sales/engagements/engagementWizardPrepReadiness";

const FOCUS_AREA_LABEL_BY_ID = new Map(
  INTRO_CALL_CONVERSATION_FOCUS_OPTIONS.map((option) => [option.id, option.label]),
);

export type IntroCallAiRecommendationsSummary = {
  templateName: string;
  productFocusLabel: string;
  probeCount: number;
  focusAreaCount: number;
  intelligenceGapCount: number;
  focusAreaLabels: string[];
  prepGapLabels: string[];
};

export function buildIntroCallFocusAreaLabels(
  conversationFocus: readonly IntroCallConversationFocusId[],
): string[] {
  if (conversationFocus.length === 0) {
    return ["General discovery"];
  }
  return conversationFocus.map((id) => FOCUS_AREA_LABEL_BY_ID.get(id) ?? id);
}

export function buildIntroCallPrepGapLabels(readiness: PreparationReadiness): string[] {
  return preparationReadinessMissingSignals(readiness).map(preparationReadinessGapChipLabel);
}

export function buildIntroCallAiRecommendationsSummary(input: {
  templateState: IntroCallTemplateState;
  productLine: string;
  conversationFocus: readonly IntroCallConversationFocusId[];
  readiness: PreparationReadiness;
}): IntroCallAiRecommendationsSummary {
  const displayTemplate = applyConversationFocusToTemplatePreview(
    input.templateState.generatedSuggestions,
    input.conversationFocus,
  );
  const templateMeta = INTRO_CALL_TEMPLATES_BY_FOCUS[input.templateState.selectedProductFocus];
  const explicitLine = resolveExplicitPrepProductLine(input.productLine);
  const focusAreaLabels = buildIntroCallFocusAreaLabels(input.conversationFocus);
  const prepGapLabels = buildIntroCallPrepGapLabels(input.readiness);

  return {
    templateName: templateMeta.productLabel,
    productFocusLabel: explicitLine || "Portfolio discovery",
    probeCount: displayTemplate.probesInformationToGather.length,
    focusAreaCount: focusAreaLabels.length,
    intelligenceGapCount: prepGapLabels.length,
    focusAreaLabels,
    prepGapLabels,
  };
}
