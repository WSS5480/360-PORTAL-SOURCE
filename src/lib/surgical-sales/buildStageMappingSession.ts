/**
 * Stage mapping mode — session model from discovery intelligence view.
 */

import type {
  DiscoveryIntelligenceGroupsView,
  DiscoveryIntelligenceSignalRow,
} from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";
import type { DiscoveryIntelligenceGroupId } from "@/lib/surgical-sales/discoveryIntelligenceProgress";
import {
  discoveryIntelligenceStatusDisplayLabel,
  resolveDiscoveryIntelligenceMaturity,
} from "@/lib/surgical-sales/discoveryIntelligenceMaturity";
import {
  isDiscoverySignalStatusResolved,
  resolveDiscoveryStructuredSignalStatus,
  type DiscoveryStructuredSignalId,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { discoveryIntelligenceSignalSupportsContact } from "@/lib/surgical-sales/discoveryIntelligenceSupportContact";
import {
  stageMappingExpectationSortKey,
  type StageMappingExpectationLevel,
  type StageMappingSignalSpec,
} from "@/lib/surgical-sales/stageMappingAnswerTypes";
import {
  getStageMappingSignalSpec,
  isStageMappingSignalId,
  STAGE_MAPPING_QUESTIONS,
  STAGE_MAPPING_UI,
  type StageMappingSignalId,
} from "@/lib/surgical-sales/stageMappingQuestions";
import { parseProviderIntelligenceFieldMetadata } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { buildPathwayIntelligenceForStage } from "@/lib/surgical-sales/pathwayStageIntelligence";
import type { SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";
import {
  discoveryMappingIntelligenceCategory,
  type DiscoveryMappingIntelligenceCategory,
} from "@/lib/surgical-sales/discoveryMappingIntelligenceCategory";
import {
  resolveStageMappingVisibilityBucket,
  stageMappingOpenBucketSortKey,
  stageMappingRegistryDbKeys,
  type StageMappingVisibilityBucket,
} from "@/lib/surgical-sales/stageMappingQuestionRegistry";
import { pickNextOpenStageMappingQuestion } from "@/lib/surgical-sales/stageMappingOperationalGroups";
import {
  resolveDiscoveryMappingSignalConfidence,
  type DiscoveryMappingIntelligenceConfidenceLevel,
} from "@/lib/surgical-sales/discoveryMappingIntelligenceConfidence";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  applyDiscoveryMappingFocusStageBucket,
  DISCOVERY_MAPPING_FOCUS_STAGE_UI,
  resolveDiscoveryMappingFocusStage,
  type DiscoveryMappingFocusStageId,
} from "@/lib/surgical-sales/discoveryMappingFocusStage";

export type StageMappingQuestion = {
  signalId: DiscoveryStructuredSignalId;
  groupId: DiscoveryIntelligenceGroupId;
  groupTitle: string;
  question: string;
  dbKey: string;
  sectionId: string;
  statusLabel: string;
  confidenceLabel: string;
  maturity: DiscoveryIntelligenceSignalRow["maturity"];
  maturityLabel: string;
  resolved: boolean;
  priority: number;
  answerSpec: StageMappingSignalSpec;
  supportsContact: boolean;
  visibilityBucket: StageMappingVisibilityBucket;
  intelligenceCategory: DiscoveryMappingIntelligenceCategory;
  intelligenceConfidenceLevel: DiscoveryMappingIntelligenceConfidenceLevel;
};

export type StageMappingSection = {
  id: DiscoveryIntelligenceGroupId;
  title: string;
  mappedPercent: number;
  questions: StageMappingQuestion[];
  requiredRemaining: number;
  helpfulOpen: number;
  laterOpen: number;
  isLaterOnly: boolean;
};

export type StageMappingPriorityCounts = {
  requiredRemaining: number;
  helpfulOpen: number;
  laterOpen: number;
};

export type StageMappingIntelligenceCategoryCounts = {
  opportunityOpen: number;
  operationalOpen: number;
  salesOpen: number;
  opportunityConfirmed: number;
  operationalConfirmed: number;
  salesConfirmed: number;
};

export type StageMappingSession = {
  stageLabel: string;
  focusStage: DiscoveryMappingFocusStageId;
  focusStageLabel: string;
  focusStageHeadline: string;
  focusStageGuidance: string;
  focusStagePlanningItems: string[];
  mappedPercent: number;
  openUncertainties: number;
  priorityCounts: StageMappingPriorityCounts;
  intelligenceCategoryCounts: StageMappingIntelligenceCategoryCounts;
  deferLaterStage: boolean;
  sections: StageMappingSection[];
  nextUnresolved: StageMappingQuestion | null;
  /** Flat list for intelligence-category grouping UI. */
  operationalQuestions: StageMappingQuestion[];
};

function compareUnresolved(a: StageMappingQuestion, b: StageMappingQuestion): number {
  const bucketDiff =
    stageMappingOpenBucketSortKey(openBucketFor(a)) -
    stageMappingOpenBucketSortKey(openBucketFor(b));
  if (bucketDiff !== 0) return bucketDiff;
  return a.priority - b.priority;
}

function openBucketFor(question: StageMappingQuestion): "required_now" | "helpful_next" | "later_stage" {
  if (question.visibilityBucket === "required_now") return "required_now";
  if (question.visibilityBucket === "helpful_next") return "helpful_next";
  if (question.visibilityBucket === "later_stage") return "later_stage";
  return "later_stage";
}

function countOpenByBucket(
  questions: StageMappingQuestion[],
  bucket: StageMappingVisibilityBucket,
): number {
  return questions.filter((q) => q.visibilityBucket === bucket).length;
}

function pathwayGapsForMapping(input: {
  pathwayStageId: SalesPathwayStageId;
  contact: Record<string, unknown>;
}): ReturnType<typeof buildPathwayIntelligenceForStage> {
  const gateInput = { contact: input.contact };
  const stages: SalesPathwayStageId[] =
    input.pathwayStageId === "discovery" || input.pathwayStageId === "observe"
      ? ["discovery", "observe"]
      : [input.pathwayStageId];

  return stages.flatMap((stageId) => buildPathwayIntelligenceForStage(stageId, gateInput));
}

function visibilityBucketToExpectationLevel(
  bucket: StageMappingVisibilityBucket,
): StageMappingExpectationLevel {
  switch (bucket) {
    case "required_now":
      return "required_now";
    case "helpful_next":
      return "helpful";
    case "later_stage":
      return "later_stage";
    case "confirmed":
    case "hidden":
    default:
      return "helpful";
  }
}

function rowToQuestion(
  row: DiscoveryIntelligenceSignalRow,
  groupId: DiscoveryIntelligenceGroupId,
  groupTitle: string,
  input: {
    pathwayStageId: SalesPathwayStageId;
    focusStage: DiscoveryMappingFocusStageId;
    fieldMeta: ReturnType<typeof parseProviderIntelligenceFieldMetadata>;
    pathwayGaps: ReturnType<typeof buildPathwayIntelligenceForStage>;
    contact: Record<string, unknown>;
  },
): StageMappingQuestion | null {
  if (!row.signalId) return null;
  const signalId = row.signalId as DiscoveryStructuredSignalId;
  if (!isStageMappingSignalId(signalId)) return null;

  const dbKeys = stageMappingRegistryDbKeys(signalId);
  const statusLabel = resolveDiscoveryStructuredSignalStatus(signalId, input.contact);
  const maturity = resolveDiscoveryIntelligenceMaturity({
    statusLabel,
    fieldMeta: input.fieldMeta,
    dbKeys,
  });
  const maturityLabel = discoveryIntelligenceStatusDisplayLabel({ statusLabel, maturity });
  const visibilityBucket = applyDiscoveryMappingFocusStageBucket({
    focusStage: input.focusStage,
    signalId,
    baseBucket: resolveStageMappingVisibilityBucket({
      signalId,
      pathwayStageId: input.pathwayStageId,
      maturity,
      statusLabel,
      dbKeys,
      fieldMeta: input.fieldMeta,
      pathwayGaps: input.pathwayGaps,
    }),
  });

  if (visibilityBucket === "hidden") return null;

  const baseSpec = getStageMappingSignalSpec(signalId);
  const answerSpec: StageMappingSignalSpec = {
    ...baseSpec,
    expectationLevel: visibilityBucketToExpectationLevel(visibilityBucket),
  };

  const resolved =
    visibilityBucket === "confirmed" ||
    isDiscoverySignalStatusResolved(signalId, statusLabel);

  const intelligenceConfidenceLevel = resolveDiscoveryMappingSignalConfidence({
    signalId: signalId as StageMappingSignalId,
    contact: input.contact,
    resolved,
  });

  return {
    signalId,
    groupId,
    groupTitle,
    question: STAGE_MAPPING_QUESTIONS[signalId] ?? row.label,
    dbKey: row.primaryDbKey,
    sectionId: row.sectionId ?? "",
    statusLabel,
    confidenceLabel: row.confidenceLabel,
    maturity,
    maturityLabel,
    resolved,
    priority: row.priority,
    answerSpec,
    supportsContact: discoveryIntelligenceSignalSupportsContact(signalId),
    visibilityBucket,
    intelligenceCategory: discoveryMappingIntelligenceCategory(signalId),
    intelligenceConfidenceLevel,
  };
}

export function buildStageMappingSession(
  view: DiscoveryIntelligenceGroupsView,
  options?: {
    contact?: Record<string, unknown>;
    engagements?: ProviderEngagementSummary[];
    cases?: Array<Record<string, unknown>>;
  },
): StageMappingSession {
  const contact = options?.contact ?? {};
  const fieldMeta = parseProviderIntelligenceFieldMetadata(
    contact.provider_intelligence_field_metadata,
  );
  const pathwayGaps = pathwayGapsForMapping({
    pathwayStageId: view.pathwayStageId,
    contact,
  });
  const focusStage = resolveDiscoveryMappingFocusStage({
    contact,
    engagements: options?.engagements,
    cases: options?.cases,
    pathwayStageId: view.pathwayStageId,
  });
  const focusStageUi = DISCOVERY_MAPPING_FOCUS_STAGE_UI[focusStage];

  const gapContext = {
    pathwayStageId: view.pathwayStageId,
    focusStage,
    fieldMeta,
    pathwayGaps,
    contact,
  };

  const sections: StageMappingSection[] = view.groups.map((group) => {
    const questions = group.rows
      .map((row) => rowToQuestion(row, group.id, group.title, gapContext))
      .filter((q): q is StageMappingQuestion => Boolean(q))
      .sort((a, b) => compareUnresolved(a, b));

    const openQuestions = questions.filter(
      (q) => q.visibilityBucket !== "confirmed" && q.visibilityBucket !== "hidden",
    );
    const isLaterOnly =
      openQuestions.length > 0 &&
      openQuestions.every((q) => q.visibilityBucket === "later_stage");

    return {
      id: group.id,
      title:
        STAGE_MAPPING_UI.sectionLabels[group.id as keyof typeof STAGE_MAPPING_UI.sectionLabels] ??
        group.title,
      mappedPercent: group.progress.percent,
      questions,
      requiredRemaining: countOpenByBucket(questions, "required_now"),
      helpfulOpen: countOpenByBucket(questions, "helpful_next"),
      laterOpen: countOpenByBucket(questions, "later_stage"),
      isLaterOnly,
    };
  });

  const operationalQuestions = sections
    .flatMap((s) => s.questions)
    .sort((a, b) => compareUnresolved(a, b));

  const openQuestions = operationalQuestions.filter(
    (q) => q.visibilityBucket !== "confirmed" && q.visibilityBucket !== "hidden",
  );
  const priorityCounts: StageMappingPriorityCounts = {
    requiredRemaining: countOpenByBucket(operationalQuestions, "required_now"),
    helpfulOpen: countOpenByBucket(operationalQuestions, "helpful_next"),
    laterOpen: countOpenByBucket(operationalQuestions, "later_stage"),
  };
  const intelligenceCategoryCounts: StageMappingIntelligenceCategoryCounts = {
    opportunityOpen: openQuestions.filter((q) => q.intelligenceCategory === "opportunity").length,
    operationalOpen: openQuestions.filter((q) => q.intelligenceCategory === "operational").length,
    salesOpen: openQuestions.filter((q) => q.intelligenceCategory === "sales").length,
    opportunityConfirmed: operationalQuestions.filter(
      (q) => q.intelligenceCategory === "opportunity" && q.visibilityBucket === "confirmed",
    ).length,
    operationalConfirmed: operationalQuestions.filter(
      (q) => q.intelligenceCategory === "operational" && q.visibilityBucket === "confirmed",
    ).length,
    salesConfirmed: operationalQuestions.filter(
      (q) => q.intelligenceCategory === "sales" && q.visibilityBucket === "confirmed",
    ).length,
  };
  const nextUnresolved = pickNextOpenStageMappingQuestion(operationalQuestions, focusStage);
  const deferLaterStage = priorityCounts.requiredRemaining > 0;

  return {
    stageLabel: view.pathwayStageLabel,
    focusStage,
    focusStageLabel: focusStageUi.label,
    focusStageHeadline: focusStageUi.headline,
    focusStageGuidance: focusStageUi.guidance,
    focusStagePlanningItems: focusStageUi.planningItems ?? [],
    mappedPercent: view.confidenceScore,
    openUncertainties: openQuestions.length,
    priorityCounts,
    intelligenceCategoryCounts,
    deferLaterStage,
    sections,
    nextUnresolved,
    operationalQuestions,
  };
}

export function splitStageMappingSectionQuestions(section: StageMappingSection): {
  immediate: StageMappingQuestion[];
  laterStage: StageMappingQuestion[];
} {
  const immediate = section.questions.filter((q) => q.visibilityBucket !== "later_stage");
  const laterStage = section.questions.filter((q) => q.visibilityBucket === "later_stage");
  return { immediate, laterStage };
}
