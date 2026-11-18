/**
 * Provider Debrief Planning engine — converts observation intelligence into a
 * structured provider conversation plan (service layer; no UI).
 */

import {
  allObservationIntelligenceText,
  collectObservationIntelligenceForDebriefPlan,
  type ObservationIntelligenceBundle,
} from "@/lib/surgical-sales/engagements/collectObservationIntelligenceForDebriefPlan";
import {
  PROVIDER_DEBRIEF_PLAN_VERSION,
  type ProviderDebriefPlan,
  type ProviderDebriefPlanInput,
  type ProviderDebriefPlanLearningItem,
  type ProviderDebriefPlanMeetingOutcome,
  type ProviderDebriefPlanNextStep,
  type ProviderDebriefPlanObjective,
  type ProviderDebriefPlanProductAssessment,
  type ProviderDebriefPlanProductFitLevel,
  type ProviderDebriefPlanProductId,
  type ProviderDebriefPlanRecommendedAction,
  type ProviderDebriefPlanSectionId,
  type ProviderDebriefPlanSnapshotV1,
  type ProviderDebriefPlanSuggestedQuestion,
  type ProviderDebriefPlanUnknownItem,
} from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";
import {
  assessProductWorkflowAlignment,
  workflowAlignmentSupportsProductConversation,
} from "@/lib/surgical-sales/engagements/matchProductWorkflowTriggers";
import { procedureAlignmentRationale } from "@/lib/surgical-sales/engagements/procedureProductAlignment";
import { formatObservationWatchItemLabel } from "@/lib/surgical-sales/observationWatchItems";

export const PROVIDER_DEBRIEF_PLAN_MAX_LEARNINGS = 12;
export const PROVIDER_DEBRIEF_PLAN_MAX_UNKNOWNS = 8;
export const PROVIDER_DEBRIEF_PLAN_MAX_OBJECTIVES = 5;
export const PROVIDER_DEBRIEF_PLAN_MAX_QUESTIONS = 8;

const ACSIS_PATTERN = /\bacs?is\b/i;
const ENDOLUMIK_PATTERN = /\bendolumik\b|\billuminated\s+(?:port|trocar)\b/i;
const COMPETITOR_PATTERN = /\bcompetitor\b|\brival\b|\bcomp\s+rep\b/i;

const LEARNING_CATEGORY_PRIORITY: Record<ProviderDebriefPlanLearningItem["category"], number> = {
  clinical_pain_point: 100,
  workflow_friction: 95,
  product_signal: 90,
  competitive_usage: 85,
  procedure_insight: 80,
  staff_observation: 75,
};

const CONFIDENCE_PRIORITY: Record<ProviderDebriefPlanLearningItem["confidence"], number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

function splitQuestionLines(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter(Boolean);
}

function sortLearnings(items: ProviderDebriefPlanLearningItem[]): ProviderDebriefPlanLearningItem[] {
  return [...items].sort((a, b) => {
    const categoryDelta = LEARNING_CATEGORY_PRIORITY[b.category] - LEARNING_CATEGORY_PRIORITY[a.category];
    if (categoryDelta !== 0) return categoryDelta;
    return CONFIDENCE_PRIORITY[b.confidence] - CONFIDENCE_PRIORITY[a.confidence];
  });
}

function textMentionsProduct(texts: string[], pattern: RegExp): boolean {
  return texts.some((text) => pattern.test(text));
}

function collectEvidenceForProduct(texts: string[], pattern: RegExp): string[] {
  return texts.filter((text) => pattern.test(text)).slice(0, 4);
}

