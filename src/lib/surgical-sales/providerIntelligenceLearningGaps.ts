/**
 * Rep-facing “what we still need to learn” phrases — drives next-step behavior.
 */

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import {
  intelligenceSectionIdForDbKey,
  PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER,
} from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import {
  assessIntelligenceFieldQuality,
  deriveIntelligenceSectionConfidence,
  type IntelligenceSectionConfidence,
} from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import {
  buildIntelligenceCapturePriorities,
  fieldHasIntelligenceSignal,
  intelligenceFieldTier,
} from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  buildRevalidationPriorities,
  intelligenceFieldDisplayName,
} from "@/lib/surgical-sales/providerIntelligenceLifecycle";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { parseProviderIntelligenceFieldMetadata } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import {
  INTELLIGENCE_GAP_STATE_LABELS,
  intelligenceGapStateLabel,
} from "@/lib/surgical-sales/providerIntelligenceGapVocabulary";
import { intelligenceGapFieldGuidance } from "@/lib/surgical-sales/providerIntelligenceGapFieldGuidance";
import type { IntelligenceGapFieldGuidance } from "@/lib/surgical-sales/providerIntelligenceGapFieldGuidance";
import { intelligenceGapBestLearnedFrom } from "@/lib/surgical-sales/providerIntelligenceGapDiscoverySource";
import {
  INTELLIGENCE_REVALIDATION_OPERATIONAL_CONSEQUENCE,
  providerOperationalConsequenceForField,
  type IntelligenceGapOperationalConsequence,
} from "@/lib/surgical-sales/providerOperationalImpact";
import { intelligenceUnlocksNextLine } from "@/lib/surgical-sales/providerIntelligenceUnlocksNext";
import {
  isVendorFootprintDiscoveryVisibleForMaturityStage,
} from "@/lib/surgical-sales/providerIntelligenceDiscoveryRouting";
import type { ProviderIntelligenceMaturityStage } from "@/lib/surgical-sales/providerIntelligenceMaturity";
import {
  intelligenceGapQualifiesForSurfacing,
  isFieldExplicitlyReferenced,
  isRequiredForImmediateAction,
  resolveIntelligenceGapStageId,
  schedulingContactUnresolvedPhrase,
} from "@/lib/surgical-sales/intelligenceGapQualification";
import type { SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";

export type IntelligenceLearningGapState = "unknown" | "partial" | "outdated";

export type IntelligenceLearningGap = {
  dbKey: string;
  sectionId: ProviderIntelligenceSectionId;
  /** Concise missing-intelligence state label (not a coaching prompt). */
  phrase: string;
  /** Executable field guidance — who, how, when. */
  fieldGuidance: IntelligenceGapFieldGuidance;
  /** @deprecated Use fieldGuidance.bestSource */
  bestLearnedFrom: string;
  /** Why this gap matters — operational problem, business risk, field inefficiency. */
  operationalConsequence: IntelligenceGapOperationalConsequence;
  /** One-line field inefficiency scan for compact surfaces. */
  operationalImpact: string;
  /** What confirming this signal unlocks next. */
  unlocksNext: string;
  state: IntelligenceLearningGapState;
  priorityScore: number;
};

function gapWithDiscoverySource(
  gap: Omit<
    IntelligenceLearningGap,
    | "fieldGuidance"
    | "bestLearnedFrom"
    | "operationalConsequence"
    | "operationalImpact"
    | "unlocksNext"
  > & {
    fieldGuidance?: IntelligenceGapFieldGuidance;
    bestLearnedFrom?: string;
    operationalConsequence?: IntelligenceGapOperationalConsequence;
    operationalImpact?: string;
    unlocksNext?: string;
  },
): IntelligenceLearningGap {
  const operationalConsequence =
    gap.operationalConsequence ?? providerOperationalConsequenceForField(gap.dbKey);
  const fieldGuidance =
    gap.fieldGuidance ?? intelligenceGapFieldGuidance(gap.dbKey, gap.sectionId);
  return {
    ...gap,
    fieldGuidance,
    bestLearnedFrom: gap.bestLearnedFrom ?? fieldGuidance.bestSource,
    operationalConsequence,
    operationalImpact: gap.operationalImpact ?? operationalConsequence.summary,
    unlocksNext: gap.unlocksNext ?? intelligenceUnlocksNextLine(gap.dbKey),
  };
}

export {
  INTELLIGENCE_GAP_STATE_LABELS,
  INTELLIGENCE_LEARNING_GAP_PHRASES,
  intelligenceGapStateLabel,
} from "@/lib/surgical-sales/providerIntelligenceGapVocabulary";

export function learningGapForField(
  dbKey: string,
  sectionId: ProviderIntelligenceSectionId,
  contact: Record<string, unknown>,
  sectionConfidence?: IntelligenceSectionConfidence,
  options?: { stageId?: SalesPathwayStageId | null },
): IntelligenceLearningGap | null {
  if (!INTELLIGENCE_GAP_STATE_LABELS[dbKey]) return null;

  const raw = contact[dbKey] as string | null | undefined;
  const assessment = assessIntelligenceFieldQuality(dbKey, raw);
  const confidence =
    sectionConfidence ?? deriveIntelligenceSectionConfidence(sectionId, contact).confidence;
  const stageId = resolveIntelligenceGapStageId(contact, options?.stageId);

  if (assessment.depth === "validated" && confidence !== "unknown" && confidence !== "partial") {
    return null;
  }

  const schedulingPhrase = schedulingContactUnresolvedPhrase(dbKey, raw, contact);

  if (!assessment.hasSignal || !fieldHasIntelligenceSignal(dbKey, raw)) {
    if (!isRequiredForImmediateAction(dbKey, contact)) {
      return null;
    }
    return gapWithDiscoverySource({
      dbKey,
      sectionId,
      phrase: intelligenceGapStateLabel(dbKey, "unknown"),
      state: "unknown",
      priorityScore: 0,
    });
  }

  if (assessment.depth === "weak" || assessment.depth === "structured") {
    if (!isFieldExplicitlyReferenced(dbKey, contact, raw, assessment)) {
      return null;
    }
    return gapWithDiscoverySource({
      dbKey,
      sectionId,
      phrase: schedulingPhrase ?? intelligenceGapStateLabel(dbKey, "partial"),
      state: "partial",
      priorityScore: 0,
    });
  }

  if (confidence === "partial" || confidence === "unknown") {
    const tier = intelligenceFieldTier(dbKey, sectionId);
    if (tier === "anchor" || tier === "supporting") {
      if (!isFieldExplicitlyReferenced(dbKey, contact, raw, assessment)) {
        return null;
      }
      return gapWithDiscoverySource({
        dbKey,
        sectionId,
        phrase: schedulingPhrase ?? intelligenceGapStateLabel(dbKey, "partial"),
        state: "partial",
        priorityScore: 0,
      });
    }
  }

  return null;
}

function revalidationLearningGaps(
  contact: Record<string, unknown>,
  fieldMetadata: ProviderIntelligenceFieldMetadataMap,
  maxItems: number,
): IntelligenceLearningGap[] {
  return buildRevalidationPriorities(contact, fieldMetadata, maxItems).map((lifecycle) => {
    const sectionId = intelligenceSectionIdForDbKey(lifecycle.dbKey) ?? "clinical_workflow";
    return gapWithDiscoverySource({
      dbKey: lifecycle.dbKey,
      sectionId,
      phrase:
        lifecycle.refreshLine ??
        `${intelligenceFieldDisplayName(lifecycle.dbKey)} — re-validate on next touch`,
      bestLearnedFrom: intelligenceGapBestLearnedFrom(lifecycle.dbKey, sectionId),
      operationalConsequence: INTELLIGENCE_REVALIDATION_OPERATIONAL_CONSEQUENCE,
      unlocksNext: "Refreshed notes support better field and OR planning",
      state: lifecycle.state === "outdated" ? "outdated" : "partial",
      priorityScore: lifecycle.revalidationPriority,
    });
  });
}

export function buildIntelligenceLearningGaps(
  contact: Record<string, unknown>,
  planning?: ProviderPlanningCompletion | null,
  maxItems = 3,
  options?: { onlyUnknown?: boolean; maturityStage?: ProviderIntelligenceMaturityStage; stageId?: SalesPathwayStageId | null },
): IntelligenceLearningGap[] {
  const stageId = resolveIntelligenceGapStageId(contact, options?.stageId);
  const sectionConfidence = new Map(
    (planning?.sections ?? []).map((s) => [s.id, s.confidence] as const),
  );

  const priorityByKey = new Map(
    buildIntelligenceCapturePriorities(contact, planning, 24).map((p) => [p.dbKey, p.priorityScore]),
  );

  const gaps: IntelligenceLearningGap[] = [];
  const seenPhrases = new Set<string>();

  for (const sectionId of Object.keys(
    PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER,
  ) as ProviderIntelligenceSectionId[]) {
    const confidence = sectionConfidence.get(sectionId);
    for (const dbKey of PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sectionId]) {
      if (
        options?.maturityStage &&
        !isVendorFootprintDiscoveryVisibleForMaturityStage(dbKey, options.maturityStage)
      ) {
        continue;
      }
      const gap = learningGapForField(dbKey, sectionId, contact, confidence, { stageId });
      if (!gap) continue;
      if (
        !intelligenceGapQualifiesForSurfacing({
          dbKey,
          contact,
          state: gap.state,
          stageId,
          raw: contact[dbKey] as string | null | undefined,
        })
      ) {
        continue;
      }
      const phraseKey = gap.phrase.toLowerCase();
      if (seenPhrases.has(phraseKey)) continue;
      seenPhrases.add(phraseKey);
      gaps.push(
        gapWithDiscoverySource({
          ...gap,
          priorityScore: priorityByKey.get(dbKey) ?? 0,
        }),
      );
    }
  }

  const fieldMetadata = parseProviderIntelligenceFieldMetadata(
    contact.provider_intelligence_field_metadata,
  );
  const revalidation = revalidationLearningGaps(contact, fieldMetadata, maxItems);
  const merged = [...revalidation, ...gaps];

  const filtered = options?.onlyUnknown
    ? merged.filter((g) => g.state === "unknown" || g.state === "outdated")
    : merged;

  return filtered
    .sort((a, b) => {
      const rank = (s: IntelligenceLearningGapState) =>
        s === "outdated" ? 0 : s === "unknown" ? 1 : 2;
      if (rank(a.state) !== rank(b.state)) return rank(a.state) - rank(b.state);
      return b.priorityScore - a.priorityScore;
    })
    .slice(0, maxItems);
}

