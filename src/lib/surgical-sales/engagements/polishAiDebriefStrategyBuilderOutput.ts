/**
 * Post-processes AI Debrief Strategy output into complete rep-facing coaching copy.
 */

import {
  coachingDetermineImportance,
  coachingExploreOpenness,
  coachingPathPrerequisites,
  coachingRecommendPath,
  coachingUnderstandImpact,
  coachingValidateObservation,
  containsInternalCategoryLabel,
  translateDebriefClinicalTopic,
} from "@/lib/surgical-sales/engagements/debriefClinicalTopicTranslation";
import {
  getDebriefProductKnowledge,
  tryResolveDebriefProductKnowledgeId,
} from "@/lib/surgical-sales/engagements/debriefProductKnowledge";
import {
  debriefCopyContainsBannedPattern,
  humanizeDebriefTopic,
  sanitizeDebriefQuestion,
  sanitizeDebriefRepFacingCopy,
} from "@/lib/surgical-sales/engagements/debriefRepFacingCopy";
import type {
  AiDebriefStrategyBuilderFitLevel,
  AiDebriefStrategyBuilderOutput,
  AiDebriefStrategyBuilderPath,
} from "@/lib/surgical-sales/engagements/aiDebriefStrategyBuilderTypes";
import { enrichLearnedBulletsWithFramework } from "@/lib/surgical-sales/engagements/commercialReadinessFrameworkGuards";
import type { CommercialReadinessFramework } from "@/lib/surgical-sales/engagements/commercialReadinessFrameworkTypes";
import type { AiDebriefStrategyBuilderContext } from "@/lib/surgical-sales/engagements/loadAiDebriefStrategyBuilderContext";
import { topicPhraseFromSynthesis } from "@/lib/surgical-sales/engagements/synthesizeDebriefCommercialStrategy";

const BARE_LABEL_MAX_LEN = 48;
const MIN_COMPLETE_SENTENCE_LEN = 55;

const BARE_TOPIC_PATTERNS: RegExp[] = [
  /^workflow delays?\.?$/i,
  /^workflow friction\.?$/i,
  /^visualization challenge fixation\.?$/i,
  /^clinical pain point(s)?\.?$/i,
  /^product signal(s)?\.?$/i,
  /^provider profile\.?$/i,
  /^workflow delays?$/i,
];

const TITLE_CASE_LABEL = /^[A-Z][a-z]+(?: [A-Z][a-z]+){1,5}$/;

function providerLabel(context: AiDebriefStrategyBuilderContext): string {
  return context.providerName?.trim() || "the surgeon";
}

function cleanField(text: string, asQuestion = false): string {
  const humanized = humanizeDebriefTopic(text) || text;
  const sanitized = asQuestion
    ? sanitizeDebriefQuestion(humanized)
    : sanitizeDebriefRepFacingCopy(humanized);
  return sanitized.trim();
}

export function canonicalDebriefProductName(raw: string | null | undefined): string | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;

  const resolved = tryResolveDebriefProductKnowledgeId(trimmed);
  if (resolved) return getDebriefProductKnowledge(resolved).name;

  if (/^acsis$/i.test(trimmed)) return "ACSIS";
  if (/^endolumik$/i.test(trimmed)) return "Endolumik";
  if (/^telabio$/i.test(trimmed)) return "TelaBio";
  if (/^biotissue$/i.test(trimmed)) return "BioTissue";
  if (/^skeletal dynamics$/i.test(trimmed)) return "Skeletal Dynamics";

  return sanitizeDebriefRepFacingCopy(trimmed);
}

function hasSentenceShape(text: string): boolean {
  return /[.!?]$/.test(text.trim()) || text.trim().split(/\s+/).length >= 10;
}

export function isBareDebriefLabel(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (BARE_TOPIC_PATTERNS.some((pattern) => pattern.test(t))) return true;
  if (containsInternalCategoryLabel(t) || debriefCopyContainsBannedPattern(t)) return true;
  if (TITLE_CASE_LABEL.test(t) && t.length < MIN_COMPLETE_SENTENCE_LEN) return true;
  if (t.length <= BARE_LABEL_MAX_LEN && !hasSentenceShape(t)) return true;
  return false;
}