function buildUnknowns(bundle: ObservationIntelligenceBundle): ProviderDebriefPlanUnknownItem[] {
  const unknowns: ProviderDebriefPlanUnknownItem[] = [];
  let priority = 100;

  for (const target of bundle.validationTargets) {
    if (target.status !== "planned") continue;
    unknowns.push({
      id: `target-${target.id}`,
      kind: "unvalidated_target",
      question: `Was ${formatObservationWatchItemLabel(target.label).toLowerCase()} confirmed during the case?`,
      rationale: "This validation target was planned before the observation but not marked observed.",
      priority: priority--,
    });
  }

  for (const line of splitQuestionLines(bundle.liveObservationFields.questions)) {
    unknowns.push({
      id: `question-${unknowns.length}`,
      kind: "open_question",
      question: line.endsWith("?") ? line : `${line}?`,
      rationale: "Captured as an open question during the observation.",
      priority: priority--,
    });
  }

  for (const line of splitQuestionLines(bundle.objectives.observation_key_questions)) {
    if (unknowns.some((item) => item.question.toLowerCase() === line.toLowerCase())) continue;
    unknowns.push({
      id: `objective-question-${unknowns.length}`,
      kind: "open_question",
      question: line.endsWith("?") ? line : `${line}?`,
      rationale: "Pre-case key question still worth confirming with the surgeon.",
      priority: priority--,
    });
  }

  const hasCompetitiveLearning = bundle.learnings.some((item) => item.category === "competitive_usage");
  if (!hasCompetitiveLearning && bundle.quickFindings.competitor_seen !== "Yes") {
    unknowns.push({
      id: "competitive-context",
      kind: "competitive_context_missing",
      question: "Which products or trays were actually used during the procedure?",
      rationale: "No competitive usage was captured in observation notes or quick findings.",
      priority: priority--,
    });
  }

  const hasProductSignal = bundle.learnings.some((item) => item.category === "product_signal");
  if (
    hasProductSignal &&
    bundle.quickFindings.product_interest !== "Strong" &&
    bundle.quickFindings.workflow_fit !== "Strong"
  ) {
    unknowns.push({
      id: "product-fit-unclear",
      kind: "product_fit_unclear",
      question: "Does the surgeon see enough workflow value to discuss a product evaluation?",
      rationale: "Product signals were observed but fit strength is not yet confirmed.",
      priority: priority--,
    });
  }

  if (unknowns.length === 0) {
    unknowns.push({
      id: "clinical-follow-through",
      kind: "clinical_gap",
      question: "What clinical takeaway from this case should we confirm directly with the surgeon?",
      rationale: "Use the debrief to validate the most important learning from the observation.",
      priority: 50,
    });
  }

  return unknowns
    .sort((a, b) => b.priority - a.priority)
    .slice(0, PROVIDER_DEBRIEF_PLAN_MAX_UNKNOWNS);
}

function buildObjectives(
  learnings: ProviderDebriefPlanLearningItem[],
  unknowns: ProviderDebriefPlanUnknownItem[],
): ProviderDebriefPlanObjective[] {
  const objectives: ProviderDebriefPlanObjective[] = [];

  const painPoints = learnings.filter((item) => item.category === "clinical_pain_point").slice(0, 2);
  for (const pain of painPoints) {
    objectives.push({
      id: `obj-pain-${pain.id}`,
      text: `Confirm with the surgeon: ${pain.signal.replace(/\.$/, "")}`,
      derivedFrom: [pain.id],
    });
  }

  const competitive = learnings.find((item) => item.category === "competitive_usage");
  if (competitive) {
    objectives.push({
      id: `obj-competitive-${competitive.id}`,
      text: "Understand how the observed competitive product fits the surgeon's current workflow",
      derivedFrom: [competitive.id],
    });
  }

  const productSignals = learnings.filter((item) => item.category === "product_signal").slice(0, 1);
  for (const signal of productSignals) {
    objectives.push({
      id: `obj-product-${signal.id}`,
      text: "Validate whether the observed product interest is strong enough to move toward evaluation",
      derivedFrom: [signal.id],
    });
  }

  for (const unknown of unknowns.slice(0, 2)) {
    if (objectives.length >= PROVIDER_DEBRIEF_PLAN_MAX_OBJECTIVES) break;
    objectives.push({
      id: `obj-unknown-${unknown.id}`,
      text: `Close the gap: ${unknown.question.replace(/\?$/, "")}`,
      derivedFrom: [unknown.id],
    });
  }

  if (objectives.length === 0) {
    objectives.push({
      id: "obj-default",
      text: "Review the key clinical learnings from the observation and agree on what matters most to the surgeon",
      derivedFrom: [],
    });
  }

  return objectives.slice(0, PROVIDER_DEBRIEF_PLAN_MAX_OBJECTIVES);
}

