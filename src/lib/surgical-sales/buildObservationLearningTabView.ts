import {
  aggregateFindingEvidenceAcrossCases,
  type AggregatedFindingEvidence,
  type EvidenceConfidenceLevel,
} from "@/lib/surgical-sales/observationFindingEvidenceConfidence";
import { formatObservationFindingForRepDisplay } from "@/lib/surgical-sales/observationIntelligenceDisplayLabels";
import { buildConciseEvidenceGaps } from "@/lib/surgical-sales/canonicalFindingNormalization";
import {
  formatEvidenceProgressLeadFromMaturity,
  resolveDebriefEvidenceReadiness,
  type DebriefEvidenceReadiness,
} from "@/lib/surgical-sales/evidenceMaturityScoring";
import {
  buildObservationProgramDebriefPreview,
  formatObservationProgramProgressCount,
  resolveObservationProgramProgress,
  type ObservationProgramDebriefPreview,
} from "@/lib/surgical-sales/observationProgramGate";
import {
  OBSERVATION_LEARNING_CATEGORY_LABELS,
  type ObservationLearningCategoryId,
} from "@/lib/surgical-sales/observationIntelligence/observationLearningTypes";
import {
  EVIDENCE_PILLAR_LABELS,
  type EvidenceAreaStatus,
  type EvidencePillarId,
} from "@/lib/surgical-sales/observationIntelligence/scoreObservationEvidence";
import { isObservationCaseComplete } from "@/lib/surgical-sales/observationProgramGate";
import { runObservationIntelligencePipeline } from "@/lib/surgical-sales/observationIntelligence/observationIntelligencePipeline";
import type { ProviderObservationProgress } from "@/lib/surgical-sales/providerObservationProgress";

export type {
  ObservationLearningCategory,
  ObservationLearningCategoryId,
  ObservationLearningFinding,
} from "@/lib/surgical-sales/observationIntelligence/observationLearningTypes";

export {
  OBSERVATION_LEARNING_CATEGORY_LABELS,
  OBSERVATION_LEARNING_CATEGORY_ORDER,
} from "@/lib/surgical-sales/observationIntelligence/observationLearningTypes";

export const OBSERVATION_EVIDENCE_PROGRESS_CHECKS: Array<{
  categoryId: EvidencePillarId;
  label: string;
}> = [
  { categoryId: "provider_pain_points", label: EVIDENCE_PILLAR_LABELS.provider_pain_points },
  { categoryId: "staff_pain_points", label: EVIDENCE_PILLAR_LABELS.staff_pain_points },
  { categoryId: "workflow_findings", label: EVIDENCE_PILLAR_LABELS.workflow_findings },
  { categoryId: "current_products", label: EVIDENCE_PILLAR_LABELS.current_products },
  { categoryId: "product_fit_signals", label: EVIDENCE_PILLAR_LABELS.product_fit_signals },
];

/** @deprecated Use OBSERVATION_EVIDENCE_PROGRESS_CHECKS */
export const OBSERVATION_VALIDATION_CHECKS = OBSERVATION_EVIDENCE_PROGRESS_CHECKS;

export type EvidenceProgressItem = {
  id: EvidencePillarId;
  label: string;
  status: EvidenceAreaStatus;
  validated: boolean;
  confirmed: boolean;
};

export type ValidatedFindingGroup = {
  id: string;
  title: string;
  findings: AggregatedFindingEvidence[];
};

export type DebriefReadinessPhase = "not_ready" | "building" | "nearly_ready" | "ready";

export const OBSERVATION_PROGRAM_GOAL =
  "Build enough evidence for a provider debrief.";

