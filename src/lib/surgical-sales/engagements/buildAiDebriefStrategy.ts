/**
 * Converts observation notes into a rep-facing debrief coaching plan.
 * Business objective: decide 360 Experience vs Case Commitment vs No Action.
 */

import { normalizeDebriefTextKey } from "@/lib/surgical-sales/engagements/buildProviderDebriefFieldExecutionBrief";
import { buildGenericProviderDebriefPlan } from "@/lib/surgical-sales/engagements/buildGenericProviderDebriefPlan";
import {
  coachingDetermineImportance,
  coachingExploreOpenness,
  coachingPathPrerequisites,
  coachingRecommendPath,
  coachingUnderstandImpact,
  coachingValidateObservation,
  translateDebriefClinicalTopic,
} from "@/lib/surgical-sales/engagements/debriefClinicalTopicTranslation";
import { sanitizeDebriefStrategy } from "@/lib/surgical-sales/engagements/debriefRepFacingCopy";
import { buildDebriefStrategyProductContext } from "@/lib/surgical-sales/engagements/debriefProductKnowledge";
import type {
  ProviderDebriefPlan,
  ProviderDebriefPlanLearningCategory,
  ProviderDebriefPlanProductAssessment,
  ProviderDebriefPlanUnknownItem,
} from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";

export type DebriefAdvancementPathId = "360_experience" | "case_commitment" | "no_action";

export type DebriefAdvancementPathRecommendation = {
  id: DebriefAdvancementPathId;
  label: string;
  status: "recommended" | "consider" | "hold";
  coachingNote: string;
};

export type AiDebriefStrategy = {
  missionWhy: string;
  missionSuccess: string;
  openingQuestion: string;
  decisionQuestions: string[];
  opportunityQuestions: string[];
  closingQuestions: string[];
  mustAnswerBeforeLeaving: string[];
  advancementPaths: DebriefAdvancementPathRecommendation[];
  desiredOutcome: string;
  /** @deprecated Active workspace compat */
  debriefMission: string;
  /** @deprecated Active workspace compat */
  conversationStrategy: string;
  /** @deprecated Active workspace compat */
  validationQuestions: string[];
  /** @deprecated Active workspace compat */
  explorationQuestions: string[];
};

export type DebriefStrategyPainPoint = {
  signal: string;
  recurrenceCount?: number;
  category?: ProviderDebriefPlanLearningCategory;
};

export type DebriefStrategyProductSignal = {
  product: string;
  fitLevel?: ProviderDebriefPlanProductAssessment["fitLevel"];
  signal?: string;
};

export type DebriefStrategyEvidenceGap = {
  id: string;
  question: string;
  kind: ProviderDebriefPlanUnknownItem["kind"];
  rationale?: string | null;
};

export type AiDebriefStrategyInput = {
  providerName: string | null;
  observationMission: string | null;
  procedureLabel: string | null;
  completedObservationCount: number;
  planMode: "generic" | "intelligence";
  knownPainPoints: DebriefStrategyPainPoint[];
  productSignals: DebriefStrategyProductSignal[];
  openEvidenceGaps: DebriefStrategyEvidenceGap[];
  explorationCandidates: string[];
  desiredOutcomePrimary: string;
  desiredOutcomeSupporting: string[];
  nextStepTitle: string;
  nextStepBody: string;
};

const BOILERPLATE_SIGNAL = [
  /^workflow friction was observed during the case\.?$/i,
  /^you noted workflow friction during the case\.?$/i,
  /^a competitor product was observed in the or\.?$/i,
  /^a competitor product was in the or\.?$/i,
  /^workflow fit looks (strong|possible|weak) from field signals\.?$/i,
  /^workflow fit looked (strong|possible|weak) from what you observed\.?$/i,
  /^product interest was (mentioned|strong) during observation\.?$/i,
  /^product interest came up during observation \((mentioned|strong)\)\.?$/i,
];

const ADVANCEMENT_PATH_LABELS: Record<DebriefAdvancementPathId, string> = {
  "360_experience": "360 Experience",
  case_commitment: "Case Commitment",
  no_action: "No Action",
};

function isBoilerplateSignal(signal: string): boolean {
  return BOILERPLATE_SIGNAL.some((pattern) => pattern.test(signal.trim()));
}

function providerLabel(input: AiDebriefStrategyInput): string {
  return input.providerName?.trim() || "the surgeon";
}

