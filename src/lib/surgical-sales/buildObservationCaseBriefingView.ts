import {
  buildObservationLearningTabView,
  type ObservationLearningTabView,
} from "@/lib/surgical-sales/buildObservationLearningTabView";
import type { AggregatedFindingEvidence } from "@/lib/surgical-sales/observationFindingEvidenceConfidence";
import {
  buildCaseFocusFromSignals,
  buildContextImpactText,
  buildIntelligenceSignals,
  buildProviderIntelligenceContext,
  dedupeFindingsForThisCaseDisplay,
  findingToIntelligenceSignal,
  resolveCaseBriefingKind,
  resolveProcedureContext,
  type CaseBriefingKind,
  type CaseBriefView,
  type CaseFocusView,
} from "@/lib/surgical-sales/caseIntelligenceSignals";
import { buildCanonicalKeyFromSignal } from "@/lib/surgical-sales/caseIntelligenceReconciliation";
import {
  buildProviderPriorEvidencePool,
  findMatchingPriorEvidence,
  priorEvidencePoolToFindings,
  priorEvidencePoolToSignals,
  sameCasePriorCanonicalKeysFromPool,
} from "@/lib/surgical-sales/providerPriorEvidencePool";
import {
  containsOntologyDisplayLabel,
  formatObservationFindingForRepDisplay,
} from "@/lib/surgical-sales/observationIntelligenceDisplayLabels";
import { OBSERVATION_FOCUS_CHIP_OPTIONS } from "@/lib/surgical-sales/observationCaseFocusChips";
import { isObservationCaseComplete } from "@/lib/surgical-sales/observationProgramGate";
import {
  acceptedFactsFromValidatedIntelligence,
  isValidatedStoredIntelligence,
} from "@/lib/surgical-sales/observationIntelligence/observationFactSupplement";
import type {
  ObservationFact,
  StoredObservationNoteIntelligence,
} from "@/lib/surgical-sales/observationIntelligence/observationFactTypes";
import { resolveNormalizedFindingFromFact } from "@/lib/surgical-sales/observationIntelligence/normalizedObservationFindings";
import {
  formatSignalMaturitySummary,
  scoreFindingMaturity,
} from "@/lib/surgical-sales/evidenceMaturityScoring";

export type { CaseBriefingKind, CaseBriefView, CaseFocusView };

export type ObservationCaseBriefingView = {
  kind: CaseBriefingKind;
  caseFocus: CaseFocusView;
};

export type CaseIntelligenceContextItem = {
  id: string;
  text: string;
  tone: "prior" | "gap" | "strengthens" | "weakens" | "adds" | "resolves" | "conflicts" | "current";
  /** §7.2: verbatim evidence quote — present when a reported (told-to-rep) v2 fact backs the finding. */
  quote?: string;
};

export type ObservationCaseIntelligenceSections = {
  thisCaseTitle: string;
  thisCaseEmptyMessage: string;
  thisCaseItems: CaseIntelligenceContextItem[];
  providerContextTitle: string;
  providerContextItems: CaseIntelligenceContextItem[];
};

const CASE_NOTE_FIELDS = [
  "live_observation_competitors",
  "live_observation_workflow",
  "live_observation_clinical_pain_points",
  "live_observation_staff_process",
  "live_observation_product_fit",
  "live_observation_surgeon_reactions",
  "notes",
  "debrief_key_findings",
];

function caseRowHasCapturedNotes(caseRow: Record<string, unknown>): boolean {
  return CASE_NOTE_FIELDS.some((field) => String(caseRow[field] ?? "").trim().length > 0);
}

function priorCasesHaveIntelligence(priorCases: Array<Record<string, unknown>>): boolean {
  return priorCases.some(
    (row) => caseRowHasCapturedNotes(row) || isObservationCaseComplete(row),
  );
}

