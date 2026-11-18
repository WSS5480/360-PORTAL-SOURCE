/**
 * Short capture summaries for collapsed intelligence cards (scannable UI).
 */

import {
  PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER,
  type ProviderIntelligenceSectionId,
} from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { buildIntelligenceLearningGaps } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import type { IntelligenceLearningGap } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  buildIntelligenceSectionSignalRows,
  type IntelligenceSectionSignalRow,
} from "@/lib/surgical-sales/providerIntelligenceSectionSignals";
import { formatIntelligenceCaptureSummaryChip } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { intelligenceSectionEmptyConfirmed } from "@/lib/surgical-sales/providerIntelligenceCardStatus";

export function buildIntelligenceSectionCaptureSummary(
  sectionId: ProviderIntelligenceSectionId,
  contact: Record<string, unknown>,
  maxItems = 4,
): string[] {
  const keys = PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sectionId] ?? [];
  const out: string[] = [];

  for (const key of keys) {
    if (out.length >= maxItems) break;
    const raw = contact[key] as string | null | undefined;
    if (!fieldHasIntelligenceSignal(key, raw)) continue;
    const chip = formatIntelligenceCaptureSummaryChip(key, raw);
    if (chip) out.push(chip);
  }

  return out;
}

export function formatIntelligenceSectionSummaryLine(
  sectionId: ProviderIntelligenceSectionId,
  contact: Record<string, unknown>,
): string {
  const chips = buildIntelligenceSectionCaptureSummary(sectionId, contact, 4);
  if (chips.length === 0) return intelligenceSectionEmptyConfirmed(sectionId);
  return chips.join(" · ");
}

export type IntelligenceSectionCardSummary = {
  signalLine: string;
  findings: IntelligenceSectionSignalRow[];
  missing: IntelligenceLearningGap[];
};

export function buildIntelligenceSectionCardSummary(
  sectionId: ProviderIntelligenceSectionId,
  contact: Record<string, unknown>,
  planning?: ProviderPlanningCompletion | null,
  options?: { maxSignalChips?: number; maxFindings?: number; maxMissing?: number },
): IntelligenceSectionCardSummary {
  const maxSignalChips = options?.maxSignalChips ?? 4;
  const maxFindings = options?.maxFindings ?? 3;
  const maxMissing = options?.maxMissing ?? 3;

  const chips = buildIntelligenceSectionCaptureSummary(sectionId, contact, maxSignalChips);
  const signalLine =
    chips.length > 0 ? chips.join(" · ") : intelligenceSectionEmptyConfirmed(sectionId);

  const findings = buildIntelligenceSectionSignalRows(sectionId, contact, maxFindings);

  const missing = buildIntelligenceLearningGaps(contact, planning, 12)
    .filter((g) => g.sectionId === sectionId)
    .slice(0, maxMissing);

  return {
    signalLine,
    findings,
    missing,
  };
}
