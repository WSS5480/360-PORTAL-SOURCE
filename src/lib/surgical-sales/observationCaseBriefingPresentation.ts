/**
 * Pre-case briefing presentation — Next Best Action First field guide.
 * Wraps calculation-layer case focus; does not change scoring or signal detection.
 */

import type { CaseBriefingKind, IntelligenceSignal } from "@/lib/surgical-sales/caseIntelligenceSignals";
import {
  buildCaseFocusFromSignals,
  buildIntelligenceSignals,
  CASE_BRIEF_BASELINE_MISSING,
  resolveCaseBriefingKind,
  resolveProcedureContext,
} from "@/lib/surgical-sales/caseIntelligenceSignals";
import { buildCanonicalKeyFromSignal } from "@/lib/surgical-sales/caseIntelligenceReconciliation";
import { buildObservationLearningTabView } from "@/lib/surgical-sales/buildObservationLearningTabView";
import type { AggregatedFindingEvidence } from "@/lib/surgical-sales/observationFindingEvidenceConfidence";
import {
  formatEstablishedFindingRepLine,
  resolveProviderDisplayName,
  sanitizeRepFacingCopy,
  translateEvidenceGapToLearningQuestion,
} from "@/lib/surgical-sales/observationRepPresentationCopy";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import {
  repCompletedCaseCount,
  repFindingCountsFromSignal,
  repProgramCompletedCaseCountFromCases,
  repWorkflowTopicFromLabel,
} from "@/lib/surgical-sales/observationRepFindingPresentation";
import type { ObservationLearningTabView } from "@/lib/surgical-sales/buildObservationLearningTabView";
import { OBSERVATION_BRIEFING_STILL_NEED_MAX } from "@/lib/surgical-sales/observationLearningObjectiveLimits";
import {
  formatRepeatEvidenceConsistencyObjective,
  translateLearningObjectiveTopic,
} from "@/lib/surgical-sales/observationLearningObjectiveDisplay";
import {
  adaptUniversalFactsToBriefingKnownSoFarLines,
  currentCaseUfFactsFromReadModel,
  mergeCurrentCaseCaptureSummaries,
  priorCompletedObservationCaseIds,
  resolveActiveOperationalNoteIdsFromActivities,
  resolveReadModelSection,
  summarizeCurrentCaseCapturesFromUfFacts,
  type UniversalFactsReadModelPayload,
} from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import {
  resolveCoachingIntelligenceSignals,
  resolveEvidenceGapsForCase,
} from "@/lib/surgical-sales/universalExtractor/resolveCoachingIntelligenceSignals";

export {
  OBSERVATION_BRIEFING_STILL_NEED_MAX,
  OBSERVATION_INTELLIGENCE_STILL_NEED_MAX,
} from "@/lib/surgical-sales/observationLearningObjectiveLimits";

export const BRIEFING_ENGINE_TERM_PATTERN =
  /\b(repeat evidence|signal captured|early signal|captured signal|validated|supported pattern|confidence|maturity|evidence threshold|pain points?|hypothesis|strengthens?|gather evidence|validate whether|\bsignal\b|\bevidence\b|\bfindings captured|\bintelligence\b)/i;

/** @deprecated use BRIEFING_ENGINE_TERM_PATTERN */
export const ENGINE_TERM_PATTERN = BRIEFING_ENGINE_TERM_PATTERN;

const BASELINE_STILL_NEED = [
  "Identify which products are used during the case",
  "Watch for workflow delays or friction points",
  "Listen for provider frustration during the case",
  "Listen for staff frustration, delays, workarounds, or complaints",
  "Watch for moments where a different product might help during the case",
] as const;

/** Baseline prompts that current-case captures can resolve or reframe (post-capture fix). */
const BASELINE_PRODUCT_PROMPT = BASELINE_STILL_NEED[0];
const BASELINE_WORKFLOW_PROMPT = BASELINE_STILL_NEED[1];
const BASELINE_PROVIDER_PROMPT = BASELINE_STILL_NEED[2];
const BASELINE_STAFF_PROMPT = BASELINE_STILL_NEED[3];
const BASELINE_PRODUCT_FIT_PROMPT = BASELINE_STILL_NEED[4];

