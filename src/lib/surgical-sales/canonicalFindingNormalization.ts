/**
 * Generic finding normalization — converts raw extracted signals into clean,
 * stable, reusable canonical findings. Product-, procedure-, and provider-agnostic.
 */

import { normalizeConceptText } from "@/lib/surgical-sales/canonicalFindingIdentity";
import { cleanProductDisplayName } from "@/lib/surgical-sales/findingDisplayLabels";
import { containsInterpretiveTitleLanguage, stripInterpretivePhrasesFromLabel } from "@/lib/surgical-sales/findingTitleLanguage";
import type { ObservationLearningCategoryId } from "@/lib/surgical-sales/observationIntelligence/observationLearningTypes";
import type { ObservationFact, ObservationFactType } from "@/lib/surgical-sales/observationIntelligence/observationFactTypes";
import { staffEfficiencyRepLabel } from "@/lib/surgical-sales/staffEfficiencyRepLabels";
import {
  PRODUCT_FIT_VISUALIZATION_FIXATION_WORKFLOW_ID,
  WORKFLOW_VISUALIZATION_BEFORE_FIXATION_ID,
} from "@/lib/surgical-sales/observationIntelligence/normalizedObservationFindings";

export type CanonicalFindingType =
  | "current_product_used"
  | "competitor_product_used"
  | "workflow_bottleneck"
  | "provider_pain_point"
  | "staff_pain_point"
  | "staff_workflow_context"
  | "product_fit_opportunity"
  | "support_issue"
  | "training_need"
  | "access_pathway"
  | "scheduling_contact"
  | "credentialing"
  | "procedure_focus"
  | "clinical_volume_trend"
  | "other";

export type CanonicalFinding = {
  raw_text: string;
  canonical_label: string;
  normalized_key: string;
  finding_type: CanonicalFindingType;
  evidence_source_type: "dictation" | "ai_extraction" | "case_row" | "stored_fact";
  source_case_id?: string | null;
  case_status_at_capture?: string | null;
  is_positive_signal: boolean;
  is_pain_point: boolean;
  is_product_fit_hypothesis: boolean;
  support_basis?: string | null;
  /** Legacy compatibility fields */
  normalizedFindingId: string;
  categoryId: ObservationLearningCategoryId;
  label: string;
};

const INCOMPLETE_PHRASE_PATTERNS = [
  /\bmay be an\b/i,
  /\bmay be a\b/i,
  /\bfrom what\b/i,
  /\bnoted:\s*$/i,
  /\bin use use\b/i,
  /\busage in use\b/i,
  /\bthey observed\b/i,
  /\bproduct-fit opportunity noted:/i,
  /\bkeep watching\b/i,
  /\bnot sure\b/i,
  /\buncertain\b/i,
  /\bsignal captured\b/i,
  /\bnew signal\b/i,
  /\bneeds supporting evidence\b/i,
  /\bpending completion\b/i,
  /\bcase not complete\b/i,
];

const SENTENCE_FRAGMENT_PATTERN =
  /\b(they|we|i|the team|there was|it seemed|from what|pretty|overall)\b/i;

const FILLER_ONLY_PATTERN =
  /^(?:yeah|ok|okay|well|so|um|uh|they|we|i|the|a|an|observed|noted|captured|signal|again|once)$/i;