export type ObservationLearningTabView = {
  progress: ProviderObservationProgress;
  programProgressLabel: string;
  programCasesLabel: string;
  programInProgressNote: string | null;
  programGoal: string;
  evidenceProgress: EvidenceProgressItem[];
  evidenceProgressLead: string;
  evidenceProgressSignalCount: number;
  evidenceProgressValidatedCount: number;
  findingsSectionTitle: string;
  validatedFindingGroups: ValidatedFindingGroup[];
  evidenceGaps: string[];
  learnedCategories: import("@/lib/surgical-sales/observationIntelligence/observationLearningTypes").ObservationLearningCategory[];
  knownFindings: AggregatedFindingEvidence[];
  validationRemaining: string[];
  debriefUnlocked: boolean;
  debriefPreview: ObservationProgramDebriefPreview | null;
  hasCapturedEvidence: boolean;
  /** @deprecated Use hasCapturedEvidence */
  hasValidatedEvidence: boolean;
  currentCaseComplete: boolean;
  currentCaseHasCapturedNotes: boolean;
  observationsRemaining: number;
  debriefReadinessPhase: DebriefReadinessPhase;
  debriefReadinessHeadline: string;
  debriefReadinessDetail: string;
  debriefProgressLabel: string;
};


const CONFIDENCE_SORT_RANK: Record<EvidenceConfidenceLevel, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

function flattenKnownFindings(
  categories: ObservationLearningTabView["learnedCategories"],
): AggregatedFindingEvidence[] {
  const seen = new Set<string>();
  const flat: AggregatedFindingEvidence[] = [];

  for (const category of categories) {
    for (const finding of category.findings) {
      const dedupeKey = finding.normalizedFindingId || finding.matchKey;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      flat.push(finding);
    }
  }

  return flat.sort((a, b) => {
    const rankDelta = CONFIDENCE_SORT_RANK[a.confidence] - CONFIDENCE_SORT_RANK[b.confidence];
    if (rankDelta !== 0) return rankDelta;
    return b.observationCount - a.observationCount;
  });
}

const VALIDATED_FINDING_GROUP_LABELS: Partial<Record<ObservationLearningCategoryId, string>> = {
  competitor_products: "Current Products Used",
  current_products: "Current Products Used",
  workflow_findings: "Workflow Findings",
  provider_pain_points: "Provider Pain Points",
  staff_pain_points: "Staff Pain Points",
  staff_workflow: "Staff Workflow",
  product_fit_signals: "Product Fit Opportunity",
};

const VALIDATED_FINDING_GROUP_ORDER: ObservationLearningCategoryId[] = [
  "current_products",
  "competitor_products",
  "workflow_findings",
  "provider_pain_points",
  "staff_pain_points",
  "staff_workflow",
  "product_fit_signals",
];

export function formatObservationProgramCasesLabel(
  completed: number,
  total: number,
): string {
  const clamped = Math.min(total, Math.max(0, completed));
  return `${clamped} of ${total} observation cases complete`;
}

export function formatProgramInProgressNoteLabel(inProgressCount: number): string | null {
  if (inProgressCount <= 0) return null;
  if (inProgressCount === 1) return "1 in-progress case note captured";
  return `${inProgressCount} in-progress case notes captured`;
}

function caseRowHasStoredNotes(caseRow: Record<string, unknown>): boolean {
  return [
    "live_observation_competitors",
    "live_observation_workflow",
    "live_observation_clinical_pain_points",
    "live_observation_staff_process",
    "live_observation_product_fit",
    "live_observation_surgeon_reactions",
    "notes",
    "debrief_key_findings",
  ].some((field) => String(caseRow[field] ?? "").trim().length > 0);
}

export function countInProgressObservationCasesWithNotes(input: {
  caseRow: Record<string, unknown>;
  priorCases?: Array<Record<string, unknown>>;
  activities?: NoteActivity[];
}): number {
  let count = 0;
  const priorCases = input.priorCases ?? [];
  const currentHasActivityNotes = (input.activities ?? []).some(
    (activity) =>
      String(activity.activity_type ?? "").trim().toLowerCase() === "note" &&
      String(activity.body ?? "").trim().length > 0,
  );

  for (const caseRow of priorCases) {
    if (isObservationCaseComplete(caseRow)) continue;
    if (caseRowHasStoredNotes(caseRow)) count += 1;
  }

  if (!isObservationCaseComplete(input.caseRow)) {
    if (currentHasActivityNotes || caseRowHasStoredNotes(input.caseRow)) {
      count += 1;
    }
  }

  return count;
}

