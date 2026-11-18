/**
 * Field-oriented intelligence card status — mobile scan labels, color tones, and rep-facing copy.
 */

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { IntelligenceSectionConfidence } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";

/** Rep-facing readiness tone (drives badge color on cards). */
export type IntelligenceCardReadinessTone =
  | "operationally_ready"
  | "confirmed"
  | "partial"
  | "unmapped"
  | "not_started";

export const INTELLIGENCE_CARD_READINESS_LABELS: Record<IntelligenceCardReadinessTone, string> = {
  operationally_ready: operationalVisibilityStateLabel("validated"),
  confirmed: operationalVisibilityStateLabel("strong"),
  partial: operationalVisibilityStateLabel("developing"),
  unmapped: operationalVisibilityStateLabel("developing"),
  not_started: operationalVisibilityStateLabel("early"),
};

/** Collapsed intelligence card section headers */
export const INTELLIGENCE_CARD_SECTION_LABELS = {
  whatWeKnow: "What we know",
  confirmed: "What we know",
  stillLearning: "Still learning",
  /** @deprecated Use `stillLearning` */
  whatsMissing: "Still learning",
  /** @deprecated Use `stillLearning` */
  openQuestions: "Still learning",
  nextAction: "Recommended field move",
} as const;

import {
  OPERATIONAL_INTEL_SECTION_EMPTY,
  OPERATIONAL_INTEL_SECTION_OPEN_CLEAR,
} from "@/lib/surgical-sales/providerIntelligenceOperationalCopy";
import {
  cardToneToVisibilityState,
  operationalVisibilityMetricsLine,
  operationalVisibilityStateLabel,
} from "@/lib/surgical-sales/operationalVisibilityVocabulary";

const INTELLIGENCE_SECTION_EMPTY_CONFIRMED: Record<ProviderIntelligenceSectionId, string> = {
  ...OPERATIONAL_INTEL_SECTION_EMPTY,
};

const INTELLIGENCE_SECTION_EMPTY_OPEN: Record<ProviderIntelligenceSectionId, string> = {
  clinical_workflow: OPERATIONAL_INTEL_SECTION_OPEN_CLEAR,
  or_environment: OPERATIONAL_INTEL_SECTION_OPEN_CLEAR,
  relationship_intelligence: OPERATIONAL_INTEL_SECTION_OPEN_CLEAR,
  commercial_signals: OPERATIONAL_INTEL_SECTION_OPEN_CLEAR,
  observation_readiness: OPERATIONAL_INTEL_SECTION_OPEN_CLEAR,
};

/** Empty-state line under Confirmed on a section card */
export function intelligenceSectionEmptyConfirmed(
  sectionId: ProviderIntelligenceSectionId,
): string {
  return (
    INTELLIGENCE_SECTION_EMPTY_CONFIRMED[sectionId] ??
    "Limited field context available in this lane."
  );
}

/** Empty-state line when the open-questions list is empty */
export function intelligenceSectionEmptyOpenQuestions(
  sectionId: ProviderIntelligenceSectionId,
): string {
  return INTELLIGENCE_SECTION_EMPTY_OPEN[sectionId] ?? "No open items";
}

export function resolveIntelligenceCardReadiness(input: {
  mapped: number;
  total: number;
  unresolvedCount: number;
  confidence?: IntelligenceSectionConfidence;
}): {
  tone: IntelligenceCardReadinessTone;
  label: string;
  metricsLine: string;
} {
  const { mapped, total, unresolvedCount, confidence } = input;
  const gapsRemaining = Math.max(0, total - mapped);
  const openQuestions = Math.max(unresolvedCount, gapsRemaining);

  let tone: IntelligenceCardReadinessTone;
  if (mapped === 0) {
    tone = "not_started";
  } else if (
    confidence === "validated" &&
    mapped >= total &&
    total > 0 &&
    openQuestions === 0
  ) {
    tone = "operationally_ready";
  } else if (
    confidence === "validated" ||
    (mapped >= total && total > 0 && openQuestions === 0)
  ) {
    tone = "confirmed";
  } else if (unresolvedCount > 0 && mapped < total) {
    tone = "unmapped";
  } else if (gapsRemaining > 0 && confidence === "unknown") {
    tone = "unmapped";
  } else if (mapped > 0 && (gapsRemaining > 0 || unresolvedCount > 0)) {
    tone = confidence === "partial" || confidence === "unknown" ? "unmapped" : "partial";
  } else {
    tone = "partial";
  }

  const openCount = tone !== "not_started" ? (unresolvedCount > 0 ? unresolvedCount : gapsRemaining) : 0;
  const metricsLine = operationalVisibilityMetricsLine({
    signalsOnFile: mapped,
    openQuestions: openCount,
    state: cardToneToVisibilityState(tone),
  });

  return {
    tone,
    label: INTELLIGENCE_CARD_READINESS_LABELS[tone],
    metricsLine,
  };
}

/** Map operational area status to card readiness tone for CSS. */
export function operationalStatusToCardTone(
  status: "confirmed" | "partial" | "high_risk" | "not_explored",
  options?: { operationallyReady?: boolean },
): IntelligenceCardReadinessTone {
  if (options?.operationallyReady && status === "confirmed") return "operationally_ready";
  if (status === "confirmed") return "confirmed";
  if (status === "partial") return "partial";
  if (status === "high_risk") return "unmapped";
  return "not_started";
}
