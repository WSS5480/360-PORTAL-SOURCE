import {
  buildObservationIntelligenceView,
  hasObservationIntelligenceContent,
} from "@/lib/surgical-sales/buildObservationIntelligenceView";
import {
  observationObjectivesFromCaseRow,
  splitDelimitedObjectiveLines,
} from "@/lib/surgical-sales/observationObjectives";

export const OBSERVATION_DEBRIEF_READINESS_MAX = 5;

const ACSIS_PATTERN = /\bacs?is\b/i;
const ENDOLUMIK_PATTERN = /\bendolumik\b/i;

export type ObservationDebriefReadinessTopicKind =
  | "pain_point"
  | "competitive"
  | "product_fit"
  | "workflow"
  | "question";

export type ObservationDebriefReadinessTopic = {
  id: string;
  kind: ObservationDebriefReadinessTopicKind;
  sourceLabel: string;
  sourceValue: string;
  topic: string;
};

export type ObservationDebriefReadinessView = {
  painPoints: string[];
  competitiveProducts: string[];
  potentialProductFits: string[];
  unansweredQuestions: string[];
  suggestedTopics: ObservationDebriefReadinessTopic[];
  suggestedObjectives: string[];
  hasIntelligence: boolean;
  signalCount: number;
  readinessSummary: string;
};

function takeUnique(values: string[], max: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
    if (result.length >= max) break;
  }
  return result;
}

function truncateTheme(text: string, max = 72): string {
  const trimmed = text.trim().replace(/\.$/, "");
  if (trimmed.length <= max) return trimmed.toLowerCase();
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

function suggestTopicFromPainPoint(pain: string): string {
  const lower = pain.toLowerCase();
  if (lower.includes("fixation")) return "Discuss fixation challenges in complex repairs.";
  if (lower.includes("visual")) return "Explore visualization gaps and their impact on technique.";
  if (lower.includes("consistency") || lower.includes("inconsist")) {
    return "Discuss consistency challenges observed during the case.";
  }
  return `Discuss ${truncateTheme(pain)} with the provider.`;
}

function suggestTopicFromCompetitor(competitor: string): string {
  if (/\bcompetitor\b/i.test(competitor)) {
    return "Understand how competitive products fit the surgeon's current workflow.";
  }
  return `Explore competitive context around ${truncateTheme(competitor, 48)}.`;
}

function suggestTopicFromProductFit(fit: string): string {
  if (ACSIS_PATTERN.test(fit)) return "Explore ACSIS fit and whether the surgeon sees evaluation value.";
  if (ENDOLUMIK_PATTERN.test(fit)) return "Discuss Endolumik fit and illumination workflow benefits.";
  if (/\bstrong\b/i.test(fit) || /\binterest\b/i.test(fit)) {
    return "Validate whether observed product interest is strong enough to move toward evaluation.";
  }
  return "Validate product fit and whether a formal evaluation makes sense.";
}

function suggestTopicFromWorkflow(friction: string): string {
  const lower = friction.toLowerCase();
  if (lower.includes("turnover") || lower.includes("setup") || lower.includes("delay")) {
    return "Review workflow friction and setup efficiency with the provider.";
  }
  return `Discuss workflow friction around ${truncateTheme(friction, 48)}.`;
}

function suggestTopicFromQuestion(question: string): string {
  const trimmed = question.trim().replace(/\?$/, "");
  return `Close the loop on ${truncateTheme(trimmed, 56)} during the debrief.`;
}

function extractNamedProductFits(signals: string[]): string[] {
  const names: string[] = [];
  for (const signal of signals) {
    if (ACSIS_PATTERN.test(signal)) names.push("ACSIS");
    if (ENDOLUMIK_PATTERN.test(signal)) names.push("Endolumik");
  }
  return takeUnique(names, OBSERVATION_DEBRIEF_READINESS_MAX);
}

function buildPotentialProductFits(productSignals: string[], namedProducts: string[]): string[] {
  if (namedProducts.length > 0) return namedProducts;
  return takeUnique(productSignals, OBSERVATION_DEBRIEF_READINESS_MAX);
}

function validationTargetQuestions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const questions: string[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    if (String(row.status ?? "planned") !== "planned") continue;
    const label = String(row.label ?? "").trim();
    if (!label) continue;
    questions.push(`Was ${label.charAt(0).toLowerCase()}${label.slice(1)} confirmed during the case?`);
  }
  return questions;
}

function buildUnansweredQuestions(caseRow: Record<string, unknown>): string[] {
  const questions: string[] = [];
  const objectives = observationObjectivesFromCaseRow(caseRow);

  for (const line of splitDelimitedObjectiveLines(objectives.observation_key_questions)) {
    questions.push(line.endsWith("?") ? line : `${line}?`);
  }

  questions.push(...validationTargetQuestions(caseRow.observation_validation_targets));

  if (questions.length === 0) {
    questions.push("Which products or trays were actually used during the procedure?");
    questions.push("What clinical takeaway from this case should we confirm with the surgeon?");
  }

  return takeUnique(questions, OBSERVATION_DEBRIEF_READINESS_MAX);
}