export function formatSignalMaturityLabel(finding: AggregatedFindingEvidence): string {
  if (finding.maturityDisplayLabel && finding.evidenceConfidenceLabel) {
    return formatSignalMaturitySummary(finding as AggregatedFindingEvidence & {
      maturityDisplayLabel: string;
      evidenceConfidenceLabel: string;
      maturityStatus: import("@/lib/surgical-sales/evidenceMaturityScoring").EvidenceMaturityStatus;
      evidenceLabel: string;
      isDebriefReadyFinding: boolean;
      hasConflictingEvidence: boolean;
      extractionConfidenceScore: number;
      evidenceConfidenceScore: number;
      extractionConfidenceLabel: string;
      confidence: import("@/lib/surgical-sales/observationFindingEvidenceConfidence").EvidenceConfidenceLevel;
    });
  }
  return formatSignalMaturitySummary(
    scoreFindingMaturity({
      label: finding.label,
      normalizedFindingId: finding.normalizedFindingId,
      observationCount: finding.observationCount,
      completedObservationCount: finding.completedObservationCount,
      capturedFromCurrentNote: finding.capturedFromCurrentNote,
      isPositiveStaffSignal: finding.isPositiveStaffSignal,
      isEarlySignal: finding.isEarlySignal,
    }),
  );
}

function priorOnlyLearningView(input: {
  caseRow: Record<string, unknown>;
  providerContact?: Record<string, unknown> | null;
  priorCases?: Array<Record<string, unknown>>;
}): ObservationLearningTabView {
  return buildObservationLearningTabView({
    caseRow: { id: input.caseRow.id ?? "current", status: String(input.caseRow.status ?? "scheduled") },
    activities: [],
    providerContact: input.providerContact,
    priorCases: input.priorCases,
  });
}

function priorFindings(
  view: ObservationLearningTabView,
  currentCaseIdValue: string,
): AggregatedFindingEvidence[] {
  return view.knownFindings.filter((finding) =>
    finding.sourceCaseIds.some((caseId) => caseId !== currentCaseIdValue),
  );
}

function buildPriorIntelligenceFindingsForReconciliation(input: {
  fullView: ObservationLearningTabView;
  caseRow: Record<string, unknown>;
  caseRowBaselineView: ObservationLearningTabView;
  priorCases: Array<Record<string, unknown>>;
  activities?: Array<{ activity_type?: string; body?: string }>;
  providerContact?: Record<string, unknown> | null;
}): AggregatedFindingEvidence[] {
  const currentCaseIdValue = currentCaseId(input.caseRow);
  const seen = new Set<string>();
  const merged: AggregatedFindingEvidence[] = [];

  const add = (finding: AggregatedFindingEvidence) => {
    const key = finding.normalizedFindingId || finding.matchKey;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(finding);
  };

  for (const finding of priorFindings(input.fullView, currentCaseIdValue)) {
    add(finding);
  }

  for (const finding of currentCaseFindings(input.caseRowBaselineView, input.caseRow)) {
    add(finding);
  }

  for (const finding of buildPriorActivityNoteFindings({
    ...input,
    procedureContext: resolveProcedureContext(input.caseRow, input.priorCases ?? []),
  })) {
    add(finding);
  }

  for (const finding of input.fullView.knownFindings) {
    if (finding.observationCount >= 2 && finding.sourceCaseIds.includes(currentCaseIdValue)) {
      add(finding);
    }
    if (
      finding.completedObservationCount >= 1 &&
      finding.sourceCaseIds.some((caseId) => caseId !== currentCaseIdValue)
    ) {
      add(finding);
    }
  }

  return merged;
}

function buildPriorActivityNoteFindings(input: {
  caseRow: Record<string, unknown>;
  activities?: Array<{ activity_type?: string; body?: string }>;
  priorCases: Array<Record<string, unknown>>;
  providerContact?: Record<string, unknown> | null;
  procedureContext?: string | null;
}): AggregatedFindingEvidence[] {
  const noteActivities = (input.activities ?? []).filter(
    (activity) => String(activity.activity_type ?? "").trim().toLowerCase() === "note",
  );
  if (noteActivities.length <= 1) return [];

  const results: AggregatedFindingEvidence[] = [];
  const seen = new Set<string>();

  for (let end = noteActivities.length - 1; end >= 1; end -= 1) {
    const view = buildObservationLearningTabView({
      caseRow: input.caseRow,
      activities: noteActivities.slice(0, end),
      priorCases: input.priorCases,
      providerContact: input.providerContact,
    });
    for (const finding of currentCaseFindings(view, input.caseRow)) {
      const key = finding.normalizedFindingId || finding.matchKey;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(finding);
    }
  }

  return results;
}