export function isCompleteRepFacingSentence(text: string): boolean {
  const t = text.trim();
  if (!t || isBareDebriefLabel(t)) return false;
  if (t.length < MIN_COMPLETE_SENTENCE_LEN && !t.endsWith("?")) return false;
  if (containsInternalCategoryLabel(t) || debriefCopyContainsBannedPattern(t)) return false;
  return true;
}

function ensureSentence(text: string, fallback: string): string {
  const cleaned = cleanField(text);
  if (isCompleteRepFacingSentence(cleaned)) {
    return cleaned.endsWith(".") || cleaned.endsWith("?") ? cleaned : `${cleaned}.`;
  }
  return fallback;
}

function uniqueNonBare(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of items) {
    const cleaned = cleanField(raw);
    if (!cleaned || isBareDebriefLabel(cleaned)) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned.endsWith(".") ? cleaned : `${cleaned}.`);
  }
  return result;
}

export function resolvePrimaryTopicPhrase(context: AiDebriefStrategyBuilderContext): string {
  const fromSynthesis = topicPhraseFromSynthesis(context.commercialSynthesis);
  if (fromSynthesis && !isBareDebriefLabel(fromSynthesis)) {
    return fromSynthesis;
  }

  const candidates = uniqueNonBare([
    ...context.commercialSynthesis.findings.map((item) => item.narrative),
    ...context.commercialSynthesis.recurringPatterns.map((item) => item.pattern),
    ...context.observationNotes.slice(-3),
  ]);

  if (candidates[0]) {
    const topic = candidates[0].replace(/\.$/, "");
    if (!isBareDebriefLabel(topic)) {
      return topic.charAt(0).toLowerCase() + topic.slice(1);
    }
  }

  const translated = translateDebriefClinicalTopic(
    context.commercialSynthesis.findings[0]?.narrative ??
      context.observationNotes[0] ??
      "",
  );

  if (translated && !isBareDebriefLabel(translated)) {
    return translated;
  }

  return "the team spent extra time on workflow steps that may affect case flow";
}

function buildPolishedDebriefMission(
  context: AiDebriefStrategyBuilderContext,
  topicPhrase: string,
  productName: string | null,
): string {
  const provider = providerLabel(context);
  const count = Math.max(0, context.completedObservationCount);

  const observationLead =
    count > 1
      ? `Across multiple observations, ${topicPhrase}.`
      : `During recent observations, ${topicPhrase}.`;

  const decisionClause = productName
    ? `whether ${provider} sees that as a meaningful workflow challenge and whether it is worth exploring ${productName} or a 360 Experience after they confirm it matters`
    : `whether ${provider} sees that as a meaningful workflow challenge and whether a commercial next step is warranted`;

  return `${observationLead} Use this conversation to confirm ${decisionClause}.`;
}

function buildPolishedDesiredOutcome(recommendedPath: AiDebriefStrategyBuilderPath): string {
  switch (recommendedPath) {
    case "Case Commitment":
      return "Leave with a clear decision: identify an evaluation case profile and schedule the next OR touchpoint, or mark this as no current opportunity.";
    case "360 Experience":
      return "Leave with a clear decision: schedule a 360 Experience, identify an evaluation case, or mark this as no current opportunity.";
    default:
      return "Leave with a clear decision: confirm there is no current opportunity, or agree on what evidence would need to change before revisiting a 360 Experience or evaluation case.";
  }
}

function buildPolishedProductWhy(
  context: AiDebriefStrategyBuilderContext,
  productName: string,
  topicPhrase: string,
  fitLevel: AiDebriefStrategyBuilderFitLevel,
): string {
  const provider = providerLabel(context);

  if (fitLevel === "none" || fitLevel === "weak") {
    return "Observation evidence is not strong enough yet to position a specific product — confirm workflow value with the surgeon first.";
  }

  return `${productName} may be worth positioning if ${provider} confirms ${topicPhrase} affects case flow or decision-making — not before they agree the issue matters.`;
}