function titleCasePhrase(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function meaningfulWordCount(text: string): number {
  return text
    .split(/\s+/)
    .filter((word) => word.length > 2 && !FILLER_ONLY_PATTERN.test(word))
    .length;
}

/** Reject labels with consecutive duplicate words (e.g. "observed observed observed"). */
export function hasRepeatedDuplicateWords(text: string): boolean {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  for (let index = 0; index < words.length - 1; index += 1) {
    if (words[index] !== words[index + 1]) continue;
    let run = 1;
    while (index + run < words.length && words[index] === words[index + run]) {
      run += 1;
    }
    if (run >= 2) return true;
  }
  return false;
}

export function isIncompletePhraseLabel(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  return INCOMPLETE_PHRASE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function isJunkFindingText(rawText: string, label?: string): boolean {
  const candidate = (label ?? rawText).trim();
  if (!candidate || candidate.length < 2) return true;
  if (hasRepeatedDuplicateWords(candidate)) return true;
  if (isIncompletePhraseLabel(candidate)) return true;
  if (/^noted:\s*/i.test(candidate)) return true;
  if (candidate.length > 90 && SENTENCE_FRAGMENT_PATTERN.test(candidate)) return true;
  if (meaningfulWordCount(candidate) < 1 && !/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/.test(candidate)) {
    return true;
  }
  if (meaningfulWordCount(candidate) < 2 && !candidate.includes(" ")) {
    return /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/.test(candidate) ? false : true;
  }
  if (containsInterpretiveTitleLanguage(candidate)) return true;
  return false;
}

export function stripProductUsageNoise(raw: string): string {
  return raw
    .replace(/^(they\s+)?(were\s+)?(using|observed|saw|still\s+using)\s+/i, "")
    .replace(/\s+(again|observed|in use|usage in use|usage use|usage|used again)$/gi, "")
    .trim();
}

export function extractProductTopic(raw: string): string {
  const stripped = stripProductUsageNoise(raw);
  return cleanProductDisplayName(stripped);
}

export function extractWorkflowTopic(raw: string): string {
  let topic = raw.trim();
  topic = topic
    .replace(/^(there was a|there were|extra time|delay|delays?)\s+/i, "")
    .replace(/\s+(observed|noted|captured|signal|delay observed)$/i, "")
    .replace(/\s+(before fixation|getting a better view)/i, " before fixation")
    .trim();

  if (/visuali.*fixation|fixation.*visuali|better view before fixation/i.test(topic)) {
    return "Visualization challenge before fixation";
  }
  if (/visualization.*workflow|fixation.*workflow/i.test(topic)) {
    return "Visualization/fixation workflow";
  }
  if (/workflow delay|pace slowed|slowed the flow/i.test(topic)) {
    return "Workflow delay";
  }
  if (/room turnover|turnover delay/i.test(topic)) {
    return "Room turnover delay";
  }
  if (/supply delay|setup delay|readiness/i.test(topic)) {
    return "Staff supply delays";
  }

  const normalized = normalizeConceptText(topic);
  return normalized ? titleCasePhrase(normalized) : topic;
}

export function extractProductFitTopic(raw: string): string {
  const topic = raw
    .replace(/^product[-\s]?fit\s+(opportunity\s+)?(noted:\s*)?/i, "")
    .replace(/\s+(may be an opportunity|may be a product fit opportunity|opportunity)$/i, "")
    .trim();

  if (/visuali.*fixation|fixation.*visuali|fixation.*workflow/i.test(`${raw} ${topic}`)) {
    return "Visualization/fixation workflow opportunity";
  }

  const workflow = extractWorkflowTopic(topic);
  if (workflow && !/opportunity$/i.test(workflow)) {
    return `${workflow.replace(/\s+opportunity$/i, "")} opportunity`;
  }
  return titleCasePhrase(normalizeConceptText(topic) || "Workflow opportunity");
}

/** Remap LLM-shaped labels to short observation-only canonical text. */
export function normalizeMessyExtractedLabel(
  raw: string,
  hints: { findingType?: CanonicalFindingType; normalizedFindingId?: string } = {},
): string {
  let text = stripInterpretivePhrasesFromLabel(raw);
  if (!text) return "";

  if (containsInterpretiveTitleLanguage(text) && /keep watching|uncertain|not sure/i.test(text)) {
    return "";
  }

  if (/^new workflow signal captured:/i.test(raw) || /^signal captured:/i.test(raw)) {
    const tail = raw.replace(/^(?:new\s+(?:workflow\s+)?signal\s+captured|signal\s+captured)\s*[:\-–—]\s*/i, "").trim();
    text = extractWorkflowTopic(tail) || titleCasePhrase(normalizeConceptText(tail));
    if (/^delay$/i.test(text)) text = "Workflow delay";
  }

  if (/\bused again\b/i.test(raw) || /\bobserved again\b/i.test(raw)) {
    const product = extractProductTopic(raw);
    if (product) return `${product} observed`;
  }

  if (/\bmay be (?:an |a )?(?:product[-\s]?fit )?opportunity\b/i.test(raw)) {
    text = extractProductFitTopic(raw);
  }

  if (/^(team|staff)\s+(appeared|seemed)\s+/i.test(text)) {
    const staff = text
      .replace(/^(team|staff)\s+(appeared|seemed)\s+/i, "")
      .replace(/\s+again$/i, "")
      .trim();
    return staffEfficiencyRepLabel(staff || text);
  }

  if (hints.findingType === "current_product_used" || hints.findingType === "competitor_product_used") {
    const topic = text
      .replace(/^(product-fit opportunity noted:|provider concern:|staff burden:|staff workflow:|support issue:|training need:)\s*/i, "")
      .trim();
    const product = extractProductTopic(topic || raw);
    return product ? `${product} observed` : text;
  }
  if (hints.findingType === "workflow_bottleneck") {
    const topic = text.trim();
    return extractWorkflowTopic(topic || raw) || "Workflow issue observed";
  }
  if (hints.findingType === "product_fit_opportunity") {
    const topic = text.trim();
    return extractProductFitTopic(topic || raw) || "Product-fit opportunity";
  }

  if (hints.normalizedFindingId === "workflow_delay") return "Workflow delay";
  if (hints.normalizedFindingId === "room_turnover_delay") return "Room turnover delay";
  if (hints.normalizedFindingId === "staff_supply_delay") return "Staff supply delays";

  return text;
}

export function buildNormalizedKey(findingType: CanonicalFindingType, topic: string): string {
  const slug = normalizeConceptText(topic).replace(/\s+/g, "_");
  if (!slug) return findingType;
  return `${findingType}:${slug}`;
}

export function buildLegacyNormalizedFindingId(
  findingType: CanonicalFindingType,
  topic: string,
  factType?: ObservationFactType,
): string {
  if (findingType === "current_product_used" || findingType === "competitor_product_used") {
    return `product_in_use:${normalizeConceptText(topic)}`;
  }
  if (findingType === "workflow_bottleneck") {
    if (/readiness|waiting|not ready|looking for|suppl/i.test(topic)) {
      return "staff_supply_delay";
    }
    if (/visualization.*fixation|fixation.*visualization/i.test(topic)) {
      return WORKFLOW_VISUALIZATION_BEFORE_FIXATION_ID;
    }
    if (/delay/i.test(topic)) return "workflow_delay";
    if (/turnover/i.test(topic)) return "room_turnover_delay";
    if (/supply/i.test(topic)) return "staff_supply_delay";
    return `workflow_${normalizeConceptText(topic).replace(/\s+/g, "_")}`;
  }
  if (findingType === "product_fit_opportunity") {
    if (/visualization.*fixation|fixation.*workflow/i.test(topic)) {
      return PRODUCT_FIT_VISUALIZATION_FIXATION_WORKFLOW_ID;
    }
    return "product_interest";
  }
  if (findingType === "provider_pain_point") {
    if (/training/i.test(topic)) return "training_gap";
    return "provider_frustration";
  }
  if (findingType === "staff_pain_point") {
    if (/supply|setup|opening/i.test(topic)) return "staff_supply_setup_delay";
    return "staff_friction";
  }
  if (findingType === "staff_workflow_context") {
    if (/organized/i.test(topic)) return "staff_efficiency_organized";
    if (/coordinated|comfortable|comfort/i.test(topic)) {
      return /comfort/i.test(topic) ? "staff_efficiency_comfortable" : "staff_efficiency_coordinated";
    }
    return `staff_efficiency:${normalizeConceptText(topic).replace(/\s+/g, "_")}`;
  }
  if (findingType === "training_need") return "training_gap";
  if (findingType === "support_issue") return `support_issue:${normalizeConceptText(topic).replace(/\s+/g, "_")}`;
  if (factType === "vendor_barrier") return "vendor_barrier";
  return normalizeConceptText(topic).replace(/\s+/g, "_") || "unknown";
}

export function buildCanonicalLabel(findingType: CanonicalFindingType, topic: string): string {
  const cleanTopic = topic.trim();
  switch (findingType) {
    case "current_product_used":
      return `${extractProductTopic(cleanTopic)} observed`;
    case "competitor_product_used":
      return `${extractProductTopic(cleanTopic)} observed`;
    case "workflow_bottleneck":
      return extractWorkflowTopic(cleanTopic);
    case "provider_pain_point":
      return `Provider concern: ${titleCasePhrase(normalizeConceptText(cleanTopic) || cleanTopic)}`;
    case "staff_pain_point":
      return `Staff burden: ${titleCasePhrase(normalizeConceptText(cleanTopic) || cleanTopic)}`;
    case "staff_workflow_context": {
      const staffTopic = cleanTopic
        .replace(/^(the\s+)?(team|staff)\s+(appeared|seemed|was|were)\s+/i, "")
        .replace(/\s+again$/i, "")
        .trim();
      return staffEfficiencyRepLabel(staffTopic || cleanTopic);
    }
    case "product_fit_opportunity":
      return extractProductFitTopic(cleanTopic);
    case "support_issue":
      return `Support issue: ${titleCasePhrase(normalizeConceptText(cleanTopic) || cleanTopic)}`;
    case "training_need":
      return `Training need: ${titleCasePhrase(normalizeConceptText(cleanTopic) || cleanTopic)}`;
    case "clinical_volume_trend":
      return cleanTopic;
    case "procedure_focus":
      return `${titleCasePhrase(normalizeConceptText(cleanTopic) || cleanTopic)} focus`;
    case "scheduling_contact":
      return "Scheduling contact identified";
    case "access_pathway":
      return /approved|granted|confirmed/i.test(cleanTopic)
        ? "Observation access approved"
        : "Observation access pending";
    case "credentialing":
      return cleanTopic ? `Credentialing status: ${titleCasePhrase(cleanTopic)}` : "Credentialing required";
    default:
      return titleCasePhrase(normalizeConceptText(cleanTopic) || cleanTopic);
  }
}

function mapCategoryId(findingType: CanonicalFindingType): ObservationLearningCategoryId {
  switch (findingType) {
    case "current_product_used":
    case "competitor_product_used":
      return "current_products";
    case "workflow_bottleneck":
      return "workflow_findings";
    case "provider_pain_point":
    case "training_need":
      return "provider_pain_points";
    case "staff_pain_point":
      return "staff_pain_points";
    case "staff_workflow_context":
      return "staff_workflow";
    case "product_fit_opportunity":
      return "product_fit_signals";
    default:
      return "workflow_findings";
  }
}

function inferFindingTypeFromFact(fact: ObservationFact): CanonicalFindingType | null {
  const value = fact.value.trim();
  if (!value) return null;

  if (
    fact.type === "workflow_delay" && /readiness|waiting|not ready|looking for/i.test(value)
  ) {
    return "workflow_bottleneck";
  }
  if (
    fact.type === "workflow_issue" &&
    /readiness|waiting|not ready|looking for|suppl/i.test(value)
  ) {
    return "workflow_bottleneck";
  }

  switch (fact.type as ObservationFactType) {
    case "current_product":
      return "current_product_used";
    case "competitor_product":
      return "competitor_product_used";
    case "provider_frustration":
      return "provider_pain_point";
    case "staff_issue":
      return /setup|product|opening|packaging|delay|availability/i.test(value)
        ? "staff_pain_point"
        : "staff_pain_point";
    case "staff_efficiency":
      return "staff_workflow_context";
    case "product_fit_signal":
      return "product_fit_opportunity";
    case "product_interest":
      return "product_fit_opportunity";
    case "training_gap":
      return "training_need";
    case "visualization_challenge":
    case "fixation_challenge":
    case "workflow_issue":
    case "workflow_delay":
    case "room_turnover_issue":
      return "workflow_bottleneck";
    default:
      return null;
  }
}

function topicFromFact(fact: ObservationFact, findingType: CanonicalFindingType): string {
  const value = fact.value.trim();
  const evidence = fact.evidence?.trim() ?? value;

  if (findingType === "current_product_used" || findingType === "competitor_product_used") {
    return extractProductTopic(value);
  }
  if (findingType === "staff_workflow_context") {
    return value.replace(/^(team|staff)\s+(appeared|seemed)\s+/i, "").trim() || value;
  }
  if (findingType === "product_fit_opportunity") {
    return value || evidence;
  }
  if (findingType === "workflow_bottleneck") {
    if (/readiness|waiting|not ready|looking for|suppl/i.test(value)) {
      return "Staff supply delays";
    }
    if (/visuali|fixation|view|angle|exposure/i.test(value)) {
      return "Visualization challenge before fixation";
    }
    return value || evidence;
  }
  return value || evidence;
}

export function normalizeObservationFactToCanonicalFinding(
  fact: ObservationFact,
  context: {
    sourceCaseId?: string | null;
    caseStatusAtCapture?: string | null;
    evidenceSourceType?: CanonicalFinding["evidence_source_type"];
  } = {},
): CanonicalFinding | null {
  const rawText = (fact.evidence?.trim() || fact.value.trim()).trim();
  const findingType = inferFindingTypeFromFact(fact);
  if (!findingType) return null;

  const topic = topicFromFact(fact, findingType);
  let canonicalLabel = buildCanonicalLabel(findingType, topic);
  canonicalLabel =
    normalizeMessyExtractedLabel(canonicalLabel, {
      findingType,
      normalizedFindingId: buildLegacyNormalizedFindingId(findingType, topic, fact.type),
    }) || canonicalLabel;

  if (isJunkFindingText(rawText, canonicalLabel)) return null;

  const normalizedKey = buildNormalizedKey(findingType, topic);
  const normalizedFindingId = buildLegacyNormalizedFindingId(findingType, topic, fact.type);

  const isPositiveSignal = findingType === "staff_workflow_context";
  const isPainPoint = findingType === "provider_pain_point" || findingType === "staff_pain_point";
  const isProductFitHypothesis = findingType === "product_fit_opportunity";

  return {
    raw_text: rawText,
    canonical_label: canonicalLabel,
    normalized_key: normalizedKey,
    finding_type: findingType,
    evidence_source_type: context.evidenceSourceType ?? "ai_extraction",
    source_case_id: context.sourceCaseId ?? null,
    case_status_at_capture: context.caseStatusAtCapture ?? null,
    is_positive_signal: isPositiveSignal,
    is_pain_point: isPainPoint,
    is_product_fit_hypothesis: isProductFitHypothesis,
    support_basis: null,
    normalizedFindingId,
    categoryId: mapCategoryId(findingType),
    label: canonicalLabel,
  };
}

export function deduplicateCanonicalFindings(findings: CanonicalFinding[]): CanonicalFinding[] {
  const byKey = new Map<string, CanonicalFinding>();

  for (const finding of findings) {
    const existing = byKey.get(finding.normalized_key);
    if (!existing) {
      byKey.set(finding.normalized_key, finding);
      continue;
    }
    if (finding.raw_text.length > existing.raw_text.length) {
      byKey.set(finding.normalized_key, { ...finding, support_basis: existing.support_basis ?? finding.support_basis });
    }
  }

  return [...byKey.values()];
}

export function linkProductFitSupportBasis(findings: CanonicalFinding[]): CanonicalFinding[] {
  const workflowKeys = findings
    .filter((finding) => finding.finding_type === "workflow_bottleneck")
    .map((finding) => finding.normalized_key);

  return findings.map((finding) => {
    if (finding.finding_type !== "product_fit_opportunity") return finding;

    const linkedWorkflow = findings.find(
      (entry) =>
        entry.finding_type === "workflow_bottleneck" &&
        (entry.normalizedFindingId === WORKFLOW_VISUALIZATION_BEFORE_FIXATION_ID ||
          /visualization.*fixation|fixation.*workflow/i.test(entry.canonical_label)),
    );

    if (linkedWorkflow) {
      const opportunityLabel =
        /visualization|fixation/i.test(linkedWorkflow.canonical_label) ||
        /visualization|fixation/i.test(linkedWorkflow.raw_text)
          ? "Visualization/fixation workflow opportunity"
          : finding.canonical_label;
      return {
        ...finding,
        canonical_label: opportunityLabel,
        label: opportunityLabel,
        support_basis: `Linked workflow: ${linkedWorkflow.canonical_label}`,
        is_product_fit_hypothesis: false,
      };
    }

    if (workflowKeys.length > 0) {
      const basis = findings.find((entry) => entry.finding_type === "workflow_bottleneck");
      return {
        ...finding,
        support_basis: basis ? `Linked workflow: ${basis.canonical_label}` : null,
        is_product_fit_hypothesis: true,
      };
    }

    return {
      ...finding,
      support_basis: null,
      is_product_fit_hypothesis: true,
    };
  });
}

export function normalizeFactsToCanonicalFindings(
  facts: ObservationFact[],
  context: {
    sourceCaseId?: string | null;
    caseStatusAtCapture?: string | null;
  } = {},
): CanonicalFinding[] {
  const raw = facts
    .map((fact) => normalizeObservationFactToCanonicalFinding(fact, context))
    .filter((finding): finding is CanonicalFinding => Boolean(finding));

  const deduped = deduplicateCanonicalFindings(raw);
  return linkProductFitSupportBasis(deduped);
}

export type FindingDisplayContext = {
  observationCount: number;
  completedObservationCount: number;
  capturedFromCurrentNote: boolean;
  currentCaseComplete: boolean;
  hasPriorMatch: boolean;
};

export type ConfidenceDisplayLabel = "Low confidence" | "Moderate-low confidence" | "Moderate confidence" | "High confidence";

/** Part 6 — human-readable maturity + confidence display for findings. */
export function formatFindingMaturityDisplay(context: FindingDisplayContext): string {
  const { observationCount, completedObservationCount, capturedFromCurrentNote, currentCaseComplete, hasPriorMatch } =
    context;

  if (completedObservationCount >= 3) {
    return "Validated across completed cases · High confidence";
  }

  if (completedObservationCount >= 2) {
    return "Repeated across 2 completed cases · Moderate confidence";
  }

  if (
    completedObservationCount === 1 &&
    observationCount >= 2 &&
    !currentCaseComplete &&
    capturedFromCurrentNote
  ) {
    return "Observed once; seen again in current note · Moderate-low confidence";
  }

  if (!currentCaseComplete && capturedFromCurrentNote) {
    if (hasPriorMatch || completedObservationCount >= 1) {
      return "Seen again in current note · Pending case completion";
    }
    return "Captured in current note · Pending case completion";
  }

  if (completedObservationCount === 1) {
    return "Observed in 1 completed case · Low confidence";
  }

  if (observationCount >= 2 && completedObservationCount === 0) {
    return "Repeated in in-progress notes · Pending case completion";
  }

  if (capturedFromCurrentNote) {
    return "Captured in current note · Pending case completion";
  }

  return "Observed in 1 completed case · Low confidence";
}

export function formatProviderContextComparison(input: {
  status: "new" | "repeated" | "strengthened" | "conflicting" | "in_progress" | "missing";
  currentCaseComplete: boolean;
  hasPriorMatch: boolean;
  displayLabel: string;
}): string {
  if (input.status === "missing") return "Still missing";
  if (input.status === "conflicting") return "Contradicts prior evidence";
  if (!input.currentCaseComplete && input.hasPriorMatch) {
    return "Seen again in current note · Pending case completion";
  }
  if (!input.currentCaseComplete) return "New signal from this case · Pending case completion";
  if (input.status === "new") return "New signal from this case";
  if (input.status === "in_progress") return "Seen again in current note · Pending case completion";
  return "Seen again in current note";
}

/** Concise evidence gap list — Part 9. */
export function buildConciseEvidenceGaps(input: {
  currentCaseComplete: boolean;
  currentCaseHasCapturedNotes: boolean;
  missingPillarLabels: string[];
  hasPendingRepeatedSignals: boolean;
  hasProductOrWorkflowSignal: boolean;
}): string[] {
  const gaps: string[] = [];
  const seen = new Set<string>();

  const push = (gap: string) => {
    const key = gap.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    gaps.push(gap);
  };

  if (!input.currentCaseComplete && input.currentCaseHasCapturedNotes) {
    push("Complete current case to confirm pending signals");
  }

  for (const label of input.missingPillarLabels) {
    push(label);
  }

  if (input.hasProductOrWorkflowSignal && !input.hasPendingRepeatedSignals) {
    push("Repeat product/workflow evidence across completed cases");
  }

  return gaps.slice(0, 5);
}

export function sanitizeDisplayLabel(label: string, findingType?: CanonicalFindingType): string {
  if (!label.trim()) return label;
  if (isJunkFindingText(label, label)) return "";
  if (findingType) {
    const topic = label
      .replace(/^(product-fit opportunity noted:|provider concern:|staff burden:|staff workflow:|support issue:|training need:)\s*/i, "")
      .trim();
    return buildCanonicalLabel(findingType, topic);
  }
  return label
    .replace(/\s+observed observed\b/gi, " observed")
    .replace(/\s+usage in use\b/gi, "")
    .replace(/\s+in use in use\b/gi, "")
    .replace(/^product-fit opportunity noted:\s*/i, "")
    .replace(/\s+observed$/i, (match, offset, whole) =>
      whole.slice(0, offset).toLowerCase().includes("observed") ? "" : match,
    )
    .trim();
}
