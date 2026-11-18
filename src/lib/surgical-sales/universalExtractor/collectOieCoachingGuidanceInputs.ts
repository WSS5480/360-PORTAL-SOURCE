import { buildObservationLearningTabView } from "@/lib/surgical-sales/buildObservationLearningTabView";
import {
  buildCaseFocusFromSignals,
  buildIntelligenceSignals,
  buildProviderIntelligenceContext,
  resolveCaseBriefingKind,
  resolveProcedureContext,
  type IntelligenceSignal,
} from "@/lib/surgical-sales/caseIntelligenceSignals";
import type { AggregatedFindingEvidence } from "@/lib/surgical-sales/observationFindingEvidenceConfidence";
import {
  buildProviderPriorEvidencePool,
  priorEvidencePoolToFindings,
} from "@/lib/surgical-sales/providerPriorEvidencePool";
import { repProgramCompletedCaseCountFromCases } from "@/lib/surgical-sales/observationRepFindingPresentation";
import {
  OIE_COMMERCIAL_NORMALIZED_FINDING_IDS,
} from "@/lib/surgical-sales/universalExtractor/coachingGuidanceConceptMapping";
import type {
  OieCoachingGuidanceInputs,
  OieGuidanceTemplateHints,
  OieIntelligenceSignalSummary,
  UfConceptMaturity,
  UfLearningGapCategory,
} from "@/lib/surgical-sales/universalExtractor/coachingGuidanceInputsTypes";

function currentCaseId(caseRow: Record<string, unknown>): string {
  return String(caseRow.id ?? "current").trim() || "current";
}

function priorOnlyLearningView(input: {
  caseRow: Record<string, unknown>;
  providerContact?: Record<string, unknown> | null;
  priorCases?: Array<Record<string, unknown>>;
}) {
  return buildObservationLearningTabView({
    caseRow: { id: input.caseRow.id ?? "current", status: String(input.caseRow.status ?? "scheduled") },
    activities: [],
    providerContact: input.providerContact,
    priorCases: input.priorCases,
  });
}

function priorFindings(
  view: ReturnType<typeof buildObservationLearningTabView>,
  currentCaseIdValue: string,
): AggregatedFindingEvidence[] {
  return view.knownFindings.filter((finding) =>
    finding.sourceCaseIds.some((caseId) => caseId !== currentCaseIdValue),
  );
}

function currentCaseFindings(
  view: ReturnType<typeof buildObservationLearningTabView>,
  currentCaseIdValue: string,
): AggregatedFindingEvidence[] {
  return view.knownFindings.filter((finding) =>
    finding.sourceCaseIds.every((caseId) => caseId === currentCaseIdValue),
  );
}

function priorCasesHaveIntelligence(priorCases: Array<Record<string, unknown>>): boolean {
  return priorCases.some(
    (row) =>
      [
        "live_observation_competitors",
        "live_observation_workflow",
        "live_observation_clinical_pain_points",
        "live_observation_staff_process",
        "live_observation_product_fit",
        "notes",
      ].some((field) => String(row[field] ?? "").trim().length > 0) ||
      String(row.status ?? "").trim().toLowerCase() === "completed",
  );
}

function oieMaturityFromSignal(signal: IntelligenceSignal): UfConceptMaturity {
  if (
    signal.evidenceStatus === "validated" ||
    signal.evidenceStatus === "repeated" ||
    signal.completedCaseCount >= 2
  ) {
    return "established";
  }
  if (signal.evidenceCount > 0 || signal.completedCaseCount >= 1) {
    return "observed_once";
  }
  return "absent";
}

function isCommercialSignal(signal: IntelligenceSignal): boolean {
  if (signal.type === "product_fit_opportunity") {
    return true;
  }
  return OIE_COMMERCIAL_NORMALIZED_FINDING_IDS.has(signal.normalizedFindingId);
}

