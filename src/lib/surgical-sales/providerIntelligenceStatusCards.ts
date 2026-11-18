/**
 * Scannable intelligence status cards — operational maturity for four strategic areas.
 */

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import {
  buildIntelligenceLearningGaps,
  learningGapForField,
  type IntelligenceLearningGap,
} from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import { intelligenceGapFieldGuidance } from "@/lib/surgical-sales/providerIntelligenceGapFieldGuidance";
import { intelligenceGapChipLabel } from "@/lib/surgical-sales/providerIntelligenceBriefing";
import { intelligenceGapStateLabel } from "@/lib/surgical-sales/providerIntelligenceGapVocabulary";
import {
  buildIntelligenceCapturePriorities,
  fieldHasIntelligenceSignal,
} from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { formatStatusCardOperationalLabel } from "@/lib/surgical-sales/providerIntelligenceOperationalConfidence";
import {
  deriveIntelligenceSectionConfidence,
  type IntelligenceSectionConfidence,
} from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import { buildIntelligenceSectionCaptureSummary } from "@/lib/surgical-sales/providerIntelligenceSectionSummary";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { resolveIntelligenceOperationalTrust } from "@/lib/surgical-sales/providerIntelligenceOperationalTrust";
import { buildProviderRelationshipOperationalMaturity } from "@/lib/surgical-sales/buildProviderRelationshipOperationalMaturity";
import {
  intelligenceUnlocksNextCapability,
  intelligenceUnlocksNextLine,
} from "@/lib/surgical-sales/providerIntelligenceUnlocksNext";
import { providerOperationalConsequenceForField } from "@/lib/surgical-sales/providerOperationalImpact";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";

export type IntelligenceStatusCardId =
  | "observation_pathway"
  | "workflow_understanding"
  | "commercial_influence"
  | "relationship_confidence";

/** User-facing confidence tier (not form completion). */
export type IntelligenceStatusCardConfidence = "low" | "partial" | "strong" | "validated";

export const INTELLIGENCE_STATUS_CARD_ORDER: IntelligenceStatusCardId[] = [
  "observation_pathway",
  "workflow_understanding",
  "commercial_influence",
  "relationship_confidence",
];

/** Scan order for the one-line operational readiness bar (relationship/coordinator is fourth). */
export const READINESS_BAR_PRIMARY_CARD_ORDER: IntelligenceStatusCardId[] = [
  "observation_pathway",
  "workflow_understanding",
  "commercial_influence",
];

export const INTELLIGENCE_STATUS_CARD_TITLES: Record<IntelligenceStatusCardId, string> = {
  observation_pathway: "OR access",
  workflow_understanding: "Workflow",
  commercial_influence: "Commercial",
  relationship_confidence: "Relationship",
};

export const CARD_SECTIONS_FOR_STATUS_CARD: Record<
  IntelligenceStatusCardId,
  ProviderIntelligenceSectionId[]
> = {
  observation_pathway: ["observation_readiness"],
  workflow_understanding: ["clinical_workflow", "or_environment"],
  commercial_influence: ["commercial_signals"],
  relationship_confidence: ["relationship_intelligence"],
};

const CONFIDENCE_RANK: Record<IntelligenceSectionConfidence, number> = {
  unknown: 0,
  partial: 1,
  confirmed: 2,
  validated: 3,
};

import { intelligenceContextualStatusCardCta } from "@/lib/surgical-sales/providerIntelligenceContextualCtas";

export type IntelligenceStatusCard = {
  id: IntelligenceStatusCardId;
  title: string;
  confidence: IntelligenceStatusCardConfidence;
  confidenceLabel: string;
  /** One-line scan summary for console cards (≤ ~96 chars). */
  scanSummary: string;
  interpretation: string;
  topMissingSignal: string | null;
  /** Compact lane scan — primary open blocker in this area. */
  keyBlocker: string;
  /** Operational capability unlocked when the blocker is solved. */
  nextUnlock: string;
  blockerCount: number;
  validatedSignalCount: number;
  emergingSignalCount: number;
  ctaLabel: string;
  ctaMode: "capture" | "review";
  targetSectionId: ProviderIntelligenceSectionId;
  targetDbKey: string | null;
};

