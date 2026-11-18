import { buildObservationCaseIntelligenceSections } from "@/lib/surgical-sales/buildObservationCaseBriefingView";
import {
  buildObservationLearningTabView,
  type ObservationLearningTabView,
} from "@/lib/surgical-sales/buildObservationLearningTabView";
import { productNeedsConfirmation } from "@/lib/surgical-sales/buildProviderIntelligenceFieldEvidenceCards";
import {
  buildSharedUnresolvedEvidenceQuestions,
  PROVIDER_UNRESOLVED_QUESTIONS_MAX,
} from "@/lib/surgical-sales/buildSharedUnresolvedEvidenceQuestions";
import { normalizeProductNameFromFindingLabel } from "@/lib/surgical-sales/findingDisplayLabels";
import type { AggregatedFindingEvidence } from "@/lib/surgical-sales/observationFindingEvidenceConfidence";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import { formatCaseIdentityDate } from "@/lib/surgical-sales/buildCaseIdentity";
import {
  buildDebriefReadinessReasons,
  buildProviderRollupCapturedSignals,
} from "@/lib/surgical-sales/observationRepPresentationCopy";
import {
  countCompletedObservationCases,
  isObservationCaseComplete,
} from "@/lib/surgical-sales/observationProgramGate";
import { PROVIDER_OBSERVATION_TARGET } from "@/lib/surgical-sales/providerObservationProgress";
import { resolveEvidencePillarScores } from "@/lib/surgical-sales/universalExtractor/resolveCoachingIntelligenceSignals";
import {
  adaptUniversalFactsToCapturedSignals,
  adaptUniversalFactsToThisObservationItems,
  resolveReadModelSection,
  type UniversalFactsReadModelPayload,
} from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";

const CASE_NOTE_FIELDS = [
  "live_observation_competitors",
  "live_observation_workflow",
  "live_observation_clinical_pain_points",
  "live_observation_staff_process",
  "live_observation_product_fit",
  "live_observation_surgeon_reactions",
  "notes",
] as const;

export type ProviderProductObservationMaturity =
  | "intro_only"
  | "incomplete_case_note"
  | "one_completed_case"
  | "repeated_completed_cases";

export type ProviderProductObservationEvidence = {
  productName: string;
  maturity: ProviderProductObservationMaturity;
  /** Completed cases where this product was observed — not total program progress. */
  completedObservationCount: number;
  whatWeKnowText: string | null;
  emergingSignalLabel: string | null;
  gapText: string;
  gapDescription: string;
  evidenceExcerpt: string | null;
  fieldBriefSentence: string | null;
};

export type ProviderCaseIntelligenceRollup = {
  visible: boolean;
  subtitle: string;
  observationProgressLabel: string;
  capturedNotesLabel: string;
  programStatusLabel: string;
  evidenceMaturityLabel: string;
  maturityPill: string;
  emergingCaseSignals: string[];
  needsMoreEvidence: string[];
  debriefImplication: string[];
  /** @deprecated use emergingCaseSignals */
  earlySignals: string[];
  /** @deprecated use needsMoreEvidence */
  stillNeedsEvidence: string[];
  detailsHref: string | null;
  detailsLabel: string;
  observationCaseNoteExcerpt: string | null;
  completedCount: number;
  totalGoal: number;
  capturedNoteCount: number;
  primaryCaseId: string | null;
  primaryCaseComplete: boolean;
  learningView: ObservationLearningTabView | null;
  productEvidence: ProviderProductObservationEvidence | null;
};

/** @deprecated use ProviderCaseIntelligenceRollup */
export type ProviderObservationIntelligenceRollup = ProviderCaseIntelligenceRollup;

function caseNoteActivities(
  caseRow: Record<string, unknown> | null | undefined,
): Array<{ activity_type?: string; body?: string; metadata_json?: Record<string, unknown> | null }> {
  const nested = caseRow?.activities;
  if (!Array.isArray(nested)) return [];
  return nested as Array<{ activity_type?: string; body?: string; metadata_json?: Record<string, unknown> | null }>;
}

function completedCapturePrefix(completedCount: number): string {
  if (completedCount === 1) return "One completed observation has captured";
  if (completedCount >= 2) return `${completedCount} completed observations have captured`;
  return "Observation notes captured";
}

