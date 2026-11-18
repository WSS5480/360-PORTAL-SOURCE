import type { AggregatedFindingEvidence } from "@/lib/surgical-sales/observationFindingEvidenceConfidence";
import {
  buildCanonicalConceptKey,
  buildCanonicalFindingKeyFromSignal,
  conceptTokens,
  conceptsMatch,
  normalizeConceptText,
  type CanonicalSignalLike,
} from "@/lib/surgical-sales/canonicalFindingIdentity";
import { formatProviderContextComparison } from "@/lib/surgical-sales/canonicalFindingNormalization";
import { buildObservationOnlyFindingTitle } from "@/lib/surgical-sales/findingDisplayContract";
import { translateFindingLabelToRepLanguage } from "@/lib/surgical-sales/observationIntelligenceDisplayLabels";
import { staffEfficiencyRepLabel } from "@/lib/surgical-sales/staffEfficiencyRepLabels";

export { normalizeConceptText, conceptsMatch, conceptTokens, buildCanonicalConceptKey };
export { buildCanonicalFindingKeyFromSignal as buildCanonicalFindingKey } from "@/lib/surgical-sales/canonicalFindingIdentity";

export type ReconcilableSignalType =
  | "observed_product"
  | "competitor_product"
  | "procedure_type"
  | "workflow_signal"
  | "workflow_bottleneck"
  | "product_fit_opportunity"
  | "provider_pain_point"
  | "staff_pain_point"
  | "staff_workflow_signal"
  | "product_handling_issue"
  | "product_adoption_signal"
  | "product_objection"
  | "training_need"
  | "support_issue"
  | "unresolved_gap"
  | "repeated_pattern"
  | "conflicting_evidence";

export type ReconcilableSignal = {
  label: string;
  type: ReconcilableSignalType;
  subtype: string | null;
  procedureContext: string | null;
  productContext: string | null;
  workflowStep: string | null;
  evidenceCount: number;
  completedCaseCount: number;
  confidence: "Low" | "Medium" | "High";
  sourceCaseIds: string[];
  normalizedFindingId: string;
  isPositiveStaffSignal: boolean;
};

export type CaseBriefingKind = "baseline" | "follow_up" | "product_covered" | "support";

export type CanonicalIntelligenceType =
  | "product_used"
  | "competitor_product_used"
  | "workflow_signal"
  | "workflow_bottleneck"
  | "provider_pain_point"
  | "staff_pain_point"
  | "staff_workflow_signal"
  | "product_fit_opportunity"
  | "product_adoption_signal"
  | "product_objection"
  | "training_need"
  | "support_issue"
  | "access_workflow"
  | "scheduling_contact"
  | "credentialing_requirement"
  | "unresolved_gap";

export type ReconciliationStatus =
  | "new"
  | "repeated"
  | "strengthened"
  | "conflicting"
  | "in_progress"
  | "missing";

export type CanonicalIntelligenceFinding = {
  type: CanonicalIntelligenceType;
  subtype: string | null;
  canonicalKey: string;
  displayLabel: string;
  scope: "case" | "provider" | "organization";
  sourceCaseId: string | null;
  sourceProviderId: string | null;
  sourceOrganizationId: string | null;
  caseType: string | null;
  procedureContext: string | null;
  productContext: string | null;
  workflowContext: string | null;
  confidence: number;
  status: ReconciliationStatus;
  signal: ReconcilableSignal;
};

const CONFIDENCE_SCORE: Record<string, number> = {
  High: 0.85,
  Medium: 0.65,
  Low: 0.45,
};

function cleanLabel(label: string): string {
  return label.replace(/\.$/, "").trim();
}

function mapSignalTypeToCanonical(type: ReconcilableSignalType): CanonicalIntelligenceType {
  switch (type) {
    case "observed_product":
      return "product_used";
    case "competitor_product":
      return "competitor_product_used";
    case "workflow_bottleneck":
      return "workflow_bottleneck";
    case "workflow_signal":
      return "workflow_signal";
    case "provider_pain_point":
      return "provider_pain_point";
    case "staff_pain_point":
      return "staff_pain_point";
    case "staff_workflow_signal":
      return "staff_workflow_signal";
    case "product_fit_opportunity":
      return "product_fit_opportunity";
    case "product_adoption_signal":
      return "product_adoption_signal";
    case "product_objection":
      return "product_objection";
    case "training_need":
      return "training_need";
    case "product_handling_issue":
    case "support_issue":
      return "support_issue";
    case "unresolved_gap":
      return "unresolved_gap";
    case "conflicting_evidence":
      return "unresolved_gap";
    case "repeated_pattern":
      return "workflow_signal";
    case "procedure_type":
      return "workflow_signal";
    default:
      return "workflow_signal";
  }
}