export function buildStatusCardScanSummary(interpretation: string, maxLen = 96): string {
  const oneLine = interpretation.replace(/\s+/g, " ").trim();
  if (oneLine.length <= maxLen) return oneLine;
  const cut = oneLine.slice(0, maxLen - 1);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > 48) return `${cut.slice(0, lastSpace).trimEnd()}…`;
  return `${cut.trimEnd()}…`;
}

export function countBlockersForStatusCard(
  cardId: IntelligenceStatusCardId,
  contact: Record<string, unknown>,
  planning?: ProviderPlanningCompletion | null,
): number {
  const sectionIds = new Set(CARD_SECTIONS_FOR_STATUS_CARD[cardId]);
  return buildIntelligenceLearningGaps(contact, planning, 48).filter((g) =>
    sectionIds.has(g.sectionId),
  ).length;
}

export function countValidatedSignalsForStatusCard(
  cardId: IntelligenceStatusCardId,
  contact: Record<string, unknown>,
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap,
): number {
  let count = 0;
  for (const sectionId of CARD_SECTIONS_FOR_STATUS_CARD[cardId]) {
    for (const dbKey of PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sectionId] ?? []) {
      const raw = contact[dbKey] as string | null | undefined;
      if (!fieldHasIntelligenceSignal(dbKey, raw)) continue;
      const trust = resolveIntelligenceOperationalTrust({
        dbKey,
        raw,
        meta: fieldMetadata?.[dbKey],
      });
      if (trust.tier === "validated") count += 1;
    }
  }
  return count;
}

export function countEmergingSignalsForStatusCard(
  cardId: IntelligenceStatusCardId,
  contact: Record<string, unknown>,
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap,
): number {
  let count = 0;
  for (const sectionId of CARD_SECTIONS_FOR_STATUS_CARD[cardId]) {
    for (const dbKey of PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sectionId] ?? []) {
      const raw = contact[dbKey] as string | null | undefined;
      if (!fieldHasIntelligenceSignal(dbKey, raw)) continue;
      const trust = resolveIntelligenceOperationalTrust({
        dbKey,
        raw,
        meta: fieldMetadata?.[dbKey],
      });
      if (trust.tier === "emerging") count += 1;
    }
  }
  return count;
}

export function statusCardConfidenceFromSection(
  confidence: IntelligenceSectionConfidence,
): IntelligenceStatusCardConfidence {
  if (confidence === "unknown") return "low";
  if (confidence === "partial") return "partial";
  if (confidence === "confirmed") return "strong";
  return "validated";
}

function mergeSectionConfidence(
  sectionIds: ProviderIntelligenceSectionId[],
  contact: Record<string, unknown>,
): IntelligenceSectionConfidence {
  let weakest: IntelligenceSectionConfidence = "validated";
  for (const sectionId of sectionIds) {
    const { confidence } = deriveIntelligenceSectionConfidence(sectionId, contact);
    if (CONFIDENCE_RANK[confidence] < CONFIDENCE_RANK[weakest]) {
      weakest = confidence;
    }
  }
  return weakest;
}

function primarySectionForCard(cardId: IntelligenceStatusCardId): ProviderIntelligenceSectionId {
  return CARD_SECTIONS_FOR_STATUS_CARD[cardId][0]!;
}

/** Observation card: coordinator before ideal cases once allowance is known. */
const OBSERVATION_PATHWAY_GAP_ORDER = [
  "provider_observation_feasibility",
  "provider_observation_credentialing_needed",
  "provider_observation_coordinator_contact",
  "provider_observation_access_path",
  "provider_ideal_observation_cases",
  "provider_observation_cadence_preference",
  "provider_observation_best_days_case_types",
  "provider_first_observation_questions",
] as const;

function topGapForObservationPathway(
  contact: Record<string, unknown>,
  planning?: ProviderPlanningCompletion | null,
): IntelligenceLearningGap | null {
  const sectionId = "observation_readiness" as const;
  const sectionConfidence = planning?.sections.find((s) => s.id === sectionId)?.confidence;
  for (const dbKey of OBSERVATION_PATHWAY_GAP_ORDER) {
    if (fieldHasIntelligenceSignal(dbKey, contact[dbKey] as string | null | undefined)) {
      continue;
    }
    const gap = learningGapForField(dbKey, sectionId, contact, sectionConfidence);
    if (gap) return gap;
  }
  return null;
}

