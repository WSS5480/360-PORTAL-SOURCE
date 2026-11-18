/**

 * Staged debrief guidance intelligence pipeline.

 * Each stage is generated only from structured observation sources — never from prior stage text.

 *

 * Three reasoning layers (strict separation):

 * A. findingsToValidate — things actually observed across cases

 * B. informationGaps — things not yet known (unresolved observation prompts)

 * C. commercialQualification — gated probes tied to primary high-priority issue only

 */



import type { DebriefPrioritizedPattern } from "@/lib/surgical-sales/engagements/debriefIntelligencePrioritization";

import {

  buildHypothesisFromPrimaryPattern,

  isHighCommercialOpportunitySignal,

  isLowValuePositiveWorkflowSignal,

  isProductUsageSignal,

  isProviderFrustrationHypothesisPattern,

  isVisualizationHypothesisPattern,

  isWorkflowFrictionHypothesisPattern,

  selectPrimaryHypothesisPattern,

  sortDebriefKnownFactsPatterns,

} from "@/lib/surgical-sales/engagements/debriefIntelligencePrioritization";

import { formatDebriefObservedFact, resolveDebriefConversationRecommendedOutcome } from "@/lib/surgical-sales/engagements/debriefGuidanceFormatUtils";
import { translateLearningObjectiveTopic } from "@/lib/surgical-sales/observationLearningObjectiveDisplay";

import type {

  DebriefFindingToValidate,

  DebriefGuidanceIntelligence,

  DebriefGuidanceIntelligenceInput,

  DebriefGuidanceIntelligenceItem,

  DebriefInformationGap,

} from "@/lib/surgical-sales/engagements/debriefGuidanceIntelligenceTypes";



type UnresolvedGapKind =

  | "provider_frustration"

  | "staff_friction"

  | "workflow_delay"

  | "determine_consistency"

  | "unknown";



const MAX_RENDER_LINES = 6;
const MAX_PREPARE_VALIDATE = 5;
const MAX_COMMERCIAL_QUALIFICATION = 3;

const BANNED_LEARN_TOPIC =
  /commercial disposition|relationship:|workflow priority:|observation access interest|next step recommended|need more observations/i;

export function prepareLearnQuestionSemanticKey(question: string): string | null {
  const q = question.trim().toLowerCase();
  if (!q || BANNED_LEARN_TOPIC.test(q)) return null;
  if (/visuali|exposure.*access|visibility|fixation/.test(q)) return "topic:visualization";
  if (/bard mesh|mesh your standard|standard product for these|used consistently/.test(q)) {
    return "topic:incumbent_product";
  }
  if (/provider frustration|feel frustrated|frustrated by anything/.test(q)) {
    return "topic:provider_frustration";
  }
  if (/staff frustration|workarounds|complaints|staff workflow/.test(q)) {
    return "topic:staff_friction";
  }
  if (/workflow slow|slowed you down|slow the team/.test(q)) return "topic:workflow_delay";
  if (/product availability|stocked before|verify product/.test(q)) return "topic:product_availability";
  if (/procedure volume|abdominal wall/.test(q)) return "topic:volume";
  return `literal:${q}`;
}

export function dedupePrepareLearnQuestions(questions: string[], limit = MAX_PREPARE_VALIDATE): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const question of questions) {
    const key = prepareLearnQuestionSemanticKey(question);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(question.trim());
    if (out.length >= limit) break;
  }
  return out;
}

function repFacingPatternTopic(label: string): string {
  const translated = translateLearningObjectiveTopic(label);
  if (translated && !BANNED_LEARN_TOPIC.test(translated)) return translated;
  return label.replace(/ used consistently$/i, "").trim().toLowerCase();
}



function providerDisplayName(providerName?: string | null): string {

  const raw = String(providerName ?? "").trim();

  if (!raw) return "the provider";

  const withoutTitle = raw.replace(/^dr\.?\s+/i, "").trim();

  const parts = withoutTitle.split(/\s+/).filter(Boolean);

  const lastName = parts[parts.length - 1] ?? withoutTitle;

  return `Dr. ${lastName}`;

}



