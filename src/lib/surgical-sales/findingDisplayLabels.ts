/**
 * Global finding display label cleanup — used across Case Intelligence sections.
 */

import type { AggregatedFindingEvidence } from "@/lib/surgical-sales/observationFindingEvidenceConfidence";
import {
  buildFindingDisplayModel,
  buildObservationOnlyFindingTitle,
  isEligibleMainFindingTitle,
  type FindingDisplayModel,
} from "@/lib/surgical-sales/findingDisplayContract";
import { normalizeConceptText } from "@/lib/surgical-sales/canonicalFindingIdentity";
import { findingToIntelligenceSignal } from "@/lib/surgical-sales/caseIntelligenceSignals";

function titleCasePhrase(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function cleanProductDisplayName(raw: string): string {
  const normalized = normalizeConceptText(
    raw
      .replace(/\s+usage use$/i, "")
      .replace(/\s+usage in use$/i, "")
      .replace(/\s+use in use$/i, "")
      .replace(/\s+used again$/i, "")
      .replace(/\s+observed$/i, "")
      .replace(/\s+in use$/i, "")
      .replace(/\s+usage$/i, "")
      .trim(),
  );
  if (!normalized) return raw.trim();
  return titleCasePhrase(normalized);
}

/** Strip display suffixes from product finding labels for rollup copy. */
export function normalizeProductNameFromFindingLabel(label: string): string {
  return cleanProductDisplayName(label);
}

export function buildFindingDisplayForAggregatedEvidence(
  finding: AggregatedFindingEvidence,
  context: {
    procedureContext?: string | null;
    currentCaseComplete?: boolean;
    providerContextCopy?: string | null;
    findingContext?: string | null;
    coOccurringFindingIds?: string[];
    findingMeta?: string | null;
  } = {},
): FindingDisplayModel {
  const signal = findingToIntelligenceSignal(finding, {
    procedureContext: context.procedureContext ?? null,
  });
  return buildFindingDisplayModel(finding, {
    signal,
    procedureContext: context.procedureContext,
    currentCaseComplete: context.currentCaseComplete,
    providerContextCopy: context.providerContextCopy ?? null,
    findingContext: context.findingContext ?? null,
    findingMeta: context.findingMeta ?? null,
  });
}

export function cleanFindingDisplayLabel(
  finding: AggregatedFindingEvidence,
  context: { procedureContext?: string | null; coOccurringFindingIds?: string[] } = {},
): string {
  return buildFindingDisplayForAggregatedEvidence(finding, context).findingTitle;
}

export function cleanCapturedFindingLabel(
  finding: AggregatedFindingEvidence,
  procedureContext: string | null = null,
): string {
  if (!isEligibleMainFindingTitle(finding)) {
    return "";
  }
  const signal = findingToIntelligenceSignal(finding, { procedureContext });
  return buildObservationOnlyFindingTitle(finding, signal);
}

export function cleanEvidenceGapProductLabel(raw: string): string {
  return cleanProductDisplayName(raw);
}

export function cleanProductConsistencyGapLabel(productLabel: string): string {
  const product = cleanProductDisplayName(productLabel);
  return `Confirm whether ${product} use is consistent`;
}

export function cleanProductFitGapLabel(conceptLabel: string): string {
  const concept = cleanProductDisplayName(conceptLabel);
  return `More evidence needed for ${concept}`;
}

export function cleanWorkflowRepeatGapLabel(workflowLabel: string): string {
  const concept = normalizeConceptText(workflowLabel);
  const display = concept ? titleCasePhrase(concept) : workflowLabel.trim();
  return `Repeat evidence needed for ${display}`;
}

export type { FindingDisplayModel };