export function formatEvidenceGapLabel(label: string): string {
  if (!label) return label;
  return `${label.charAt(0)}${label.slice(1).toLowerCase()}`;
}

export function buildValidatedFindingGroups(
  categories: ObservationLearningTabView["learnedCategories"],
): ValidatedFindingGroup[] {
  const findingsByGroup = new Map<string, ValidatedFindingGroup>();

  for (const categoryId of VALIDATED_FINDING_GROUP_ORDER) {
    const category = categories.find((entry) => entry.id === categoryId);
    if (!category || category.findings.length === 0) continue;

    const title =
      VALIDATED_FINDING_GROUP_LABELS[categoryId] ??
      OBSERVATION_LEARNING_CATEGORY_LABELS[categoryId];
    const groupId =
      categoryId === "competitor_products" || categoryId === "current_products"
        ? "current_products_used"
        : categoryId;
    const existing = findingsByGroup.get(groupId);

    if (existing) {
      const seen = new Set(
        existing.findings.map((finding) => finding.normalizedFindingId || finding.matchKey),
      );
      for (const finding of category.findings) {
        const dedupeKey = finding.normalizedFindingId || finding.matchKey;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        existing.findings.push(finding);
      }
      continue;
    }

    findingsByGroup.set(groupId, {
      id: groupId,
      title,
      findings: [...category.findings],
    });
  }

  return Array.from(findingsByGroup.values()).filter((group) => group.findings.length > 0);
}

export function formatDebriefProgressLabel(completed: number, total: number): string {
  const clamped = Math.min(total, Math.max(0, completed));
  return `${clamped} / ${total}`;
}

export function resolveDebriefReadinessPhase(input: {
  debriefUnlocked: boolean;
  completed: number;
  evidenceReadiness?: DebriefEvidenceReadiness;
}): DebriefReadinessPhase {
  if (input.debriefUnlocked) return "ready";
  if (input.evidenceReadiness === "nearly_ready") return "nearly_ready";
  if (input.completed > 0 || input.evidenceReadiness === "building") return "building";
  return "not_ready";
}

export function formatDebriefReadinessHeadline(phase: DebriefReadinessPhase): string {
  if (phase === "ready") return "Ready for Debrief";
  if (phase === "nearly_ready") return "Evidence Nearly Ready";
  return "Not Ready for Debrief";
}

export function formatDebriefReadinessDetail(input: {
  phase: DebriefReadinessPhase;
  completed: number;
  total: number;
  observationsRemaining: number;
  currentCaseComplete: boolean;
  currentCaseHasCapturedNotes: boolean;
}): string {
  if (input.phase === "ready") {
    return "Enough evidence gathered for a productive provider debrief.";
  }
  if (input.phase === "nearly_ready") {
    return `Evidence is nearly ready, but debrief stays locked until ${input.total} completed observations.`;
  }

  if (!input.currentCaseComplete && input.currentCaseHasCapturedNotes && input.completed === 0) {
    return "Early evidence captured in this case — mark it complete and keep observing to build debrief readiness.";
  }

  if (input.completed > 0) {
    if (input.observationsRemaining === 1) {
      return "Evidence is building — one more observation would strengthen debrief readiness.";
    }
    return `Evidence is building — ${input.observationsRemaining} more observations would strengthen debrief readiness.`;
  }

  if (input.observationsRemaining === 1) {
    return "Capture observation notes to start building debrief readiness.";
  }
  return "Capture observation notes across cases to build debrief readiness.";
}