function sameCasePriorCanonicalKeys(
  findings: AggregatedFindingEvidence[],
  procedureContext: string | null,
): string[] {
  return findings.map((finding) =>
    buildCanonicalKeyFromSignal(findingToIntelligenceSignal(finding, { procedureContext })),
  );
}

function reconciliationMatchOptions(
  finding: AggregatedFindingEvidence,
  currentCaseIdValue: string,
  sameCasePriorKeys: string[],
): {
  currentCaseId: string;
  observationCount: number;
  completedObservationCount: number;
  sourceCaseIds: string[];
  sameCasePriorCanonicalKeys: string[];
} {
  return {
    currentCaseId: currentCaseIdValue,
    observationCount: finding.observationCount,
    completedObservationCount: finding.completedObservationCount,
    sourceCaseIds: finding.sourceCaseIds,
    sameCasePriorCanonicalKeys: sameCasePriorKeys,
  };
}

function currentCaseId(caseRow: Record<string, unknown>): string {
  return String(caseRow.id ?? "current").trim() || "current";
}

function currentCaseFindings(
  view: ObservationLearningTabView,
  caseRow: Record<string, unknown>,
): AggregatedFindingEvidence[] {
  if (!view.currentCaseHasCapturedNotes) return [];
  const caseId = currentCaseId(caseRow);
  return view.knownFindings.filter((finding) => finding.sourceCaseIds.includes(caseId));
}

function missionFromSavedGoal(caseRow: Record<string, unknown>): string | null {
  const raw = String(caseRow.observation_goal ?? "").trim();
  if (!raw) return null;
  const line = raw
    .split(/\n+/)
    .map((entry) => entry.trim())
    .find((entry) => entry.length > 0 && !OBSERVATION_FOCUS_CHIP_OPTIONS.includes(entry as never));
  if (!line) return null;
  return line.endsWith(".") ? line : `${line}.`;
}

export function buildObservationCaseMission(input: {
  caseRow: Record<string, unknown>;
  priorFindings: AggregatedFindingEvidence[];
  observationsRemaining: number;
  completedObservations: number;
  debriefUnlocked: boolean;
}): string {
  const saved = missionFromSavedGoal(input.caseRow);
  const procedureContext = resolveProcedureContext(input.caseRow, []);
  const signals = buildIntelligenceSignals({
    findings: input.priorFindings,
    procedureContext,
  });
  const workflow = signals.find(
    (signal) => signal.type === "workflow_signal" || signal.type === "workflow_bottleneck",
  );
  const product = signals.find(
    (signal) => signal.type === "observed_product" || signal.type === "competitor_product",
  );
  const workflowLabel = workflow?.workflowStep ?? workflow?.label.toLowerCase() ?? null;
  const productLabel = product?.productContext ?? null;
  const procedurePhrase = procedureContext ? `${procedureContext.toLowerCase()} workflow` : "case workflow";

  if (input.debriefUnlocked || (input.completedObservations >= 4 && input.observationsRemaining <= 1)) {
    return "Confirm open questions before the provider debrief.";
  }

  if (workflowLabel && productLabel) {
    return `Watch whether ${workflowLabel} repeats and whether ${productLabel} remains part of the provider's ${procedurePhrase}.`;
  }

  if (workflowLabel) {
    return `Watch whether ${workflowLabel} repeats during this case.`;
  }

  if (productLabel) {
    return `Confirm whether ${productLabel} remains part of the provider's case workflow.`;
  }

  if (saved) return saved;

  return "Capture baseline case workflow, product usage, and provider/staff frustrations.";
}