function toOieSignalSummary(signal: IntelligenceSignal): OieIntelligenceSignalSummary {
  return {
    normalizedFindingId: signal.normalizedFindingId,
    type: signal.type,
    subtype: signal.subtype,
    label: signal.label,
    maturity: oieMaturityFromSignal(signal),
    completedCaseCount: signal.completedCaseCount,
    evidenceStatus: signal.evidenceStatus,
    isCommercial: isCommercialSignal(signal),
    isPositiveStaff: signal.isPositiveStaffSignal,
    sampleEvidence: signal.label,
    sourceCaseIds: signal.sourceCaseIds,
  };
}

function dedupeSignalSummaries(signals: IntelligenceSignal[]): OieIntelligenceSignalSummary[] {
  const seen = new Set<string>();
  const output: OieIntelligenceSignalSummary[] = [];
  for (const signal of signals) {
    if (signal.type === "unresolved_gap") continue;
    const key = signal.normalizedFindingId || `${signal.type}:${signal.subtype ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(toOieSignalSummary(signal));
  }
  return output.sort((left, right) =>
    left.normalizedFindingId.localeCompare(right.normalizedFindingId),
  );
}

function buildTemplateHints(input: {
  signals: IntelligenceSignal[];
  evidenceGaps: string[];
}): OieGuidanceTemplateHints {
  const contentSignals = input.signals.filter((signal) => signal.type !== "unresolved_gap");
  const hasWorkflow = contentSignals.some(
    (signal) => signal.type === "workflow_signal" || signal.type === "workflow_bottleneck",
  );
  const hasProduct = contentSignals.some(
    (signal) => signal.type === "observed_product" || signal.type === "competitor_product",
  );
  return {
    hasWorkflow,
    hasProduct,
    providerPainGap: input.evidenceGaps.some((gap) => /provider pain/i.test(gap)),
    staffPainGap: input.evidenceGaps.some((gap) => /staff pain/i.test(gap)),
  };
}

function deriveOieLearningGaps(input: {
  evidenceGaps: string[];
  briefingPriorSignals: OieIntelligenceSignalSummary[];
}): UfLearningGapCategory[] {
  const gaps = new Set<UfLearningGapCategory>();

  if (input.evidenceGaps.some((gap) => /provider pain/i.test(gap))) {
    gaps.add("provider_friction_unknown");
  }
  if (input.evidenceGaps.some((gap) => /staff pain/i.test(gap))) {
    gaps.add("staff_friction_unknown");
  }
  if (input.evidenceGaps.some((gap) => /current products/i.test(gap))) {
    gaps.add("product_usage_unknown");
  }
  if (
    input.evidenceGaps.some((gap) => /repeat|across completed/i.test(gap)) ||
    input.briefingPriorSignals.some((signal) => signal.maturity === "observed_once")
  ) {
    gaps.add("repeat_confirmation_needed");
  }

  return [...gaps];
}

/** Read-only OIE inputs that feed workflow guidance sections (Phase A evaluation). */
export function collectOieCoachingGuidanceInputs(input: {
  caseRow: Record<string, unknown>;
  priorCases?: Array<Record<string, unknown>>;
  activities?: Array<{ activity_type?: string; body?: string }>;
  providerContact?: Record<string, unknown> | null;
}): OieCoachingGuidanceInputs {
  const priorCases = input.priorCases ?? [];
  const currentCaseIdValue = currentCaseId(input.caseRow);
  const fullView = buildObservationLearningTabView({
    caseRow: input.caseRow,
    activities: input.activities,
    providerContact: input.providerContact,
    priorCases,
  });
  const priorView = priorOnlyLearningView(input);
  const priorSignalsFindings = priorFindings(priorView, currentCaseIdValue);
  const hasPrior = priorCasesHaveIntelligence(priorCases) && priorSignalsFindings.length > 0;
  const kind = resolveCaseBriefingKind(input.caseRow, hasPrior);
  const procedureContext = resolveProcedureContext(input.caseRow, priorCases);

  const briefingIntelligenceSignals = buildIntelligenceSignals({
    findings: priorSignalsFindings,
    evidenceProgress: fullView.evidenceProgress,
    procedureContext,
    priorCases,
    caseRow: input.caseRow,
  });

  const priorEvidencePool = buildProviderPriorEvidencePool({
    currentCaseId: currentCaseIdValue,
    caseRow: input.caseRow,
    activities: input.activities,
    priorCases,
    providerContact: input.providerContact,
  });
  const priorFindingsMerged = priorEvidencePoolToFindings(priorEvidencePool);
  const mergedFindings = [...fullView.knownFindings, ...priorFindingsMerged].filter(
    (finding, index, all) =>
      all.findIndex(
        (candidate) =>
          (candidate.normalizedFindingId || candidate.matchKey) ===
          (finding.normalizedFindingId || finding.matchKey),
      ) === index,
  );
  const focusNextIntelligenceSignals = buildIntelligenceSignals({
    findings: mergedFindings,
    evidenceProgress: fullView.evidenceProgress,
    procedureContext,
    priorCases,
    caseRow: input.caseRow,
  });

  const providerContext = buildProviderIntelligenceContext({
    signals: focusNextIntelligenceSignals,
    evidenceGaps: fullView.evidenceGaps,
    kind,
  });

  const engineFocus = buildCaseFocusFromSignals({
    kind,
    signals: briefingIntelligenceSignals,
    procedureContext,
    debriefUnlocked: false,
    observationsRemaining: 5,
    completedObservations: repProgramCompletedCaseCountFromCases({ caseRow: input.caseRow, priorCases }),
    evidenceGaps: fullView.evidenceGaps,
  });

  const briefingPriorSignals = dedupeSignalSummaries(
    briefingIntelligenceSignals.filter((signal) => signal.type !== "unresolved_gap"),
  );
  const focusNextSignals = dedupeSignalSummaries(focusNextIntelligenceSignals);
  const currentCaseSignalFindings = currentCaseFindings(fullView, currentCaseIdValue);
  const currentCaseIntelligenceSignals = buildIntelligenceSignals({
    findings: currentCaseSignalFindings,
    evidenceProgress: fullView.evidenceProgress,
    procedureContext,
    priorCases,
    caseRow: input.caseRow,
  });
  const currentCaseSignals = dedupeSignalSummaries(currentCaseIntelligenceSignals);

  const commercialNormalizedFindingIds = [
    ...new Set(
      [...briefingPriorSignals, ...focusNextSignals, ...currentCaseSignals]
        .filter((signal) => signal.isCommercial)
        .map((signal) => signal.normalizedFindingId),
    ),
  ];

  const programCompletedCount = repProgramCompletedCaseCountFromCases({
    caseRow: input.caseRow,
    priorCases,
  });
  const priorCompletedCaseCount = priorSignalsFindings
    .flatMap((finding) => finding.sourceCaseIds)
    .filter((caseId) => caseId !== currentCaseIdValue)
    .filter((caseId, index, all) => all.indexOf(caseId) === index).length;

  const templateHints = buildTemplateHints({
    signals: briefingIntelligenceSignals,
    evidenceGaps: fullView.evidenceGaps,
  });

  return {
    source: "oie",
    briefingKind: kind,
    programCompletedCount,
    priorCompletedCaseCount,
    briefingPriorSignals,
    focusNextSignals,
    currentCaseSignals,
    evidenceGaps: fullView.evidenceGaps,
    gaps: deriveOieLearningGaps({ evidenceGaps: fullView.evidenceGaps, briefingPriorSignals }),
    focusCuesRaw: providerContext.focusCuesRaw,
    engineStillMissing: engineFocus.stillMissing,
    commercialNormalizedFindingIds,
    templateHints,
  };
}
