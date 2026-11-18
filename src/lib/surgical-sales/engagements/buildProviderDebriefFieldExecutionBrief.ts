/**
 * Field-execution debrief brief — five sections, deduplicated intelligence, Layer 1 + Layer 2 merge.
 */

import { buildGenericProviderDebriefPlan } from "@/lib/surgical-sales/engagements/buildGenericProviderDebriefPlan";
import {
  buildAiDebriefStrategyFromProviderDebriefPlan,
  type AiDebriefStrategy,
} from "@/lib/surgical-sales/engagements/buildAiDebriefStrategy";
import { providerDebriefFitLevelLabel } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";
import type {
  ProviderDebriefPlan,
  ProviderDebriefPlanLearningItem,
  ProviderDebriefPlanProductAssessment,
  ProviderDebriefPlanSuggestedQuestion,
  ProviderDebriefPlanUnknownItem,
} from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";

export type DebriefGuidanceTier = "field_guide" | "observation_assisted" | "observation_rich";

export type ProviderDebriefFieldExecutionBrief = {
  guidanceTier: DebriefGuidanceTier;
  strategy: AiDebriefStrategy;
  mission: {
    headline: string;
    focusLine: string | null;
    takeaways: string[];
    programLine: string | null;
  };
  discussionGuide: {
    primaryQuestion: string;
    followUpQuestions: string[];
  };
  validationChecklist: Array<{ id: string; question: string; whyItMatters: string | null }>;
  opportunity: {
    productLabel: string;
    statusLine: string;
    askQuestion: string;
  };
  desiredOutcome: {
    successStatement: string;
    supporting: string[];
    nextStepTitle: string;
    nextStepBody: string;
  };
};

const GENERIC_DEBRIEF_OBJECTIVE =
  "Review what you observed with the surgeon, validate your takeaways, and agree on one concrete next step.";

const GENERIC_THEME_TAKEAWAYS = [
  "Cover recurring workflow patterns and frustrations from observations.",
  "Confirm whether what you observed matches the surgeon's priorities.",
] as const;

const GENERIC_VALIDATION = [
  "What stood out most — and is it repeatable across cases?",
  "Do your priorities match what we observed in the OR?",
  "What would need to be true before trying something new?",
] as const;

const GENERIC_OPPORTUNITY_ASK =
  "Is there any workflow pain from recent observations that might justify trying something new?";

const GENERIC_FRICTION_QUESTION =
  /^which workflow step created the most friction during the case you observed\?$/i;
const GENERIC_PRODUCT_QUESTION =
  /^would it be worth scheduling a focused conversation about product fit for cases like this one\?$/i;

const BOILERPLATE_LEARNING = [
  /^workflow friction was observed during the case\.?$/i,
  /^you noted workflow friction during the case\.?$/i,
  /^a competitor product was observed in the or\.?$/i,
  /^a competitor product was in the or\.?$/i,
  /^workflow fit looks (strong|possible|weak) from field signals\.?$/i,
  /^workflow fit looked (strong|possible|weak) from what you observed\.?$/i,
  /^product interest was (mentioned|strong) during observation\.?$/i,
  /^product interest came up during observation \((mentioned|strong)\)\.?$/i,
];

export function normalizeDebriefTextKey(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/^prior case \([^)]+\):\s*/i, "")
    .replace(/^prior observation:\s*/i, "")
    .replace(/^recurring pain point \(\d+ observations\):\s*/i, "")
    .replace(/^competitive pattern \(\d+ observations\):\s*/i, "")
    .replace(/^opportunity pattern \(\d+ observations\):\s*/i, "")
    .replace(/^product fit trend \(\d+ observations\):\s*/i, "")
    .replace(/^known [^:]+ on provider profile:\s*/i, "")
    .replace(/^pre-case signal to validate:\s*/i, "")
    .replace(/\.$/, "")
    .replace(/\s+/g, " ");
}

function isBoilerplateLearning(signal: string): boolean {
  const trimmed = signal.trim();
  return BOILERPLATE_LEARNING.some((pattern) => pattern.test(trimmed));
}

function isGenericTemplateQuestion(text: string): boolean {
  return GENERIC_FRICTION_QUESTION.test(text.trim()) || GENERIC_PRODUCT_QUESTION.test(text.trim());
}