export function formatEvidenceProgressLead(input: {
  signalCount: number;
  total: number;
  currentCaseComplete: boolean;
  validatedCount: number;
  pillars?: Array<{ maturityStatus?: import("@/lib/surgical-sales/evidenceMaturityScoring").EvidenceMaturityStatus }>;
}): string {
  if (input.pillars?.length) {
    return formatEvidenceProgressLeadFromMaturity({
      pillars: input.pillars.map((pillar) => ({
        status: pillar.maturityStatus ?? "missing",
      })),
      total: input.total,
    });
  }
  if (input.validatedCount > 0) {
    return `${input.validatedCount} of ${input.total} evidence areas validated`;
  }
  if (input.currentCaseComplete) {
    return `${input.signalCount} of ${input.total} evidence areas observed`;
  }
  return `${input.signalCount} of ${input.total} evidence areas have captured signals`;
}

export function resolveFindingsSectionTitle(input: {
  currentCaseComplete: boolean;
  completedObservationCount: number;
}): string {
  if (!input.currentCaseComplete || input.completedObservationCount === 0) {
    return "Captured Findings";
  }
  return "Observed Findings";
}

export function buildEvidenceProgressItems(
  aggregatedByCategory: Record<string, AggregatedFindingEvidence[]>,
): EvidenceProgressItem[] {
  return OBSERVATION_EVIDENCE_PROGRESS_CHECKS.map((check) => {
    const findings = aggregatedByCategory[check.categoryId] ?? [];
    return {
      id: check.categoryId,
      label: check.label,
      status: findings.length > 0 ? "captured_signal" : "missing",
      validated: findings.some((finding) => finding.completedObservationCount >= 2),
      confirmed: findings.some((finding) => finding.completedObservationCount >= 2),
    };
  });
}

export function formatKnownFindingMeta(
  finding: AggregatedFindingEvidence,
  input?: { currentCaseComplete?: boolean },
): string {
  const parts: string[] = [];

  if (finding.maturityDisplayLabel && finding.evidenceConfidenceLabel) {
    parts.push(`${finding.maturityDisplayLabel} · ${finding.evidenceConfidenceLabel}`);
  } else {
    parts.push(finding.evidenceLabel);
    const confidence =
      finding.confidence === "High"
        ? "High confidence"
        : finding.confidence === "Medium"
          ? "Moderate confidence"
          : "Low confidence";
    parts.push(confidence);
  }

  if (finding.capturedFromCurrentNote && !input?.currentCaseComplete) {
    parts.push("Case not complete");
  }

  if (finding.isPositiveStaffSignal) {
    parts.push("Positive staff workflow context");
    parts.push("Not a pain point");
  }

  if (finding.isEarlySignal && finding.maturityStatus !== "validated_pattern" && finding.maturityStatus !== "debrief_ready") {
    parts.push("Needs supporting evidence");
  }

  if (finding.hasConflictingEvidence) {
    parts.push("Mixed product pattern");
  }

  return parts.join(" · ");
}

function currentCaseHasCapturedNotes(input: {
  caseRow: Record<string, unknown>;
  activities?: NoteActivity[];
}): boolean {
  const activityNotes = (input.activities ?? []).some(
    (activity) =>
      String(activity.activity_type ?? "").trim().toLowerCase() === "note" &&
      String(activity.body ?? "").trim().length > 0,
  );
  if (activityNotes) return true;

  return [
    "live_observation_competitors",
    "live_observation_workflow",
    "live_observation_clinical_pain_points",
    "live_observation_staff_process",
    "live_observation_product_fit",
    "live_observation_surgeon_reactions",
    "notes",
  ].some((field) => String(input.caseRow[field] ?? "").trim().length > 0);
}

function isWorkflowFindingRecord(finding: AggregatedFindingEvidence): boolean {
  const id = finding.normalizedFindingId;
  if (id.startsWith("workflow_") || id === "visualization_challenge") return true;
  return /workflow|delay|turnover|setup|prep|visualization|fixation|graft|deployment|handling|confusion/i.test(
    finding.label,
  );
}

