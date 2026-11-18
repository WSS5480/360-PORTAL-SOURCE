/**
 * Translates internal extraction labels into surgeon-recognizable clinical language
 * for Observation Debrief coaching output.
 */

import type { ProviderDebriefPlanLearningCategory } from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";
import {
  isOntologyDisplayLabel,
  isOntologyProductLabel,
  translateFindingLabelToRepLanguage,
} from "@/lib/surgical-sales/observationIntelligenceDisplayLabels";
import { translateLearningObjectiveTopic } from "@/lib/surgical-sales/observationLearningObjectiveDisplay";

const BUILDER_PREFIX_PATTERNS: RegExp[] = [
  /^recurring pain point \(\d+ observations\):\s*/i,
  /^competitive pattern \(\d+ observations\):\s*/i,
  /^prior observation:\s*/i,
  /^known workflow pain point on provider profile:\s*/i,
  /^pre-case signal to validate:\s*/i,
];

function stripDebriefBuilderPrefixes(text: string): string {
  let result = text.trim();
  for (const pattern of BUILDER_PREFIX_PATTERNS) {
    result = result.replace(pattern, "");
  }
  return result.trim();
}

/** Internal category tokens that must never appear as conversation topics. */
const INTERNAL_CATEGORY_ONLY =
  /^(clinical frustration(s)?|workflow pain point(s)?|product signal(s)?|clinical pain point(s)?|workflow friction|procedure insight|staff observation|competitive usage|product fit|visualization challenge fixation|visualization challenge before fixation|visualization delay)$/i;

const INTERNAL_CATEGORY_IN_PHRASE =
  /\b(clinical frustration(s)?|workflow pain point(s)?|product signal(s)?|clinical pain point(s)?|visualization challenge fixation)\b/gi;

const TITLE_CASE_JUNK = /^[A-Z][a-z]+(?: [A-Z][a-z]+)+$/;

function isNaturalClinicalSentence(text: string): boolean {
  const t = text.trim();
  return (
    t.length > 24 &&
    (/ (before|during|after|when|creates|affects|when) /i.test(t) ||
      /\b(uncertainty|friction|delay|visualization|fixation)\b/i.test(t)) &&
    !INTERNAL_CATEGORY_ONLY.test(t) &&
    !isOntologyDisplayLabel(t)
  );
}

function normalizeTopicKey(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]+/g, " ")
    .replace(/\s+/g, " ");
}

function mapVisualizationFixationPhrase(): string {
  return "extra time spent establishing visualization before fixation";
}

function mapFromNormalizedKey(key: string): string | null {
  if (/visuali.*fixation|fixation.*visuali|visualization challenge/.test(key)) {
    return mapVisualizationFixationPhrase();
  }
  if (/clinical.*frustr|provider.*frustr|^frustration/.test(key)) {
    return "moments of frustration during the case";
  }
  if (/workflow.*pain|workflow.*friction|workflow.*delay|workflow.*burden/.test(key)) {
    return "workflow friction during the case";
  }
  if (/product.*signal|product.*interest|product.*fit/.test(key)) {
    return "interest in a different product approach";
  }
  if (/competitor|competitive/.test(key)) {
    return "which products were actually used in the room";
  }
  if (/staff.*process|staff.*workflow|staff.*friction/.test(key)) {
    return "staff coordination around setup and turnover";
  }
  if (/stock|avail|suppl|verify product/.test(key)) {
    return "time spent confirming products were ready before the case";
  }
  return null;
}