function buildSuggestedQuestions(
  objectives: ProviderDebriefPlanObjective[],
  unknowns: ProviderDebriefPlanUnknownItem[],
  learnings: ProviderDebriefPlanLearningItem[],
): ProviderDebriefPlanSuggestedQuestion[] {
  const questions: ProviderDebriefPlanSuggestedQuestion[] = [];
  let priority = 100;

  for (const unknown of unknowns.slice(0, 4)) {
    questions.push({
      id: `q-${unknown.id}`,
      text: unknown.question,
      objectiveId: objectives.find((objective) => objective.derivedFrom.includes(unknown.id))?.id ?? null,
      priority: priority--,
    });
  }

  const friction = learnings.find((item) => item.category === "workflow_friction");
  if (friction && !questions.some((q) => /friction|workflow/i.test(q.text))) {
    questions.push({
      id: `q-friction-${friction.id}`,
      text: "Which workflow step created the most friction during the case you observed?",
      objectiveId: objectives.find((objective) => objective.derivedFrom.includes(friction.id))?.id ?? null,
      priority: priority--,
    });
  }

  const product = learnings.find((item) => item.category === "product_signal");
  if (product && !questions.some((q) => /product|evaluation|trial/i.test(q.text))) {
    questions.push({
      id: `q-product-${product.id}`,
      text: "Would it be worth scheduling a focused conversation about product fit for cases like this one?",
      objectiveId: objectives.find((objective) => objective.derivedFrom.includes(product.id))?.id ?? null,
      priority: priority--,
    });
  }

  return questions
    .sort((a, b) => b.priority - a.priority)
    .slice(0, PROVIDER_DEBRIEF_PLAN_MAX_QUESTIONS);
}