function resolveBriefingProviderName(input: {
  caseRow: Record<string, unknown>;
  providerContact?: Record<string, unknown> | null;
}): string | null {
  const fromRow = resolveProviderDisplayName(input.caseRow);
  if (fromRow) return fromRow;
  if (!input.providerContact) return null;
  const fromContact = contactDisplayName(
    input.providerContact as Parameters<typeof contactDisplayName>[0],
  );
  return fromContact && fromContact !== "—" ? fromContact : null;
}

const VISUALIZATION_RECURRENCE_PROMPT =
  "Note whether extra visualization or evaluation time shows up again in future cases";
const WORKFLOW_RECURRENCE_PROMPT =
  "Determine whether the workflow issues observed repeat in future cases";
const PROCEDURAL_PATTERN_PROMPT =
  "Watch whether procedural decision-making patterns repeat across future cases";
const PROVIDER_FUTURE_PROMPT =
  "Continue listening for provider frustration or product dissatisfaction in future observations";

type CurrentCaseCaptureSummary = {
  hasProduct: boolean;
  hasVisualization: boolean;
  hasOtherWorkflowIssue: boolean;
  hasPositiveStaff: boolean;
  hasStaffFriction: boolean;
  hasProviderFrustration: boolean;
};

function summarizeCurrentCaseCaptures(
  findings: AggregatedFindingEvidence[],
): CurrentCaseCaptureSummary {
  const summary: CurrentCaseCaptureSummary = {
    hasProduct: false,
    hasVisualization: false,
    hasOtherWorkflowIssue: false,
    hasPositiveStaff: false,
    hasStaffFriction: false,
    hasProviderFrustration: false,
  };

  for (const finding of findings) {
    const id = finding.normalizedFindingId ?? "";
    if (id.startsWith("product_in_use:") || id.startsWith("competitor_product:")) {
      summary.hasProduct = true;
    } else if (id === "workflow_visualization_before_fixation" || id === "visualization_challenge") {
      summary.hasVisualization = true;
    } else if (
      id === "workflow_delay" ||
      id === "room_turnover_delay" ||
      id === "staff_supply_delay" ||
      id === "staff_supply_setup_delay"
    ) {
      summary.hasOtherWorkflowIssue = true;
    } else if (id.startsWith("staff_efficiency")) {
      summary.hasPositiveStaff = true;
    } else if (id === "staff_friction") {
      summary.hasStaffFriction = true;
    } else if (id === "provider_frustration") {
      summary.hasProviderFrustration = true;
    }
  }

  return summary;
}

/**
 * Post-capture fix for the baseline "Still Need To Learn" checklist: once the
 * current observation has captured findings, prompts that are already answered
 * by this case are removed or reframed as future-looking follow-ups so the
 * section never contradicts "This Observation". With no current-case findings
 * the baseline list is returned unchanged.
 */
export function applyCurrentCaseCapturesToBaselineStillNeed(
  baseline: readonly string[],
  currentCaseFindings: AggregatedFindingEvidence[],
  captureSummary?: CurrentCaseCaptureSummary,
): string[] {
  if (currentCaseFindings.length === 0 && !captureSummary) {
    return [...baseline];
  }

  const captured =
    captureSummary ?? summarizeCurrentCaseCaptures(currentCaseFindings);
  const lines: string[] = [];

  for (const prompt of baseline) {
    if (prompt === BASELINE_PRODUCT_PROMPT) {
      // Product already identified in this observation — prompt is resolved.
      if (captured.hasProduct) continue;
      lines.push(prompt);
      continue;
    }

    if (prompt === BASELINE_WORKFLOW_PROMPT) {
      if (captured.hasVisualization) {
        lines.push(VISUALIZATION_RECURRENCE_PROMPT);
      } else if (captured.hasOtherWorkflowIssue) {
        lines.push(WORKFLOW_RECURRENCE_PROMPT);
      } else {
        lines.push(prompt);
      }
      continue;
    }

    if (prompt === BASELINE_PROVIDER_PROMPT) {
      // Frustration captured ⇒ resolved; otherwise keep a future-looking
      // prompt that doesn't imply something was expected and missed.
      if (!captured.hasProviderFrustration) lines.push(PROVIDER_FUTURE_PROMPT);
      continue;
    }

    if (prompt === BASELINE_STAFF_PROMPT) {
      // Staff friction captured ⇒ resolved. Positive staff workflow captured
      // ⇒ don't imply staff friction is a gap in this case.
      if (captured.hasStaffFriction || captured.hasPositiveStaff) continue;
      lines.push(prompt);
      continue;
    }

    if (prompt === BASELINE_PRODUCT_FIT_PROMPT) {
      if (captured.hasVisualization) {
        lines.push(PROCEDURAL_PATTERN_PROMPT);
      } else {
        lines.push(prompt);
      }
      continue;
    }

    lines.push(prompt);
  }

  return lines;
}

