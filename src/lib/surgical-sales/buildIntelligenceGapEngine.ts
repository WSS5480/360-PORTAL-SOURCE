/**
 * Intelligence Gap Engine — surfaces execution gaps from ACCESS, WORKFLOW, and CLINICAL domains.
 * Gaps improve field recommendations; they do not block commercial milestone advancement.
 */


import {
  missionGapCompletenessLabel,
  missionGapPriorityLabel,
} from "@/lib/surgical-sales/providerMissionExecutionLanguage";
import { hydrateDiscoveryContactFromLegacy } from "@/lib/surgical-sales/discoveryIntelligenceLegacyMigration";
import {
  buildIntelligenceCapturePriorities,
  fieldHasIntelligenceSignal,
  intelligenceFieldTier,
} from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  intelligenceSectionIdForDbKey,
  PROVIDER_INTELLIGENCE_SECTION_LABELS,
  type ProviderIntelligenceSectionId,
} from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import {
  assessIntelligenceFieldQuality,
  deriveIntelligenceSectionConfidence,
} from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import {
  intelligenceGapQualifiesForSurfacing,
  isFieldExplicitlyReferenced,
  isFieldMissionRelevant,
  resolveIntelligenceGapStageId,
} from "@/lib/surgical-sales/intelligenceGapQualification";
import {
  learningGapForField,
  type IntelligenceLearningGap,
  type IntelligenceLearningGapState,
} from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import type { SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";
import { isIntelligenceFieldValidatedOnFile } from "@/lib/surgical-sales/providerIntelligenceValidatedOnFile";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import {
  INTELLIGENCE_GAP_DOMAIN_LABELS,
  intelligenceGapEngineFieldKeys,
  resolveIntelligenceGapTopic,
  type IntelligenceGapDomainId,
} from "@/lib/surgical-sales/intelligenceGapEngineArchitecture";

export type IntelligenceGapCompleteness = "known" | "partial" | "missing";
export type IntelligenceGapPriority = "high" | "medium" | "low";

export type IntelligenceGapTopicAssessment = {
  topicId: string;
  topicLabel: string;
  domain: IntelligenceGapDomainId;
  completeness: IntelligenceGapCompleteness;
  assessedFieldCount: number;
  knownFieldCount: number;
  partialFieldCount: number;
  missingFieldCount: number;
};

export type IntelligenceGapEngineItem = {
  id: string;
  domain: IntelligenceGapDomainId;
  topicId: string;
  topicLabel: string;
  text: string;
  priority: IntelligenceGapPriority;
  completeness: Exclude<IntelligenceGapCompleteness, "known">;
  dbKey: string;
  state: IntelligenceLearningGapState;
  priorityScore: number;
};

export type IntelligenceGapDomainAssessment = {
  id: IntelligenceGapDomainId;
  label: string;
  completeness: IntelligenceGapCompleteness;
  topics: IntelligenceGapTopicAssessment[];
};

export type IntelligenceGapEngineView = {
  domains: IntelligenceGapDomainAssessment[];
  gaps: IntelligenceGapEngineItem[];
};

const DOMAIN_ORDER: IntelligenceGapDomainId[] = ["access", "workflow", "clinical"];

const PRIORITY_RANK: Record<IntelligenceGapPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const STATE_RANK: Record<IntelligenceLearningGapState, number> = {
  unknown: 0,
  outdated: 1,
  partial: 2,
};

function fieldCompletenessFromGap(gap: IntelligenceLearningGap | null): IntelligenceGapCompleteness {
  if (!gap) return "known";
  if (gap.state === "unknown" || gap.state === "outdated") return "missing";
  return "partial";
}

function aggregateCompleteness(counts: {
  known: number;
  partial: number;
  missing: number;
}): IntelligenceGapCompleteness {
  const total = counts.known + counts.partial + counts.missing;
  if (total === 0) return "missing";
  if (counts.missing > 0 && counts.known === 0 && counts.partial === 0) return "missing";
  if (counts.known === total) return "known";
  if (counts.missing > 0 && counts.known === 0) return "missing";
  return "partial";
}

function deriveGapPriority(input: {
  domain: IntelligenceGapDomainId;
  tier: ReturnType<typeof intelligenceFieldTier>;
  state: IntelligenceLearningGapState;
  priorityScore: number;
}): IntelligenceGapPriority {
  if (input.state === "unknown" && input.domain === "access" && input.tier === "anchor") {
    return "high";
  }
  if (input.priorityScore >= 95 || (input.domain === "access" && input.state === "unknown" && input.tier !== "depth")) {
    return "high";
  }
  if (input.priorityScore >= 55 || input.state === "unknown" || input.state === "outdated") {
    return "medium";
  }
  return "low";
}

function assessFieldCompleteness(
  contact: Record<string, unknown>,
  dbKey: string,
  sectionConfidence: Map<ProviderIntelligenceSectionId, ReturnType<typeof deriveIntelligenceSectionConfidence>["confidence"]>,
  stageId: SalesPathwayStageId,
): { completeness: IntelligenceGapCompleteness; gap: IntelligenceLearningGap | null; inScope: boolean } {
  const sectionId = intelligenceSectionIdForDbKey(dbKey);
  if (!sectionId) return { completeness: "known", gap: null, inScope: false };

  if (isIntelligenceFieldValidatedOnFile(dbKey, contact)) {
    return { completeness: "known", gap: null, inScope: true };
  }

  const raw = contact[dbKey] as string | null | undefined;
  const assessment = assessIntelligenceFieldQuality(dbKey, raw);
  const hasSignal = assessment.hasSignal && fieldHasIntelligenceSignal(dbKey, raw);
  const missionRelevant = isFieldMissionRelevant(dbKey, contact, stageId);
  const referenced = isFieldExplicitlyReferenced(dbKey, contact, raw, assessment);
  const inScope = hasSignal || missionRelevant || referenced;

  if (!inScope) {
    return { completeness: "known", gap: null, inScope: false };
  }

  const gap = learningGapForField(dbKey, sectionId, contact, sectionConfidence.get(sectionId), { stageId });
  if (gap) {
    if (
      !intelligenceGapQualifiesForSurfacing({
        dbKey,
        contact,
        state: gap.state,
        stageId,
        raw,
        assessment,
      })
    ) {
      return { completeness: hasSignal ? "partial" : "known", gap: null, inScope };
    }
    return { completeness: fieldCompletenessFromGap(gap), gap, inScope: true };
  }

  if (!hasSignal) {
    return { completeness: missionRelevant ? "missing" : "known", gap: null, inScope };
  }
  if (assessment.depth === "validated" || assessment.depth === "structured") {
    return { completeness: "known", gap: null, inScope: true };
  }
  return { completeness: "partial", gap: null, inScope: true };
}

function isProviderIntelligenceSectionId(sectionId: string): sectionId is ProviderIntelligenceSectionId {
  return sectionId in PROVIDER_INTELLIGENCE_SECTION_LABELS;
}

export function buildIntelligenceGapEngine(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  maxGaps?: number;
  stageId?: SalesPathwayStageId | null;
}): IntelligenceGapEngineView {
  const contact = hydrateDiscoveryContactFromLegacy(input.contact ?? {});
  const maxGaps = input.maxGaps ?? 3;
  const stageId = resolveIntelligenceGapStageId(contact, input.stageId);

  const sectionConfidence = new Map<ProviderIntelligenceSectionId, ReturnType<typeof deriveIntelligenceSectionConfidence>["confidence"]>();
  for (const section of input.planning?.sections ?? []) {
    if (isProviderIntelligenceSectionId(section.id)) {
      sectionConfidence.set(section.id, section.confidence);
    }
  }

  const priorityByKey = new Map(
    buildIntelligenceCapturePriorities(contact, input.planning, 48).map((p) => [p.dbKey, p.priorityScore]),
  );

  type TopicAccumulator = {
    topic: NonNullable<ReturnType<typeof resolveIntelligenceGapTopic>>;
    known: number;
    partial: number;
    missing: number;
    fieldCount: number;
  };

  const topicAccumulators = new Map<string, TopicAccumulator>();
  const gapCandidates: IntelligenceGapEngineItem[] = [];
  const seenGapPhrases = new Set<string>();

  for (const dbKey of intelligenceGapEngineFieldKeys()) {
    const topic = resolveIntelligenceGapTopic(dbKey);
    if (!topic) continue;

    const { completeness, gap, inScope } = assessFieldCompleteness(
      contact,
      dbKey,
      sectionConfidence,
      stageId,
    );

    if (!inScope) continue;

    const topicKey = `${topic.domain}:${topic.topicId}`;
    const acc = topicAccumulators.get(topicKey) ?? {
      topic,
      known: 0,
      partial: 0,
      missing: 0,
      fieldCount: 0,
    };
    acc.fieldCount += 1;
    if (completeness === "known") acc.known += 1;
    else if (completeness === "partial") acc.partial += 1;
    else acc.missing += 1;
    topicAccumulators.set(topicKey, acc);

    if (!gap || completeness === "known") continue;

    const phraseKey = gap.phrase.toLowerCase();
    if (seenGapPhrases.has(phraseKey)) continue;
    seenGapPhrases.add(phraseKey);

    const sectionId = intelligenceSectionIdForDbKey(dbKey)!;
    const tier = intelligenceFieldTier(dbKey, sectionId);
    const priorityScore = priorityByKey.get(dbKey) ?? gap.priorityScore;

    gapCandidates.push({
      id: `gap-${dbKey}`,
      domain: topic.domain,
      topicId: topic.topicId,
      topicLabel: topic.topicLabel,
      text: scanLine(gap.phrase, 120),
      priority: deriveGapPriority({
        domain: topic.domain,
        tier,
        state: gap.state,
        priorityScore,
      }),
      completeness: completeness === "missing" ? "missing" : "partial",
      dbKey,
      state: gap.state,
      priorityScore,
    });
  }

  const domains: IntelligenceGapDomainAssessment[] = DOMAIN_ORDER.map((domainId) => {
    const topics = [...topicAccumulators.values()]
      .filter((acc) => acc.topic.domain === domainId)
      .map((acc) => ({
        topicId: acc.topic.topicId,
        topicLabel: acc.topic.topicLabel,
        domain: domainId,
        completeness: aggregateCompleteness({
          known: acc.known,
          partial: acc.partial,
          missing: acc.missing,
        }),
        assessedFieldCount: acc.fieldCount,
        knownFieldCount: acc.known,
        partialFieldCount: acc.partial,
        missingFieldCount: acc.missing,
      }))
      .sort((a, b) => a.topicLabel.localeCompare(b.topicLabel));

    const domainCounts = topics.reduce(
      (sum, topic) => ({
        known: sum.known + topic.knownFieldCount,
        partial: sum.partial + topic.partialFieldCount,
        missing: sum.missing + topic.missingFieldCount,
      }),
      { known: 0, partial: 0, missing: 0 },
    );

    return {
      id: domainId,
      label: INTELLIGENCE_GAP_DOMAIN_LABELS[domainId],
      completeness: aggregateCompleteness(domainCounts),
      topics,
    };
  });

  const gaps = gapCandidates
    .sort((a, b) => {
      if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority]) {
        return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      }
      if (STATE_RANK[a.state] !== STATE_RANK[b.state]) {
        return STATE_RANK[a.state] - STATE_RANK[b.state];
      }
      if (a.domain !== b.domain) {
        return DOMAIN_ORDER.indexOf(a.domain) - DOMAIN_ORDER.indexOf(b.domain);
      }
      return b.priorityScore - a.priorityScore;
    })
    .slice(0, maxGaps);

  return { domains, gaps };
}

export const INTELLIGENCE_GAP_PRIORITY_LABELS: Record<IntelligenceGapPriority, string> = {
  high: missionGapPriorityLabel("high"),
  medium: missionGapPriorityLabel("medium"),
  low: missionGapPriorityLabel("low"),
};

export const INTELLIGENCE_GAP_COMPLETENESS_LABELS: Record<IntelligenceGapCompleteness, string> = {
  known: missionGapCompletenessLabel("known"),
  partial: missionGapCompletenessLabel("partial"),
  missing: missionGapCompletenessLabel("missing"),
};