function signalToCanonicalInput(signal: ReconcilableSignal): CanonicalSignalLike {
  return {
    type: signal.type,
    label: signal.label,
    normalizedFindingId: signal.normalizedFindingId,
    procedureContext: signal.procedureContext,
    productContext: signal.productContext,
    workflowStep: signal.workflowStep,
    isPositiveStaffSignal: signal.isPositiveStaffSignal,
  };
}

export function buildCanonicalKeyFromSignal(signal: ReconcilableSignal): string {
  return buildCanonicalConceptKey(signalToCanonicalInput(signal));
}

function conceptSegmentFromKey(key: string, typePrefix: string): string {
  if (!key.startsWith(`${typePrefix}:`)) return "";
  const parts = key.split(":");
  return parts.length > 2 ? parts.slice(2).join(":") : parts.slice(1).join(":");
}

function productIdentityFromSignal(signal: ReconcilableSignal): string {
  const key = buildCanonicalKeyFromSignal(signal);
  if (key.startsWith("product_used:") || key.startsWith("competitor_product_used:")) {
    return key.split(":").slice(1).join(":");
  }
  return normalizeConceptText(cleanLabel(signal.label));
}

function workflowConceptFromSignal(signal: ReconcilableSignal): string {
  const key = buildCanonicalKeyFromSignal(signal);
  if (key.startsWith("workflow_signal:") || key.startsWith("workflow_bottleneck:")) {
    return conceptSegmentFromKey(key, key.split(":")[0]!);
  }
  return normalizeConceptText(cleanLabel(signal.label));
}

function painConceptFromSignal(signal: ReconcilableSignal): string {
  const key = buildCanonicalKeyFromSignal(signal);
  if (key.startsWith("provider_pain_point:") || key.startsWith("staff_pain_point:")) {
    return key.split(":").slice(1).join(":");
  }
  return normalizeConceptText(cleanLabel(signal.label));
}

function productFitConceptFromSignal(signal: ReconcilableSignal): string {
  const key = buildCanonicalKeyFromSignal(signal);
  if (key.startsWith("product_fit_opportunity:")) {
    return conceptSegmentFromKey(key, "product_fit_opportunity");
  }
  return normalizeConceptText(cleanLabel(signal.label));
}

function displayLabelFromSignal(signal: ReconcilableSignal): string {
  if (signal.productContext) return cleanLabel(signal.productContext);
  return cleanLabel(signal.label);
}

export function toCanonicalFinding(
  signal: ReconcilableSignal,
  input: {
    sourceCaseId?: string | null;
    sourceProviderId?: string | null;
    sourceOrganizationId?: string | null;
    caseType?: string | null;
    caseComplete?: boolean;
    status?: ReconciliationStatus;
  } = {},
): CanonicalIntelligenceFinding {
  const canonicalType = mapSignalTypeToCanonical(signal.type);
  const workflow = workflowConceptFromSignal(signal);
  const product = productIdentityFromSignal(signal);

  return {
    type: canonicalType,
    subtype: signal.subtype,
    canonicalKey: buildCanonicalKeyFromSignal(signal),
    displayLabel: displayLabelFromSignal(signal),
    scope: "provider",
    sourceCaseId: input.sourceCaseId ?? signal.sourceCaseIds[0] ?? null,
    sourceProviderId: input.sourceProviderId ?? null,
    sourceOrganizationId: input.sourceOrganizationId ?? null,
    caseType: input.caseType ?? null,
    procedureContext: signal.procedureContext,
    productContext: product || null,
    workflowContext: workflow || null,
    confidence: CONFIDENCE_SCORE[signal.confidence] ?? 0.45,
    status: input.status ?? (input.caseComplete ? "repeated" : "in_progress"),
    signal,
  };
}