function assessProductFit(
  product: ProviderDebriefPlanProductId,
  bundle: ObservationIntelligenceBundle,
  texts: string[],
): ProviderDebriefPlanProductAssessment {
  const pattern = product === "ACSIS" ? ACSIS_PATTERN : product === "Endolumik" ? ENDOLUMIK_PATTERN : null;
  const mentioned = pattern ? textMentionsProduct(texts, pattern) : false;
  const evidence = pattern ? collectEvidenceForProduct(texts, pattern) : [];
  const fitRationale: string[] = [];

  let fitLevel: ProviderDebriefPlanProductFitLevel = "unknown";

  if (product === "future_opportunity") {
    if (bundle.quickFindings.product_interest === "Strong") {
      fitLevel = "strong";
      fitRationale.push("Strong product interest was captured during the observation.");
    } else if (bundle.quickFindings.product_interest === "Mentioned") {
      fitLevel = "possible";
      fitRationale.push("Product interest was mentioned but not yet confirmed as strong.");
    } else if (bundle.learnings.some((item) => item.category === "product_signal")) {
      fitLevel = "needs_surgeon_confirmation";
      fitRationale.push("You noted possible product interest — confirm with the surgeon.");
    } else {
      fitLevel = "unlikely";
      fitRationale.push("No clear product opening on this case yet.");
    }

    if (bundle.quickFindings.workflow_fit === "Strong" || bundle.quickFindings.workflow_fit === "Possible") {
      fitRationale.push(`Workflow fit looked ${bundle.quickFindings.workflow_fit?.toLowerCase()} from your observation notes.`);
    }

    return { product, fitLevel, fitRationale, evidence };
  }

  if (mentioned) {
    fitRationale.push(`${product} came up in your observation notes.`);
    evidence.push(...collectEvidenceForProduct(texts, pattern!));
  }

  if (mentioned && bundle.quickFindings.product_interest === "Strong") {
    fitLevel = "strong";
    fitRationale.push("Product interest and explicit product mention align.");
  } else if (mentioned && (bundle.quickFindings.product_interest === "Mentioned" || bundle.quickFindings.workflow_fit === "Possible")) {
    fitLevel = "possible";
    fitRationale.push("Product was mentioned with moderate workflow or interest from your notes.");
  } else if (mentioned) {
    fitLevel = "needs_surgeon_confirmation";
    fitRationale.push("Product was mentioned but fit strength still needs surgeon confirmation.");
  } else if (bundle.quickFindings.product_interest === "Mentioned" || bundle.quickFindings.product_interest === "Strong") {
    fitLevel = "needs_surgeon_confirmation";
    fitRationale.push("General product interest came up without a specific product mention.");
  } else {
    fitLevel = "unlikely";
    fitRationale.push(`No ${product}-specific mention on this observation yet.`);
  }

  if (bundle.quickFindings.workflow_fit === "Strong") {
    fitRationale.push("Workflow fit from your notes supports a stronger product conversation.");
  }

  if (product === "ACSIS" || product === "Endolumik") {
    const alignment = assessProductWorkflowAlignment({
      productId: product,
      observationTexts: texts,
      procedureLabel: bundle.procedureLabel,
      learnings: bundle.learnings,
    });

    const procedureRationale = procedureAlignmentRationale(bundle.procedureLabel, product);
    if (procedureRationale && !fitRationale.includes(procedureRationale)) {
      fitRationale.push(procedureRationale);
    }

    if (workflowAlignmentSupportsProductConversation(alignment)) {
      const triggerSummary =
        alignment.matchedClinicalTriggers[0] ?? alignment.matchedWorkflowTriggers[0];
      if (fitLevel === "unlikely") {
        fitLevel = "needs_surgeon_confirmation";
        fitRationale.push(
          `Observed workflow aligns with ${product} (${triggerSummary.replace(/\.$/, "")}) — confirm with the surgeon before positioning it.`,
        );
      } else if (fitLevel === "needs_surgeon_confirmation") {
        fitRationale.push(
          `Workflow evidence supports exploring ${product} after surgeon validation (${triggerSummary.replace(/\.$/, "")}).`,
        );
      }

      evidence.push(...alignment.evidenceExcerpts);
    }
  }

  return {
    product,
    fitLevel,
    fitRationale: fitRationale.slice(0, 4),
    evidence: [...new Set(evidence)].slice(0, 4),
  };
}

function buildProductAssessments(
  bundle: ObservationIntelligenceBundle,
  texts: string[],
): ProviderDebriefPlanProductAssessment[] {
  return (["ACSIS", "Endolumik", "future_opportunity"] as const).map((product) =>
    assessProductFit(product, bundle, texts),
  );
}

function buildMeetingOutcome(
  learnings: ProviderDebriefPlanLearningItem[],
  productAssessments: ProviderDebriefPlanProductAssessment[],
  unknowns: ProviderDebriefPlanUnknownItem[],
): ProviderDebriefPlanMeetingOutcome {
  const strongestProduct = productAssessments.find(
    (item) => item.fitLevel === "strong" || item.fitLevel === "possible",
  );
  const painCount = learnings.filter((item) =>
    ["clinical_pain_point", "workflow_friction"].includes(item.category),
  ).length;

  let primary = "Align with the surgeon on the most important clinical learnings from the observation.";
  const supporting: string[] = [];

  if (strongestProduct) {
    primary = `Confirm with the surgeon whether ${strongestProduct.product === "future_opportunity" ? "a product evaluation" : strongestProduct.product} fits the workflow observed in the OR.`;
    supporting.push("Validate product fit using the surgeon's own words, not your assumptions from the OR.");
  } else if (painCount > 0) {
    primary = "Confirm the clinical pain points observed in the OR and whether they represent a recurring workflow issue.";
  }

  if (unknowns.length > 0) {
    supporting.push(`Close ${Math.min(unknowns.length, 3)} open question${unknowns.length === 1 ? "" : "s"} from the observation.`);
  }

  const competitive = learnings.some((item) => item.category === "competitive_usage");
  if (competitive) {
    supporting.push("Clarify how competitive products influence the surgeon's current preferences.");
  }

  supporting.push("Agree on one concrete next step before ending the conversation.");

  return {
    primary,
    supporting: [...new Set(supporting)].slice(0, 4),
  };
}

