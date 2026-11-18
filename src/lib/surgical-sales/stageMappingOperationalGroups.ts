/**
 * Discovery Mapping — intelligence category grouping for the mapping modal UI.
 */

import { compareDiscoverySignalPriority } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import type { DiscoveryMappingIntelligenceCategory } from "@/lib/surgical-sales/discoveryMappingIntelligenceCategory";
import {
  discoveryMappingCategoryOrderForFocusStage,
  discoveryMappingPreferredSignalOrderForFocusStage,
  type DiscoveryMappingFocusStageId,
} from "@/lib/surgical-sales/discoveryMappingFocusStage";
import type { StageMappingQuestion } from "@/lib/surgical-sales/buildStageMappingSession";
import { compareDiscoveryMappingIntelligenceConfidenceForValidation } from "@/lib/surgical-sales/discoveryMappingIntelligenceConfidence";
import { stageMappingOpenBucketSortKey } from "@/lib/surgical-sales/stageMappingQuestionRegistry";

export type StageMappingOperationalGroups = {
  requiredNow: StageMappingQuestion[];
  helpfulNext: StageMappingQuestion[];
  confirmed: StageMappingQuestion[];
  laterStage: StageMappingQuestion[];
};

export type StageMappingIntelligenceCategorySlice = {
  open: StageMappingQuestion[];
  laterStage: StageMappingQuestion[];
  confirmed: StageMappingQuestion[];
};

export type StageMappingIntelligenceCategoryGroups = Record<
  DiscoveryMappingIntelligenceCategory,
  StageMappingIntelligenceCategorySlice
>;

function isOpenQuestion(question: StageMappingQuestion): boolean {
  return question.visibilityBucket !== "confirmed" && question.visibilityBucket !== "hidden";
}

function openBucketFor(
  question: StageMappingQuestion,
): "required_now" | "helpful_next" | "later_stage" {
  if (question.visibilityBucket === "required_now") return "required_now";
  if (question.visibilityBucket === "helpful_next") return "helpful_next";
  return "later_stage";
}

export function compareOpenStageMappingQuestions(
  a: StageMappingQuestion,
  b: StageMappingQuestion,
): number {
  const bucketDiff =
    stageMappingOpenBucketSortKey(openBucketFor(a)) -
    stageMappingOpenBucketSortKey(openBucketFor(b));
  if (bucketDiff !== 0) return bucketDiff;

  const confidenceDiff = compareDiscoveryMappingIntelligenceConfidenceForValidation(
    a.intelligenceConfidenceLevel,
    b.intelligenceConfidenceLevel,
  );
  if (confidenceDiff !== 0) return confidenceDiff;

  if (a.priority !== b.priority) return a.priority - b.priority;
  return compareDiscoverySignalPriority(a.signalId, b.signalId);
}

export function openStageMappingQuestions(questions: StageMappingQuestion[]): StageMappingQuestion[] {
  return questions.filter(isOpenQuestion);
}

export function groupStageMappingQuestionsByBucket(
  questions: StageMappingQuestion[],
): StageMappingOperationalGroups {
  return {
    requiredNow: questions.filter((q) => q.visibilityBucket === "required_now"),
    helpfulNext: questions.filter((q) => q.visibilityBucket === "helpful_next"),
    confirmed: questions.filter((q) => q.visibilityBucket === "confirmed"),
    laterStage: questions.filter((q) => q.visibilityBucket === "later_stage"),
  };
}

export function groupStageMappingQuestionsByIntelligenceCategory(
  questions: StageMappingQuestion[],
  focusStage?: DiscoveryMappingFocusStageId,
): StageMappingIntelligenceCategoryGroups {
  const categoryOrder = focusStage
    ? discoveryMappingCategoryOrderForFocusStage(focusStage)
    : discoveryMappingCategoryOrderForFocusStage("access_pathway");

  const groups = Object.fromEntries(
    categoryOrder.map((category) => [
      category,
      { open: [], laterStage: [], confirmed: [] },
    ]),
  ) as unknown as StageMappingIntelligenceCategoryGroups;

  for (const question of questions) {
    const slice = groups[question.intelligenceCategory];
    if (question.visibilityBucket === "confirmed") {
      slice.confirmed.push(question);
      continue;
    }
    if (question.visibilityBucket === "hidden") continue;
    if (question.visibilityBucket === "later_stage") {
      slice.laterStage.push(question);
      continue;
    }
    slice.open.push(question);
  }

  for (const category of categoryOrder) {
    const slice = groups[category];
    slice.open.sort(compareOpenStageMappingQuestions);
    slice.laterStage.sort(compareOpenStageMappingQuestions);
    slice.confirmed.sort(compareOpenStageMappingQuestions);
  }

  return groups;
}

/** Highest-priority unresolved required-now question (legacy bucket picker). */
export function pickNextRequiredStageMappingQuestion(
  questions: StageMappingQuestion[],
): StageMappingQuestion | null {
  return (
    [...questions]
      .filter((q) => q.visibilityBucket === "required_now")
      .sort(compareOpenStageMappingQuestions)[0] ?? null
  );
}

export function pickNextHelpfulStageMappingQuestion(
  questions: StageMappingQuestion[],
): StageMappingQuestion | null {
  return (
    [...questions]
      .filter((q) => q.visibilityBucket === "helpful_next")
      .sort(compareOpenStageMappingQuestions)[0] ?? null
  );
}

/**
 * Stage-aware next-open picker — prioritizes the workflow stage's signal order,
 * then falls back to category order.
 */
export function pickNextOpenStageMappingQuestion(
  questions: StageMappingQuestion[],
  focusStage: DiscoveryMappingFocusStageId = "access_pathway",
): StageMappingQuestion | null {
  const open = openStageMappingQuestions(questions);
  if (!open.length) return null;

  const openBySignal = new Map(open.map((question) => [question.signalId, question]));
  const preferredSignals = discoveryMappingPreferredSignalOrderForFocusStage(focusStage);

  for (const signalId of preferredSignals) {
    const match = openBySignal.get(signalId);
    if (match) return match;
  }

  const preferredOrder = discoveryMappingCategoryOrderForFocusStage(focusStage);

  for (const category of preferredOrder) {
    const categoryOpen = open
      .filter((q) => q.intelligenceCategory === category)
      .sort(compareOpenStageMappingQuestions);
    if (categoryOpen.length > 0) {
      return categoryOpen[0] ?? null;
    }
  }

  return open.sort(compareOpenStageMappingQuestions)[0] ?? null;
}
