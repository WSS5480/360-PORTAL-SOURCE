/**
 * Known vs unknown operational signals per intelligence area (provider overview scan).
 */

import {
  PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER,
  PROVIDER_INTELLIGENCE_SECTION_ORDER,
  type ProviderIntelligenceSectionId,
} from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { PROVIDER_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/providerIntelligenceFields";
import { learningGapForField } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import { intelligenceGapStateLabel } from "@/lib/surgical-sales/providerIntelligenceGapVocabulary";
import { assessIntelligenceFieldQuality } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import { formatIntelligenceCaptureSummaryChip } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import { isIntelligenceSectionVisibleForCommercialStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import type { ProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import {
  providerOperationalConsequenceForField,
  type IntelligenceGapOperationalConsequence,
} from "@/lib/surgical-sales/providerOperationalImpact";
import { intelligenceGapFieldGuidance } from "@/lib/surgical-sales/providerIntelligenceGapFieldGuidance";
import { intelligenceUnlocksNextLine } from "@/lib/surgical-sales/providerIntelligenceUnlocksNext";
import type { IntelligenceGapFieldGuidance } from "@/lib/surgical-sales/providerIntelligenceGapFieldGuidance";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";

import {
  PROVIDER_OVERVIEW_DISCOVERY_TITLE,
  PROVIDER_OVERVIEW_DISCOVERY_UNKNOWN_SHORT,
  PROVIDER_OVERVIEW_OPERATIONAL_AREA_LABELS,
} from "@/lib/surgical-sales/providerOverviewVocabulary";

export { PROVIDER_OVERVIEW_DISCOVERY_TITLE, PROVIDER_OVERVIEW_OPERATIONAL_AREA_LABELS };

const FIELD_LABEL_BY_KEY = new Map(PROVIDER_INTELLIGENCE_FIELD_DEFS.map((f) => [f.dbKey, f.label]));

export type ProviderDiscoveryKnownItem = {
  dbKey: string;
  label: string;
  sectionId: ProviderIntelligenceSectionId;
};

export type ProviderDiscoveryUnknownItem = {
  dbKey: string;
  label: string;
  sectionId: ProviderIntelligenceSectionId;
  operationalConsequence: IntelligenceGapOperationalConsequence;
  operationalImpact: string;
  unlocksNext: string;
  fieldGuidance: IntelligenceGapFieldGuidance;
};

export type ProviderOverviewOperationalAreaDiscovery = {
  areaId: ProviderIntelligenceSectionId;
  areaLabel: string;
  known: ProviderDiscoveryKnownItem[];
  unknown: ProviderDiscoveryUnknownItem[];
};

function formatKnownScanLabel(dbKey: string, chip: string): string {
  const normalized = chip.trim();
  if (dbKey === "provider_observation_feasibility") {
    if (/allowed|restricted|not/i.test(normalized)) return normalized;
    return `Observation ${normalized.toLowerCase()}`;
  }
  if (dbKey === "provider_procedure_focus" && !/procedure/i.test(normalized)) {
    return `${normalized} procedures targeted`;
  }
  if (dbKey === "provider_ideal_observation_cases" && !/observe|case/i.test(normalized)) {
    return `${normalized} cases to observe`;
  }
  return scanLine(normalized, 48);
}

function formatUnknownScanLabel(dbKey: string, gapState: "unknown" | "partial"): string {
  const short = PROVIDER_OVERVIEW_DISCOVERY_UNKNOWN_SHORT[dbKey];
  if (short) return short;
  const phrase = intelligenceGapStateLabel(dbKey, gapState);
  return phrase
    .replace(/ unknown$/i, "")
    .replace(/ not mapped$/i, "")
    .replace(/ unconfirmed$/i, "")
    .replace(/ unclear$/i, "")
    .trim();
}

function buildAreaDiscovery(
  sectionId: ProviderIntelligenceSectionId,
  contact: Record<string, unknown>,
  maxKnown: number,
  maxUnknown: number,
): ProviderOverviewOperationalAreaDiscovery {
  const keys = PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sectionId] ?? [];
  const known: ProviderDiscoveryKnownItem[] = [];
  const unknown: ProviderDiscoveryUnknownItem[] = [];

  for (const dbKey of keys) {
    const raw = contact[dbKey] as string | null | undefined;
    const assessment = assessIntelligenceFieldQuality(dbKey, raw);
    const gap = learningGapForField(dbKey, sectionId, contact);

    if (
      assessment.depth === "validated" ||
      assessment.depth === "structured" ||
      (assessment.hasSignal && assessment.depth === "weak" && !gap)
    ) {
      const chip = formatIntelligenceCaptureSummaryChip(dbKey, raw);
      if (chip && known.length < maxKnown) {
        known.push({
          dbKey,
          label: formatKnownScanLabel(dbKey, chip),
          sectionId,
        });
      }
      continue;
    }

    if (unknown.length >= maxUnknown) continue;

    if (gap) {
      const operationalConsequence = gap.operationalConsequence;
      unknown.push({
        dbKey,
        label: formatUnknownScanLabel(
          dbKey,
          gap.state === "partial" ? "partial" : "unknown",
        ),
        sectionId,
        operationalConsequence,
        operationalImpact: operationalConsequence.summary,
        unlocksNext: gap.unlocksNext,
        fieldGuidance: gap.fieldGuidance,
      });
    } else if (!assessment.hasSignal) {
      const operationalConsequence = providerOperationalConsequenceForField(dbKey);
      unknown.push({
        dbKey,
        label:
          PROVIDER_OVERVIEW_DISCOVERY_UNKNOWN_SHORT[dbKey] ??
          (FIELD_LABEL_BY_KEY.get(dbKey) ?? dbKey),
        sectionId,
        operationalConsequence,
        operationalImpact: operationalConsequence.summary,
        unlocksNext: intelligenceUnlocksNextLine(dbKey),
        fieldGuidance: intelligenceGapFieldGuidance(dbKey, sectionId),
      });
    }
  }

  return {
    areaId: sectionId,
    areaLabel: PROVIDER_OVERVIEW_OPERATIONAL_AREA_LABELS[sectionId],
    known,
    unknown,
  };
}

export function buildProviderOverviewDiscoveryAreas(input: {
  contact: Record<string, unknown>;
  commercialStage: ProviderCommercialWorkflowStage;
  maxKnownPerArea?: number;
  maxUnknownPerArea?: number;
}): ProviderOverviewOperationalAreaDiscovery[] {
  const maxKnown = input.maxKnownPerArea ?? 4;
  const maxUnknown = input.maxUnknownPerArea ?? 4;

  return PROVIDER_INTELLIGENCE_SECTION_ORDER.filter((sectionId) =>
    isIntelligenceSectionVisibleForCommercialStage(sectionId, input.commercialStage),
  )
    .map((sectionId) => buildAreaDiscovery(sectionId, input.contact, maxKnown, maxUnknown))
    .filter((area) => area.known.length > 0 || area.unknown.length > 0);
}

export function pickOperationalAreaDiscovery(
  areas: ProviderOverviewOperationalAreaDiscovery[],
  sectionId: ProviderIntelligenceSectionId,
): ProviderOverviewOperationalAreaDiscovery | null {
  return areas.find((a) => a.areaId === sectionId) ?? null;
}