function formatProgramFrequency(count: number, total: number): string {

  return ` (${count} of ${total} observations)`;

}



function ensureQuestion(text: string): string {

  const trimmed = text.trim();

  if (!trimmed) return "";

  return trimmed.endsWith("?") ? trimmed : `${trimmed.replace(/[.!]$/, "")}?`;

}



function ensureSentence(text: string): string {

  const trimmed = text.trim();

  if (!trimmed) return "";

  return /[.?!]$/.test(trimmed) ? trimmed : `${trimmed}.`;

}



function isInconsistentPattern(pattern: DebriefPrioritizedPattern): boolean {

  return (

    pattern.count < pattern.total &&

    pattern.count <= Math.max(1, Math.floor(pattern.total / 2))

  );

}



function extractProductLabel(label: string): string {

  return label.replace(/ used consistently$/i, "").trim();

}



function classifyUnresolvedGap(rawPrompt: string): { kind: UnresolvedGapKind; topic: string | null } {

  const trimmed = rawPrompt.trim();

  if (/^listen for provider frustration/i.test(trimmed)) {

    return { kind: "provider_frustration", topic: null };

  }

  if (/^listen for staff frustration, delays, workarounds, or complaints/i.test(trimmed)) {

    return { kind: "staff_friction", topic: null };

  }

  if (/^determine whether (.+?) happens consistently across cases/i.test(trimmed)) {

    return {

      kind: "determine_consistency",

      topic: trimmed.match(/^determine whether (.+?) happens consistently across cases/i)?.[1]?.trim() ?? null,

    };

  }

  if (/workflow delay/i.test(trimmed)) {

    return { kind: "workflow_delay", topic: "workflow delays" };

  }

  return { kind: "unknown", topic: null };

}



function buildGapFromUnresolvedPrompt(rawPrompt: string): DebriefInformationGap | null {

  const { kind, topic } = classifyUnresolvedGap(rawPrompt);



  switch (kind) {

    case "provider_frustration":

      return {

        gapKind: kind,

        discoveryQuestion: "Did we miss any provider or staff frustrations during the observed cases?",

      };

    case "staff_friction":

      return {

        gapKind: kind,

        discoveryQuestion:

          "Are any staff frustration, delays, workarounds, or complaints meaningful to you in these cases?",

      };

    case "workflow_delay":

      return {

        gapKind: kind,

        discoveryQuestion:

          "Did anything in the observed workflow slow the team down enough to be worth addressing?",

      };

    case "determine_consistency":
      if (!topic || BANNED_LEARN_TOPIC.test(topic)) return null;
      const translatedTopic = translateLearningObjectiveTopic(topic);
      if (!translatedTopic || BANNED_LEARN_TOPIC.test(translatedTopic)) return null;
      return {
        gapKind: kind,
        discoveryQuestion: ensureQuestion(
          `Does ${translatedTopic} happen often enough to matter, or only in certain case types`,
        ),
      };

    default:

      return null;

  }

}



function dedupeInformationGaps(gaps: DebriefInformationGap[]): DebriefInformationGap[] {

  const hasProviderFrustration = gaps.some((gap) => gap.gapKind === "provider_frustration");

  const filtered = hasProviderFrustration

    ? gaps.filter((gap) => gap.gapKind !== "staff_friction")

    : gaps;



  return dedupeStrings(filtered.map((gap) => gap.discoveryQuestion)).map((question) => {

    const match = filtered.find((gap) => gap.discoveryQuestion === question);

    return match ?? { gapKind: "unknown", discoveryQuestion: question };

  });

}