function resolveClinicalTopic(
  pain: DebriefStrategyPainPoint | null,
  gap: DebriefStrategyEvidenceGap | null,
): string {
  if (pain) {
    return translateDebriefClinicalTopic(pain.signal, pain.category);
  }
  if (gap) {
    const fromQuestion = gap.question.replace(/^was\s+/i, "").replace(/\s+confirmed during the case\??$/i, "");
    return translateDebriefClinicalTopic(fromQuestion);
  }
  return "what stood out during the cases you observed";
}

function buildMissionWhy(input: AiDebriefStrategyInput, clinicalTopic: string | null): string {
  const provider = providerLabel(input);

  if (input.planMode === "generic") {
    return `Meet with ${provider} to understand whether what you observed in the OR is worth acting on together.`;
  }

  if (clinicalTopic && clinicalTopic !== "what stood out during the cases you observed") {
    return `You observed ${clinicalTopic} with ${provider}. Use this conversation to learn whether it matters clinically — before discussing any next step.`;
  }

  return `Sit down with ${provider} to confirm what you observed, understand whether it matters, and only then decide if there is a next step worth taking.`;
}

function buildMissionSuccess(_input: AiDebriefStrategyInput): string {
  return "Leave knowing whether the workflow issue is real for them, whether they would act on it, and — only if the answer is yes — which next step you both agreed on.";
}

function pickLeadPain(input: AiDebriefStrategyInput): DebriefStrategyPainPoint | null {
  for (const pain of input.knownPainPoints) {
    if (isBoilerplateSignal(pain.signal)) continue;
    const topic = translateDebriefClinicalTopic(pain.signal, pain.category);
    if (topic) return pain;
  }
  return null;
}

function pickLeadGap(input: AiDebriefStrategyInput): DebriefStrategyEvidenceGap | null {
  for (const gap of input.openEvidenceGaps) {
    if (gap.kind === "competitive_context_missing") continue;
    return gap;
  }
  return input.openEvidenceGaps[0] ?? null;
}

function pickLeadProductSignal(
  signals: DebriefStrategyProductSignal[],
): DebriefStrategyProductSignal | null {
  const order: ProviderDebriefPlanProductAssessment["fitLevel"][] = [
    "strong",
    "possible",
    "needs_surgeon_confirmation",
    "unknown",
  ];

  for (const level of order) {
    const match = signals.find((s) => s.fitLevel === level && s.product !== "future_opportunity");
    if (match) return match;
  }

  return signals.find((s) => s.product === "future_opportunity") ?? signals[0] ?? null;
}

function resolveRecommendedPath(
  input: AiDebriefStrategyInput,
  leadProduct: DebriefStrategyProductSignal | null,
  hasMeaningfulPain: boolean,
): DebriefAdvancementPathId {
  if (input.planMode === "generic") {
    return "no_action";
  }

  if (leadProduct?.fitLevel === "strong") {
    return "case_commitment";
  }

  if (
    leadProduct?.fitLevel === "possible" ||
    leadProduct?.fitLevel === "needs_surgeon_confirmation" ||
    (hasMeaningfulPain && leadProduct && leadProduct.fitLevel !== "unlikely")
  ) {
    return "360_experience";
  }

  if (hasMeaningfulPain) {
    return "360_experience";
  }

  return "no_action";
}

function buildAdvancementPaths(
  input: AiDebriefStrategyInput,
  recommended: DebriefAdvancementPathId,
  leadProduct: DebriefStrategyProductSignal | null,
): DebriefAdvancementPathRecommendation[] {
  const productKnowledge = buildDebriefStrategyProductContext({
    productSignals: input.productSignals,
  }).primary;

  const productLabel =
    productKnowledge?.name ??
    (leadProduct && leadProduct.product !== "future_opportunity"
      ? leadProduct.product
      : "your product");

  const notes: Record<DebriefAdvancementPathId, string> = {
    "360_experience":
      input.planMode === "generic"
        ? "Offer when they see workflow value but are not ready for an OR commitment yet."
        : productKnowledge?.experience360Positioning ??
          "Workflow value may be there — a hands-on 360 Experience lets them test fit before committing cases.",
    case_commitment:
      input.planMode === "generic"
        ? "Offer when they confirm the pain is real and want to move forward in the OR."
        : productKnowledge?.evaluationCaseTriggers[0]
          ? `They may be ready to commit cases with ${productLabel} when ${productKnowledge.evaluationCaseTriggers[0].toLowerCase()}`
          : `They may be ready to commit cases with ${productLabel} — only after they confirm the workflow issue matters.`,
    no_action:
      input.planMode === "generic"
        ? "Stay here when the workflow is acceptable to them or there is no appetite to change."
        : productKnowledge?.avoidWhen[0]
          ? `Hold commercial next step when ${productKnowledge.avoidWhen[0].toLowerCase()}`
          : "No commercial next step yet — keep the relationship without pushing a program forward.",
  };

  const order: DebriefAdvancementPathId[] = ["360_experience", "case_commitment", "no_action"];

  return order.map((id) => ({
    id,
    label: ADVANCEMENT_PATH_LABELS[id],
    status:
      id === recommended
        ? "recommended"
        : id === "no_action" && recommended !== "no_action"
          ? "hold"
          : "consider",
    coachingNote: notes[id],
  }));
}