function topGapForCard(
  cardId: IntelligenceStatusCardId,
  contact: Record<string, unknown>,
  planning?: ProviderPlanningCompletion | null,
): IntelligenceLearningGap | null {
  if (cardId === "observation_pathway") {
    return topGapForObservationPathway(contact, planning);
  }
  const sectionIds = new Set(CARD_SECTIONS_FOR_STATUS_CARD[cardId]);
  const priority = buildIntelligenceCapturePriorities(contact, planning, 12).find((p) =>
    sectionIds.has(p.sectionId),
  );
  if (priority) {
    const gap = learningGapForField(
      priority.dbKey,
      priority.sectionId,
      contact,
      planning?.sections.find((s) => s.id === priority.sectionId)?.confidence,
    );
    if (gap && !fieldHasIntelligenceSignal(priority.dbKey, contact[priority.dbKey] as string | null | undefined)) {
      return gap;
    }
    return learningGapForField(
      priority.dbKey,
      priority.sectionId,
      contact,
      planning?.sections.find((s) => s.id === priority.sectionId)?.confidence,
    ) ?? (() => {
      const fieldGuidance = intelligenceGapFieldGuidance(priority.dbKey, priority.sectionId);
      return {
        dbKey: priority.dbKey,
        sectionId: priority.sectionId,
        phrase: priority.reason,
        fieldGuidance,
        bestLearnedFrom: fieldGuidance.bestSource,
        operationalConsequence: providerOperationalConsequenceForField(priority.dbKey),
        operationalImpact: providerOperationalConsequenceForField(priority.dbKey).summary,
        unlocksNext: intelligenceUnlocksNextLine(priority.dbKey),
        state: "unknown" as const,
        priorityScore: priority.priorityScore,
      };
    })();
  }
  const gaps = buildIntelligenceLearningGaps(contact, planning, 16);
  return gaps.find((g) => sectionIds.has(g.sectionId)) ?? null;
}

function chipsForCard(
  cardId: IntelligenceStatusCardId,
  contact: Record<string, unknown>,
  maxPerSection = 2,
): string[] {
  const chips: string[] = [];
  for (const sectionId of CARD_SECTIONS_FOR_STATUS_CARD[cardId]) {
    const sectionChips = buildIntelligenceSectionCaptureSummary(sectionId, contact, maxPerSection);
    for (const chip of sectionChips) {
      if (!chips.includes(chip)) chips.push(chip);
      if (chips.length >= 3) break;
    }
    if (chips.length >= 3) break;
  }
  return chips;
}

function shortenGapPhrase(_phrase: string, dbKey?: string): string {
  if (dbKey) {
    const chip = intelligenceGapChipLabel(dbKey, "unknown");
    return chip.charAt(0).toLowerCase() + chip.slice(1);
  }
  const line = _phrase.trim();
  return line.charAt(0).toLowerCase() + line.slice(1);
}

function formatCapturedSignals(chips: string[], cardId: IntelligenceStatusCardId): string {
  if (cardId === "observation_pathway") {
    return chips
      .map((chip) => {
        if (chip === "Cleared") return "credentialing cleared";
        return chip;
      })
      .join(" + ");
  }
  return chips.join(" + ");
}

function buildInterpretation(
  cardId: IntelligenceStatusCardId,
  contact: Record<string, unknown>,
  confidence: IntelligenceStatusCardConfidence,
  topGap: IntelligenceLearningGap | null,
): string {
  const chips = chipsForCard(cardId, contact);

  if (confidence === "low") {
    if (cardId === "observation_pathway") {
      return "Observation access path not established — confirm allowance and coordinator.";
    }
    if (cardId === "workflow_understanding") {
      return "Clinical workflow and OR context still thin — anchor on procedures and credentialing.";
    }
    if (cardId === "commercial_influence") {
      return "Trial willingness and who is already in the room are not clear yet.";
    }
    if (cardId === "relationship_confidence") {
      return buildProviderRelationshipOperationalMaturity(contact).headline;
    }
    return "Relationship not operationally mature yet — validate influence and engagement style.";
  }

  if (chips.length === 0) {
    return topGap
      ? `${shortenGapPhrase(topGap.phrase)}.`
      : "Early signals forming — strengthen anchors on your next touch.";
  }

  if (cardId === "relationship_confidence") {
    const maturity = buildProviderRelationshipOperationalMaturity(contact);
    if (maturity.documentedCount >= 2) {
      if (topGap && (confidence === "partial" || confidence === "strong")) {
        const gapShort = shortenGapPhrase(topGap.phrase, topGap.dbKey);
        return `${maturity.headline} Still to confirm: ${gapShort}.`;
      }
      return maturity.headline;
    }
  }

  const captured = formatCapturedSignals(chips.slice(0, 2), cardId);
  if (
    topGap &&
    (confidence === "partial" || confidence === "strong") &&
    captured.length > 0
  ) {
    const gapShort = shortenGapPhrase(topGap.phrase, topGap.dbKey);
    return `${captured}, but ${gapShort}.`;
  }

  if (confidence === "validated") {
    return chips.length >= 2 ? `${captured} — durable enough for the field.` : `${captured} — validated.`;
  }

  if (confidence === "strong") {
    return chips.length >= 2 ? `${captured} — enough to plan against.` : `${captured} — strong signal.`;
  }

  return chips.join(" · ");
}

