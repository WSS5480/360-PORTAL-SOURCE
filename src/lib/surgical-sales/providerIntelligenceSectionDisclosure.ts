/**
 * Progressive disclosure copy and builders — collapsed scan vs expanded detail.
 */

import type { ProviderPlanningSectionCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { PROVIDER_PLANNING_SECTION_STATUS_DISPLAY } from "@/lib/surgical-sales/providerIntelligenceDisplayLabels";
import {
  formatFieldCaptureHistoryLine,
  formatIntelligenceFieldAttributionDisplay,
  type IntelligenceFieldAttribution,
  type ProviderIntelligenceFieldMetadataMap,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { operationalIntelligenceChipLabel } from "@/lib/surgical-sales/providerIntelligenceBriefing";
import {
  assessIntelligenceFieldQuality,
  type IntelligenceFieldQualityAssessment,
} from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import {
  formatIntelligenceLifecycleLabel,
} from "@/lib/surgical-sales/providerIntelligenceLifecycle";
import {
  resolveIntelligenceFieldFreshness,
  type IntelligenceFieldFreshnessDisplay,
} from "@/lib/surgical-sales/providerIntelligenceFreshness";
import {
  resolveIntelligenceOperationalTrust,
  type IntelligenceOperationalTrust,
} from "@/lib/surgical-sales/providerIntelligenceOperationalTrust";
import {
  buildIntelligenceSectionSignalRows,
  type IntelligenceSectionSignalRow,
} from "@/lib/surgical-sales/providerIntelligenceSectionSignals";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { parseIntelligenceCaptureValue } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";

export const COLLAPSED_TOP_FINDINGS_MAX = 2;
export const COLLAPSED_KEY_GAPS_MAX = 2;
export const COLLAPSED_STALE_WARNINGS_MAX = 2;

export function formatPlanningSectionStatusDisplay(
  section: Pick<ProviderPlanningSectionCompletion, "status">,
): string {
  return PROVIDER_PLANNING_SECTION_STATUS_DISPLAY[section.status] ?? "In progress";
}

export function formatIntelligenceFieldValidationLabel(
  assessment: IntelligenceFieldQualityAssessment,
): string | null {
  switch (assessment.depth) {
    case "validated":
      return "Confirmed on file";
    case "structured":
      return "Captured — add detail";
    case "weak":
      return "Thin note — add detail";
    default:
      return null;
  }
}

export function truncateScanFinding(value: string, max = 56): string {
  const t = value.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export type IntelligenceSectionSignalDetail = IntelligenceSectionSignalRow & {
  /** Operational field label for scan/detail headers. */
  chipLabel: string;
  notes: string | null;
  validationLabel: string | null;
  operationalTrust: IntelligenceOperationalTrust;
  freshness: IntelligenceFieldFreshnessDisplay | null;
  attribution: ReturnType<typeof formatIntelligenceFieldAttributionDisplay>;
  historyLine: string | null;
};

export function buildIntelligenceSectionSignalDetails(
  sectionId: ProviderIntelligenceSectionId,
  contact: Record<string, unknown>,
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap,
  maxItems = 24,
): IntelligenceSectionSignalDetail[] {
  const rows = buildIntelligenceSectionSignalRows(sectionId, contact, maxItems);

  return rows.map((row) => {
    const raw = contact[row.dbKey] as string | null | undefined;
    const parsed = parseIntelligenceCaptureValue(row.dbKey, raw);
    const notes = String(parsed.notes ?? "").trim() || null;
    const assessment = assessIntelligenceFieldQuality(row.dbKey, raw);
    const meta = fieldMetadata?.[row.dbKey];
    const freshness = resolveIntelligenceFieldFreshness(row.dbKey, raw, meta);
    const operationalTrust = resolveIntelligenceOperationalTrust({
      dbKey: row.dbKey,
      raw,
      meta,
      assessment,
      lifecycle: freshness,
      freshnessTier: freshness?.freshnessTier ?? null,
    });

    return {
      ...row,
      chipLabel: operationalIntelligenceChipLabel(row.dbKey, row.label),
      notes,
      validationLabel: formatIntelligenceLifecycleLabel(freshness, assessment),
      operationalTrust,
      freshness,
      attribution: formatIntelligenceFieldAttributionDisplay(meta),
      historyLine: formatFieldCaptureHistoryLine(meta),
    };
  });
}