function buildMeaningFromPattern(pattern: DebriefPrioritizedPattern): string {

  const label = pattern.label;



  if (isProductUsageSignal(label)) {

    return `${extractProductLabel(label)} appeared across observed cases — confirm whether that reflects current standard practice.`;

  }



  if (isLowValuePositiveWorkflowSignal(label)) {

    return `${label} — use as context unless the provider identifies a problem.`;

  }



  if (isVisualizationHypothesisPattern(label)) {

    if (isInconsistentPattern(pattern)) {

      return `${label} appeared inconsistently — validate whether it matters before treating it as a workflow issue.`;

    }

    return `${label} appeared across observations — validate whether it affects efficiency or exposure.`;

  }



  if (isWorkflowFrictionHypothesisPattern(label) || isProviderFrustrationHypothesisPattern(label)) {

    return `${label} was observed — validate whether the provider sees it as meaningful.`;

  }



  if (isHighCommercialOpportunitySignal(label)) {

    return `${label} was observed — validate whether it matters enough to address.`;

  }



  return `${label} was noted during observation — confirm whether it reflects the provider's experience.`;

}



function buildValidationQuestionFromPattern(pattern: DebriefPrioritizedPattern): string {

  const label = pattern.label;



  if (isProductUsageSignal(label)) {

    const product = extractProductLabel(label);

    return ensureQuestion(`Is ${product} your standard product for these cases`);

  }



  if (isLowValuePositiveWorkflowSignal(label)) {

    return "Is the current workflow acceptable from your perspective?";

  }



  if (isVisualizationHypothesisPattern(label)) {

    const topic = repFacingPatternTopic(label);

    if (isInconsistentPattern(pattern)) {

      return ensureQuestion(

        `Does ${topic} happen often enough to matter, or only in certain case types`,

      );

    }

    return ensureQuestion(`Does ${topic} affect how you experience these cases`);

  }



  if (isWorkflowFrictionHypothesisPattern(label)) {

    return "Did anything in the observed workflow slow you down enough to be worth addressing?";

  }



  if (isProviderFrustrationHypothesisPattern(label)) {

    return "Do you feel frustrated by anything from the cases we observed?";

  }



  if (isHighCommercialOpportunitySignal(label)) {

    return ensureQuestion(`Does ${repFacingPatternTopic(label)} reflect how you experience these cases`);

  }



  return ensureQuestion(`Does ${repFacingPatternTopic(label)} matter enough to address`);

}



function buildFindingFromPattern(pattern: DebriefPrioritizedPattern): DebriefFindingToValidate {

  return {

    displayFinding: formatDebriefObservedFact(

      `${pattern.label}${formatProgramFrequency(pattern.count, pattern.total)}`,

    ),

    meaning: ensureSentence(buildMeaningFromPattern(pattern)),

    validationQuestion: buildValidationQuestionFromPattern(pattern),

    sourcePatternLabel: pattern.label,

  };

}



function findingToLegacyItem(finding: DebriefFindingToValidate): DebriefGuidanceIntelligenceItem {

  return {

    finding: finding.displayFinding,

    meaning: finding.meaning,

    validationQuestion: finding.validationQuestion,

    qualificationQuestion: "",

    nextStepQuestion: "",

    sourcePatternLabel: finding.sourcePatternLabel,

  };

}



function buildGatedCommercialQualification(input: {

  primaryPattern: DebriefPrioritizedPattern | null;

}): string[] {

  const { primaryPattern } = input;



  if (!primaryPattern || !isHighCommercialOpportunitySignal(primaryPattern.label)) {

    return [];

  }



  if (isProductUsageSignal(primaryPattern.label) || isLowValuePositiveWorkflowSignal(primaryPattern.label)) {

    return [];

  }



  const questions: string[] = [

    "When you think about the cases we observed, is anything consistently annoying or slowing you down?",

  ];



  if (isVisualizationHypothesisPattern(primaryPattern.label)) {

    questions.push("Does the visualization issue affect case flow enough to be worth addressing?");

  } else if (isWorkflowFrictionHypothesisPattern(primaryPattern.label)) {

    questions.push("Does this workflow issue affect case flow enough to be worth addressing?");

  } else if (isProviderFrustrationHypothesisPattern(primaryPattern.label)) {

    questions.push("Does this frustration affect case flow enough to be worth addressing?");

  } else {

    questions.push(

      ensureQuestion(

        `Does ${primaryPattern.label.toLowerCase()} affect case flow enough to be worth addressing`,

      ),

    );

  }



  questions.push("What would need to be true for you to consider a next step?");



  return dedupeStrings(questions).slice(0, MAX_COMMERCIAL_QUALIFICATION);

}