function canonicalTypesCompatible(
  left: CanonicalIntelligenceType,
  right: CanonicalIntelligenceType,
): boolean {
  if (left === right) return true;
  if (
    (left === "product_used" || left === "competitor_product_used") &&
    (right === "product_used" || right === "competitor_product_used")
  ) {
    return true;
  }
  if (
    (left === "workflow_signal" || left === "workflow_bottleneck") &&
    (right === "workflow_signal" || right === "workflow_bottleneck")
  ) {
    return true;
  }
  if (left === "support_issue" && right === "support_issue") return true;
  if (left === "training_need" && right === "training_need") return true;
  return false;
}

function keysMatch(left: CanonicalIntelligenceFinding, right: CanonicalIntelligenceFinding): boolean {
  if (!canonicalTypesCompatible(left.type, right.type)) return false;
  if (left.canonicalKey === right.canonicalKey) return true;

  if (left.type === "product_used" || left.type === "competitor_product_used") {
    return left.productContext !== null && left.productContext === right.productContext;
  }

  if (left.type === "workflow_signal" || left.type === "workflow_bottleneck") {
    return conceptsMatch(left.workflowContext ?? "", right.workflowContext ?? "");
  }

  if (left.type === "provider_pain_point" || left.type === "staff_pain_point") {
    return conceptsMatch(painConceptFromSignal(left.signal), painConceptFromSignal(right.signal));
  }

  if (left.type === "staff_workflow_signal") {
    return conceptsMatch(left.displayLabel, right.displayLabel);
  }

  if (left.type === "product_fit_opportunity") {
    return conceptsMatch(left.workflowContext ?? left.displayLabel, right.workflowContext ?? right.displayLabel);
  }

  if (left.type === "support_issue" || left.type === "training_need") {
    return conceptsMatch(left.displayLabel, right.displayLabel);
  }

  return conceptsMatch(left.displayLabel, right.displayLabel);
}

function isConflicting(left: CanonicalIntelligenceFinding, right: CanonicalIntelligenceFinding): boolean {
  if (
    (left.type === "product_used" || left.type === "competitor_product_used") &&
    (right.type === "product_used" || right.type === "competitor_product_used")
  ) {
    const leftProduct = left.productContext;
    const rightProduct = right.productContext;
    if (!leftProduct || !rightProduct) return false;
    return leftProduct !== rightProduct;
  }
  return false;
}

export function findConflictingPriorFinding(
  current: CanonicalIntelligenceFinding,
  priors: CanonicalIntelligenceFinding[],
): CanonicalIntelligenceFinding | undefined {
  return priors.find((prior) => isConflicting(current, prior));
}

export type ReconciliationMatchOptions = {
  currentCaseId?: string | null;
  observationCount?: number;
  completedObservationCount?: number;
  sourceCaseIds?: string[];
  /** Canonical keys captured from earlier notes on the same in-progress case. */
  sameCasePriorCanonicalKeys?: string[];
};

export function hasCrossCaseAggregatedEvidence(options: ReconciliationMatchOptions = {}): boolean {
  const currentCaseId = options.currentCaseId ?? null;
  if ((options.observationCount ?? 0) >= 2) return true;
  if ((options.completedObservationCount ?? 0) >= 1) {
    if (!currentCaseId) return true;
    const otherCases = (options.sourceCaseIds ?? []).filter((id) => id !== currentCaseId);
    if (otherCases.length > 0) return true;
  }
  return false;
}

function isCurrentCaseOnlyDuplicate(
  current: CanonicalIntelligenceFinding,
  prior: CanonicalIntelligenceFinding,
  options: ReconciliationMatchOptions,
): boolean {
  const currentCaseId = options.currentCaseId;
  if (!currentCaseId) return false;

  if (options.sameCasePriorCanonicalKeys?.includes(prior.canonicalKey)) {
    return false;
  }

  const priorCaseIds = prior.signal.sourceCaseIds.filter(Boolean);
  if (priorCaseIds.length === 0) return false;

  const onlyCurrentCase = priorCaseIds.every((id) => id === currentCaseId);
  if (!onlyCurrentCase) return false;

  if (prior.signal.normalizedFindingId === current.signal.normalizedFindingId) {
    return true;
  }

  if (keysMatch(current, prior)) {
    return false;
  }

  return true;
}