function cleanTakeawayText(signal: string): string {
  let text = signal.trim().replace(/\.$/, "");
  text = text.replace(/^recurring pain point \(\d+ observations\):\s*/i, "");
  text = text.replace(/^competitive pattern \(\d+ observations\):\s*/i, "");
  text = text.replace(/^prior case \([^)]+\):\s*/i, "");
  text = text.replace(/^prior observation:\s*/i, "");
  text = text.replace(/^known [^:]+ on provider profile:\s*/i, "");
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }
  return text.endsWith(".") ? text : `${text}.`;
}

export function resolveDebriefObjectiveFromPlan(
  plan: ProviderDebriefPlan,
  planMode: "generic" | "intelligence",
): string {
  if (planMode === "generic") {
    return plan.desiredMeetingOutcome.primary;
  }

  const confirmObjective = plan.suggestedObjectives.find((objective) =>
    /^confirm with the surgeon:/i.test(objective.text),
  );
  if (confirmObjective) {
    const topic = confirmObjective.text.replace(/^confirm with the surgeon:\s*/i, "").replace(/\.$/, "");
    if (topic) {
      return `Validate whether ${topic.charAt(0).toLowerCase()}${topic.slice(1)}.`;
    }
  }

  const gapObjective = plan.suggestedObjectives.find((objective) =>
    /^close the gap:/i.test(objective.text),
  );
  if (gapObjective) {
    return gapObjective.text.replace(/^close the gap:\s*/i, "Validate ");
  }

  const validateObjective = plan.suggestedObjectives.find((objective) =>
    /validate whether|confirm whether|understand how/i.test(objective.text),
  );
  if (validateObjective) {
    return validateObjective.text;
  }

  if (plan.suggestedObjectives[0]?.text) {
    return plan.suggestedObjectives[0].text;
  }

  return plan.desiredMeetingOutcome.primary;
}

function rankConversationQuestions(
  questions: ProviderDebriefPlanSuggestedQuestion[],
  planMode: "generic" | "intelligence",
): string[] {
  const sorted = [...questions]
    .sort((a, b) => b.priority - a.priority)
    .map((question) => question.text.trim())
    .filter(Boolean);

  if (planMode !== "intelligence") {
    return sorted;
  }

  const specific = sorted.filter((text) => !isGenericTemplateQuestion(text));
  return specific.length > 0 ? specific : sorted;
}

function isDefaultClinicalGap(item: ProviderDebriefPlanUnknownItem): boolean {
  return item.id === "clinical-follow-through";
}

function selectMissionTakeaways(
  plan: ProviderDebriefPlan,
  planMode: "generic" | "intelligence",
  usedKeys: Set<string>,
): string[] {
  if (planMode === "generic") {
    for (const line of GENERIC_THEME_TAKEAWAYS) {
      usedKeys.add(normalizeDebriefTextKey(line));
    }
    return [...GENERIC_THEME_TAKEAWAYS];
  }

  const takeaways: string[] = [];

  for (const pain of plan.longitudinalIntelligence.recurringPainPoints) {
    if (pain.count < 2 || takeaways.length >= 3) continue;
    const text = cleanTakeawayText(pain.signal);
    const key = normalizeDebriefTextKey(text);
    if (usedKeys.has(key)) continue;
    usedKeys.add(key);
    takeaways.push(text);
  }

  for (const learning of plan.whatWeLearned) {
    if (takeaways.length >= 3) break;
    if (isBoilerplateLearning(learning.signal)) continue;
    const text = cleanTakeawayText(learning.signal);
    const key = normalizeDebriefTextKey(text);
    if (!key || usedKeys.has(key)) continue;
    usedKeys.add(key);
    takeaways.push(text);
  }

  if (takeaways.length === 0) {
    for (const line of GENERIC_THEME_TAKEAWAYS.slice(0, 2)) {
      usedKeys.add(normalizeDebriefTextKey(line));
      takeaways.push(line);
    }
  }

  return takeaways;
}