function normalizeCaseType(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

function observationCases(cases: Array<Record<string, unknown>> | undefined): Array<Record<string, unknown>> {
  return (cases ?? []).filter((row) => normalizeCaseType(row.case_type) === "observation");
}

export function observationCaseHasCapturedNotes(caseRow: Record<string, unknown>): boolean {
  if (CASE_NOTE_FIELDS.some((field) => String(caseRow[field] ?? "").trim().length > 0)) {
    return true;
  }
  const nested = caseRow.activities;
  if (!Array.isArray(nested)) return false;
  return nested.some(
    (activity) =>
      String((activity as { activity_type?: string }).activity_type ?? "")
        .trim()
        .toLowerCase() === "note" &&
      String((activity as { body?: string }).body ?? "").trim().length > 0,
  );
}

function caseUpdatedAt(caseRow: Record<string, unknown>): number {
  const raw = caseRow.updated_at ?? caseRow.created_at ?? 0;
  const parsed = Date.parse(String(raw));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function resolvePrimaryObservationCase(
  cases: Array<Record<string, unknown>>,
): Record<string, unknown> | null {
  const withNotes = cases.filter(observationCaseHasCapturedNotes);
  if (withNotes.length === 0) return cases[0] ?? null;

  const incompleteWithNotes = withNotes.filter((row) => !isObservationCaseComplete(row));
  const pool = incompleteWithNotes.length > 0 ? incompleteWithNotes : withNotes;
  return [...pool].sort((a, b) => caseUpdatedAt(b) - caseUpdatedAt(a))[0] ?? null;
}

function countCapturedNoteCases(cases: Array<Record<string, unknown>>): number {
  return cases.filter(observationCaseHasCapturedNotes).length;
}

function countProviderCompletedObservations(input: {
  observationCases: Array<Record<string, unknown>>;
  providerContact?: Record<string, unknown> | null;
  primaryCase: Record<string, unknown> | null;
}): number {
  const priorCases = input.observationCases.filter(
    (row) => String(row.id ?? "") !== String(input.primaryCase?.id ?? ""),
  );
  if (input.primaryCase) {
    return countCompletedObservationCases(input.primaryCase, priorCases);
  }
  return priorCases.filter((row) => isObservationCaseComplete(row)).length;
}

function resolveProviderNameFromContact(contact: Record<string, unknown>): string | null {
  const name = contactDisplayName(
    contact as Parameters<typeof contactDisplayName>[0],
  );
  return name === "—" ? null : name;
}

function extractProductUseFindings(
  learningView: ObservationLearningTabView | null,
): AggregatedFindingEvidence[] {
  return (
    learningView?.knownFindings.filter(
      (finding) =>
        finding.normalizedFindingId.startsWith("product_in_use:") ||
        /\bin use\b|\bobserved\b|\bused again\b/i.test(finding.label),
    ) ?? []
  );
}

function caseRowHintsProductUse(
  caseRow: Record<string, unknown> | null | undefined,
  productName: string,
): boolean {
  if (!caseRow) return false;
  const text = CASE_NOTE_FIELDS.map((field) => String(caseRow[field] ?? "").trim())
    .filter(Boolean)
    .join(". ");
  if (!text) return false;
  const productPattern = new RegExp(productName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return productPattern.test(text) || /\b(in use|using|used)\b/i.test(text);
}

function buildRollupEarlySignals(input: {
  learningView: ObservationLearningTabView | null;
  providerName: string | null;
  primaryCase: Record<string, unknown> | null;
  priorCases: Array<Record<string, unknown>>;
  contact: Record<string, unknown>;
  completedCount: number;
  primaryCaseComplete: boolean;
}): string[] {
  if (!input.learningView || !input.primaryCase) return [];

  const sections = buildObservationCaseIntelligenceSections({
    caseRow: input.primaryCase,
    providerContact: input.contact,
    priorCases: input.priorCases,
    activities: caseNoteActivities(input.primaryCase),
  });

  return buildProviderRollupCapturedSignals({
    findings: input.learningView.knownFindings,
    providerName: input.providerName,
    completedCount: input.completedCount,
    primaryCaseComplete: input.primaryCaseComplete,
    currentCaseHasCapturedNotes: input.learningView.currentCaseHasCapturedNotes,
    thisObservationLines: sections.thisCaseItems.map((item) => item.text),
  });
}

function resolveEvidenceMaturityLabel(
  learningView: ObservationLearningTabView | null,
  completedCount: number,
  primaryCase?: Record<string, unknown> | null,
): string {
  const dateSuffix = (() => {
    if (!primaryCase) return "";
    const { dateLine } = formatCaseIdentityDate(primaryCase.case_date as string | null | undefined);
    return dateLine && dateLine !== "Date TBD" ? ` · ${dateLine}` : "";
  })();

  if (!learningView?.hasCapturedEvidence) return "No case notes yet";
  if (learningView.evidenceProgressValidatedCount > 0) return "Validated case patterns";
  if (completedCount === 1) return `Observed in 1 completed case${dateSuffix}`;
  if (completedCount >= 2) return `Observed across completed cases${dateSuffix}`;
  return "Early case signals";
}

function resolveMaturityPill(
  learningView: ObservationLearningTabView | null,
  completedCount: number,
  primaryCase?: Record<string, unknown> | null,
): string {
  const label = resolveEvidenceMaturityLabel(learningView, completedCount, primaryCase);
  if (label === "Early case signals") return "Early signals";
  if (label === "Validated case patterns") return "Validated patterns";
  if (
    label.startsWith("Observed in 1 completed case") ||
    label.startsWith("Observed across completed cases")
  ) {
    return "Observed";
  }
  return "Building";
}

export function buildObservationCaseNoteEvidenceExcerpt(input: {
  completedCount: number;
  capturedNoteCount: number;
  primaryCaseComplete: boolean;
}): string {
  const noteLabel =
    input.capturedNoteCount === 1
      ? "1 case note captured"
      : `${input.capturedNoteCount} case notes captured`;

  if (input.capturedNoteCount > 0 && input.completedCount === 0) {
    return `${noteLabel} · not yet counted as a completed observation`;
  }

  if (input.completedCount > 0) {
    const caseLabel =
      input.completedCount === 1
        ? "1 observation case complete"
        : `${input.completedCount} observation cases complete`;
    return `${caseLabel} · ${noteLabel}`;
  }

  return noteLabel;
}

function buildDebriefImplication(input: {
  learningView: ObservationLearningTabView | null;
  providerName: string | null;
  primaryCase: Record<string, unknown> | null;
  priorCases: Array<Record<string, unknown>>;
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
}): string[] {
  if (!input.learningView) {
    return [];
  }

  const resolvedPillarScores = input.primaryCase
    ? resolveEvidencePillarScores({
        oiePillars: input.learningView.evidenceProgress.map((pillar) => ({
          id: pillar.id,
          label: pillar.label,
          status: pillar.status,
          maturityStatus: pillar.validated
            ? "validated_pattern"
            : pillar.status === "missing"
              ? "missing"
              : "captured_signal",
          validated: pillar.validated,
          confirmed: pillar.confirmed,
          supportingFactCount: 0,
        })),
        universalFactsReadModel: input.universalFactsReadModel,
        caseRow: input.primaryCase,
        priorCases: input.priorCases,
      })
    : input.learningView.evidenceProgress.map((pillar) => ({
        id: pillar.id,
        label: pillar.label,
        status: pillar.status,
        maturityStatus: pillar.validated
          ? "validated_pattern"
          : pillar.status === "missing"
            ? "missing"
            : "captured_signal",
        validated: pillar.validated,
        confirmed: pillar.confirmed,
        supportingFactCount: 0,
      }));

  return buildDebriefReadinessReasons({
    findings: input.learningView.knownFindings,
    evidenceGaps: input.learningView.evidenceGaps,
    evidenceProgress: resolvedPillarScores.map((pillar) => ({
      id: pillar.id,
      label: pillar.label,
      status: pillar.status,
      validated: pillar.validated,
      confirmed: pillar.confirmed,
    })),
    providerName: input.providerName,
  });
}

function buildRollupStillNeedsEvidence(input: {
  contact: Record<string, unknown>;
  primaryCase: Record<string, unknown> | null;
  priorCases: Array<Record<string, unknown>>;
  learningView: ObservationLearningTabView | null;
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
}): string[] {
  if (!input.learningView || !input.primaryCase) return [];

  return buildSharedUnresolvedEvidenceQuestions({
    caseRow: input.primaryCase,
    priorCases: input.priorCases,
    providerContact: input.contact,
    activities: caseNoteActivities(input.primaryCase),
    learningView: input.learningView,
    universalFactsReadModel: input.universalFactsReadModel,
    maxItems: PROVIDER_UNRESOLVED_QUESTIONS_MAX,
  });
}

function buildObservedProductEvidence(input: {
  productName: string;
  maturity: ProviderProductObservationMaturity;
  completedObservationCount: number;
}): ProviderProductObservationEvidence {
  const productCompletedCount = Math.max(0, input.completedObservationCount);

  if (input.maturity === "repeated_completed_cases") {
    return {
      productName: input.productName,
      maturity: input.maturity,
      completedObservationCount: productCompletedCount,
      whatWeKnowText: `${input.productName} observed`,
      emergingSignalLabel: `${input.productName} observed`,
      gapText: "",
      gapDescription: "",
      evidenceExcerpt: `${input.productName} has been observed across multiple cases and appears to be part of the provider's current workflow.`,
      fieldBriefSentence:
        productCompletedCount >= 2
          ? `${completedCapturePrefix(productCompletedCount)} ${input.productName} use`
          : null,
    };
  }

  if (input.maturity === "one_completed_case") {
    return {
      productName: input.productName,
      maturity: input.maturity,
      completedObservationCount: productCompletedCount,
      whatWeKnowText: `${input.productName} observed`,
      emergingSignalLabel: `${input.productName} observed`,
      gapText: `Confirm ${input.productName} consistency across cases`,
      gapDescription: `${input.productName} was observed in 1 observation case. Confirm whether this repeats across additional cases.`,
      evidenceExcerpt: `${input.productName} was observed in 1 observation case. Confirm whether usage is consistent across additional cases.`,
      fieldBriefSentence: `One completed observation has captured ${input.productName} use`,
    };
  }

  return {
    productName: input.productName,
    maturity: "incomplete_case_note",
    completedObservationCount: productCompletedCount,
    whatWeKnowText: `${input.productName} observed`,
    emergingSignalLabel: `${input.productName} observed`,
    gapText: `Confirm ${input.productName} consistency across cases`,
    gapDescription: `${input.productName} was captured in the current case note. Confirm consistency once observations are completed.`,
    evidenceExcerpt: `${input.productName} was captured in the current case note. Confirm whether usage is consistent across completed observations.`,
    fieldBriefSentence: `A current observation case note has captured ${input.productName} use`,
  };
}

export function resolveProviderProductObservationEvidence(input: {
  contact: Record<string, unknown>;
  learningView: ObservationLearningTabView | null;
  primaryCase?: Record<string, unknown> | null;
  completedCount?: number;
  capturedNoteCount?: number;
}): ProviderProductObservationEvidence | null {
  const introProduct = productNeedsConfirmation(input.contact);
  const productFindings = extractProductUseFindings(input.learningView);

  const productName =
    normalizeProductNameFromFindingLabel(productFindings[0]?.label ?? "") ||
    introProduct?.productName;
  if (!productName) return null;

  const primaryCaseComplete = input.learningView?.currentCaseComplete ?? false;
  const completedCount = input.completedCount ?? input.learningView?.progress.completed ?? 0;
  const capturedNoteCount = input.capturedNoteCount ?? 0;

  if (productFindings.length === 0) {
    const hasCaseProductSignal =
      (capturedNoteCount > 0 || completedCount > 0) &&
      caseRowHintsProductUse(input.primaryCase, productName);

    if (hasCaseProductSignal) {
      let maturity: ProviderProductObservationMaturity = "incomplete_case_note";
      let productCompletedCount = 0;
      if (completedCount >= 2) {
        maturity = "repeated_completed_cases";
        productCompletedCount = completedCount;
      } else if (completedCount >= 1 && primaryCaseComplete) {
        maturity = "one_completed_case";
        productCompletedCount = 1;
      }
      return buildObservedProductEvidence({
        productName,
        maturity,
        completedObservationCount: productCompletedCount,
      });
    }

    if (!introProduct) return null;
    return {
      productName,
      maturity: "intro_only",
      completedObservationCount: 0,
      whatWeKnowText: null,
      emergingSignalLabel: null,
      gapText: "Confirm current product use",
      gapDescription: `${productName} was mentioned. Confirm product usage during first observation.`,
      evidenceExcerpt: `${productName} was mentioned, but product usage should be confirmed during the first observation.`,
      fieldBriefSentence: null,
    };
  }

  const maxCompletedCount = Math.max(...productFindings.map((finding) => finding.completedObservationCount), 0);
  const hasIncompleteCapture = productFindings.some((finding) => finding.capturedFromCurrentNote);

  let maturity: ProviderProductObservationMaturity;
  if (maxCompletedCount >= 2) {
    maturity = "repeated_completed_cases";
  } else if (maxCompletedCount >= 1 && primaryCaseComplete && !hasIncompleteCapture) {
    maturity = "one_completed_case";
  } else if (hasIncompleteCapture || maxCompletedCount === 0) {
    maturity = "incomplete_case_note";
  } else {
    maturity = "one_completed_case";
  }

  if (
    maturity === "repeated_completed_cases" ||
    maturity === "one_completed_case" ||
    maturity === "incomplete_case_note"
  ) {
    return buildObservedProductEvidence({
      productName,
      maturity,
      completedObservationCount: maxCompletedCount,
    });
  }

  return {
    productName,
    maturity: "intro_only",
    completedObservationCount: 0,
    whatWeKnowText: null,
    emergingSignalLabel: null,
    gapText: "Confirm current product use",
    gapDescription: `${productName} was mentioned. Confirm product usage during first observation.`,
    evidenceExcerpt: `${productName} was mentioned, but product usage should be confirmed during the first observation.`,
    fieldBriefSentence: null,
  };
}

export function buildCaseIntelligenceBriefLead(rollup: ProviderCaseIntelligenceRollup): string | null {
  if (!rollup.visible) return null;

  const productName = rollup.productEvidence?.productName;
  const productCompletedCount = rollup.productEvidence?.completedObservationCount ?? 0;
  const hasWorkflow = rollup.emergingCaseSignals.some((signal) =>
    /visualization|fixation|workflow/i.test(signal),
  );
  const workflowPhrase = "an early visualization/fixation workflow signal";

  if (productCompletedCount > 0 && rollup.primaryCaseComplete && productName) {
    const prefix = completedCapturePrefix(productCompletedCount);
    const parts = [`${productName} use`];
    if (hasWorkflow) parts.push(workflowPhrase);
    return `${prefix} ${parts.join(" and ")}.`;
  }

  if (rollup.capturedNoteCount > 0 && productName) {
    const parts = [`${productName} use`];
    if (hasWorkflow) parts.push(workflowPhrase);
    return `A current observation case note has captured ${parts.join(" and ")}, but the case has not been marked complete.`;
  }

  return buildObservationFieldBriefSentence(rollup);
}

export function buildObservationFieldBriefSentence(
  rollup: ProviderCaseIntelligenceRollup,
): string | null {
  if (!rollup.visible || rollup.capturedNoteCount === 0) return null;

  const hasWorkflowSignal = rollup.emergingCaseSignals.some((signal) =>
    /visualization|fixation|workflow/i.test(signal),
  );
  const productSentence = rollup.productEvidence?.fieldBriefSentence;
  const productCompletedCount = rollup.productEvidence?.completedObservationCount ?? 0;

  if (!productSentence && !hasWorkflowSignal) return null;

  const parts: string[] = [];
  if (productSentence) parts.push(productSentence);
  if (hasWorkflowSignal) {
    parts.push("an early visualization/fixation workflow signal");
  }

  let signalText = "";
  if (parts.length === 2) {
    signalText = `${parts[0]} and ${parts[1]}`;
  } else {
    signalText = parts[0] ?? "observation intelligence signals";
  }

  if (rollup.completedCount > 0 && !rollup.primaryCaseComplete) {
    return `Observation notes captured ${signalText}, but the current case has not been marked complete.`;
  }

  if (productCompletedCount > 0 && rollup.primaryCaseComplete) {
    return `${completedCapturePrefix(productCompletedCount)} ${signalText}.`;
  }

  if (rollup.completedCount > 0 && rollup.primaryCaseComplete) {
    return `${completedCapturePrefix(rollup.completedCount)} ${signalText}.`;
  }

  return `A current observation case note has captured ${signalText}, but the case has not been marked complete.`;
}

export function buildProviderCaseIntelligenceRollup(input: {
  contact: Record<string, unknown>;
  providerId: string;
  cases?: Array<Record<string, unknown>>;
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
}): ProviderCaseIntelligenceRollup | null {
  const obsCases = observationCases(input.cases);
  if (obsCases.length === 0) return null;

  const capturedNoteCount = countCapturedNoteCases(obsCases);
  const primaryCase = resolvePrimaryObservationCase(obsCases);
  const priorCases = obsCases.filter((row) => String(row.id ?? "") !== String(primaryCase?.id ?? ""));
  const completedCount = countProviderCompletedObservations({
    observationCases: obsCases,
    providerContact: input.contact,
    primaryCase,
  });

  if (capturedNoteCount === 0 && completedCount === 0) return null;

  const learningView = primaryCase
    ? buildObservationLearningTabView({
        caseRow: primaryCase,
        activities: caseNoteActivities(primaryCase),
        providerContact: input.contact,
        priorCases,
      })
    : null;

  const productEvidence = resolveProviderProductObservationEvidence({
    contact: input.contact,
    learningView,
    primaryCase,
    completedCount,
    capturedNoteCount,
  });

  const providerName = resolveProviderNameFromContact(input.contact);
  const primaryCaseComplete = primaryCase ? isObservationCaseComplete(primaryCase) : false;
  const oieEmergingCaseSignals = buildRollupEarlySignals({
    learningView,
    providerName,
    primaryCase,
    priorCases,
    contact: input.contact,
    completedCount,
    primaryCaseComplete,
  });

  const oieThisObservationLines =
    primaryCase && learningView
      ? buildObservationCaseIntelligenceSections({
          caseRow: primaryCase,
          providerContact: input.contact,
          priorCases,
          activities: caseNoteActivities(primaryCase),
        }).thisCaseItems.map((item) => item.text)
      : [];

  const ufThisObservationLines =
    input.universalFactsReadModel?.providerRuns?.length && primaryCase
      ? adaptUniversalFactsToThisObservationItems({
          caseRuns: input.universalFactsReadModel.providerRuns,
          caseId: String(primaryCase.id ?? "").trim(),
          hasCurrentNotes: learningView?.currentCaseHasCapturedNotes ?? false,
          providerName,
        }).map((item) => item.text)
      : [];

  const thisObservationLines = resolveReadModelSection(
    ufThisObservationLines,
    () => oieThisObservationLines,
  );

  const emergingCaseSignals = resolveReadModelSection(
    input.universalFactsReadModel?.providerRuns?.length
      ? adaptUniversalFactsToCapturedSignals({
          providerRuns: input.universalFactsReadModel.providerRuns,
          completedCaseIds: obsCases
            .filter((row) => isObservationCaseComplete(row))
            .map((row) => String(row.id ?? "").trim())
            .filter(Boolean),
          programCompletedCount: completedCount,
          currentCaseHasCapturedNotes: learningView?.currentCaseHasCapturedNotes ?? false,
          primaryCaseComplete,
          thisObservationLines,
          providerName,
        })
      : [],
    () => oieEmergingCaseSignals,
  );
  const needsMoreEvidence = buildRollupStillNeedsEvidence({
    contact: input.contact,
    primaryCase,
    priorCases,
    learningView,
    universalFactsReadModel: input.universalFactsReadModel,
  });
  const debriefImplication = buildDebriefImplication({
    learningView,
    providerName,
    primaryCase,
    priorCases,
    universalFactsReadModel: input.universalFactsReadModel,
  });

  const primaryCaseId = primaryCase ? String(primaryCase.id ?? "").trim() || null : null;
  const observationProgressLabel = `${completedCount} of ${PROVIDER_OBSERVATION_TARGET} observation cases complete`;
  const capturedNotesLabel =
    capturedNoteCount === 1 ? "1 case note captured" : `${capturedNoteCount} case notes captured`;
  const observationCaseNoteExcerpt = buildObservationCaseNoteEvidenceExcerpt({
    completedCount,
    capturedNoteCount,
    primaryCaseComplete,
  });

  return {
    visible: true,
    subtitle: "Evidence from observed and covered cases",
    observationProgressLabel,
    capturedNotesLabel,
    programStatusLabel: `${observationProgressLabel} · ${capturedNotesLabel}`,
    evidenceMaturityLabel: resolveEvidenceMaturityLabel(learningView, completedCount, primaryCase),
    maturityPill: resolveMaturityPill(learningView, completedCount, primaryCase),
    observationCaseNoteExcerpt,
    emergingCaseSignals,
    needsMoreEvidence,
    debriefImplication,
    earlySignals: emergingCaseSignals,
    stillNeedsEvidence: needsMoreEvidence,
    detailsHref: primaryCaseId
      ? `/portal/sales/cases/${encodeURIComponent(primaryCaseId)}`
      : null,
    detailsLabel: "View case details",
    completedCount,
    totalGoal: PROVIDER_OBSERVATION_TARGET,
    capturedNoteCount,
    primaryCaseId,
    primaryCaseComplete,
    learningView,
    productEvidence,
  };
}

/** @deprecated use buildProviderCaseIntelligenceRollup */
export const buildProviderObservationIntelligenceRollup = buildProviderCaseIntelligenceRollup;