export function findMatchingPriorFinding(
  current: CanonicalIntelligenceFinding,
  priors: CanonicalIntelligenceFinding[],
  options: ReconciliationMatchOptions = {},
): CanonicalIntelligenceFinding | undefined {
  if (!priors.length) return undefined;

  const eligible = priors.filter((prior) => !isCurrentCaseOnlyDuplicate(current, prior, options));

  const idMatch = eligible.find(
    (prior) => prior.signal.normalizedFindingId === current.signal.normalizedFindingId,
  );
  if (idMatch) return idMatch;

  return eligible.find((prior) => keysMatch(current, prior));
}

export function reconcileFinding(input: {
  current: CanonicalIntelligenceFinding;
  prior?: CanonicalIntelligenceFinding;
  caseComplete: boolean;
  resolved?: boolean;
  matchOptions?: ReconciliationMatchOptions;
}): ReconciliationStatus {
  const { current, prior, caseComplete, resolved, matchOptions = {} } = input;

  if (current.type === "unresolved_gap") return "missing";
  if (resolved) return "strengthened";

  if (prior && isConflicting(current, prior)) return "conflicting";

  if (!prior && hasCrossCaseAggregatedEvidence(matchOptions)) {
    if (!caseComplete) return "in_progress";
    if ((matchOptions.completedObservationCount ?? 0) >= 2) return "strengthened";
    return "repeated";
  }

  if (!prior) return "new";

  const totalCompleted = Math.max(
    current.signal.completedCaseCount,
    current.signal.evidenceCount,
    caseComplete ? prior.signal.completedCaseCount + 1 : prior.signal.completedCaseCount,
  );

  if (!caseComplete) return "in_progress";
  if (totalCompleted >= 2) return "strengthened";
  return "repeated";
}

