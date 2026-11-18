import { mergeVisualizationFindingLabels } from "@/lib/surgical-sales/observationIntelligence/normalizedObservationFindings";
import {
  isJunkFindingText,
  normalizeMessyExtractedLabel,
  sanitizeDisplayLabel,
} from "@/lib/surgical-sales/canonicalFindingNormalization";
import {
  buildCanonicalConceptKey,
  type ReconcilableSignalType,
} from "@/lib/surgical-sales/canonicalFindingIdentity";
import {
  enrichAggregatedFindingsWithMaturity,
  type FindingMaturityScore,
} from "@/lib/surgical-sales/evidenceMaturityScoring";
import { containsInterpretiveTitleLanguage, preferObservationTitle } from "@/lib/surgical-sales/findingTitleLanguage";

export type EvidenceConfidenceLevel = "Low" | "Medium" | "High";

export function normalizeFindingMatchKey(finding: string): string {
  return finding
    .trim()
    .toLowerCase()
    .replace(/^competitor\s+/i, "")
    .replace(/\s+(?:observed|present|identified|noted)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function evidenceConfidenceFromObservationCount(
  observationCount: number,
): EvidenceConfidenceLevel {
  if (observationCount >= 3) return "High";
  if (observationCount >= 2) return "Medium";
  return "Low";
}

export function formatEvidenceObservationLabel(observationCount: number): string {
  const count = Math.max(0, observationCount);
  if (count === 1) return "Observed in 1 completed case";
  return `Observed in ${count} completed cases`;
}

export function formatCapturedFromCurrentCaseNoteLabel(): string {
  return "Captured from current case note";
}

export function categoryMeetsValidationThreshold(
  findings: Array<{ observationCount: number }>,
): boolean {
  return findings.some((finding) => finding.observationCount >= 2);
}

export type AggregatedFindingEvidence = {
  label: string;
  matchKey: string;
  normalizedFindingId: string;
  observationCount: number;
  completedObservationCount: number;
  capturedFromCurrentNote: boolean;
  isPositiveStaffSignal: boolean;
  isEarlySignal: boolean;
  confidence: EvidenceConfidenceLevel;
  evidenceLabel: string;
  sourceCaseIds: string[];
  isInferred?: boolean;
} & Partial<FindingMaturityScore>;

const POSITIVE_STAFF_SIGNAL_IDS = new Set([
  "staff_efficiency_coordinated",
  "staff_efficiency_organized",
  "staff_efficiency_comfortable",
]);

const EARLY_SIGNAL_FINDING_IDS = new Set([
  "workflow_visualization_before_fixation",
  "visualization_challenge",
  "product_fit_visualization_fixation_workflow",
  "visualization_fixation_workflow_opportunity",
]);

function inferSignalTypeFromFindingId(normalizedFindingId: string): ReconcilableSignalType {
  if (normalizedFindingId.startsWith("product_in_use:")) return "observed_product";
  if (normalizedFindingId.startsWith("competitor_product:")) return "competitor_product";
  if (normalizedFindingId === "workflow_delay" || normalizedFindingId.startsWith("workflow_")) {
    return "workflow_bottleneck";
  }
  if (normalizedFindingId === "provider_frustration" || normalizedFindingId.includes("provider_pain")) {
    return "provider_pain_point";
  }
  if (normalizedFindingId === "staff_friction" || normalizedFindingId.includes("staff_pain")) {
    return "staff_pain_point";
  }
  if (
    normalizedFindingId.startsWith("staff_efficiency") ||
    normalizedFindingId.includes("staff_workflow")
  ) {
    return "staff_workflow_signal";
  }
  if (normalizedFindingId.includes("product_fit") || normalizedFindingId === "product_interest") {
    return "product_fit_opportunity";
  }
  return "workflow_signal";
}

function aggregationBucketKey(finding: {
  label: string;
  normalizedFindingId?: string;
}): string {
  const explicitId = finding.normalizedFindingId?.trim();
  const normalizedFindingId = explicitId || normalizeFindingMatchKey(finding.label);
  // When callers supply a stable id, bucket by canonical concept — not messy label text.
  return buildCanonicalConceptKey({
    type: inferSignalTypeFromFindingId(normalizedFindingId),
    label: explicitId ? "" : finding.label,
    normalizedFindingId,
  });
}

function normalizeAggregatedLabel(label: string): string {
  return normalizeMessyExtractedLabel(sanitizeDisplayLabel(label)) || sanitizeDisplayLabel(label) || label;
}

function pickPreferredFindingLabel(left: string, right: string): string {
  const cleanLeft = normalizeMessyExtractedLabel(sanitizeDisplayLabel(left)) || sanitizeDisplayLabel(left);
  const cleanRight = normalizeMessyExtractedLabel(sanitizeDisplayLabel(right)) || sanitizeDisplayLabel(right);
  if (containsInterpretiveTitleLanguage(cleanLeft) && !containsInterpretiveTitleLanguage(cleanRight)) {
    return cleanRight;
  }
  if (containsInterpretiveTitleLanguage(cleanRight) && !containsInterpretiveTitleLanguage(cleanLeft)) {
    return cleanLeft;
  }
  if (isJunkFindingText(cleanLeft)) return cleanRight;
  if (isJunkFindingText(cleanRight)) return cleanLeft;
  if (!cleanLeft) return cleanRight;
  if (!cleanRight) return cleanLeft;
  return preferObservationTitle(cleanLeft, cleanRight);
}

export function aggregateFindingEvidenceAcrossCases(
  sources: Array<{
    caseId: string;
    caseComplete?: boolean;
    isCurrentCase?: boolean;
    findings: Array<{ label: string; normalizedFindingId?: string; isInferred?: boolean }>;
  }>,
): AggregatedFindingEvidence[] {
  const buckets = new Map<
    string,
    {
      label: string;
      normalizedFindingId: string;
      caseIds: Set<string>;
      completedCaseIds: Set<string>;
      capturedFromCurrentNote: boolean;
      isInferred: boolean;
    }
  >();

  for (const source of sources) {
    const caseId = source.caseId.trim() || `case-${buckets.size}`;
    const caseComplete = source.caseComplete ?? false;

    for (const finding of source.findings) {
      const label = finding.label.trim();
      if (!label) continue;
      const normalizedFindingId = finding.normalizedFindingId?.trim() || normalizeFindingMatchKey(label);
      if (!normalizedFindingId) continue;
      const bucketKey = aggregationBucketKey({ label, normalizedFindingId });

      const existing = buckets.get(bucketKey);
      if (existing) {
        existing.label =
          normalizedFindingId === "workflow_visualization_before_fixation" ||
          normalizedFindingId === "visualization_challenge"
            ? mergeVisualizationFindingLabels(existing.label, label)
            : pickPreferredFindingLabel(existing.label, label);
        existing.caseIds.add(caseId);
        if (caseComplete) existing.completedCaseIds.add(caseId);
        if (source.isCurrentCase && !caseComplete) existing.capturedFromCurrentNote = true;
        if (finding.isInferred) existing.isInferred = true;
        continue;
      }

      buckets.set(bucketKey, {
        label: normalizeAggregatedLabel(label),
        normalizedFindingId,
        caseIds: new Set<string>([caseId]),
        completedCaseIds: caseComplete ? new Set<string>([caseId]) : new Set<string>(),
        capturedFromCurrentNote: Boolean(source.isCurrentCase && !caseComplete),
        isInferred: Boolean(finding.isInferred),
      });
    }
  }

  return enrichAggregatedFindingsWithMaturity(
    [...buckets.values()].map((bucket) => {
      const observationCount = bucket.caseIds.size;
      const completedObservationCount = bucket.completedCaseIds.size;
      const capturedFromCurrentNote =
        bucket.capturedFromCurrentNote && completedObservationCount === 0;
      const isPositiveStaffSignal =
        POSITIVE_STAFF_SIGNAL_IDS.has(bucket.normalizedFindingId) ||
        bucket.normalizedFindingId.startsWith("staff_efficiency:");
      const isEarlySignal =
        EARLY_SIGNAL_FINDING_IDS.has(bucket.normalizedFindingId) ||
        bucket.normalizedFindingId === "visualization_fixation_workflow_opportunity";

      return {
        label: bucket.label,
        matchKey: bucket.normalizedFindingId,
        normalizedFindingId: bucket.normalizedFindingId,
        observationCount,
        completedObservationCount,
        capturedFromCurrentNote,
        isPositiveStaffSignal,
        isEarlySignal,
        confidence: "Low" as EvidenceConfidenceLevel,
        evidenceLabel: capturedFromCurrentNote
          ? formatCapturedFromCurrentCaseNoteLabel()
          : formatEvidenceObservationLabel(completedObservationCount),
        sourceCaseIds: [...bucket.caseIds],
        isInferred: bucket.isInferred,
      };
    }),
  ).sort((left, right) => {
      const confidenceRank = { High: 3, Medium: 2, Low: 1 };
      const rankDiff = confidenceRank[right.confidence] - confidenceRank[left.confidence];
      if (rankDiff !== 0) return rankDiff;
      return right.observationCount - left.observationCount;
    });
}