function workflowGapLabelFromFinding(finding: AggregatedFindingEvidence): string {
  if (/visuali.*fixation|fixation.*visuali/i.test(`${finding.label} ${finding.normalizedFindingId}`)) {
    return "visualization/fixation workflow";
  }
  const label = finding.label
    .replace(/\s+(challenge|challenges|signal|observed|noted)$/i, "")
    .replace(/^extra\s+/i, "")
    .trim();
  return label.charAt(0).toLowerCase() + label.slice(1);
}

function buildObservationEvidenceGaps(input: {
  evidencePillars: Array<{ id: EvidencePillarId; label: string; status: EvidenceAreaStatus }>;
  knownFindings: AggregatedFindingEvidence[];
  currentCaseComplete: boolean;
  currentCaseHasCapturedNotes: boolean;
}): string[] {
  const missingPillarLabels = input.evidencePillars
    .filter((pillar) => pillar.status === "missing")
    .map((pillar) => formatEvidenceGapLabel(pillar.label));

  const hasPendingRepeatedSignals = input.knownFindings.some(
    (finding) =>
      finding.capturedFromCurrentNote &&
      !input.currentCaseComplete &&
      (finding.observationCount >= 2 || finding.completedObservationCount >= 1),
  );

  const hasProductOrWorkflowSignal = input.knownFindings.some(
    (finding) =>
      finding.normalizedFindingId.startsWith("product_in_use:") || isWorkflowFindingRecord(finding),
  );

  return buildConciseEvidenceGaps({
    currentCaseComplete: input.currentCaseComplete,
    currentCaseHasCapturedNotes: input.currentCaseHasCapturedNotes,
    missingPillarLabels,
    hasPendingRepeatedSignals,
    hasProductOrWorkflowSignal,
  });
}

export type { EvidenceConfidenceLevel };

type NoteActivity = {
  id?: string;
  activity_type?: string;
  body?: string;
  metadata_json?: Record<string, unknown> | null;
  created_at?: string;
};

function debriefPreviewActivities(input: {
  caseRow: Record<string, unknown>;
  activities?: NoteActivity[];
}) {
  const fallbackCreatedAt = String(input.caseRow.updated_at ?? input.caseRow.created_at ?? "");
  return input.activities?.map((activity, index) => ({
    ...activity,
    id: activity.id ?? `activity-${index}`,
    activity_type: activity.activity_type ?? "note",
    body: activity.body ?? "",
    created_at: activity.created_at ?? fallbackCreatedAt,
  }));
}

