/**
 * Generic evidence maturity and confidence scoring for Case Intelligence.
 * Product-, procedure-, and provider-agnostic.
 */

import type { EvidenceConfidenceLevel } from "@/lib/surgical-sales/observationFindingEvidenceConfidence";
import type { ReconciliationStatus } from "@/lib/surgical-sales/caseIntelligenceReconciliation";
import { formatFindingMaturityDisplay } from "@/lib/surgical-sales/canonicalFindingNormalization";

export type EvidenceMaturityStatus =
  | "captured_signal"
  | "observed_once"
  | "repeated_signal"
  | "supported_pattern"
  | "validated_pattern"
  | "debrief_ready"
  | "conflicting_evidence"
  | "missing";

export type FindingEvidenceKind =
  | "product_used"
  | "competitor_product"
  | "workflow_bottleneck"
  | "workflow_signal"
  | "provider_pain_point"
  | "staff_pain_point"
  | "staff_workflow_signal"
  | "product_fit_opportunity"
  | "support_issue"
  | "training_need"
  | "unknown";

export type ConfidenceDisplayLabel = "Low confidence" | "Moderate confidence" | "High confidence";

export type MaturityDisplayLabel =
  | "Captured signal"
  | "Observed once"
  | "Repeated signal"
  | "Supported pattern"
  | "Validated pattern"
  | "Debrief-ready"
  | "Conflicting evidence"
  | "Missing";

export type FindingMaturityInput = {
  label: string;
  normalizedFindingId: string;
  observationCount: number;
  completedObservationCount: number;
  capturedFromCurrentNote: boolean;
  isPositiveStaffSignal: boolean;
  isEarlySignal: boolean;
  isInferred?: boolean;
  isOrganizationSuggested?: boolean;
  hasDirectQuote?: boolean;
  hasWorkflowImpact?: boolean;
  hasUnderlyingWorkflowEvidence?: boolean;
  hasProductConflict?: boolean;
  reconciliationStatus?: ReconciliationStatus;
  findingKind?: FindingEvidenceKind;
};

export type FindingMaturityScore = {
  maturityStatus: EvidenceMaturityStatus;
  extractionConfidenceScore: number;
  evidenceConfidenceScore: number;
  extractionConfidenceLabel: ConfidenceDisplayLabel;
  evidenceConfidenceLabel: ConfidenceDisplayLabel;
  maturityDisplayLabel: MaturityDisplayLabel;
  evidenceLabel: string;
  confidence: EvidenceConfidenceLevel;
  isDebriefReadyFinding: boolean;
  hasConflictingEvidence: boolean;
};

const MATURITY_EVIDENCE_RANGE: Record<EvidenceMaturityStatus, [number, number]> = {
  missing: [0, 0],
  captured_signal: [0.2, 0.35],
  observed_once: [0.35, 0.5],
  repeated_signal: [0.5, 0.65],
  supported_pattern: [0.65, 0.8],
  validated_pattern: [0.8, 0.9],
  debrief_ready: [0.85, 0.95],
  conflicting_evidence: [0.25, 0.45],
};

const COMMERCIAL_FINDING_KINDS = new Set<FindingEvidenceKind>([
  "provider_pain_point",
  "staff_pain_point",
  "workflow_bottleneck",
  "workflow_signal",
  "product_fit_opportunity",
  "competitor_product",
  "support_issue",
  "training_need",
  "product_used",
]);

const PROVIDER_PAIN_IDS = new Set(["provider_frustration", "training_gap"]);
const STAFF_PAIN_IDS = new Set(["staff_friction", "staff_supply_setup_delay"]);
const PRODUCT_FIT_IDS = new Set(["product_interest", "product_fit_visualization_fixation_workflow"]);