const BASELINE_FOCUS = [
  "Observe workflow, product use, and any provider or staff friction",
  "Confirm current product usage",
  "Listen for provider frustration",
  "Listen for staff complaints or workarounds",
] as const;

export type ObservationCaseBriefingRepView = {
  kind: CaseBriefingKind;
  focusToday: string[];
  whyThisMatters: string;
  knownSoFar: string[];
  stillNeedToLearn: string[];
  sectionTitles: {
    focus: string;
    why: string;
    known: string;
    stillNeed: string;
  };
  /** Legacy shape for tests and callers expecting CaseFocusView */
  caseFocus: {
    knownSoFar: string[];
    stillMissing: string[];
    focusToday: string;
  };
};

function cleanProductLabel(label: string): string {
  return label
    .replace(/\s+usage in use$/i, "")
    .replace(/\s+observed$/i, "")
    .replace(/\s+in use$/i, "")
    .trim();
}

function productDisplayName(signal: IntelligenceSignal): string {
  return cleanProductLabel(String(signal.productContext ?? signal.label));
}

function isVisualizationWorkflowSignal(signal: IntelligenceSignal): boolean {
  return /visuali.*fixation|fixation.*visuali|visualization_fixation|visualization\/fixation/i.test(
    `${signal.label} ${signal.workflowStep ?? ""} ${signal.normalizedFindingId}`,
  );
}

function isWorkflowDelaySignal(signal: IntelligenceSignal): boolean {
  return (
    signal.normalizedFindingId === "workflow_delay" ||
    /delay|slowed|slow the flow|slow workflow/i.test(`${signal.label} ${signal.workflowStep ?? ""}`)
  );
}

function isVisualizationWorkflowFinding(finding: AggregatedFindingEvidence): boolean {
  return (
    finding.normalizedFindingId === "workflow_visualization_before_fixation" ||
    /visualization.*fixation|fixation.*visualization/i.test(
      `${finding.label} ${finding.normalizedFindingId}`,
    )
  );
}

function pickStrongestFinding(
  findings: AggregatedFindingEvidence[],
  predicate: (finding: AggregatedFindingEvidence) => boolean,
): AggregatedFindingEvidence | undefined {
  return [...findings]
    .filter(predicate)
    .sort((left, right) => right.completedObservationCount - left.completedObservationCount)[0];
}

function workflowTopicFromSignal(signal: IntelligenceSignal): string {
  if (isVisualizationWorkflowSignal(signal)) return "visualization before fixation";
  if (isWorkflowDelaySignal(signal)) return "workflow delay";
  return repWorkflowTopicFromLabel(signal.workflowStep ?? signal.label);
}

