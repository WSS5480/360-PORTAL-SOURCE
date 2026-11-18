/**
 * Field intelligence metric policy — hide abstract scores until completed evidence exists.
 * Prefer known / unknown / learned / next over CRM-style percentages and tiers.
 */

import { DISCOVERY_FIELD_STATUS } from "@/lib/surgical-sales/discoveryFieldStatus";
import {
  providerHasFieldIntelligenceEvidence,
  type ProviderFieldIntelligenceEvidenceInput,
} from "@/lib/surgical-sales/providerFieldIntelligenceEvidence";

const F = DISCOVERY_FIELD_STATUS;

export type EvidenceCaptureCounts = {
  /** Validated or not-needed on file. */
  confirmed: number;
  /** Captured but not yet validated. */
  learning: number;
  /** Unknown, blocked, or conditional — still open. */
  open: number;
  total: number;
};

export function resolveEvidenceCaptureCounts(
  signals: Array<{ statusLabel: string }>,
): EvidenceCaptureCounts {
  let confirmed = 0;
  let learning = 0;
  let open = 0;

  for (const { statusLabel } of signals) {
    const status = String(statusLabel ?? "").trim();
    if (status === F.validated || status === F.notApplicable) {
      confirmed += 1;
    } else if (status === F.captured || status === F.conditional) {
      learning += 1;
    } else {
      open += 1;
    }
  }

  return {
    confirmed,
    learning,
    open,
    total: signals.length,
  };
}

export function hasSufficientFieldEvidence(input: ProviderFieldIntelligenceEvidenceInput): boolean {
  return providerHasFieldIntelligenceEvidence(input);
}

/** Abstract percentages, tiers, and confidence scores require completed evidence. */
export function shouldShowAbstractMetrics(input: {
  hasFieldEvidence: boolean;
  confirmedCount: number;
}): boolean {
  return input.hasFieldEvidence && input.confirmedCount > 0;
}

/** Direct ratio from completed evidence items only — never weighted partial credit. */
export function evidenceDerivedProgressPercent(counts: EvidenceCaptureCounts): number | null {
  if (counts.total <= 0 || counts.confirmed <= 0) return null;
  return Math.round((counts.confirmed / counts.total) * 100);
}

export function formatEvidenceCaptureSummary(
  counts: EvidenceCaptureCounts,
  hasFieldEvidence: boolean,
): string | null {
  if (!hasFieldEvidence) return null;
  if (counts.total === 0) return null;

  if (counts.confirmed === 0 && counts.learning === 0) {
    return counts.open === 1 ? "1 open" : `${counts.open} open`;
  }

  const parts: string[] = [];
  if (counts.confirmed > 0) {
    parts.push(counts.confirmed === 1 ? "1 confirmed" : `${counts.confirmed} confirmed`);
  }
  if (counts.learning > 0) {
    parts.push(counts.learning === 1 ? "1 learning" : `${counts.learning} learning`);
  }
  if (counts.open > 0) {
    parts.push(counts.open === 1 ? "1 open" : `${counts.open} open`);
  }
  return parts.join(" · ");
}

export function formatRequirementProgress(
  met: number,
  total: number,
  hasFieldEvidence: boolean,
): string | null {
  if (!hasFieldEvidence || total <= 0) return null;
  return `${met} of ${total} confirmed`;
}

export function formatEvidenceDerivedPercentLabel(
  counts: EvidenceCaptureCounts,
  hasFieldEvidence: boolean,
): string | null {
  if (!shouldShowAbstractMetrics({ hasFieldEvidence, confirmedCount: counts.confirmed })) {
    return null;
  }
  const pct = evidenceDerivedProgressPercent(counts);
  if (pct == null) return null;
  return `${counts.confirmed} of ${counts.total} confirmed`;
}
