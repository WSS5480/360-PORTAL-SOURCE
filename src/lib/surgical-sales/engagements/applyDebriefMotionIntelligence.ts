/**
 * Enriches conversation plan and advancement path coaching with motion intelligence.
 * Does not modify framework scores, product recommendations, or workflow pain logic.
 */

import type { AiDebriefStrategyBuilderOutput } from "@/lib/surgical-sales/engagements/aiDebriefStrategyBuilderTypes";
import type { DebriefMotionIntelligenceBundle } from "@/lib/surgical-sales/engagements/debriefMotionIntelligenceTypes";

function ensureSentence(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (/[.!?]$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
}

function pickPriorCommitment(bundle: DebriefMotionIntelligenceBundle): string | null {
  const commitment = bundle.priorDebrief.find((item) => item.coachingUse === "commitment");
  if (commitment) return commitment.excerpt;

  const continuity = bundle.priorDebrief[0];
  return continuity?.excerpt ?? null;
}

function pickIntroStakeholder(bundle: DebriefMotionIntelligenceBundle): string | null {
  const scheduling = bundle.introCall.find((item) => item.coachingUse === "scheduling");
  if (scheduling) return scheduling.excerpt;

  const stakeholder = bundle.introCall.find((item) => item.coachingUse === "stakeholder");
  return stakeholder?.excerpt ?? bundle.introCall[0]?.excerpt ?? null;
}

function pickContactAccess(bundle: DebriefMotionIntelligenceBundle): string | null {
  const stakeholder = bundle.contactScheduling.find(
    (item) => item.coachingUse === "stakeholder" || item.coachingUse === "access",
  );
  return stakeholder?.excerpt ?? bundle.contactScheduling[0]?.excerpt ?? null;
}

function buildPriorDebriefConversationQuestion(commitment: string): string {
  return ensureSentence(
    `Follow up on your prior debrief commitment: ${commitment.replace(/\.$/, "")}`,
  );
}

function buildIntroConversationQuestion(intel: string): string {
  if (/\b(karen|controls scheduling|coordinator|schedul)\b/i.test(intel)) {
    return ensureSentence(
      `Confirm access path from your intro call — ${intel.replace(/\.$/, "")}`,
    );
  }
  return ensureSentence(
    `From your intro conversation, validate whether this still holds: ${intel.replace(/\.$/, "")}`,
  );
}

function buildContactSchedulingQuestion(access: string): string {
  if (/\b(karen|controls scheduling|coordinator)\b/i.test(access)) {
    return ensureSentence(
      `Route next-step scheduling through the contact noted on file — ${access.replace(/\.$/, "")}`,
    );
  }
  return ensureSentence(
    `Before proposing dates, account for access on file: ${access.replace(/\.$/, "")}`,
  );
}

function appendUniqueQuestion(existing: string[], question: string, max: number): string[] {
  if (!question || existing.some((item) => item.toLowerCase() === question.toLowerCase())) {
    return existing;
  }
  return [...existing, question].slice(0, max);
}

function buildAdvancementWhyEnrichment(bundle: DebriefMotionIntelligenceBundle): string[] {
  const parts: string[] = [];

  const commitment = pickPriorCommitment(bundle);
  if (commitment) {
    parts.push(
      ensureSentence(`Prior debrief commitment: ${commitment.replace(/\.$/, "")}`),
    );
  }

  const intro = pickIntroStakeholder(bundle);
  if (intro) {
    parts.push(ensureSentence(`Intro call context: ${intro.replace(/\.$/, "")}`));
  }

  const access = pickContactAccess(bundle);
  if (access && access !== intro) {
    parts.push(ensureSentence(`Scheduling and access: ${access.replace(/\.$/, "")}`));
  }

  return parts;
}

export function applyDebriefMotionIntelligenceToStrategy(
  strategy: AiDebriefStrategyBuilderOutput,
  bundle: DebriefMotionIntelligenceBundle,
): AiDebriefStrategyBuilderOutput {
  const hasMotion =
    bundle.priorDebrief.length > 0 ||
    bundle.introCall.length > 0 ||
    bundle.contactScheduling.length > 0;

  if (!hasMotion) return strategy;

  const commitment = pickPriorCommitment(bundle);
  const introIntel = pickIntroStakeholder(bundle);
  const contactAccess = pickContactAccess(bundle);

  let validateObservationQuestions = [...strategy.conversationStrategy.validateObservationQuestions];
  let opennessToChangeQuestions = [...strategy.conversationStrategy.opennessToChangeQuestions];
  let closingQuestion = strategy.conversationStrategy.closingQuestion;

  if (commitment) {
    validateObservationQuestions = appendUniqueQuestion(
      validateObservationQuestions,
      buildPriorDebriefConversationQuestion(commitment),
      3,
    );
  }

  if (introIntel) {
    opennessToChangeQuestions = appendUniqueQuestion(
      opennessToChangeQuestions,
      buildIntroConversationQuestion(introIntel),
      3,
    );
  }

  if (contactAccess) {
    closingQuestion = `${buildContactSchedulingQuestion(contactAccess)} ${closingQuestion}`.trim();
  }

  const advancementParts = buildAdvancementWhyEnrichment(bundle);
  const advancementWhy =
    advancementParts.length > 0
      ? `${strategy.recommendedAdvancementPath.why} ${advancementParts.join(" ")}`.trim()
      : strategy.recommendedAdvancementPath.why;

  return {
    ...strategy,
    conversationStrategy: {
      ...strategy.conversationStrategy,
      validateObservationQuestions,
      opennessToChangeQuestions,
      closingQuestion,
    },
    recommendedAdvancementPath: {
      ...strategy.recommendedAdvancementPath,
      why: advancementWhy,
    },
  };
}