function buildPolishedProductRisk(productName: string | null): string {
  if (!productName) {
    return "Positioning product before the surgeon confirms workflow value will feel premature.";
  }
  return `Do not pitch ${productName} until ${productName === "ACSIS" ? "they" : "the surgeon"} confirms the workflow issue is meaningful enough to explore a change.`;
}

function buildPolishedConversationStrategy(
  context: AiDebriefStrategyBuilderContext,
  topicPhrase: string,
  recommendedPath: AiDebriefStrategyBuilderPath,
  raw: AiDebriefStrategyBuilderOutput["conversationStrategy"],
): AiDebriefStrategyBuilderOutput["conversationStrategy"] {
  const validate = uniqueNonBare(raw.validateObservationQuestions).map((q) =>
    cleanField(q, true),
  );
  const impact = uniqueNonBare(raw.impactQuestions).map((q) => cleanField(q, true));
  const openness = uniqueNonBare(raw.opennessToChangeQuestions).map((q) =>
    cleanField(q, true),
  );

  const opening = ensureSentence(
    raw.opening,
    coachingValidateObservation(topicPhrase),
  );

  const validateQuestions =
    validate.length > 0
      ? validate.slice(0, 2)
      : [coachingValidateObservation(topicPhrase)];

  const impactQuestions =
    impact.length > 0 ? impact.slice(0, 2) : [coachingUnderstandImpact(topicPhrase)];

  const importanceQuestion = coachingDetermineImportance(topicPhrase);
  const opennessQuestions =
    openness.length > 0
      ? [importanceQuestion, ...openness.filter((q) => q !== importanceQuestion)].slice(0, 2)
      : [importanceQuestion, coachingExploreOpenness(topicPhrase)];

  const closingQuestion = ensureSentence(
    raw.closingQuestion,
    `${coachingRecommendPath(recommendedPath)} ${coachingPathPrerequisites()}`.trim(),
  );

  return {
    opening: opening.endsWith("?") ? opening : sanitizeDebriefQuestion(opening),
    validateObservationQuestions: validateQuestions,
    impactQuestions,
    opennessToChangeQuestions: opennessQuestions,
    closingQuestion: closingQuestion.endsWith("?")
      ? closingQuestion
      : sanitizeDebriefQuestion(closingQuestion),
  };
}

function polishLearnedBullets(
  items: string[],
  context: AiDebriefStrategyBuilderContext,
  topicPhrase: string,
): string[] {
  const polished = uniqueNonBare(items);
  if (polished.length >= 3) return polished.slice(0, 5);

  const fillers: string[] = [...polished];

  if (fillers.length === 0) {
    fillers.push(
      context.completedObservationCount > 1
        ? `Across ${context.completedObservationCount} observations, ${topicPhrase}.`
        : `During recent observations, ${topicPhrase}.`,
    );
  }

  if (fillers.length < 3) {
    fillers.push(
      `Treat this as a working hypothesis until ${providerLabel(context)} confirms it matches their experience.`,
    );
  }

  if (fillers.length < 3) {
    fillers.push("You still need their read on whether what you saw is worth acting on.");
  }

  return fillers.slice(0, 5);
}