function keyBlockerForStatusCard(
  cardId: IntelligenceStatusCardId,
  contact: Record<string, unknown>,
  confidence: IntelligenceStatusCardConfidence,
  topGap: IntelligenceLearningGap | null,
): string {
  if (topGap) {
    return scanLine(intelligenceGapChipLabel(topGap.dbKey, topGap.state), 72);
  }
  if (confidence === "validated") {
    return "No open operational risks";
  }
  return scanLine(
    formatStatusCardOperationalLabel(cardId, contact, confidence, topGap),
    72,
  );
}

function nextUnlockForStatusCard(
  confidence: IntelligenceStatusCardConfidence,
  topGap: IntelligenceLearningGap | null,
  targetDbKey: string | null,
): string {
  if (topGap) {
    return intelligenceUnlocksNextCapability(topGap.dbKey);
  }
  if (targetDbKey) {
    return intelligenceUnlocksNextCapability(targetDbKey);
  }
  if (confidence === "validated") {
    return "Field planning without capture friction in this lane";
  }
  return intelligenceUnlocksNextCapability("provider_procedure_focus");
}

export function buildIntelligenceStatusCard(
  cardId: IntelligenceStatusCardId,
  contact: Record<string, unknown>,
  planning?: ProviderPlanningCompletion | null,
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap,
): IntelligenceStatusCard {
  const sectionConfidence = mergeSectionConfidence(CARD_SECTIONS_FOR_STATUS_CARD[cardId], contact);
  const confidence = statusCardConfidenceFromSection(sectionConfidence);
  const topGap = topGapForCard(cardId, contact, planning);
  const interpretation = buildInterpretation(cardId, contact, confidence, topGap);
  const cta = intelligenceContextualStatusCardCta({ cardId, confidence, topGap });

  let topMissingSignal: string | null = null;
  if (topGap) {
    topMissingSignal = intelligenceGapChipLabel(topGap.dbKey, topGap.state);
  } else if (confidence === "low") {
    const firstKey = CARD_SECTIONS_FOR_STATUS_CARD[cardId]
      .flatMap((sid) => PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sid] ?? [])
      .find((key) => key);
    topMissingSignal = firstKey
      ? "No durable signals in this area yet"
      : "Optional context — add if helpful on your next touch";
  }

  return {
    id: cardId,
    title: INTELLIGENCE_STATUS_CARD_TITLES[cardId],
    confidence,
    confidenceLabel: formatStatusCardOperationalLabel(cardId, contact, confidence, topGap),
    scanSummary: buildStatusCardScanSummary(interpretation),
    interpretation,
    topMissingSignal,
    keyBlocker: keyBlockerForStatusCard(cardId, contact, confidence, topGap),
    nextUnlock: nextUnlockForStatusCard(confidence, topGap, cta.targetDbKey),
    blockerCount: countBlockersForStatusCard(cardId, contact, planning),
    validatedSignalCount: countValidatedSignalsForStatusCard(cardId, contact, fieldMetadata),
    emergingSignalCount: countEmergingSignalsForStatusCard(cardId, contact, fieldMetadata),
    ...cta,
  };
}

export function buildProviderIntelligenceStatusCards(
  contact: Record<string, unknown>,
  planning?: ProviderPlanningCompletion | null,
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap,
): IntelligenceStatusCard[] {
  return INTELLIGENCE_STATUS_CARD_ORDER.map((id) =>
    buildIntelligenceStatusCard(id, contact, planning, fieldMetadata),
  );
}