function buildSuggestedTopics(input: {
  painPoints: string[];
  competitiveProducts: string[];
  potentialProductFits: string[];
  productSignals: string[];
  workflowFriction: string[];
  unansweredQuestions: string[];
}): ObservationDebriefReadinessTopic[] {
  const topics: ObservationDebriefReadinessTopic[] = [];

  for (const pain of input.painPoints.slice(0, 2)) {
    topics.push({
      id: `topic-pain-${topics.length}`,
      kind: "pain_point",
      sourceLabel: "Pain Point",
      sourceValue: pain,
      topic: suggestTopicFromPainPoint(pain),
    });
  }

  for (const competitor of input.competitiveProducts.slice(0, 1)) {
    topics.push({
      id: `topic-competitive-${topics.length}`,
      kind: "competitive",
      sourceLabel: "Competitive Product",
      sourceValue: competitor,
      topic: suggestTopicFromCompetitor(competitor),
    });
  }

  const productSource =
    input.potentialProductFits[0] ??
    input.productSignals.find((signal) => ACSIS_PATTERN.test(signal) || ENDOLUMIK_PATTERN.test(signal)) ??
    input.productSignals[0];

  if (productSource) {
    topics.push({
      id: `topic-product-${topics.length}`,
      kind: "product_fit",
      sourceLabel: "Potential Product Fit",
      sourceValue: productSource,
      topic: suggestTopicFromProductFit(productSource),
    });
  }

  for (const friction of input.workflowFriction.slice(0, 1)) {
    topics.push({
      id: `topic-workflow-${topics.length}`,
      kind: "workflow",
      sourceLabel: "Workflow Friction",
      sourceValue: friction,
      topic: suggestTopicFromWorkflow(friction),
    });
  }

  for (const question of input.unansweredQuestions.slice(0, 2)) {
    topics.push({
      id: `topic-question-${topics.length}`,
      kind: "question",
      sourceLabel: "Unanswered Question",
      sourceValue: question,
      topic: suggestTopicFromQuestion(question),
    });
  }

  return topics.slice(0, OBSERVATION_DEBRIEF_READINESS_MAX);
}

function buildSuggestedObjectives(input: {
  painPoints: string[];
  competitiveProducts: string[];
  potentialProductFits: string[];
  unansweredQuestions: string[];
}): string[] {
  const objectives: string[] = [];

  if (input.painPoints[0]) {
    objectives.push(`Confirm with the surgeon: ${input.painPoints[0].replace(/\.$/, "")}`);
  }

  if (input.competitiveProducts[0]) {
    objectives.push("Understand how the observed competitive product fits the surgeon's current workflow");
  }

  if (input.potentialProductFits[0]) {
    objectives.push(`Validate whether ${input.potentialProductFits[0]} is worth pursuing for evaluation`);
  }

  for (const question of input.unansweredQuestions.slice(0, 2)) {
    if (objectives.length >= OBSERVATION_DEBRIEF_READINESS_MAX) break;
    objectives.push(`Close the gap: ${question.replace(/\?$/, "")}`);
  }

  if (objectives.length === 0) {
    objectives.push(
      "Review the key clinical learnings from the observation and agree on what matters most to the surgeon",
    );
  }

  return takeUnique(objectives, OBSERVATION_DEBRIEF_READINESS_MAX);
}

function buildReadinessSummary(signalCount: number, hasIntelligence: boolean): string {
  if (!hasIntelligence) {
    return "Capture observation notes to build debrief readiness.";
  }
  if (signalCount >= 4) {
    return `${signalCount} signals captured — you're ready to plan the provider debrief conversation.`;
  }
  return `${signalCount} signal${signalCount === 1 ? "" : "s"} captured — review suggested topics before planning debrief.`;
}

export function buildObservationDebriefReadinessView(
  caseRow: Record<string, unknown>,
): ObservationDebriefReadinessView {
  const intelligence = buildObservationIntelligenceView(caseRow);
  const byId = Object.fromEntries(intelligence.categories.map((category) => [category.id, category.items]));

  const painPoints = takeUnique(byId.clinical_pain_points ?? [], OBSERVATION_DEBRIEF_READINESS_MAX);
  const competitiveProducts = takeUnique(byId.competitor_products ?? [], OBSERVATION_DEBRIEF_READINESS_MAX);
  const productSignals = takeUnique(byId.product_fit_signals ?? [], OBSERVATION_DEBRIEF_READINESS_MAX);
  const workflowFriction = takeUnique(byId.workflow_friction ?? [], OBSERVATION_DEBRIEF_READINESS_MAX);
  const namedProductFits = extractNamedProductFits(productSignals);
  const potentialProductFits = buildPotentialProductFits(productSignals, namedProductFits);
  const unansweredQuestions = buildUnansweredQuestions(caseRow);

  const signalCount =
    painPoints.length +
    competitiveProducts.length +
    potentialProductFits.length +
    workflowFriction.length;

  const hasIntelligence = hasObservationIntelligenceContent(caseRow);

  const suggestedTopics = buildSuggestedTopics({
    painPoints,
    competitiveProducts,
    potentialProductFits,
    productSignals,
    workflowFriction,
    unansweredQuestions,
  });

  const suggestedObjectives = buildSuggestedObjectives({
    painPoints,
    competitiveProducts,
    potentialProductFits,
    unansweredQuestions,
  });

  return {
    painPoints,
    competitiveProducts,
    potentialProductFits,
    unansweredQuestions,
    suggestedTopics,
    suggestedObjectives,
    hasIntelligence,
    signalCount,
    readinessSummary: buildReadinessSummary(signalCount, hasIntelligence),
  };
}
