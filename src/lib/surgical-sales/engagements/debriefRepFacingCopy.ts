/**
 * Rep-facing copy for Observation Debrief — strips internal ontology and builder artifacts.
 */

import type {
  AiDebriefStrategy,
  DebriefAdvancementPathRecommendation,
} from "@/lib/surgical-sales/engagements/buildAiDebriefStrategy";
import { cleanProductDisplayName } from "@/lib/surgical-sales/findingDisplayLabels";
import { translateDebriefClinicalTopic } from "@/lib/surgical-sales/engagements/debriefClinicalTopicTranslation";
import {
  isOntologyDisplayLabel,
  isOntologyProductLabel,
  translateFindingLabelToRepLanguage,
} from "@/lib/surgical-sales/observationIntelligenceDisplayLabels";
import { sanitizeRepFacingCopy } from "@/lib/surgical-sales/observationRepPresentationCopy";

const BUILDER_PREFIX_PATTERNS: RegExp[] = [
  /^recurring pain point \(\d+ observations\):\s*/i,
  /^competitive pattern \(\d+ observations\):\s*/i,
  /^opportunity pattern \(\d+ observations\):\s*/i,
  /^product fit trend \(\d+ observations\):\s*/i,
  /^prior case \([^)]+\):\s*/i,
  /^prior observation:\s*/i,
  /^prior opportunity observation:\s*/i,
  /^prior product fit observation:\s*/i,
  /^known workflow pain point on provider profile:\s*/i,
  /^known competitive footprint on provider profile:\s*/i,
  /^known evaluation openness on provider profile:\s*/i,
  /^known technique preference on provider profile:\s*/i,
  /^known procedure focus on provider profile:\s*/i,
  /^pre-case signal to validate:\s*/i,
  /^observed \d+ times:\s*/i,
  /^latest signal:\s*/i,
  /^evidence:\s*/i,
];

const INTERNAL_PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bStill needed:\s*/gi, ""],
  [/\bValidate in field intelligence\.?/gi, "Confirm with the surgeon."],
  [/\bfield intelligence\b/gi, "observation notes"],
  [/\bfield signals?\b/gi, "what you observed"],
  [/\bobservation intelligence\b/gi, "observation notes"],
  [/\bintelligence-backed\b/gi, "based on your observations"],
  [/\bintelligence-assisted\b/gi, "based on your notes"],
  [/\bproduct signal(s)?\b/gi, "product interest"],
  [/\bclinical frustration(s)?\b/gi, "frustration during the case"],
  [/\bworkflow pain point(s)?\b/gi, "workflow friction"],
  [/\bclinical pain point(s)?\b/gi, "frustration during the case"],
  [/\bprovider profile\b/gi, "what we know about the surgeon"],
  [/\bworkflow friction\b/gi, "workflow friction during the case"],
  [/\bvisualization Challenge Fixation\b/g, "extra time establishing visualization before fixation"],
  [/\bvisualization challenge fixation\b/gi, "extra time establishing visualization before fixation"],
  [/\bvalidation target\b/gi, "observation checklist item"],
  [/\bquick finding(s)?\b/gi, "field note"],
  [/\bwas referenced in observation intelligence\.?/gi, "came up in your observation notes."],
  [/\bvalidate whether\b/gi, "confirm whether"],
  [/\bvalidate what matters\b/gi, "confirm what matters"],
  [/\bvalidate your\b/gi, "confirm your"],
  [/\bvalidate assumptions\b/gi, "confirm assumptions"],
  [/\bvalidate recurring\b/gi, "confirm recurring"],
  [/\bvalidate with the surgeon\b/gi, "confirm with the surgeon"],
  [/\bobservation takeaway\b/gi, "takeaway from the OR"],
  [/\bobservation notes\b/gi, "what you saw in the OR"],
  [/\bobservation program\b/gi, "observation visits"],
  [/\bApple Product Used Surgery observed\b/gi, "A product was used during the procedure"],
  [/\bProduct Used Surgery observed\b/gi, "A product was used during the procedure"],
];

export function stripDebriefBuilderPrefixes(text: string): string {
  let result = text.trim();
  for (const pattern of BUILDER_PREFIX_PATTERNS) {
    result = result.replace(pattern, "");
  }
  return result.trim();
}