export function formatBriefingLearningQuestion(input: {
  text: string;
  signals: IntelligenceSignal[];
}): string {
  const translated = translateEvidenceGapToLearningQuestion(input.text);

  if (/^repeat evidence for\s+/i.test(input.text)) {
    const topic = input.text.replace(/^repeat evidence for\s+/i, "").trim();
    return formatRepeatEvidenceConsistencyObjective(topic);
  }

  if (/^confirm whether .+ repeats$/i.test(translated)) {
    const match = translated.match(/^confirm whether (.+?) repeats$/i);
    if (match?.[1]) {
      return `Confirm whether ${translateLearningObjectiveTopic(match[1].trim())} appears in this case`;
    }
  }

  if (/provider pain/i.test(input.text) || translated === "Additional provider frustrations") {
    return "Listen for provider frustration during the case";
  }

  if (/staff pain/i.test(input.text) || translated === "Staff pain points") {
    return "Listen for staff frustration, delays, workarounds, or complaints";
  }

  if (translated === "Products used" || /which products are used/i.test(translated)) {
    return "Confirm current product usage during the case";
  }

  if (/workflow bottleneck|workflow observations/i.test(translated)) {
    return "Watch for workflow delays or friction points";
  }

  if (/product-fit/i.test(translated)) {
    return "Watch for moments where a different product might help during the case";
  }

  return sanitizeRepFacingCopy(
    translated.replace(/\brepeat evidence\b/gi, "consistent observation across cases"),
  );
}

function mergeEquivalentBriefingSignals(signals: IntelligenceSignal[]): IntelligenceSignal[] {
  const byKey = new Map<string, IntelligenceSignal>();

  for (const signal of signals) {
    if (signal.type === "unresolved_gap") continue;
    const key = buildCanonicalKeyFromSignal(signal);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, signal);
      continue;
    }
    const existingCount = repCompletedCaseCount(repFindingCountsFromSignal(existing));
    const nextCount = repCompletedCaseCount(repFindingCountsFromSignal(signal));
    if (nextCount > existingCount) {
      byKey.set(key, signal);
    }
  }

  return [...byKey.values()];
}

function buildBriefingKnownSoFar(input: {
  findings: AggregatedFindingEvidence[];
  signals: IntelligenceSignal[];
  kind: CaseBriefingKind;
  providerName: string | null;
  programCompletedCount: number;
}): string[] {
  if (input.kind === "baseline") {
    return ["No prior observations recorded for this provider yet"];
  }

  const merged = mergeEquivalentBriefingSignals(input.signals);
  const known: string[] = [];
  const seenConcepts = new Set<string>();

  const push = (line: string | null, conceptKey?: string) => {
    if (!line || BRIEFING_ENGINE_TERM_PATTERN.test(line)) return;
    const key = (conceptKey ?? line).toLowerCase();
    if (seenConcepts.has(key)) return;
    seenConcepts.add(key);
    known.push(line);
  };

  const formatFinding = (finding: AggregatedFindingEvidence) =>
    formatEstablishedFindingRepLine(finding, {
      surface: "briefing",
      providerName: input.providerName,
      programCompletedCount: input.programCompletedCount,
      peerFindings: input.findings,
    });

  const product = pickStrongestFinding(
    input.findings,
    (finding) =>
      finding.normalizedFindingId.startsWith("product_in_use:") ||
      finding.normalizedFindingId.startsWith("competitor_product:"),
  );
  if (product) {
    push(formatFinding(product), `product:${product.normalizedFindingId}`);
  }

  const workflow =
    pickStrongestFinding(input.findings, isVisualizationWorkflowFinding) ??
    pickStrongestFinding(
      input.findings,
      (finding) =>
        finding.normalizedFindingId.startsWith("workflow_") ||
        finding.normalizedFindingId === "visualization_challenge",
    );
  if (workflow) {
    push(formatFinding(workflow), `workflow:${workflow.normalizedFindingId}`);
  }

  const painPoint =
    pickStrongestFinding(
      input.findings,
      (finding) =>
        finding.normalizedFindingId.includes("pain") ||
        finding.normalizedFindingId === "provider_frustration",
    ) ??
    pickStrongestFinding(
      input.findings,
      (finding) => finding.normalizedFindingId === "staff_friction" || /^staff burden:/i.test(finding.label),
    );
  if (painPoint) {
    push(formatFinding(painPoint), painPoint.normalizedFindingId);
  }

  const staffPositive = input.findings
    .filter((finding) => finding.isPositiveStaffSignal)
    .sort((left, right) => {
      const leftOrganized = /organized|coordinated/i.test(left.label) ? 0 : 1;
      const rightOrganized = /organized|coordinated/i.test(right.label) ? 0 : 1;
      if (leftOrganized !== rightOrganized) return leftOrganized - rightOrganized;
      return right.completedObservationCount - left.completedObservationCount;
    })[0];
  if (staffPositive) {
    push(formatFinding(staffPositive), "staff-positive");
  }

  const workflowSignal = merged.find(
    (signal) => signal.type === "workflow_signal" || signal.type === "workflow_bottleneck",
  );
  const productFit = merged.find((signal) => signal.type === "product_fit_opportunity");
  if (productFit && known.length < 3) {
    const workflowTopic = workflowSignal ? workflowTopicFromSignal(workflowSignal) : "";
    const fitTopic = productFit.label.replace(/\s+opportunity$/i, "").trim().toLowerCase();
    if (!workflowTopic || !fitTopic.includes(workflowTopic.replace(/\s+/g, " "))) {
      push(
        `Possible opening to discuss a solution around ${fitTopic || "this workflow"}`,
        `fit:${buildCanonicalKeyFromSignal(productFit)}`,
      );
    }
  }

  return known.length > 0 ? known.slice(0, 4) : ["No prior observations recorded for this provider yet"];
}