export function buildObservationCaseBriefingView(input: {
  caseRow: Record<string, unknown>;
  providerContact?: Record<string, unknown> | null;
  priorCases?: Array<Record<string, unknown>>;
  activities?: Array<{ activity_type?: string; body?: string }>;
}): ObservationCaseBriefingView {
  const priorCases = input.priorCases ?? [];
  const priorView = priorOnlyLearningView(input);
  const fullView = buildObservationLearningTabView({
    caseRow: input.caseRow,
    activities: input.activities,
    providerContact: input.providerContact,
    priorCases,
  });

  const priorSignals = priorFindings(priorView, currentCaseId(input.caseRow));
  const hasPrior = priorCasesHaveIntelligence(priorCases) && priorSignals.length > 0;
  const kind = resolveCaseBriefingKind(input.caseRow, hasPrior);
  const procedureContext = resolveProcedureContext(input.caseRow, priorCases);
  const intelligenceSignals = buildIntelligenceSignals({
    findings: priorSignals,
    evidenceProgress: fullView.evidenceProgress,
    procedureContext,
    priorCases,
    caseRow: input.caseRow,
  });

  const productGapMissing = fullView.evidenceProgress.some(
    (entry) => entry.id === "current_products" && entry.status === "missing",
  );

  const caseFocus = buildCaseFocusFromSignals({
    kind,
    signals: intelligenceSignals,
    procedureContext,
    debriefUnlocked: fullView.debriefUnlocked,
    observationsRemaining: fullView.observationsRemaining,
    completedObservations: fullView.progress.completed,
    evidenceGaps: fullView.evidenceGaps,
    productPatternUncertain: productGapMissing,
  });

  return { kind, caseFocus };
}

function providerContextFromPrior(
  priorSignals: AggregatedFindingEvidence[],
  fullView: ObservationLearningTabView,
  procedureContext: string | null,
  priorCases: Array<Record<string, unknown>>,
): CaseIntelligenceContextItem[] {
  const signals = buildIntelligenceSignals({
    findings: priorSignals,
    evidenceProgress: fullView.evidenceProgress,
    procedureContext,
    priorCases,
  });

  const context = buildProviderIntelligenceContext({
    signals,
    evidenceGaps: fullView.evidenceGaps,
    kind: "follow_up",
  });

  return context.entries.map((entry) => ({
    id: entry.id,
    text: entry.contextText,
    tone: entry.tone,
  }));
}