/** Intelligence tab view — facts → intelligence → evidence scoring pipeline. */
export function buildObservationLearningTabView(input: {
  caseRow: Record<string, unknown>;
  activities?: NoteActivity[];
  providerContact?: Record<string, unknown> | null;
  priorCases?: Array<Record<string, unknown>>;
}): ObservationLearningTabView {
  const pipeline = runObservationIntelligencePipeline(input);

  const evidenceProgress: EvidenceProgressItem[] = pipeline.evidencePillars.map((pillar) => ({
    id: pillar.id,
    label: pillar.label,
    status: pillar.status,
    validated: pillar.validated,
    confirmed: pillar.confirmed,
  }));

  const validationRemaining = pipeline.evidencePillars
    .filter((pillar) => pillar.status === "missing")
    .map((pillar) => pillar.label);
  const validatedFindingGroups = buildValidatedFindingGroups(pipeline.learnedCategories).map((group) => ({
    ...group,
    findings: group.findings.map((finding) => ({
      ...finding,
      label: formatObservationFindingForRepDisplay(finding, { mode: "established_pattern" }),
    })),
  }));

  const progress = resolveObservationProgramProgress(input);
  const debriefUnlocked = progress.debriefReady;
  const observationsRemaining = progress.remaining;
  const knownFindings = flattenKnownFindings(pipeline.learnedCategories);
  const hasCapturedEvidence = knownFindings.length > 0;
  const currentCaseComplete = isObservationCaseComplete(input.caseRow);
  const capturedNotes = currentCaseHasCapturedNotes(input);
  const inProgressCasesWithNotes = countInProgressObservationCasesWithNotes(input);
  const evidenceReadiness = resolveDebriefEvidenceReadiness({
    completedObservations: progress.completed,
    requiredObservations: progress.total,
    findings: knownFindings.filter((finding) => Boolean(finding.maturityStatus)) as import("@/lib/surgical-sales/evidenceMaturityScoring").FindingMaturityScore[],
    hasProviderPainEvidence: pipeline.evidencePillars.some(
      (pillar) => pillar.id === "provider_pain_points" && pillar.status !== "missing",
    ),
    hasStaffPainEvidence: pipeline.evidencePillars.some(
      (pillar) => pillar.id === "staff_pain_points" && pillar.status !== "missing",
    ),
    hasWorkflowOrProductEvidence: pipeline.evidencePillars.some(
      (pillar) =>
        (pillar.id === "workflow_findings" ||
          pillar.id === "current_products" ||
          pillar.id === "product_fit_signals") &&
        pillar.status !== "missing",
    ),
    onlyCapturedSignals:
      knownFindings.length > 0 &&
      knownFindings.every((finding) => finding.maturityStatus === "captured_signal"),
  });
  const evidenceGaps = buildObservationEvidenceGaps({
    evidencePillars: pipeline.evidencePillars,
    knownFindings,
    currentCaseComplete,
    currentCaseHasCapturedNotes: capturedNotes,
  });
  const debriefReadinessPhase = resolveDebriefReadinessPhase({
    debriefUnlocked,
    completed: progress.completed,
    evidenceReadiness,
  });
  const debriefPreview = debriefUnlocked
    ? buildObservationProgramDebriefPreview({
        caseRow: input.caseRow,
        activities: debriefPreviewActivities(input),
        providerContact: input.providerContact,
        priorCases: input.priorCases,
      })
    : null;

  return {
    progress,
    programProgressLabel: formatObservationProgramProgressCount(progress.completed, progress.total),
    programCasesLabel: formatObservationProgramCasesLabel(progress.completed, progress.total),
    programInProgressNote: formatProgramInProgressNoteLabel(inProgressCasesWithNotes),
    programGoal: OBSERVATION_PROGRAM_GOAL,
    evidenceProgress,
    evidenceProgressLead: formatEvidenceProgressLead({
      signalCount: pipeline.evidenceProgressSignalCount,
      total: evidenceProgress.length,
      currentCaseComplete,
      validatedCount: pipeline.evidenceProgressValidatedCount,
      pillars: pipeline.evidencePillars,
    }),
    evidenceProgressSignalCount: pipeline.evidenceProgressSignalCount,
    evidenceProgressValidatedCount: pipeline.evidenceProgressValidatedCount,
    findingsSectionTitle: resolveFindingsSectionTitle({
      currentCaseComplete,
      completedObservationCount: progress.completed,
    }),
    validatedFindingGroups,
    evidenceGaps,
    learnedCategories: pipeline.learnedCategories,
    knownFindings,
    validationRemaining,
    debriefUnlocked,
    debriefPreview,
    hasCapturedEvidence,
    currentCaseComplete,
    currentCaseHasCapturedNotes: capturedNotes,
    observationsRemaining,
    debriefReadinessPhase,
    debriefReadinessHeadline: formatDebriefReadinessHeadline(debriefReadinessPhase),
    debriefReadinessDetail: formatDebriefReadinessDetail({
      phase: debriefReadinessPhase,
      completed: progress.completed,
      total: progress.total,
      observationsRemaining,
      currentCaseComplete,
      currentCaseHasCapturedNotes: capturedNotes,
    }),
    debriefProgressLabel: formatDebriefProgressLabel(progress.completed, progress.total),
    hasValidatedEvidence: hasCapturedEvidence,
  };
}

// Re-export for tests that import buildEvidenceProgressItems with category buckets.
export { aggregateFindingEvidenceAcrossCases };