function buildDesiredOutcome(recommended: DebriefAdvancementPathId): string {
  const pathLabel = ADVANCEMENT_PATH_LABELS[recommended];
  return `Walk out with clarity on whether the workflow issue is worth acting on. If yes, confirm ${pathLabel} (or their preferred path) and schedule the next touchpoint.`;
}

function buildConversationCoaching(
  input: AiDebriefStrategyInput,
  clinicalTopic: string,
  recommended: DebriefAdvancementPathId,
  usedKeys: Set<string>,
): {
  openingQuestion: string;
  decisionQuestions: string[];
  opportunityQuestions: string[];
  closingQuestions: string[];
} {
  const productKnowledge = buildDebriefStrategyProductContext({
    productSignals: input.productSignals,
  }).primary;

  const pushUnique = (list: string[], line: string) => {
    const key = normalizeDebriefTextKey(line);
    if (usedKeys.has(key)) return;
    usedKeys.add(key);
    list.push(line);
  };

  const openingQuestion =
    input.planMode === "generic"
      ? "I'd like to start with what stood out to you from the cases we observed — does that match what you saw?"
      : coachingValidateObservation(clinicalTopic);

  usedKeys.add(normalizeDebriefTextKey(openingQuestion));

  const decisionQuestions: string[] = [];
  const opportunityQuestions: string[] = [];
  const closingQuestions: string[] = [];

  if (input.planMode !== "generic") {
    pushUnique(decisionQuestions, coachingUnderstandImpact(clinicalTopic));
  } else {
    pushUnique(
      decisionQuestions,
      "When those moments come up in your cases, how do they affect the flow of the procedure or the team's work?",
    );
  }

  if (input.planMode !== "generic") {
    pushUnique(opportunityQuestions, coachingDetermineImportance(clinicalTopic));
  } else {
    pushUnique(
      opportunityQuestions,
      "Is anything you observed painful enough that you would prioritize fixing it if you could?",
    );
  }

  pushUnique(opportunityQuestions, coachingExploreOpenness(clinicalTopic));

  if (input.planMode !== "generic" && productKnowledge?.discoveryQuestions[0]) {
    pushUnique(opportunityQuestions, productKnowledge.discoveryQuestions[0]);
  }

  const competitiveGap = input.openEvidenceGaps.find((g) => g.kind === "competitive_context_missing");
  if (competitiveGap && decisionQuestions.length < 2) {
    pushUnique(
      decisionQuestions,
      "Are you satisfied with the products and trays you are using today, or is there room to improve?",
    );
  }

  pushUnique(closingQuestions, coachingRecommendPath(ADVANCEMENT_PATH_LABELS[recommended]));
  pushUnique(closingQuestions, coachingPathPrerequisites());

  return {
    openingQuestion,
    decisionQuestions: decisionQuestions.slice(0, 2),
    opportunityQuestions: opportunityQuestions.slice(0, 2),
    closingQuestions: closingQuestions.slice(0, 2),
  };
}

function buildMustAnswerChecklist(clinicalTopic: string): string[] {
  return [
    "Did what you observed match how the surgeon experiences these cases?",
    clinicalTopic.includes("visualization") || clinicalTopic.includes("fixation")
      ? "Determine whether extra time establishing visualization before fixation is creating a meaningful workflow challenge."
      : `Determine whether ${clinicalTopic} is creating a meaningful workflow challenge worth addressing.`,
    "Are they open to exploring a change if the issue is real — or is the current workflow good enough?",
    "Which advancement path did you land on before leaving?",
  ];
}