function buildNextStep(
  bundle: ObservationIntelligenceBundle,
  productAssessments: ProviderDebriefPlanProductAssessment[],
  learnings: ProviderDebriefPlanLearningItem[],
): { primary: ProviderDebriefPlanNextStep; alternates: ProviderDebriefPlanNextStep[] } {
  const steps: ProviderDebriefPlanNextStep[] = [];
  const strongestProduct = productAssessments.find((item) => item.fitLevel === "strong");
  const possibleProduct = productAssessments.find((item) => item.fitLevel === "possible" || item.fitLevel === "needs_surgeon_confirmation");
  const providerName = bundle.providerName ?? "the surgeon";

  if (bundle.noteCount === 0 && learnings.length === 0) {
    steps.push({
      action: "capture_additional_observation_notes",
      title: "Capture observation notes first",
      body: "Add observation notes or quick findings before planning the provider debrief conversation.",
      priority: 100,
    });
  } else {
    steps.push({
      action: "schedule_provider_debrief",
      title: "Schedule a provider debrief conversation",
      body: `Use this plan to guide a follow-up with ${providerName} about what you learned in the OR.`,
      priority: 95,
    });
  }

  if (strongestProduct) {
    steps.push({
      action: "create_adoption_initiative",
      title: "Prepare an evaluation",
      body: `Strong ${strongestProduct.product === "future_opportunity" ? "product fit" : strongestProduct.product} patterns suggest starting an evaluation after the debrief.`,
      priority: 90,
    });
    steps.push({
      action: "schedule_product_support_case",
      title: "Plan a product support case",
      body: "If the surgeon is ready, schedule hands-on product support for the next relevant procedure.",
      priority: 80,
    });
  } else if (possibleProduct) {
    steps.push({
      action: "confirm_product_fit_with_surgeon",
      title: "Confirm product fit with the surgeon",
      body: "Use the debrief to validate whether what you observed justifies moving toward evaluation.",
      priority: 88,
    });
  }

  if (bundle.quickFindings.follow_up_needed === "Yes") {
    steps.push({
      action: "update_provider_profile",
      title: "Update provider profile after debrief",
      body: "Capture confirmed learnings on the provider profile once the surgeon validates them.",
      priority: 70,
    });
  }

  if (steps.length === 0) {
    steps.push({
      action: "no_action_yet",
      title: "Review observation intelligence",
      body: "Insufficient observation intelligence to recommend a specific next step yet.",
      priority: 10,
    });
  }

  const sorted = steps.sort((a, b) => b.priority - a.priority);
  return {
    primary: sorted[0]!,
    alternates: sorted.slice(1, 4),
  };
}

function selectDebriefLearnings(
  learnings: ProviderDebriefPlanLearningItem[],
): ProviderDebriefPlanLearningItem[] {
  const sorted = sortLearnings(learnings);
  const currentCaseLearnings = sorted.filter((item) => item.source !== "prior_observation");
  const priorLearnings = sorted.filter((item) => item.source === "prior_observation");
  return [...currentCaseLearnings.slice(0, 8), ...priorLearnings.slice(0, 4)].slice(
    0,
    PROVIDER_DEBRIEF_PLAN_MAX_LEARNINGS,
  );
}