export function humanizeDebriefTopic(raw: string): string {
  const stripped = stripDebriefBuilderPrefixes(raw);
  if (stripped && isOntologyProductLabel(stripped.replace(/\s+observed$/i, "").trim())) {
    return "a product was used during the procedure";
  }

  const translated = translateDebriefClinicalTopic(raw);
  if (translated) return translated;

  if (!stripped) return "";

  const cleanedProduct = cleanProductDisplayName(stripped.replace(/\s+observed$/i, "").trim());
  if (cleanedProduct && !isOntologyProductLabel(cleanedProduct)) {
    return cleanedProduct;
  }

  if (isOntologyDisplayLabel(stripped)) {
    return translateFindingLabelToRepLanguage(stripped, { mode: "established_pattern" });
  }

  return stripped;
}

export function sanitizeDebriefRepFacingCopy(text: string): string {
  let result = String(text ?? "").trim();
  if (!result) return "";

  for (const [pattern, replacement] of INTERNAL_PHRASE_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  result = sanitizeRepFacingCopy(result);
  result = result.replace(/\s{2,}/g, " ").replace(/\s+([,.!?])/g, "$1").trim();

  if (/^[\s—–-]+$/.test(result)) return "";

  return result;
}

export function sanitizeDebriefQuestion(text: string): string {
  const humanized = humanizeDebriefTopic(text);
  const sanitized = sanitizeDebriefRepFacingCopy(humanized || text);
  const trimmed = sanitized.trim();
  if (!trimmed) return "Where should we start on a commercial next step?";
  return trimmed.endsWith("?") ? trimmed : `${trimmed}?`;
}

function sanitizeAdvancementPath(path: DebriefAdvancementPathRecommendation): DebriefAdvancementPathRecommendation {
  return {
    ...path,
    coachingNote: sanitizeDebriefRepFacingCopy(path.coachingNote),
  };
}

export function sanitizeDebriefStrategy(
  strategy: Omit<
    AiDebriefStrategy,
    "debriefMission" | "conversationStrategy" | "validationQuestions" | "explorationQuestions"
  >,
): Omit<AiDebriefStrategy, "debriefMission" | "conversationStrategy" | "validationQuestions" | "explorationQuestions"> {
  return {
    missionWhy: sanitizeDebriefRepFacingCopy(strategy.missionWhy),
    missionSuccess: sanitizeDebriefRepFacingCopy(strategy.missionSuccess),
    openingQuestion: sanitizeDebriefQuestion(strategy.openingQuestion),
    decisionQuestions: strategy.decisionQuestions
      .map((line) => sanitizeDebriefRepFacingCopy(line))
      .filter(Boolean),
    opportunityQuestions: strategy.opportunityQuestions
      .map((line) => sanitizeDebriefRepFacingCopy(line))
      .filter(Boolean),
    closingQuestions: strategy.closingQuestions.map(sanitizeDebriefQuestion).filter(Boolean),
    mustAnswerBeforeLeaving: strategy.mustAnswerBeforeLeaving
      .map((line) => sanitizeDebriefRepFacingCopy(line))
      .filter(Boolean),
    advancementPaths: strategy.advancementPaths.map(sanitizeAdvancementPath),
    desiredOutcome: sanitizeDebriefRepFacingCopy(strategy.desiredOutcome),
  };
}

/** Patterns that must never appear in rep-facing debrief copy. */
export const DEBRIEF_BANNED_DISPLAY_PATTERNS: RegExp[] = [
  /known workflow pain point on provider profile/i,
  /still needed:/i,
  /validate in field intelligence/i,
  /apple product used surgery/i,
  /product used surgery observed/i,
  /clinical_pain_point|workflow_friction|product_signal/i,
  /\bconfidence:\s*(high|medium|low)\b/i,
  /recurring pain point \(\d+ observations\)/i,
  /prior observation:/i,
  /observation intelligence/i,
  /field signals?/i,
  /\bclinical frustration(s)?\b/i,
  /\bworkflow pain point(s)?\b/i,
  /\bproduct signal(s)?\b/i,
  /\bclinical pain point(s)?\b/i,
  /\bprovider profile\b/i,
  /\bworkflow friction\b/i,
  /\bvisualization challenge fixation\b/i,
];

export function debriefCopyContainsBannedPattern(text: string): boolean {
  return DEBRIEF_BANNED_DISPLAY_PATTERNS.some((pattern) => pattern.test(text));
}