export function buildPrioritizedStillNeedToLearn(input: {
  kind: CaseBriefingKind;
  signals: IntelligenceSignal[];
  evidenceGaps: string[];
  knownSoFar?: string[];
  maxItems?: number;
  /** Findings captured on the current case — resolves/reframes baseline prompts post-capture. */
  currentCaseFindings?: AggregatedFindingEvidence[];
  currentCaseCaptureSummary?: CurrentCaseCaptureSummary;
}): string[] {
  if (input.kind === "baseline") {
    return applyCurrentCaseCapturesToBaselineStillNeed(
      BASELINE_STILL_NEED,
      input.currentCaseFindings ?? [],
      input.currentCaseCaptureSummary,
    ).slice(0, input.maxItems ?? OBSERVATION_BRIEFING_STILL_NEED_MAX);
  }

  const engineFocus = buildCaseFocusFromSignals({
    kind: input.kind,
    signals: input.signals,
    procedureContext: null,
    debriefUnlocked: false,
    observationsRemaining: 5,
    completedObservations: 0,
    evidenceGaps: input.evidenceGaps,
  });

  const lines: string[] = [];
  const seen = new Set<string>();

  const push = (line: string) => {
    const sanitized = sanitizeRepFacingCopy(line);
    const key = sanitized.toLowerCase();
    if (!sanitized || seen.has(key) || BRIEFING_ENGINE_TERM_PATTERN.test(sanitized)) return;
    seen.add(key);
    lines.push(sanitized);
  };

  for (const item of engineFocus.stillMissing) {
    push(formatBriefingLearningQuestion({ text: item, signals: input.signals }));
  }

  if (lines.length === 0) {
    return applyCurrentCaseCapturesToBaselineStillNeed(
      BASELINE_STILL_NEED,
      input.currentCaseFindings ?? [],
      input.currentCaseCaptureSummary,
    ).slice(0, input.maxItems ?? OBSERVATION_BRIEFING_STILL_NEED_MAX);
  }

  return lines.slice(0, input.maxItems ?? OBSERVATION_BRIEFING_STILL_NEED_MAX);
}

