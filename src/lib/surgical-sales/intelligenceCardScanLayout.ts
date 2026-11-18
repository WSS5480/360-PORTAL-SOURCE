/**
 * Scan-first intelligence card layout — collapsed summary + drawer sections.
 */

import { isCaseIntelligenceDbKey } from "@/lib/surgical-sales/caseIntelligenceFields";
import { formatOpenItemsCount } from "@/lib/surgical-sales/discoveryOpenItemsVocabulary";
import type { IntelligenceCardReadinessTone } from "@/lib/surgical-sales/providerIntelligenceCardStatus";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import {
  accountUnderstandingSourceAttribution,
} from "@/lib/surgical-sales/accountUnderstandingOperationalCard";
import {
  formatIntelligenceFieldAttributionDisplay,
  type ProviderIntelligenceFieldMetadataMap,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { sanitizeUnansweredIntelligenceCopy } from "@/lib/surgical-sales/aiSynthesisGuardrails";
import { PROVIDER_FIELD_OPS_SECTION } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";
import { operationalIntelligenceChipLabel } from "@/lib/surgical-sales/providerIntelligenceBriefing";
import type { IntelligenceSectionConfidence } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import {
  isIncompleteSentenceFragment,
  isLowQualityIntelligenceText,
} from "@/lib/surgical-sales/operationalIntelligenceDisplay";

export type IntelligenceCardScopeBadge = "facility" | "provider" | "case";

export const INTELLIGENCE_CARD_SCOPE_BADGE_LABELS: Record<IntelligenceCardScopeBadge, string> = {
  facility: "Facility",
  provider: "Provider",
  case: "Case",
};

export const INTELLIGENCE_CARD_DRAWER_LABELS = {
  whatWeKnow: "What we know",
  stillLearning: "Still learning",
  sourceTouch: "Source / last touch",
  recommendedNext: PROVIDER_FIELD_OPS_SECTION.recommendedFieldMove,
} as const;

const CRM_NARRATIVE_PATTERN =
  /\b(provider stated|they said|on the call|during the visit|mentioned that|told us)\b/i;

const PLACEHOLDER_PATTERN =
  /still learning|nothing confirmed|no open questions|not confirmed yet|no major operational|synthesized from|not much here/i;

export function isOperationalScanPlaceholder(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  return PLACEHOLDER_PATTERN.test(t);
}

/** Single-line operational summary — no ellipsis truncation, raw fragments, or incomplete sentences. */
export function operationalCardScanSummaryLine(line: string): string {
  let t = line.trim().replace(CRM_NARRATIVE_PATTERN, "").replace(/\s+/g, " ").trim();
  t = sanitizeUnansweredIntelligenceCopy(t);
  if (!t || isOperationalScanPlaceholder(t)) return "";
  if (isLowQualityIntelligenceText(t)) return "";
  if (isIncompleteSentenceFragment(t)) return "";
  if (t.endsWith("…") || t.includes("…")) return "";
  return t;
}

export function resolveIntelligenceCardScopeBadge(input: {
  scope?: "organization" | "provider";
  dbKey: string;
  sectionId?: ProviderIntelligenceSectionId;
}): IntelligenceCardScopeBadge {
  if (input.scope === "organization") return "facility";
  if (isCaseIntelligenceDbKey(input.dbKey)) return "case";
  return "provider";
}

export function intelligenceCardOpenItemsLabel(count: number): string {
  if (count <= 0) return "No open items";
  return formatOpenItemsCount(count);
}

export function intelligenceCardScanActionLabel(input: {
  mapped?: number;
  unresolvedCount: number;
  tone?: IntelligenceCardReadinessTone;
  confidence?: IntelligenceSectionConfidence;
}): string {
  if ((input.mapped ?? 0) === 0 || input.tone === "not_started" || input.confidence === "unknown") {
    return "Map";
  }
  return "Refine";
}

export function buildIntelligenceCardSourceTouchLines(input: {
  fieldKeys: readonly string[];
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;
  limit?: number;
}): string[] {
  const limit = input.limit ?? 4;
  const lines: string[] = [];
  for (const dbKey of input.fieldKeys) {
    const attr = accountUnderstandingSourceAttribution(dbKey, input.fieldMetadata);
    if (attr) {
      lines.push(attr);
      if (lines.length >= limit) return lines;
      continue;
    }
    const display = formatIntelligenceFieldAttributionDisplay(input.fieldMetadata?.[dbKey]);
    const touch = display.briefLine ?? display.sourceLine ?? display.validatedLine;
    if (!touch) continue;
    const label = operationalIntelligenceChipLabel(dbKey, dbKey);
    lines.push(`${label}: ${touch}`);
    if (lines.length >= limit) break;
  }
  return lines;
}