/** Gaps for summary UI — mature profiles only surface unknowns, not thin partials. */
export function buildIntelligenceLearningGapsForDisplay(
  contact: Record<string, unknown>,
  planning?: ProviderPlanningCompletion | null,
  maxItems = 3,
): IntelligenceLearningGap[] {
  const mature =
    planning?.status === "complete" ||
    (planning?.sections.length &&
      planning.sections.every((s) => s.confidence === "validated" || s.confidence === "confirmed"));
  return buildIntelligenceLearningGaps(contact, planning, maxItems, {
    onlyUnknown: Boolean(mature),
  });
}

export function formatLearningGapsSummary(gaps: IntelligenceLearningGap[], max = 2): string {
  if (gaps.length === 0) return "Profile is in good shape — refresh when the account shifts.";
  const phrases = gaps.slice(0, max).map((g) => g.phrase);
  if (phrases.length === 1) return phrases[0]!;
  return `${phrases[0]} · ${phrases[1]}`;
}

export function formatLearningGapsHeadline(
  planning: ProviderPlanningCompletion | null | undefined,
  contact: Record<string, unknown>,
): string {
  const gaps = buildIntelligenceLearningGaps(contact, planning, 4);
  if (gaps.length === 0) {
    return "Durable context is in place — update when you learn something new.";
  }
  return formatLearningGapsSummary(gaps, 2);
}

export { INTELLIGENCE_LEARNING_GAPS_TITLE } from "@/lib/surgical-sales/providerIntelligenceRepVocabulary";