function buildBriefingFocusTodayItems(input: {
  kind: CaseBriefingKind;
  signals: IntelligenceSignal[];
  evidenceGaps: string[];
}): string[] {
  if (input.kind === "baseline") {
    return [...BASELINE_FOCUS].slice(0, 4);
  }

  if (input.kind === "support") {
    return [
      "Note whether the issue is resolved",
      "Identify what caused the issue",
      "Watch whether staff need additional training or escalation",
    ];
  }

  const merged = mergeEquivalentBriefingSignals(input.signals);
  const workflow = merged.find(
    (signal) => signal.type === "workflow_signal" || signal.type === "workflow_bottleneck",
  );
  const product = merged.find(
    (signal) => signal.type === "observed_product" || signal.type === "competitor_product",
  );
  const providerPainGap = input.evidenceGaps.some((gap) => /provider pain/i.test(gap));
  const staffPainGap = input.evidenceGaps.some((gap) => /staff pain/i.test(gap));

  const items: string[] = [];
  const seen = new Set<string>();

  const push = (line: string) => {
    const key = line.toLowerCase();
    if (!line || seen.has(key) || BRIEFING_ENGINE_TERM_PATTERN.test(line)) return;
    seen.add(key);
    items.push(line);
  };

  if (workflow) {
    const topic = workflowTopicFromSignal(workflow);
    if (isWorkflowDelaySignal(workflow)) {
      push("Watch whether workflow delays repeat");
    } else {
      push(`Watch whether ${topic} affects the procedure flow`);
    }
  }

  if (product) {
    push(`Confirm current product usage — note whether ${productDisplayName(product)} is used again`);
  } else if (input.kind !== "product_covered") {
    push("Confirm current product usage");
  }

  if (providerPainGap) {
    push("Listen for provider frustration");
  }

  if (staffPainGap) {
    push("Listen for staff complaints or workarounds");
  }

  if (items.length === 0) {
    const engineFocus = buildCaseFocusFromSignals({
      kind: input.kind,
      signals: input.signals,
      procedureContext: null,
      debriefUnlocked: false,
      observationsRemaining: 5,
      completedObservations: 0,
      evidenceGaps: input.evidenceGaps,
    });
    push(focusCueToObjective(engineFocus.focusToday));
  }

  if (items.length < 2) {
    push("Watch whether the observed issue affects the procedure flow");
  }

  return items.slice(0, 4);
}

function focusCueToObjective(focusCue: string): string {
  const trimmed = focusCue.trim();
  return trimmed || "Watch whether the observed issue affects the procedure flow";
}