const REPORTED_SPEECH_PATTERN = /\b(?:said|told|mentioned|asked|heard|according to)\b|["\u201c\u201d]/i;

/** §7.2: reported (told-to-rep) v2 facts whose evidence reads as speech, keyed by normalized finding id. */
function collectReportedQuotesByFindingId(
  activities: Array<{ activity_type?: string; body?: string; metadata_json?: Record<string, unknown> | null }> | undefined,
): Map<string, string> {
  const quotes = new Map<string, string>();
  for (const activity of activities ?? []) {
    if (String(activity.activity_type ?? "").trim().toLowerCase() !== "note") continue;
    const raw = activity.metadata_json?.ai_extraction;
    if (!raw || typeof raw !== "object") continue;
    const stored = raw as StoredObservationNoteIntelligence;
    if (!isValidatedStoredIntelligence(stored)) continue;
    for (const fact of acceptedFactsFromValidatedIntelligence(stored)) {
      if ((fact as ObservationFact).confirmation_state !== "reported") continue;
      const evidence = String(fact.evidence ?? "").trim();
      if (!evidence || !REPORTED_SPEECH_PATTERN.test(evidence)) continue;
      const normalized = resolveNormalizedFindingFromFact(fact);
      if (!normalized?.normalizedFindingId || quotes.has(normalized.normalizedFindingId)) continue;
      quotes.set(normalized.normalizedFindingId, evidence);
    }
  }
  return quotes;
}

export function buildObservationCaseIntelligenceSections(input: {
  caseRow: Record<string, unknown>;
  providerContact?: Record<string, unknown> | null;
  priorCases?: Array<Record<string, unknown> & { activities?: Array<{ id?: string; activity_type?: string; body?: string; metadata_json?: Record<string, unknown> | null }> }>;
  activities?: Array<{ activity_type?: string; body?: string; metadata_json?: Record<string, unknown> | null }>;
}): ObservationCaseIntelligenceSections {
  const priorCases = input.priorCases ?? [];
  const currentCaseIdValue = currentCaseId(input.caseRow);
  const fullView = buildObservationLearningTabView({
    caseRow: input.caseRow,
    activities: input.activities,
    providerContact: input.providerContact,
    priorCases,
  });

  const priorEvidencePool = buildProviderPriorEvidencePool({
    currentCaseId: currentCaseIdValue,
    caseRow: input.caseRow,
    activities: input.activities,
    priorCases,
    providerContact: input.providerContact,
  });
  const priorSignals = priorEvidencePoolToFindings(priorEvidencePool);
  const currentFindings = currentCaseFindings(fullView, input.caseRow);
  const hasCurrentNotes = fullView.currentCaseHasCapturedNotes;
  const procedureContext = resolveProcedureContext(input.caseRow, priorCases);
  const hasPrior = priorEvidencePool.length > 0;
  const briefingKind = resolveCaseBriefingKind(input.caseRow, hasPrior);
  const caseComplete = fullView.currentCaseComplete;
  const displayFindings = dedupeFindingsForThisCaseDisplay(currentFindings, { procedureContext });
  const sameCasePriorKeys = sameCasePriorCanonicalKeysFromPool(priorEvidencePool, currentCaseIdValue);
  const priorIntelligenceSignals = priorEvidencePoolToSignals(priorEvidencePool);

  const reportedQuotes = collectReportedQuotesByFindingId(input.activities);

  const thisCaseItems: CaseIntelligenceContextItem[] = hasCurrentNotes
    ? (() => {
        const seen = new Set<string>();
        const items: CaseIntelligenceContextItem[] = [];

        for (const finding of displayFindings) {
          const title = formatObservationFindingForRepDisplay(finding, {
            procedureContext,
            mode: "current_case",
          });
          if (!title || containsOntologyDisplayLabel(title)) continue;

          const key = title.trim().toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);

          const quote = reportedQuotes.get(finding.normalizedFindingId);

          items.push({
            id: `current-${finding.normalizedFindingId}`,
            text: title,
            tone: "current",
            ...(quote ? { quote } : {}),
          });
        }

        return items;
      })()
    : [];

  const providerContextItems: CaseIntelligenceContextItem[] = [];

  if (!hasCurrentNotes) {
    providerContextItems.push(...providerContextFromPrior(priorSignals, fullView, procedureContext, priorCases));
  } else {
    const seenImpact = new Set<string>();
    const noteText = (input.activities ?? [])
      .map((activity) => String(activity.body ?? ""))
      .join(" ");

    if (briefingKind === "support" && /resolved|retrain|addressed|fixed/i.test(noteText)) {
      providerContextItems.push({
        id: "support-resolved",
        text: "Support issue appears resolved or staff may need more guidance.",
        tone: "resolves",
      });
      seenImpact.add("support issue appears resolved or staff may need more guidance.");
    }

    for (const finding of displayFindings) {
      const current = findingToIntelligenceSignal(finding, { procedureContext });
      const matchOptions = reconciliationMatchOptions(finding, currentCaseIdValue, sameCasePriorKeys);
      const poolMatch = findMatchingPriorEvidence(current, priorEvidencePool);
      const prior = poolMatch?.signal;
      const impact = buildContextImpactText(current, prior, {
        caseComplete,
        briefingKind,
        priorSignals: priorIntelligenceSignals,
        matchOptions,
      });
      const key = impact.text.toLowerCase();
      if (seenImpact.has(key)) continue;
      seenImpact.add(key);
      providerContextItems.push({
        id: `impact-${finding.normalizedFindingId}`,
        text: impact.text,
        tone: impact.tone,
      });
    }

    for (const gap of fullView.evidenceGaps) {
      if (/provider pain/i.test(gap)) {
        providerContextItems.push({
          id: "ctx-provider-pain",
          text: "Provider frustrations not yet noted",
          tone: "gap",
        });
      }
      if (/staff pain/i.test(gap)) {
        providerContextItems.push({
          id: "ctx-staff-pain",
          text: "Staff frustrations not yet noted",
          tone: "gap",
        });
      }
    }

    if (providerContextItems.length === 0 && priorSignals.length > 0) {
      providerContextItems.push(...providerContextFromPrior(priorSignals, fullView, procedureContext, priorCases));
    }
  }

  return {
    thisCaseTitle: "This Case",
    thisCaseEmptyMessage:
      "Nothing noted for this case yet. Start dictation or add a quick note after the case.",
    thisCaseItems,
    providerContextTitle: hasCurrentNotes ? "Provider Context" : "Prior Context to Confirm",
    providerContextItems,
  };
}