function titleCasePhrase(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function productDisplayLabel(signal: ReconcilableSignal): string {
  const identity = productIdentityFromSignal(signal);
  if (identity) return titleCasePhrase(identity);
  return cleanLabel(signal.label);
}

function workflowDisplayLabel(signal: ReconcilableSignal): string {
  const fromLabel = cleanLabel(signal.label)
    .replace(/\s+(challenge|challenges|observed|noted|captured|signal)$/i, "")
    .replace(/^extra\s+/i, "")
    .replace(/\s+(usage in use|usage use|usage|in use)$/i, "")
    .trim();
  if (fromLabel) return fromLabel;
  const concept = workflowConceptFromSignal(signal);
  if (concept) return titleCasePhrase(concept);
  return cleanLabel(signal.label);
}

function painDisplayLabel(signal: ReconcilableSignal): string {
  return translateFindingLabelToRepLanguage(cleanLabel(signal.label), {
    signalType: signal.type,
    normalizedFindingId: signal.normalizedFindingId,
    mode: "current_case",
  });
}

function productFitDisplayLabel(signal: ReconcilableSignal): string {
  const concept = productFitConceptFromSignal(signal);
  return titleCasePhrase(concept || cleanLabel(signal.label));
}

export function buildThisCaseDisplayLabel(
  finding: AggregatedFindingEvidence,
  signal: ReconcilableSignal,
): string {
  return buildObservationOnlyFindingTitle(finding, signal);
}

export function cleanProductEvidenceGapLabel(raw: string): string {
  return titleCasePhrase(normalizeConceptText(cleanProductLabel(raw)));
}

function cleanProductLabel(label: string): string {
  return label
    .replace(/\s+usage in use$/i, "")
    .replace(/\s+usage use$/i, "")
    .replace(/\s+used again$/i, "")
    .replace(/\s+in use$/i, "")
    .replace(/\s+usage$/i, "")
    .trim();
}

function resolveTotalCompletedCaseCount(input: {
  signal: ReconcilableSignal;
  matchOptions?: ReconciliationMatchOptions;
  caseComplete: boolean;
  prior?: CanonicalIntelligenceFinding;
}): number {
  const aggregated = Math.max(
    input.matchOptions?.completedObservationCount ?? 0,
    input.signal.completedCaseCount,
  );
  if (aggregated >= 2) return aggregated;
  if (!input.caseComplete || !input.prior) return aggregated;

  const priorCount = input.prior.signal.completedCaseCount;
  const currentCount = Math.max(input.signal.completedCaseCount, input.caseComplete ? 1 : 0);

  if (priorCount >= 1 && currentCount >= 1) {
    return priorCount + currentCount;
  }

  return Math.max(aggregated, priorCount + 1);
}

export function buildProviderContextDisplayText(input: {
  current: CanonicalIntelligenceFinding;
  prior?: CanonicalIntelligenceFinding;
  caseComplete: boolean;
  briefingKind: CaseBriefingKind;
  resolved?: boolean;
  matchOptions?: ReconciliationMatchOptions;
}): { text: string; tone: "adds" | "strengthens" | "resolves" | "conflicts" } {
  const status = reconcileFinding({
    current: input.current,
    prior: input.prior,
    caseComplete: input.caseComplete,
    resolved: input.resolved,
    matchOptions: input.matchOptions,
  });
  const signal = input.current.signal;
  const display = input.current.displayLabel;
  const kind = input.briefingKind;

  if (kind === "support") {
    if (input.resolved || /resolved|addressed|fixed|retrain/i.test(signal.label)) {
      return {
        text: `${painDisplayLabel(signal) || display} resolved — monitor for recurrence.`,
        tone: "resolves",
      };
    }
    if (status === "in_progress" || status === "repeated" || status === "strengthened") {
      if (input.current.type === "training_need") {
        return {
          text: `${painDisplayLabel(signal) || display} repeated — may require escalation or root-cause review.`,
          tone: "strengthens",
        };
      }
      return {
        text: `${painDisplayLabel(signal) || display} repeated — may require escalation or root-cause review.`,
        tone: "strengthens",
      };
    }
    return {
      text: "Capture whether the issue is resolved, what caused it, and whether training or escalation is needed.",
      tone: "adds",
    };
  }

  if (status === "conflicting") {
    const product = productDisplayLabel(signal);
    return {
      text: `${product} differs from prior product use — verify whether product choice depends on case type.`,
      tone: "conflicts",
    };
  }

  if (status === "in_progress" || status === "repeated" || status === "strengthened") {
    const totalCompleted = resolveTotalCompletedCaseCount({
      signal,
      matchOptions: input.matchOptions,
      caseComplete: input.caseComplete,
      prior: input.prior,
    });

    if (input.current.type === "product_used" || input.current.type === "competitor_product_used") {
      const product = productDisplayLabel(signal);
      if (!input.caseComplete) {
        return {
          text: `${product} noted again — also seen in this in-progress case.`,
          tone: "strengthens",
        };
      }
      if (totalCompleted >= 2) {
        return {
          text: `${product} noted in ${totalCompleted} completed cases — same product pattern.`,
          tone: "strengthens",
        };
      }
      return {
        text: `${product} noted again — same product pattern is building.`,
        tone: "strengthens",
      };
    }

    if (input.current.type === "workflow_signal" || input.current.type === "workflow_bottleneck") {
      const workflow = workflowDisplayLabel(signal);
      if (!input.caseComplete) {
        return {
          text: `${workflow} noted again — also seen in this in-progress case.`,
          tone: "strengthens",
        };
      }
      if (totalCompleted >= 2) {
        return {
          text: `${workflow} noted in ${totalCompleted} completed cases — same workflow pattern.`,
          tone: "strengthens",
        };
      }
      return {
        text: `${workflow} noted again — same workflow pattern is building.`,
        tone: "strengthens",
      };
    }

    if (input.current.type === "provider_pain_point") {
      return {
        text: `${painDisplayLabel(signal)} noted again — provider frustration pattern is building.`,
        tone: "strengthens",
      };
    }

    if (input.current.type === "staff_pain_point") {
      return {
        text: `${painDisplayLabel(signal)} noted again — staff frustration pattern is building.`,
        tone: "strengthens",
      };
    }

    if (input.current.type === "staff_workflow_signal") {
      const staffLabel = staffEfficiencyRepLabel(signal.label);
      return {
        text: `${staffLabel} again — positive staff workflow context.`,
        tone: "strengthens",
      };
    }

    if (input.current.type === "product_fit_opportunity") {
      const topic = productFitDisplayLabel(signal);
      return {
        text: `${topic} noted again — product opening looks more consistent.`,
        tone: "strengthens",
      };
    }

    if (input.current.type === "product_adoption_signal") {
      return {
        text: `${productDisplayLabel(signal) || painDisplayLabel(signal)} noted again — product use pattern is building.`,
        tone: "strengthens",
      };
    }

    if (input.current.type === "training_need") {
      return {
        text: `Training need noted: ${painDisplayLabel(signal)}.`,
        tone: "strengthens",
      };
    }

    return {
      text: `${cleanLabel(signal.label)} noted again — builds on a prior observation.`,
      tone: "strengthens",
    };
  }

  if (input.current.type === "product_used" || input.current.type === "competitor_product_used") {
    return {
      text: `New product observed: ${productDisplayLabel(signal)}.`,
      tone: "adds",
    };
  }

  if (input.current.type === "workflow_signal" || input.current.type === "workflow_bottleneck") {
    return {
      text: `New workflow note: ${workflowDisplayLabel(signal)}.`,
      tone: "adds",
    };
  }

  if (input.current.type === "provider_pain_point") {
    return {
      text: `New provider frustration noted: ${painDisplayLabel(signal)}.`,
      tone: "adds",
    };
  }

  if (input.current.type === "staff_pain_point") {
    return {
      text: `New staff frustration noted: ${painDisplayLabel(signal)}.`,
      tone: "adds",
    };
  }

  if (input.current.type === "staff_workflow_signal") {
    return {
      text: `New staff workflow observation: ${staffEfficiencyRepLabel(signal.label)}.`,
      tone: "adds",
    };
  }

  if (input.current.type === "product_fit_opportunity") {
    return {
      text: `New product opening noted: ${productFitDisplayLabel(signal)}.`,
      tone: "adds",
    };
  }

  return {
    text: `New observation: ${cleanLabel(signal.label)}.`,
    tone: "adds",
  };
}

function specificityScore(signal: ReconcilableSignal): number {
  const concept = workflowConceptFromSignal(signal);
  return conceptTokens(concept).length;
}

function isGenericWorkflowSignal(signal: ReconcilableSignal): boolean {
  if (signal.normalizedFindingId === "workflow_delay") return true;
  const tokens = conceptTokens(workflowConceptFromSignal(signal));
  return tokens.length <= 1 || tokens.join(" ") === "delay" || tokens.join(" ") === "workflow delay";
}

function workflowSignalsSubsumed(
  generic: ReconcilableSignal,
  specific: ReconcilableSignal,
): boolean {
  if (!isGenericWorkflowSignal(generic)) return false;
  if (generic.normalizedFindingId === "workflow_delay") return true;
  const genericConcept = workflowConceptFromSignal(generic);
  const specificConcept = workflowConceptFromSignal(specific);
  if (!specificConcept) return false;
  if (!genericConcept || genericConcept === "delay" || genericConcept === "workflow") return true;
  return conceptsMatch(genericConcept, specificConcept);
}

export function dedupeFindingsByCanonicalKey(
  findings: AggregatedFindingEvidence[],
  toSignal: (finding: AggregatedFindingEvidence) => ReconcilableSignal,
): AggregatedFindingEvidence[] {
  if (findings.length <= 1) return findings;

  const signals = findings.map(toSignal);
  const workflowSignals = signals.filter(
    (signal) =>
      mapSignalTypeToCanonical(signal.type) === "workflow_signal" ||
      mapSignalTypeToCanonical(signal.type) === "workflow_bottleneck",
  );
  const hasSpecificWorkflow = workflowSignals.some((signal) => !isGenericWorkflowSignal(signal));

  const filtered = findings.filter((finding, index) => {
    const signal = signals[index]!;
    if (
      hasSpecificWorkflow &&
      isGenericWorkflowSignal(signal) &&
      workflowSignals.some(
        (other, otherIndex) =>
          otherIndex !== index &&
          !isGenericWorkflowSignal(other) &&
          workflowSignalsSubsumed(signal, other),
      )
    ) {
      return false;
    }
    return true;
  });

  const seenKeys = new Set<string>();
  const result: AggregatedFindingEvidence[] = [];

  for (const finding of filtered) {
    const signal = toSignal(finding);
    const key = buildCanonicalKeyFromSignal(signal);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    result.push(finding);
  }

  return result;
}

export function isOrganizationScopedFinding(finding: CanonicalIntelligenceFinding): boolean {
  return (
    finding.type === "access_workflow" ||
    finding.type === "scheduling_contact" ||
    finding.type === "credentialing_requirement"
  );
}

export function isProviderScopedFinding(finding: CanonicalIntelligenceFinding): boolean {
  return !isOrganizationScopedFinding(finding);
}