function buildBriefingWhyThisMatters(input: {
  kind: CaseBriefingKind;
  signals: IntelligenceSignal[];
  evidenceGaps: string[];
  stillNeedToLearn: string[];
}): string {
  if (input.kind === "baseline") {
    return "This is an early observation — establish baseline workflow, product use, and any friction you notice.";
  }

  if (input.kind === "support") {
    return "Prior notes flagged a support issue — confirm whether it is resolved and whether staff need additional guidance.";
  }

  const merged = mergeEquivalentBriefingSignals(input.signals);
  const hasWorkflow = merged.some(
    (signal) => signal.type === "workflow_signal" || signal.type === "workflow_bottleneck",
  );
  const hasProduct = merged.some(
    (signal) => signal.type === "observed_product" || signal.type === "competitor_product",
  );
  const providerPainGap = input.evidenceGaps.some((gap) => /provider pain/i.test(gap));
  const staffPainGap = input.evidenceGaps.some((gap) => /staff pain/i.test(gap));

  const established: string[] = [];
  if (hasWorkflow) established.push("a recurring workflow issue");
  if (hasProduct) established.push("the same products being used");

  const needsConfirmation: string[] = [];
  if (providerPainGap) needsConfirmation.push("provider frustrations");
  if (staffPainGap) needsConfirmation.push("how staff are affected");

  if (established.length > 0 && needsConfirmation.length > 0) {
    const establishedText =
      established.length === 1 ? established[0] : `${established[0]} and ${established[1]}`;
    const needsText =
      needsConfirmation.length === 1
        ? needsConfirmation[0]
        : `${needsConfirmation[0]} and ${needsConfirmation[1]}`;
    return `Prior observations suggest ${establishedText}, but ${needsText} still need confirmation.`;
  }

  if (established.length > 0) {
    return `Prior observations suggest ${established.join(" and ")} — use this case to confirm whether the pattern holds.`;
  }

  if (needsConfirmation.length > 0) {
    return `Prior observations are limited — prioritize learning about ${needsConfirmation.join(" and ")} in this case.`;
  }

  if (input.stillNeedToLearn.length > 0) {
    return "Prior observations provide a starting point — focus on confirming the open questions below.";
  }

  return "Use this case to build on what you already know about this provider's workflow.";
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

export const PROVIDER_UNRESOLVED_QUESTIONS_MAX = 3;

export type SharedUnresolvedEvidenceQuestionsInput = {
  caseRow: Record<string, unknown>;
  priorCases?: Array<Record<string, unknown>>;
  providerContact?: Record<string, unknown> | null;
  activities?: Array<{ activity_type?: string; body?: string; metadata_json?: Record<string, unknown> | null }>;
  maxItems?: number;
  learningView?: ObservationLearningTabView | null;
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
};

export function buildSharedUnresolvedEvidenceQuestions(
  input: SharedUnresolvedEvidenceQuestionsInput,
): string[] {
  const priorCases = input.priorCases ?? [];
  const currentCaseIdValue = String(input.caseRow.id ?? "current").trim() || "current";
  const fullView =
    input.learningView ??
    buildObservationLearningTabView({
      caseRow: input.caseRow,
      activities: input.activities,
      providerContact: input.providerContact,
      priorCases,
    });

  const priorView = priorOnlyLearningView({
    caseRow: input.caseRow,
    providerContact: input.providerContact,
    priorCases,
  });
  const priorSignalsFindings = priorFindings(priorView, currentCaseIdValue);
  const hasPrior = priorCasesHaveIntelligence(priorCases) && priorSignalsFindings.length > 0;
  const kind = resolveCaseBriefingKind(input.caseRow, hasPrior);
  const procedureContext = resolveProcedureContext(input.caseRow, priorCases);
  const programCompletedCount = repProgramCompletedCaseCountFromCases({
    caseRow: input.caseRow,
    priorCases,
  });
  const intelligenceSignals = resolveCoachingIntelligenceSignals({
    oieFindings: priorSignalsFindings,
    evidenceProgress: fullView.evidenceProgress,
    procedureContext,
    priorCases,
    caseRow: input.caseRow,
    briefingKind: kind,
    programCompletedCount,
    universalFactsReadModel: input.universalFactsReadModel,
    signalScope: "prior",
  });
  const evidenceGaps = resolveEvidenceGapsForCase({
    oieGaps: fullView.evidenceGaps,
    universalFactsReadModel: input.universalFactsReadModel,
    caseRow: input.caseRow,
    priorCases,
    briefingKind: kind,
    programCompletedCount,
  });

  // Post-capture fix: findings captured on the current case resolve or reframe
  // baseline prompts so this section can't contradict "This Observation".
  const currentCaseFindings = fullView.currentCaseHasCapturedNotes
    ? fullView.knownFindings.filter((finding) => finding.sourceCaseIds.includes(currentCaseIdValue))
    : [];
  const ufFacts = currentCaseUfFactsFromReadModel({
    universalFactsReadModel: input.universalFactsReadModel,
    caseId: currentCaseIdValue,
    activeOperationalNoteIds: resolveActiveOperationalNoteIdsFromActivities(input.activities),
    providerName: resolveBriefingProviderName({
      caseRow: input.caseRow,
      providerContact: input.providerContact,
    }),
  });
  const hasCurrentCaptures = currentCaseFindings.length > 0 || ufFacts.length > 0;
  const mergedCaptureSummary = hasCurrentCaptures
    ? mergeCurrentCaseCaptureSummaries(
        summarizeCurrentCaseCaptures(currentCaseFindings),
        summarizeCurrentCaseCapturesFromUfFacts(ufFacts),
      )
    : undefined;

  return buildPrioritizedStillNeedToLearn({
    kind,
    signals: intelligenceSignals,
    evidenceGaps,
    maxItems: input.maxItems ?? OBSERVATION_BRIEFING_STILL_NEED_MAX,
    currentCaseFindings,
    currentCaseCaptureSummary: mergedCaptureSummary,
  });
}

export function topSharedUnresolvedEvidenceQuestion(
  input: SharedUnresolvedEvidenceQuestionsInput,
): string | null {
  return buildSharedUnresolvedEvidenceQuestions({ ...input, maxItems: 1 })[0] ?? null;
}

export function buildObservationCaseBriefingRepView(input: {
  caseRow: Record<string, unknown>;
  providerContact?: Record<string, unknown> | null;
  priorCases?: Array<Record<string, unknown>>;
  activities?: Array<{ activity_type?: string; body?: string; metadata_json?: Record<string, unknown> | null }>;
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
}): ObservationCaseBriefingRepView {
  const priorCases = input.priorCases ?? [];
  const currentCaseIdValue = String(input.caseRow.id ?? "current").trim() || "current";
  const priorView = priorOnlyLearningView(input);
  const fullView = buildObservationLearningTabView({
    caseRow: input.caseRow,
    activities: input.activities,
    providerContact: input.providerContact,
    priorCases,
  });

  const priorSignalsFindings = priorFindings(priorView, currentCaseIdValue);
  const hasPrior = priorCasesHaveIntelligence(priorCases) && priorSignalsFindings.length > 0;
  const kind = resolveCaseBriefingKind(input.caseRow, hasPrior);
  const procedureContext = resolveProcedureContext(input.caseRow, priorCases);
  const programCompletedCount = repProgramCompletedCaseCountFromCases({
    caseRow: input.caseRow,
    priorCases,
  });
  const intelligenceSignals = resolveCoachingIntelligenceSignals({
    oieFindings: priorSignalsFindings,
    evidenceProgress: fullView.evidenceProgress,
    procedureContext,
    priorCases,
    caseRow: input.caseRow,
    briefingKind: kind,
    programCompletedCount,
    universalFactsReadModel: input.universalFactsReadModel,
    signalScope: "prior",
  });
  const evidenceGaps = resolveEvidenceGapsForCase({
    oieGaps: fullView.evidenceGaps,
    universalFactsReadModel: input.universalFactsReadModel,
    caseRow: input.caseRow,
    priorCases,
    briefingKind: kind,
    programCompletedCount,
  });

  const knownSoFar = (() => {
    const oieKnownSoFar = () =>
      buildBriefingKnownSoFar({
        findings: priorSignalsFindings,
        signals: intelligenceSignals,
        kind,
        providerName: resolveProviderDisplayName(input.caseRow),
        programCompletedCount: repProgramCompletedCaseCountFromCases({
          caseRow: input.caseRow,
          priorCases,
        }),
      });

    return resolveReadModelSection(
      input.universalFactsReadModel?.programRuns?.length
        ? adaptUniversalFactsToBriefingKnownSoFarLines({
            programRuns: input.universalFactsReadModel.programRuns,
            priorCompletedCaseIds: priorCompletedObservationCaseIds({
              caseRow: input.caseRow,
              priorCases,
            }),
            briefingKind: kind,
            programCompletedCount: repProgramCompletedCaseCountFromCases({
              caseRow: input.caseRow,
              priorCases,
            }),
          })
        : [],
      oieKnownSoFar,
    );
  })();
  const stillNeedToLearn = buildSharedUnresolvedEvidenceQuestions({
    caseRow: input.caseRow,
    priorCases,
    providerContact: input.providerContact,
    activities: input.activities,
    learningView: fullView,
    universalFactsReadModel: input.universalFactsReadModel,
    maxItems: OBSERVATION_BRIEFING_STILL_NEED_MAX,
  });
  const focusToday = buildBriefingFocusTodayItems({
    kind,
    signals: intelligenceSignals,
    evidenceGaps,
  });
  const whyThisMatters = buildBriefingWhyThisMatters({
    kind,
    signals: intelligenceSignals,
    evidenceGaps,
    stillNeedToLearn,
  });

  const sectionTitles = {
    focus: "Focus Today",
    why: "Why This Matters",
    known: "Known So Far",
    stillNeed: "Still Need to Learn",
  };

  return {
    kind,
    focusToday,
    whyThisMatters,
    knownSoFar,
    stillNeedToLearn,
    sectionTitles,
    caseFocus: {
      knownSoFar,
      stillMissing: stillNeedToLearn,
      focusToday: focusToday.join(" · "),
    },
  };
}

export { CASE_BRIEF_BASELINE_MISSING };