function dedupeStrings(lines: string[]): string[] {

  const out: string[] = [];

  const seen = new Set<string>();

  for (const line of lines) {

    const trimmed = line.trim();

    if (!trimmed) continue;

    const key = trimmed.toLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);

    out.push(trimmed);

  }

  return out;

}



function dedupeFindings(findings: DebriefFindingToValidate[]): DebriefFindingToValidate[] {

  const out: DebriefFindingToValidate[] = [];

  const seen = new Set<string>();

  for (const finding of findings) {

    const key = finding.sourcePatternLabel.toLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);

    out.push(finding);

  }

  return out;

}



export function buildDebriefGuidanceIntelligence(

  input: DebriefGuidanceIntelligenceInput,

): DebriefGuidanceIntelligence {

  const patterns = sortDebriefKnownFactsPatterns(input.patterns ?? []);

  const primaryPattern = selectPrimaryHypothesisPattern(patterns);

  const provider = providerDisplayName(input.providerName);



  const recommendedOutcome = resolveDebriefConversationRecommendedOutcome({

    observationPatterns: patterns,

    desiredOutcome: input.desiredOutcome ?? null,

    primaryPattern,

  });



  const primaryHypothesis = buildHypothesisFromPrimaryPattern({

    pattern: primaryPattern,

    providerDisplayName: provider,

    procedureLabel: input.procedureLabel,

  });



  const informationGaps = dedupeInformationGaps(

    (input.unresolvedObservationPrompts ?? [])

      .map((prompt) => buildGapFromUnresolvedPrompt(prompt))

      .filter((gap): gap is DebriefInformationGap => gap != null),

  );



  const findingsToValidate = dedupeFindings(

    patterns.slice(0, MAX_RENDER_LINES).map((pattern) => buildFindingFromPattern(pattern)),

  );



  const whatWeObserved = dedupeStrings(findingsToValidate.map((finding) => finding.displayFinding)).slice(

    0,

    MAX_RENDER_LINES,

  );



  const whatToValidate = dedupePrepareLearnQuestions([

    ...findingsToValidate.map((finding) => finding.validationQuestion),

    ...informationGaps.map((gap) => gap.discoveryQuestion),

  ]);



  const commercialQualification = buildGatedCommercialQualification({ primaryPattern });

  const conversationStarters = commercialQualification.slice(0, MAX_COMMERCIAL_QUALIFICATION);



  const items = findingsToValidate.map(findingToLegacyItem).slice(0, MAX_RENDER_LINES);



  return {

    findingsToValidate,

    informationGaps,

    commercialQualification,

    items,

    primaryHypothesis: ensureSentence(primaryHypothesis),

    recommendedOutcome,

    whatWeObserved,

    whatToValidate,

    conversationStarters,

  };

}



export function rebuildDebriefGuidanceIntelligenceFromWorkspaceDraft(input: {

  knownFacts: string[];

  providerName?: string | null;

  procedureLabel?: string | null;

  desiredOutcome?: DebriefGuidanceIntelligenceInput["desiredOutcome"];

}): DebriefGuidanceIntelligence {

  const patterns = input.knownFacts.map((fact) => {

    const match = fact.match(/^(.*)\s*\((\d+) of (\d+) observations?\)$/i);

    if (!match) {

      return { label: fact.trim(), count: 1, total: 1, importance: 0 };

    }

    return {

      label: match[1].trim(),

      count: Number(match[2]),

      total: Number(match[3]),

      importance: 0,

    };

  });



  return buildDebriefGuidanceIntelligence({

    patterns,

    unresolvedObservationPrompts: [],

    providerName: input.providerName,

    procedureLabel: input.procedureLabel,

    desiredOutcome: input.desiredOutcome,

  });

}