export function polishAiDebriefStrategyBuilderOutput(
  raw: AiDebriefStrategyBuilderOutput,
  context: AiDebriefStrategyBuilderContext,
  framework?: CommercialReadinessFramework,
): AiDebriefStrategyBuilderOutput {
  const topicPhrase = resolvePrimaryTopicPhrase(context);
  const recommendedPath = raw.recommendedAdvancementPath.path;

  const canonicalProduct = canonicalDebriefProductName(raw.recommendedProductAngle.productName);
  let fitLevel = raw.recommendedProductAngle.fitLevel;
  if (!canonicalProduct || fitLevel === "none") {
    fitLevel = "none";
  }

  const productName = fitLevel === "none" ? null : canonicalProduct;

  const debriefMission = ensureSentence(
    raw.debriefMission,
    buildPolishedDebriefMission(context, topicPhrase, productName),
  );

  const desiredOutcome = ensureSentence(
    raw.desiredOutcome,
    buildPolishedDesiredOutcome(recommendedPath),
  );

  const productWhy = ensureSentence(
    raw.recommendedProductAngle.why,
    productName
      ? buildPolishedProductWhy(context, productName, topicPhrase, fitLevel)
      : "Observation evidence does not yet support a specific product conversation in the room.",
  );

  const productRisk = ensureSentence(
    raw.recommendedProductAngle.risk,
    buildPolishedProductRisk(productName),
  );

  const primaryHypothesis = ensureSentence(
    raw.primaryHypothesis,
    `If ${topicPhrase} is a real priority for ${providerLabel(context)}, there may be room to explore a workflow change — but confirm before recommending anything.`,
  );

  const pathWhy = ensureSentence(
    raw.recommendedAdvancementPath.why,
    recommendedPath === "Case Commitment"
      ? "They may be ready to commit cases — only after they confirm the workflow issue matters."
      : recommendedPath === "360 Experience"
        ? "Workflow value may be there — a 360 Experience lets them test fit before committing cases."
        : "Hold commercial next steps until workflow value and surgeon appetite are confirmed.",
  );

  const learnedBullets = framework
    ? enrichLearnedBulletsWithFramework(
        polishLearnedBullets(raw.whatWeThinkWeLearned, context, topicPhrase),
        framework,
      )
    : polishLearnedBullets(raw.whatWeThinkWeLearned, context, topicPhrase);

  return {
    debriefMission: isCompleteRepFacingSentence(debriefMission)
      ? debriefMission
      : framework?.directorSummary ?? buildPolishedDebriefMission(context, topicPhrase, productName),
    whatWeThinkWeLearned: learnedBullets,
    primaryHypothesis,
    recommendedProductAngle: {
      productName,
      fitLevel,
      why: productWhy,
      risk: productRisk,
    },
    conversationStrategy: buildPolishedConversationStrategy(
      context,
      topicPhrase,
      recommendedPath,
      raw.conversationStrategy,
    ),
    recommendedAdvancementPath: {
      path: recommendedPath,
      why: pathWhy,
    },
    desiredOutcome: isCompleteRepFacingSentence(desiredOutcome)
      ? desiredOutcome
      : buildPolishedDesiredOutcome(recommendedPath),
  };
}

export function sanitizeAiDebriefStrategyBuilderOutput(
  raw: AiDebriefStrategyBuilderOutput,
  context?: AiDebriefStrategyBuilderContext,
  framework?: CommercialReadinessFramework,
): AiDebriefStrategyBuilderOutput {
  const productName = canonicalDebriefProductName(raw.recommendedProductAngle.productName);

  const fitLevel =
    raw.recommendedProductAngle.fitLevel === "strong" && !productName
      ? "none"
      : raw.recommendedProductAngle.fitLevel;

  const sanitized: AiDebriefStrategyBuilderOutput = {
    debriefMission: cleanField(raw.debriefMission),
    whatWeThinkWeLearned: raw.whatWeThinkWeLearned
      .map((item) => cleanField(item))
      .filter((item) => item && !isBareDebriefLabel(item)),
    primaryHypothesis: cleanField(raw.primaryHypothesis),
    recommendedProductAngle: {
      productName: fitLevel === "none" ? null : productName,
      fitLevel,
      why: cleanField(raw.recommendedProductAngle.why),
      risk: cleanField(raw.recommendedProductAngle.risk),
    },
    conversationStrategy: {
      opening: cleanField(raw.conversationStrategy.opening, true),
      validateObservationQuestions: raw.conversationStrategy.validateObservationQuestions
        .map((q) => cleanField(q, true))
        .filter(Boolean),
      impactQuestions: raw.conversationStrategy.impactQuestions
        .map((q) => cleanField(q, true))
        .filter(Boolean),
      opennessToChangeQuestions: raw.conversationStrategy.opennessToChangeQuestions
        .map((q) => cleanField(q, true))
        .filter(Boolean),
      closingQuestion: cleanField(raw.conversationStrategy.closingQuestion, true),
    },
    recommendedAdvancementPath: {
      path: raw.recommendedAdvancementPath.path,
      why: cleanField(raw.recommendedAdvancementPath.why),
    },
    desiredOutcome: cleanField(raw.desiredOutcome),
  };

  if (!context) return sanitized;
  return polishAiDebriefStrategyBuilderOutput(sanitized, context, framework);
}