/** Surgeon-recognizable noun phrase — never an internal category label. */
export function translateDebriefClinicalTopic(
  raw: string,
  category?: ProviderDebriefPlanLearningCategory,
): string {
  const stripped = stripDebriefBuilderPrefixes(raw).replace(/\.$/, "").trim();
  if (!stripped) return "";

  if (isNaturalClinicalSentence(stripped)) {
    return stripped.charAt(0).toLowerCase() + stripped.slice(1);
  }

  const key = normalizeTopicKey(stripped);
  const fromKey = mapFromNormalizedKey(key);
  if (fromKey) return fromKey;

  if (INTERNAL_CATEGORY_ONLY.test(stripped)) {
    if (/visualization|fixation/.test(key)) return mapVisualizationFixationPhrase();
    if (/frustration|clinical/.test(key)) return "moments of frustration during the case";
    if (/workflow/.test(key)) return "workflow friction during the case";
    if (/product/.test(key)) return "interest in a different product approach";
  }

  const learningTopic = translateLearningObjectiveTopic(stripped);
  if (learningTopic && learningTopic !== stripped && !INTERNAL_CATEGORY_ONLY.test(learningTopic)) {
    if (/extra visualization time before fixation/i.test(learningTopic)) {
      return mapVisualizationFixationPhrase();
    }
    if (!isOntologyDisplayLabel(learningTopic)) {
      return learningTopic;
    }
  }

  let translated = translateFindingLabelToRepLanguage(stripped, { mode: "established_pattern" });
  if (translated && !isOntologyDisplayLabel(translated) && !INTERNAL_CATEGORY_ONLY.test(translated)) {
    if (/extra time was spent improving visualization before fixation/i.test(translated)) {
      return mapVisualizationFixationPhrase();
    }
    if (/provider expressed frustration/i.test(translated)) {
      return "moments of frustration during the case";
    }
    translated = translated.replace(/\s+observed$/i, "").trim();
    if (translated && !TITLE_CASE_JUNK.test(translated)) {
      return translated.charAt(0).toLowerCase() + translated.slice(1);
    }
  }

  if (TITLE_CASE_JUNK.test(stripped) && !isNaturalClinicalSentence(stripped)) {
    const spaced = stripped
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/Challenge Fixation/i, "before fixation")
      .replace(/Visualization Challenge/i, "visualization")
      .trim();
    const remapped = mapFromNormalizedKey(normalizeTopicKey(spaced));
    if (remapped) return remapped;
  }

  if (category === "competitive_usage") {
    return "which products and trays were in play during the case";
  }
  if (category === "product_signal") {
    return "whether a different product approach could help the workflow";
  }
  if (category === "workflow_friction" || category === "clinical_pain_point") {
    if (/visuali|fixation/.test(key)) return mapVisualizationFixationPhrase();
    return stripped.charAt(0).toLowerCase() + stripped.slice(1);
  }

  return stripped.charAt(0).toLowerCase() + stripped.slice(1);
}

export function stripInternalCategoryTokens(text: string): string {
  return text.replace(INTERNAL_CATEGORY_IN_PHRASE, "").replace(/\s{2,}/g, " ").trim();
}

/** Step 1 — validate the observation with the surgeon. */
export function coachingValidateObservation(topic: string): string {
  if (/visualization|fixation/.test(topic)) {
    return `When we observed ${topic}, did that match how you experience these cases day to day?`;
  }
  return `When we observed ${topic} in the OR, did that match your experience running these cases?`;
}

/** Step 2 — understand clinical and workflow impact. */
export function coachingUnderstandImpact(topic: string): string {
  if (/visualization|fixation/.test(topic)) {
    return `When ${topic} happens, how does that affect your fixation decisions or overall case pace?`;
  }
  return `When ${topic} comes up, how does it affect the flow of the case or the team's work?`;
}

/** Step 3 — determine whether it matters enough to act. */
export function coachingDetermineImportance(topic: string): string {
  if (/visualization|fixation/.test(topic)) {
    return `Determine whether ${topic} is creating a meaningful workflow challenge worth addressing.`;
  }
  return `Is ${topic} painful enough that you'd prioritize fixing it if you could?`;
}

/** Step 4 — explore openness to change before any commercial path. */
export function coachingExploreOpenness(topic: string): string {
  return `If that issue is real for you, would you be open to exploring a different approach — or is the current workflow working well enough?`;
}

/** Step 5 — recommend advancement path only after workflow value is established. */
export function coachingRecommendPath(recommendedLabel: string): string {
  return `Based on what we discussed, does ${recommendedLabel} feel like the right next step — or would you prefer to hold off for now?`;
}

export function coachingPathPrerequisites(): string {
  return "Who else would need to be involved if you decided to move forward?";
}

export function containsInternalCategoryLabel(text: string): boolean {
  return (
    INTERNAL_CATEGORY_ONLY.test(text.trim()) ||
    INTERNAL_CATEGORY_IN_PHRASE.test(text) ||
    /\bvisualization challenge fixation\b/i.test(text) ||
    isOntologyDisplayLabel(text)
  );
}