function clampScore(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function scoreInRange(range: [number, number], ratio: number): number {
  const [min, max] = range;
  return clampScore(min + (max - min) * clampScore(ratio));
}

function confidenceLabelFromScore(score: number): ConfidenceDisplayLabel {
  if (score >= 0.76) return "High confidence";
  if (score > 0.52) return "Moderate confidence";
  return "Low confidence";
}

function legacyConfidenceFromScore(score: number): EvidenceConfidenceLevel {
  if (score >= 0.75) return "High";
  if (score >= 0.5) return "Medium";
  return "Low";
}

export function inferFindingEvidenceKind(input: {
  normalizedFindingId: string;
  label: string;
  isPositiveStaffSignal: boolean;
}): FindingEvidenceKind {
  const id = input.normalizedFindingId;
  if (input.isPositiveStaffSignal || id.startsWith("staff_efficiency")) {
    return "staff_workflow_signal";
  }
  if (id.startsWith("product_in_use:")) return "product_used";
  if (id.startsWith("competitor_product:") || /competitor/i.test(input.label)) {
    return "competitor_product";
  }
  if (PROVIDER_PAIN_IDS.has(id) || /provider.*frustrat|provider pain/i.test(input.label)) {
    return "provider_pain_point";
  }
  if (STAFF_PAIN_IDS.has(id) || (/staff/i.test(input.label) && /pain|friction|burden|complaint/i.test(input.label))) {
    return "staff_pain_point";
  }
  if (PRODUCT_FIT_IDS.has(id) || id.includes("product_fit") || /product[-\s]?fit|opportunity/i.test(input.label)) {
    return "product_fit_opportunity";
  }
  if (/support issue|escalat|deployment concern|handling concern/i.test(input.label)) {
    return "support_issue";
  }
  if (id === "training_gap" || /training need|retraining/i.test(input.label)) {
    return "training_need";
  }
  if (
    id === "workflow_delay" ||
    id.startsWith("workflow_") ||
    /bottleneck|delay|slowed|friction|workaround/i.test(input.label)
  ) {
    return "workflow_bottleneck";
  }
  if (/workflow/i.test(input.label)) return "workflow_signal";
  return "unknown";
}

function isHedgedLabel(label: string): boolean {
  return /\b(not sure|unsure|maybe|possible|unclear|may be|might|appears? to|seemed like)\b/i.test(label);
}

function isInferredFinding(input: FindingMaturityInput): boolean {
  if (input.isInferred) return true;
  if (input.isEarlySignal && input.isOrganizationSuggested) return true;
  return /inferred|hypothesis|may be an opportunity|potential opportunity/i.test(input.label);
}

export function scoreExtractionConfidence(input: FindingMaturityInput): number {
  let score = 0.68;
  const id = input.normalizedFindingId;

  if (id.startsWith("product_in_use:") || id.startsWith("competitor_product:")) score = 0.88;
  else if (PROVIDER_PAIN_IDS.has(id) || STAFF_PAIN_IDS.has(id)) score = 0.82;
  else if (id.startsWith("staff_efficiency:")) score = 0.8;
  else if (id === "workflow_delay" || id.startsWith("workflow_")) score = 0.78;

  if (input.hasDirectQuote) score += 0.08;
  if (isHedgedLabel(input.label)) score -= 0.18;
  if (isInferredFinding(input)) score -= 0.15;
  if (input.isOrganizationSuggested) score -= 0.2;

  return clampScore(score);
}

function canReachValidatedPattern(kind: FindingEvidenceKind, input: FindingMaturityInput): boolean {
  if (kind === "staff_workflow_signal") return false;
  if (kind === "product_fit_opportunity") {
    return Boolean(input.hasUnderlyingWorkflowEvidence) && input.completedObservationCount >= 3;
  }
  if (kind === "provider_pain_point") {
    return PROVIDER_PAIN_IDS.has(input.normalizedFindingId) || Boolean(input.hasDirectQuote);
  }
  if (kind === "staff_pain_point") {
    return STAFF_PAIN_IDS.has(input.normalizedFindingId) && !input.isPositiveStaffSignal;
  }
  if (kind === "workflow_bottleneck" || kind === "workflow_signal") {
    return Boolean(input.hasWorkflowImpact) || input.completedObservationCount >= 3;
  }
  return input.completedObservationCount >= 3;
}

function capMaturityForKind(
  status: EvidenceMaturityStatus,
  kind: FindingEvidenceKind,
  input: FindingMaturityInput,
): EvidenceMaturityStatus {
  if (kind === "product_fit_opportunity" && !input.hasUnderlyingWorkflowEvidence) {
    if (status === "validated_pattern" || status === "debrief_ready") return "repeated_signal";
    if (status === "supported_pattern" && input.completedObservationCount < 3) return "repeated_signal";
  }
  if (kind === "staff_workflow_signal" && status === "validated_pattern") {
    return "supported_pattern";
  }
  if (kind === "provider_pain_point" && input.normalizedFindingId === "workflow_delay") {
    return "observed_once";
  }
  return status;
}

export function resolveEvidenceMaturityStatus(input: FindingMaturityInput): EvidenceMaturityStatus {
  const kind = input.findingKind ?? inferFindingEvidenceKind(input);

  if (input.reconciliationStatus === "conflicting" || input.hasProductConflict) {
    return "conflicting_evidence";
  }
  if (input.observationCount <= 0) return "missing";

  const completed = input.completedObservationCount;
  const distinctCases = input.observationCount;
  const inProgressContribution = input.capturedFromCurrentNote && completed === 0;

  if (completed === 0 && (inProgressContribution || distinctCases >= 1)) {
    return "captured_signal";
  }

  let status: EvidenceMaturityStatus = "observed_once";

  if (completed >= 3 && canReachValidatedPattern(kind, input)) {
    status = "validated_pattern";
  } else if (completed >= 2) {
    status = "supported_pattern";
  } else if (distinctCases >= 2 || (completed >= 1 && input.capturedFromCurrentNote)) {
    status = "repeated_signal";
  } else if (completed === 1) {
    status = "observed_once";
  }

  status = capMaturityForKind(status, kind, input);

  const commerciallyMeaningful = COMMERCIAL_FINDING_KINDS.has(kind) && kind !== "staff_workflow_signal";
  if (
    commerciallyMeaningful &&
    (status === "validated_pattern" ||
      (status === "supported_pattern" &&
        (kind === "provider_pain_point" ||
          kind === "staff_pain_point" ||
          kind === "workflow_bottleneck" ||
          kind === "support_issue")))
  ) {
    return "debrief_ready";
  }

  return status;
}

export function scoreEvidenceConfidence(
  maturityStatus: EvidenceMaturityStatus,
  input: FindingMaturityInput,
): number {
  const range = MATURITY_EVIDENCE_RANGE[maturityStatus];
  const completedRatio =
    input.completedObservationCount > 0
      ? input.completedObservationCount / Math.max(input.observationCount, input.completedObservationCount)
      : 0;
  let score = scoreInRange(range, completedRatio || 0.35);

  if (input.completedObservationCount >= 2) score += 0.04;
  if (input.observationCount >= 3 && input.completedObservationCount >= 2) score += 0.03;
  if (input.hasDirectQuote) score += 0.04;
  if (input.hasWorkflowImpact) score += 0.03;
  if (input.capturedFromCurrentNote && input.completedObservationCount === 0) score -= 0.08;
  if (input.isOrganizationSuggested) score -= 0.15;
  if (isInferredFinding(input)) score -= 0.1;
  if (isHedgedLabel(input.label)) score -= 0.08;
  if (input.isEarlySignal && !input.hasUnderlyingWorkflowEvidence) score -= 0.05;
  if (maturityStatus === "conflicting_evidence") score = Math.min(score, 0.45);

  return clampScore(score);
}

export function formatMaturityDisplayLabel(status: EvidenceMaturityStatus): MaturityDisplayLabel {
  switch (status) {
    case "captured_signal":
      return "Captured signal";
    case "observed_once":
      return "Observed once";
    case "repeated_signal":
      return "Repeated signal";
    case "supported_pattern":
      return "Supported pattern";
    case "validated_pattern":
      return "Validated pattern";
    case "debrief_ready":
      return "Debrief-ready";
    case "conflicting_evidence":
      return "Conflicting evidence";
    default:
      return "Missing";
  }
}

export function formatFindingEvidenceLabel(
  status: EvidenceMaturityStatus,
  input: FindingMaturityInput,
): string {
  const currentCaseComplete =
    input.completedObservationCount >= 1 &&
    (!input.capturedFromCurrentNote || input.completedObservationCount >= input.observationCount);

  return formatFindingMaturityDisplay({
    observationCount: input.observationCount,
    completedObservationCount: input.completedObservationCount,
    capturedFromCurrentNote: input.capturedFromCurrentNote,
    currentCaseComplete,
    hasPriorMatch: input.observationCount > 1 || input.completedObservationCount >= 1,
  });
}

export function scoreFindingMaturity(input: FindingMaturityInput): FindingMaturityScore {
  const findingKind = input.findingKind ?? inferFindingEvidenceKind(input);
  const maturityStatus = resolveEvidenceMaturityStatus({ ...input, findingKind });
  const extractionConfidenceScore = scoreExtractionConfidence(input);
  const evidenceConfidenceScore = scoreEvidenceConfidence(maturityStatus, input);

  return {
    maturityStatus,
    extractionConfidenceScore,
    evidenceConfidenceScore,
    extractionConfidenceLabel: confidenceLabelFromScore(extractionConfidenceScore),
    evidenceConfidenceLabel: confidenceLabelFromScore(evidenceConfidenceScore),
    maturityDisplayLabel: formatMaturityDisplayLabel(maturityStatus),
    evidenceLabel: formatFindingEvidenceLabel(maturityStatus, input),
    confidence: legacyConfidenceFromScore(evidenceConfidenceScore),
    isDebriefReadyFinding: maturityStatus === "debrief_ready",
    hasConflictingEvidence: maturityStatus === "conflicting_evidence",
  };
}

export function detectProductPatternConflict(
  findings: Array<{ normalizedFindingId: string; completedObservationCount: number }>,
): boolean {
  const products = new Set<string>();
  for (const finding of findings) {
    if (!finding.normalizedFindingId.startsWith("product_in_use:")) continue;
    if (finding.completedObservationCount < 1) continue;
    products.add(finding.normalizedFindingId);
  }
  return products.size >= 2;
}

export function hasUnderlyingWorkflowEvidenceForProductFit(input: {
  productFitFinding: { sourceCaseIds: string[] };
  workflowFindings: Array<{ sourceCaseIds: string[]; completedObservationCount: number }>;
}): boolean {
  const caseIds = new Set(input.productFitFinding.sourceCaseIds);
  return input.workflowFindings.some(
    (finding) =>
      finding.completedObservationCount >= 1 &&
      finding.sourceCaseIds.some((caseId) => caseIds.has(caseId)),
  );
}

export type PillarMaturityInput = {
  pillarId: string;
  findings: FindingMaturityScore[];
  completedCasesWithSignal: number;
  incompleteCasesWithSignal: number;
  hasMissingRequiredKind: boolean;
};

export function resolvePillarMaturityStatus(input: PillarMaturityInput): EvidenceMaturityStatus {
  const active = input.findings.filter((finding) => finding.maturityStatus !== "missing");
  if (active.length === 0) return "missing";

  const best = active.reduce((top, finding) => {
    const rank: Record<EvidenceMaturityStatus, number> = {
      missing: 0,
      captured_signal: 1,
      conflicting_evidence: 2,
      observed_once: 3,
      repeated_signal: 4,
      supported_pattern: 5,
      validated_pattern: 6,
      debrief_ready: 7,
    };
    return rank[finding.maturityStatus] > rank[top.maturityStatus] ? finding : top;
  }, active[0]!);

  if (best.maturityStatus === "validated_pattern" || best.maturityStatus === "debrief_ready") {
    return best.maturityStatus;
  }
  if (input.completedCasesWithSignal >= 2) return "supported_pattern";
  if (input.completedCasesWithSignal === 1) return "observed_once";
  if (input.incompleteCasesWithSignal > 0) return "captured_signal";
  return best.maturityStatus;
}

export function pillarMeetsValidatedThreshold(status: EvidenceMaturityStatus): boolean {
  return status === "validated_pattern" || status === "debrief_ready";
}

export function formatEvidenceProgressLeadFromMaturity(input: {
  pillars: Array<{ status: EvidenceMaturityStatus }>;
  total: number;
}): string {
  const active = input.pillars.filter((pillar) => pillar.status !== "missing");
  const validated = input.pillars.filter((pillar) => pillarMeetsValidatedThreshold(pillar.status)).length;
  const repeated = input.pillars.filter(
    (pillar) => pillar.status === "repeated_signal" || pillar.status === "supported_pattern",
  ).length;
  const observed = input.pillars.filter(
    (pillar) => pillar.status === "observed_once" || pillar.status === "captured_signal",
  ).length;

  if (validated > 0) {
    return `${validated} of ${input.total} evidence areas validated`;
  }
  if (repeated > 0) {
    return `${active.length} of ${input.total} evidence areas have repeated signals`;
  }
  if (observed > 0 && active.some((pillar) => pillar.status === "observed_once")) {
    return `${active.length} of ${input.total} evidence areas observed`;
  }
  if (active.length > 0) {
    return `${active.length} of ${input.total} evidence areas have captured signals`;
  }
  return `0 of ${input.total} evidence areas have captured signals`;
}

export type DebriefEvidenceReadiness = "not_ready" | "building" | "nearly_ready" | "ready";

export function resolveDebriefEvidenceReadiness(input: {
  completedObservations: number;
  requiredObservations: number;
  findings: FindingMaturityScore[];
  hasProviderPainEvidence: boolean;
  hasStaffPainEvidence: boolean;
  hasWorkflowOrProductEvidence: boolean;
  onlyCapturedSignals: boolean;
}): DebriefEvidenceReadiness {
  if (input.completedObservations >= input.requiredObservations) {
    const debriefReadyFinding = input.findings.some((finding) => finding.isDebriefReadyFinding);
    if (debriefReadyFinding && input.hasWorkflowOrProductEvidence) return "ready";
    if (input.hasWorkflowOrProductEvidence && input.hasProviderPainEvidence) return "ready";
    return "nearly_ready";
  }

  if (input.onlyCapturedSignals) return "not_ready";

  const hasRepeatedCommercial = input.findings.some(
    (finding) =>
      finding.maturityStatus === "repeated_signal" ||
      finding.maturityStatus === "supported_pattern" ||
      finding.maturityStatus === "validated_pattern" ||
      finding.maturityStatus === "debrief_ready",
  );

  if (hasRepeatedCommercial && (!input.hasProviderPainEvidence || !input.hasStaffPainEvidence)) {
    return "nearly_ready";
  }

  if (input.completedObservations > 0 || hasRepeatedCommercial) return "building";
  return "not_ready";
}

export function formatSignalMaturitySummary(score: FindingMaturityScore): string {
  if (score.maturityStatus === "debrief_ready") {
    return `${score.maturityDisplayLabel} · ${score.evidenceConfidenceLabel}`;
  }
  if (score.maturityStatus === "validated_pattern") {
    return `${score.maturityDisplayLabel} · ${score.evidenceConfidenceLabel}`;
  }
  if (score.maturityStatus === "supported_pattern") {
    return `${score.maturityDisplayLabel} · ${score.evidenceConfidenceLabel}`;
  }
  if (score.maturityStatus === "repeated_signal") {
    return `${score.maturityDisplayLabel} · ${score.evidenceConfidenceLabel}`;
  }
  if (score.maturityStatus === "observed_once") {
    return `${score.maturityDisplayLabel} · ${score.evidenceConfidenceLabel}`;
  }
  if (score.maturityStatus === "captured_signal") {
    return `${score.maturityDisplayLabel} · ${score.evidenceConfidenceLabel}`;
  }
  if (score.maturityStatus === "conflicting_evidence") {
    return `${score.maturityDisplayLabel} · ${score.evidenceConfidenceLabel}`;
  }
  return score.evidenceLabel;
}

export function enrichFindingWithMaturity<
  T extends {
    label: string;
    normalizedFindingId: string;
    observationCount: number;
    completedObservationCount: number;
    capturedFromCurrentNote: boolean;
    isPositiveStaffSignal: boolean;
    isEarlySignal: boolean;
    confidence: EvidenceConfidenceLevel;
    evidenceLabel: string;
    sourceCaseIds: string[];
  },
>(
  finding: T,
  context: {
    hasUnderlyingWorkflowEvidence?: boolean;
    hasProductConflict?: boolean;
    reconciliationStatus?: ReconciliationStatus;
  } = {},
): T & FindingMaturityScore {
  const score = scoreFindingMaturity({
    label: finding.label,
    normalizedFindingId: finding.normalizedFindingId,
    observationCount: finding.observationCount,
    completedObservationCount: finding.completedObservationCount,
    capturedFromCurrentNote: finding.capturedFromCurrentNote,
    isPositiveStaffSignal: finding.isPositiveStaffSignal,
    isEarlySignal: finding.isEarlySignal,
    hasUnderlyingWorkflowEvidence: context.hasUnderlyingWorkflowEvidence,
    hasProductConflict: context.hasProductConflict,
    hasWorkflowImpact:
      finding.normalizedFindingId === "workflow_delay" ||
      finding.normalizedFindingId.startsWith("workflow_"),
    hasDirectQuote: /said|told|mentioned|noted|frustrated|objected|complained|quote/i.test(finding.label),
    reconciliationStatus: context.reconciliationStatus,
  });

  return {
    ...finding,
    ...score,
    confidence: score.confidence,
    evidenceLabel: score.evidenceLabel,
  };
}

export function enrichAggregatedFindingsWithMaturity<
  T extends {
    label: string;
    normalizedFindingId: string;
    observationCount: number;
    completedObservationCount: number;
    capturedFromCurrentNote: boolean;
    isPositiveStaffSignal: boolean;
    isEarlySignal: boolean;
    confidence: EvidenceConfidenceLevel;
    evidenceLabel: string;
    sourceCaseIds: string[];
  },
>(findings: T[]): Array<T & FindingMaturityScore> {
  const productConflict = detectProductPatternConflict(findings);
  const workflowFindings = findings.filter(
    (finding) =>
      finding.normalizedFindingId === "workflow_delay" ||
      finding.normalizedFindingId.startsWith("workflow_"),
  );

  return findings.map((finding) => {
    const kind = inferFindingEvidenceKind(finding);
    const hasUnderlyingWorkflowEvidence =
      kind === "product_fit_opportunity"
        ? hasUnderlyingWorkflowEvidenceForProductFit({
            productFitFinding: finding,
            workflowFindings,
          })
        : undefined;

    return enrichFindingWithMaturity(finding, {
      hasUnderlyingWorkflowEvidence,
      hasProductConflict:
        productConflict && finding.normalizedFindingId.startsWith("product_in_use:"),
    });
  });
}