function buildValidationChecklist(
  plan: ProviderDebriefPlan,
  planMode: "generic" | "intelligence",
  usedKeys: Set<string>,
): ProviderDebriefFieldExecutionBrief["validationChecklist"] {
  const raw =
    planMode === "generic"
      ? GENERIC_VALIDATION.map((question, index) => ({
          id: `generic-val-${index}`,
          kind: "clinical_gap" as const,
          question,
          rationale: "Validate assumptions directly with the surgeon.",
          priority: 90 - index,
        }))
      : [...plan.whatWeStillDontKnow]
          .sort((a, b) => b.priority - a.priority)
          .filter((item) => !isDefaultClinicalGap(item) || plan.whatWeStillDontKnow.length === 1);

  const items: ProviderDebriefFieldExecutionBrief["validationChecklist"] = [];

  for (const item of raw) {
    if (items.length >= 4) break;
    const key = normalizeDebriefTextKey(item.question);
    if (usedKeys.has(key)) continue;
    usedKeys.add(key);
    items.push({
      id: item.id,
      question: item.question.endsWith("?") ? item.question : `${item.question}?`,
      whyItMatters: item.rationale?.trim() || null,
    });
  }

  if (items.length === 0) {
    for (const question of GENERIC_VALIDATION.slice(0, 2)) {
      const key = normalizeDebriefTextKey(question);
      if (usedKeys.has(key)) continue;
      usedKeys.add(key);
      items.push({ id: `fallback-val-${items.length}`, question, whyItMatters: null });
    }
  }

  return items;
}

function buildDiscussionGuide(
  plan: ProviderDebriefPlan,
  planMode: "generic" | "intelligence",
  validationKeys: Set<string>,
  usedKeys: Set<string>,
): ProviderDebriefFieldExecutionBrief["discussionGuide"] {
  const ranked = rankConversationQuestions(plan.suggestedQuestions, planMode).filter((text) => {
    const key = normalizeDebriefTextKey(text);
    return !validationKeys.has(key) && !usedKeys.has(key);
  });

  const pool =
    ranked.length > 0
      ? ranked
      : planMode === "generic"
        ? plan.suggestedQuestions.map((q) => q.text.trim()).filter(Boolean)
        : ["What stood out to you most from the cases we observed?"];

  const deduped: string[] = [];
  for (const text of pool) {
    const key = normalizeDebriefTextKey(text);
    if (usedKeys.has(key) || validationKeys.has(key)) continue;
    usedKeys.add(key);
    deduped.push(text);
    if (deduped.length >= 5) break;
  }

  const primaryQuestion =
    deduped[0] ?? "What should we validate together from your observations?";

  return {
    primaryQuestion,
    followUpQuestions: deduped.slice(1, 4),
  };
}

function pickLeadOpportunity(
  assessments: ProviderDebriefPlanProductAssessment[],
): ProviderDebriefPlanProductAssessment | null {
  const order: ProviderDebriefPlanProductAssessment["fitLevel"][] = [
    "strong",
    "possible",
    "needs_surgeon_confirmation",
    "unknown",
    "unlikely",
  ];

  for (const level of order) {
    if (level === "unlikely") continue;
    const match = assessments.find((item) => item.fitLevel === level);
    if (match) return match;
  }

  return assessments.find((item) => item.product === "future_opportunity") ?? null;
}

function buildOpportunitySection(
  plan: ProviderDebriefPlan,
  planMode: "generic" | "intelligence",
  usedKeys: Set<string>,
): ProviderDebriefFieldExecutionBrief["opportunity"] {
  const assessment = pickLeadOpportunity(plan.productOpportunityAssessment);
  const procedure = plan.context.procedureLabel?.trim();

  if (
    !assessment ||
    planMode === "generic" ||
    assessment.fitLevel === "unknown" ||
    assessment.fitLevel === "unlikely"
  ) {
    return {
      productLabel: "Future opportunity",
      statusLine: "Explore evaluation appetite with the surgeon.",
      askQuestion: GENERIC_OPPORTUNITY_ASK,
    };
  }

  const productLabel =
    assessment.product === "future_opportunity" ? "Product opportunity" : assessment.product;
  const statusLine = `${providerDebriefFitLevelLabel(assessment.fitLevel)} — confirm in the surgeon's words.`;

  const contextSuffix = procedure ? ` for ${procedure.toLowerCase()} cases` : "";
  const askQuestion = `Based on what we observed, would a focused ${productLabel} conversation${contextSuffix} be useful?`;

  usedKeys.add(normalizeDebriefTextKey(productLabel));
  for (const line of assessment.fitRationale.slice(0, 1)) {
    usedKeys.add(normalizeDebriefTextKey(line));
  }

  return { productLabel, statusLine, askQuestion };
}