export function buildAiDebriefStrategy(input: AiDebriefStrategyInput): AiDebriefStrategy {
  const usedKeys = new Set<string>();
  const leadPain = pickLeadPain(input);
  const leadGap = pickLeadGap(input);
  const leadProduct = pickLeadProductSignal(input.productSignals);
  const hasMeaningfulPain = leadPain !== null;
  const clinicalTopic = resolveClinicalTopic(leadPain, leadGap);

  const missionWhy = buildMissionWhy(input, clinicalTopic);
  const missionSuccess = buildMissionSuccess(input);

  const recommended = resolveRecommendedPath(input, leadProduct, hasMeaningfulPain);
  const conversation = buildConversationCoaching(input, clinicalTopic, recommended, usedKeys);

  const mustAnswerBeforeLeaving = buildMustAnswerChecklist(clinicalTopic);
  const advancementPaths = buildAdvancementPaths(input, recommended, leadProduct);
  const desiredOutcome = buildDesiredOutcome(recommended);

  const raw: Omit<
    AiDebriefStrategy,
    "debriefMission" | "conversationStrategy" | "validationQuestions" | "explorationQuestions"
  > = {
    missionWhy,
    missionSuccess,
    openingQuestion: conversation.openingQuestion,
    decisionQuestions: conversation.decisionQuestions,
    opportunityQuestions: conversation.opportunityQuestions,
    closingQuestions: conversation.closingQuestions,
    mustAnswerBeforeLeaving,
    advancementPaths,
    desiredOutcome,
  };

  const sanitized = sanitizeDebriefStrategy(raw);

  return {
    ...sanitized,
    debriefMission: sanitized.missionWhy,
    conversationStrategy: sanitized.missionSuccess,
    validationQuestions: sanitized.decisionQuestions,
    explorationQuestions: sanitized.closingQuestions,
  };
}

export function buildAiDebriefStrategyFromProviderDebriefPlan(input: {
  plan: ProviderDebriefPlan;
  planMode: "generic" | "intelligence";
  completedObservationCount: number;
  providerName?: string | null;
}): AiDebriefStrategy {
  const { plan, planMode } = input;
  const li = plan.longitudinalIntelligence;

  const knownPainPoints: DebriefStrategyPainPoint[] = [];

  for (const pain of li.recurringPainPoints) {
    knownPainPoints.push({
      signal: pain.signal,
      recurrenceCount: pain.count,
      category: "clinical_pain_point",
    });
  }

  for (const learning of plan.whatWeLearned) {
    if (isBoilerplateSignal(learning.signal)) continue;
    knownPainPoints.push({
      signal: learning.signal,
      recurrenceCount: learning.source === "prior_observation" ? 2 : 1,
      category: learning.category,
    });
  }

  const productSignals: DebriefStrategyProductSignal[] = plan.productOpportunityAssessment.map(
    (assessment) => ({
      product: assessment.product,
      fitLevel: assessment.fitLevel,
      signal: assessment.fitRationale[0] ?? assessment.evidence[0],
    }),
  );

  const openEvidenceGaps: DebriefStrategyEvidenceGap[] =
    planMode === "generic"
      ? []
      : plan.whatWeStillDontKnow
          .filter(
            (item) => item.id !== "clinical-follow-through" || plan.whatWeStillDontKnow.length === 1,
          )
          .sort((a, b) => b.priority - a.priority)
          .map((item) => ({
            id: item.id,
            question: item.question,
            kind: item.kind,
            rationale: item.rationale,
          }));

  return buildAiDebriefStrategy({
    providerName: input.providerName ?? plan.context.providerName,
    observationMission: plan.context.observationMission,
    procedureLabel: plan.context.procedureLabel,
    completedObservationCount: input.completedObservationCount,
    planMode,
    knownPainPoints,
    productSignals,
    openEvidenceGaps,
    explorationCandidates: [],
    desiredOutcomePrimary: plan.desiredMeetingOutcome.primary,
    desiredOutcomeSupporting: plan.desiredMeetingOutcome.supporting,
    nextStepTitle: plan.recommendedNextStep.title,
    nextStepBody: plan.recommendedNextStep.body,
  });
}

export function buildAiDebriefStrategyGeneric(input: {
  providerId: string | null;
  providerName: string | null;
  facilityName: string | null;
  completedObservationCount: number;
}): AiDebriefStrategy {
  const plan = buildGenericProviderDebriefPlan(input);
  return buildAiDebriefStrategyFromProviderDebriefPlan({
    plan,
    planMode: "generic",
    completedObservationCount: input.completedObservationCount,
    providerName: input.providerName,
  });
}