export function buildProviderDebriefPlan(input: ProviderDebriefPlanInput): ProviderDebriefPlan {
  const bundle = collectObservationIntelligenceForDebriefPlan(input);
  const texts = allObservationIntelligenceText(bundle);
  const whatWeLearned = selectDebriefLearnings(bundle.learnings);
  const whatWeStillDontKnow = buildUnknowns(bundle);
  const suggestedObjectives = buildObjectives(whatWeLearned, whatWeStillDontKnow);
  const suggestedQuestions = buildSuggestedQuestions(suggestedObjectives, whatWeStillDontKnow, whatWeLearned);
  const productOpportunityAssessment = buildProductAssessments(bundle, texts);
  const desiredMeetingOutcome = buildMeetingOutcome(whatWeLearned, productOpportunityAssessment, whatWeStillDontKnow);
  const { primary: recommendedNextStep, alternates: alternateNextSteps } = buildNextStep(
    bundle,
    productOpportunityAssessment,
    whatWeLearned,
  );

  const validationTargetsObserved = bundle.validationTargets.filter((item) => item.status === "observed").length;
  const validationTargetsPlanned = bundle.validationTargets.filter((item) => item.status === "planned").length;

  return {
    version: PROVIDER_DEBRIEF_PLAN_VERSION,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    context: {
      caseId: bundle.caseId,
      providerId: bundle.providerId,
      providerName: bundle.providerName,
      facilityName: bundle.facilityName,
      procedureLabel: bundle.procedureLabel,
      caseDateLabel: bundle.caseDateLabel,
      observationMission: bundle.observationMission,
    },
    whatWeLearned,
    whatWeStillDontKnow,
    suggestedObjectives,
    suggestedQuestions,
    productOpportunityAssessment,
    desiredMeetingOutcome,
    recommendedNextStep,
    alternateNextSteps,
    hasSufficientInputs: bundle.noteCount > 0 || whatWeLearned.length > 0,
    inputSummary: {
      noteCount: bundle.noteCount,
      extractedSignalCount: bundle.extractedSignalCount,
      validationTargetsObserved,
      validationTargetsPlanned,
      priorObservationCaseCount: input.priorObservationCases?.length ?? 0,
    },
    longitudinalIntelligence: bundle.longitudinalIntelligence,
  };
}

export function buildProviderDebriefPlanSnapshot(input: {
  plan: ProviderDebriefPlan;
  sourceCaseId: string;
  sourceEngagementId?: string | null;
}): ProviderDebriefPlanSnapshotV1 {
  return {
    ...input.plan,
    sourceCaseId: input.sourceCaseId,
    sourceEngagementId: input.sourceEngagementId ?? null,
  };
}

export function parseProviderDebriefPlanSnapshot(raw: unknown): ProviderDebriefPlanSnapshotV1 | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  if (row.version !== PROVIDER_DEBRIEF_PLAN_VERSION) return null;
  if (!Array.isArray(row.whatWeLearned) || !Array.isArray(row.suggestedObjectives)) return null;
  const sourceCaseId = String(row.sourceCaseId ?? "").trim();
  if (!sourceCaseId) return null;
  return row as ProviderDebriefPlanSnapshotV1;
}

export function providerDebriefPlanSection(plan: ProviderDebriefPlan, sectionId: ProviderDebriefPlanSectionId): unknown {
  switch (sectionId) {
    case "what_we_learned":
      return plan.whatWeLearned;
    case "what_we_still_dont_know":
      return plan.whatWeStillDontKnow;
    case "suggested_objectives":
      return plan.suggestedObjectives;
    case "suggested_questions":
      return plan.suggestedQuestions;
    case "product_opportunity_assessment":
      return plan.productOpportunityAssessment;
    case "desired_meeting_outcome":
      return plan.desiredMeetingOutcome;
    case "recommended_next_step":
      return plan.recommendedNextStep;
    default:
      return null;
  }
}

export type {
  ProviderDebriefPlan,
  ProviderDebriefPlanInput,
  ProviderDebriefPlanSnapshotV1,
  ProviderDebriefPlanRecommendedAction,
} from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";