function resolveGuidanceTier(
  plan: ProviderDebriefPlan,
  planMode: "generic" | "intelligence",
  intelligenceTakeawayCount: number,
): DebriefGuidanceTier {
  if (planMode === "generic" || plan.context.caseId === "generic-debrief-plan") {
    return "field_guide";
  }

  if (intelligenceTakeawayCount >= 2 && plan.hasSufficientInputs) {
    return "observation_rich";
  }

  if (intelligenceTakeawayCount >= 1 || plan.hasSufficientInputs) {
    return "observation_assisted";
  }

  return "field_guide";
}

function buildDesiredOutcomeSection(
  plan: ProviderDebriefPlan,
  planMode: "generic" | "intelligence",
  missionHeadline: string,
): ProviderDebriefFieldExecutionBrief["desiredOutcome"] {
  const primary = plan.desiredMeetingOutcome.primary.trim();
  const headlineKey = normalizeDebriefTextKey(missionHeadline);
  const primaryKey = normalizeDebriefTextKey(primary);

  const successStatement =
    planMode !== "generic" && primaryKey !== headlineKey && primary !== GENERIC_DEBRIEF_OBJECTIVE
      ? primary
      : "Leave with one surgeon-validated takeaway and one agreed next step.";

  const supporting = plan.desiredMeetingOutcome.supporting
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2);

  return {
    successStatement,
    supporting,
    nextStepTitle: plan.recommendedNextStep.title,
    nextStepBody: plan.recommendedNextStep.body,
  };
}

export function buildProviderDebriefFieldExecutionBrief(input: {
  plan: ProviderDebriefPlan;
  planMode: "generic" | "intelligence";
  completedObservationCount: number;
}): ProviderDebriefFieldExecutionBrief {
  const { plan, planMode } = input;

  const intelligenceTakeawayCount =
    planMode === "intelligence"
      ? plan.whatWeLearned.filter((item) => !isBoilerplateLearning(item.signal)).length
      : 0;

  const count = Math.max(0, input.completedObservationCount);

  const strategy = buildAiDebriefStrategyFromProviderDebriefPlan({
    plan,
    planMode,
    completedObservationCount: count,
    providerName: plan.context.providerName,
  });

  const desiredOutcomeMeta = buildDesiredOutcomeSection(plan, planMode, strategy.missionWhy);

  return {
    guidanceTier: resolveGuidanceTier(plan, planMode, intelligenceTakeawayCount),
    strategy,
    mission: {
      headline: strategy.missionWhy,
      focusLine: null,
      takeaways: [],
      programLine: null,
    },
    discussionGuide: {
      primaryQuestion: strategy.openingQuestion,
      followUpQuestions: strategy.explorationQuestions,
    },
    validationChecklist: strategy.mustAnswerBeforeLeaving.map((question, index) => ({
      id: `must-answer-${index}`,
      question,
      whyItMatters: null,
    })),
    opportunity: {
      productLabel: "Potential opportunity",
      statusLine: "",
      askQuestion: strategy.opportunityQuestions[0] ?? GENERIC_OPPORTUNITY_ASK,
    },
    desiredOutcome: {
      successStatement: strategy.desiredOutcome,
      supporting: desiredOutcomeMeta.supporting,
      nextStepTitle: plan.recommendedNextStep.title,
      nextStepBody: plan.recommendedNextStep.body,
    },
  };
}

export function buildProviderDebriefFieldExecutionBriefFromGeneric(input: {
  providerId: string | null;
  providerName: string | null;
  facilityName: string | null;
  completedObservationCount: number;
}): ProviderDebriefFieldExecutionBrief {
  const plan = buildGenericProviderDebriefPlan(input);
  return buildProviderDebriefFieldExecutionBrief({
    plan,
    planMode: "generic",
    completedObservationCount: input.completedObservationCount,
  });
}

export function rankDebriefConversationQuestions(
  questions: ProviderDebriefPlanSuggestedQuestion[],
  planMode: "generic" | "intelligence",
): string[] {
  return rankConversationQuestions(questions, planMode);
}
