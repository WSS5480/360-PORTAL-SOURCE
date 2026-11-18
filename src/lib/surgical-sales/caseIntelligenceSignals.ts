import type { AggregatedFindingEvidence, EvidenceConfidenceLevel } from "@/lib/surgical-sales/observationFindingEvidenceConfidence";
import type { EvidencePillarId } from "@/lib/surgical-sales/observationIntelligence/scoreObservationEvidence";
import type { EvidenceProgressItem } from "@/lib/surgical-sales/buildObservationLearningTabView";
import {
  buildCanonicalKeyFromSignal,
  buildProviderContextDisplayText,
  buildThisCaseDisplayLabel,
  dedupeFindingsByCanonicalKey,
  findMatchingPriorFinding,
  findConflictingPriorFinding,
  normalizeConceptText,
  type ReconciliationMatchOptions,
  toCanonicalFinding,
} from "@/lib/surgical-sales/caseIntelligenceReconciliation";
import { buildObservationOnlyFindingTitle } from "@/lib/surgical-sales/findingDisplayContract";
import {
  formatRepPriorEvidenceCountPhrase,
  formatRepStaffPositiveLine,
  repCompletedCaseCount,
  repFindingCountsFromSignal,
} from "@/lib/surgical-sales/observationRepFindingPresentation";
export type IntelligenceSignalType =
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

export type EvidenceStatus =
  | "observed_once"
  | "repeated"
  | "validated"
  | "missing"
  | "conflicting";

export type CaseBriefingKind = "baseline" | "follow_up" | "product_covered" | "support";

export type IntelligenceSignal = {
  label: string;
  type: IntelligenceSignalType;
  subtype: string | null;
  procedureContext: string | null;
  productContext: string | null;
  workflowStep: string | null;
  evidenceCount: number;
  completedCaseCount: number;
  confidence: EvidenceConfidenceLevel;
  evidenceStatus: EvidenceStatus;
  sourceCaseIds: string[];
  lastObservedAt: string | null;
  normalizedFindingId: string;
  isPositiveStaffSignal: boolean;
};

export const CASE_BRIEF_BASELINE_MISSING = [
  "Products used",
  "Workflow bottlenecks",
  "Provider pain points",
  "Staff pain points",
  "Product-fit opportunities",
] as const;

/** @deprecated Use CASE_BRIEF_BASELINE_MISSING */
export const CASE_FOCUS_LOOK_FOR = CASE_BRIEF_BASELINE_MISSING;

export type CaseFocusView = {
  knownSoFar: string[];
  stillMissing: string[];
  focusToday: string;
};

export type CaseBriefView = CaseFocusView;

export type ProviderIntelligenceContextEntry = {
  id: string;
  category: "prior_signal" | "evidence_gap";
  tone: "prior" | "gap";
  contextText: string;
  focusCueRaw: string | null;
  priorEvidenceText: string | null;
};

const WORKFLOW_BOTTLENECK_IDS = new Set([
  "workflow_delay",
  "room_turnover_delay",
  "staff_supply_delay",
  "staff_supply_setup_delay",
]);

const PROVIDER_PAIN_IDS = new Set(["provider_frustration"]);
const STAFF_PAIN_IDS = new Set(["staff_friction"]);
const TRAINING_IDS = new Set(["training_gap"]);
const OBJECTION_IDS = new Set(["vendor_barrier"]);
const PRODUCT_FIT_IDS = new Set([
  "product_interest",
  "product_fit_visualization_fixation_workflow",
  "visualization_fixation_workflow_opportunity",
]);
const STAFF_POSITIVE_IDS = new Set([
  "staff_efficiency_coordinated",
  "staff_efficiency_organized",
  "staff_efficiency_comfortable",
]);

const GAP_PILLAR_TO_SUBTYPE: Partial<Record<EvidencePillarId, string>> = {
  provider_pain_points: "provider_pain_points",
  staff_pain_points: "staff_pain_points",
  workflow_findings: "workflow",
  current_products: "product_usage",
  product_fit_signals: "product_fit",
};

function evidenceStatusFromFinding(finding: AggregatedFindingEvidence): EvidenceStatus {
  const count = finding.completedObservationCount;
  if (count >= 3) return "validated";
  if (count >= 2) return "repeated";
  return "observed_once";
}

function titleCaseWord(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function productNameFromFindingId(normalizedFindingId: string): string | null {
  if (normalizedFindingId.startsWith("product_in_use:")) {
    return normalizedFindingId
      .slice("product_in_use:".length)
      .split(/[_\-\s]+/)
      .filter(Boolean)
      .map(titleCaseWord)
      .join(" ");
  }
  if (normalizedFindingId.startsWith("competitor_product:")) {
    return normalizedFindingId
      .slice("competitor_product:".length)
      .split(/[_\-\s]+/)
      .filter(Boolean)
      .map(titleCaseWord)
      .join(" ");
  }
  return null;
}

function cleanProductLabel(label: string): string {
  return label
    .replace(/\s+usage in use$/i, "")
    .replace(/\s+used again$/i, "")
    .replace(/\s+in use$/i, "")
    .replace(/\s+usage$/i, "")
    .trim();
}

function productIdentityKey(signal: IntelligenceSignal): string {
  const fromCanonical = canonicalProductKey(signal);
  if (fromCanonical) return fromCanonical;
  return productDisplayName(signal).toLowerCase();
}

export function normalizeProductNameForMatching(raw: string): string {
  return normalizeConceptText(raw);
}

export function canonicalProductKey(signal: IntelligenceSignal): string | null {
  if (signal.type !== "observed_product" && signal.type !== "competitor_product") return null;

  if (signal.normalizedFindingId.startsWith("product_in_use:")) {
    return normalizeProductNameForMatching(signal.normalizedFindingId.slice("product_in_use:".length));
  }
  if (signal.normalizedFindingId.startsWith("competitor_product:")) {
    return normalizeProductNameForMatching(signal.normalizedFindingId.slice("competitor_product:".length));
  }

  return normalizeProductNameForMatching(productDisplayName(signal));
}

export function canonicalProductKeyFromFinding(finding: AggregatedFindingEvidence): string | null {
  if (!isProductFinding(finding) && !/competitor/i.test(finding.normalizedFindingId)) {
    if (!finding.normalizedFindingId.startsWith("product_in_use:")) return null;
  }

  if (finding.normalizedFindingId.startsWith("product_in_use:")) {
    return normalizeProductNameForMatching(finding.normalizedFindingId.slice("product_in_use:".length));
  }
  if (finding.normalizedFindingId.startsWith("competitor_product:")) {
    return normalizeProductNameForMatching(finding.normalizedFindingId.slice("competitor_product:".length));
  }

  return normalizeProductNameForMatching(cleanProductLabel(cleanSignalLabel(finding.label)));
}

export function canonicalWorkflowKey(signal: IntelligenceSignal): string | null {
  if (signal.type !== "workflow_signal" && signal.type !== "workflow_bottleneck") return null;
  const key = buildCanonicalKeyFromSignal(signal);
  const colonIndex = key.indexOf(":");
  const concept = colonIndex >= 0 ? key.slice(colonIndex + 1) : key;
  if (!concept) return null;
  if (concept.includes("visualization") && concept.includes("fixation")) {
    return "visualization_fixation_workflow";
  }
  return concept.replace(/\s+/g, "_");
}

const GENERIC_WORKFLOW_BASES = new Set(["delay", "workflow_delay", "workflow"]);

export function effectiveCanonicalWorkflowKey(
  signal: IntelligenceSignal,
  siblingSignals: IntelligenceSignal[],
): string | null {
  const base = canonicalWorkflowKey(signal);
  if (!base) return null;
  if (GENERIC_WORKFLOW_BASES.has(base)) {
    const specificSibling = siblingSignals.find((entry) => {
      const siblingKey = canonicalWorkflowKey(entry);
      return siblingKey && !GENERIC_WORKFLOW_BASES.has(siblingKey);
    });
    if (specificSibling) return canonicalWorkflowKey(specificSibling);
  }
  return base;
}

export function canonicalProductFitKey(signal: IntelligenceSignal): string | null {
  if (signal.type !== "product_fit_opportunity") return null;
  return extractProductFitTopic(signal).toLowerCase().replace(/\s+/g, "_");
}

export function canonicalStaffPositiveKey(signal: IntelligenceSignal): string | null {
  if (!isPositiveStaffContextSignal(signal)) return null;
  const label = cleanSignalLabel(signal.label).toLowerCase();
  if (/organized|organisation/i.test(label)) return "staff_organized_positive";
  if (/coordinated/i.test(label)) return "staff_coordinated_positive";
  if (/comfortable with current products/i.test(label)) return "staff_comfortable_positive";
  if (/efficient|smooth/i.test(label)) return "staff_efficient_positive";
  return signal.normalizedFindingId;
}

function isGenericWorkflowDelayFinding(finding: AggregatedFindingEvidence): boolean {
  return finding.normalizedFindingId === "workflow_delay";
}

export function dedupeFindingsForThisCaseDisplay(
  findings: AggregatedFindingEvidence[],
  context: { procedureContext?: string | null } = {},
): AggregatedFindingEvidence[] {
  return dedupeFindingsByCanonicalKey(findings, (finding) =>
    findingToIntelligenceSignal(finding, context),
  );
}

function cleanSignalLabel(label: string): string {
  return label.replace(/\.$/, "").trim();
}

export function isPositiveStaffContextSignal(signal: IntelligenceSignal): boolean {
  if (signal.type === "staff_workflow_signal" || signal.isPositiveStaffSignal) return true;
  if (STAFF_POSITIVE_IDS.has(signal.normalizedFindingId)) return true;
  return /team appeared|team seemed|staff seemed|comfortable with current products|appeared organized|appeared coordinated|communication was good|case went smoothly|positive staff workflow/i.test(
    signal.label,
  );
}

export function normalizeWorkflowQuestionPhrase(label: string): string {
  let phrase = cleanSignalLabel(label).toLowerCase();

  phrase = phrase
    .replace(/^(extra|additional)\s+/i, "")
    .replace(/\s+(time|required|observed|noted|challenge|challenges|signal)$/i, "")
    .replace(/visualization\s+(?:challenge|delay|time)\s+before\s+fixation/g, "visualization before fixation")
    .replace(/visualization\s+time\s+before\s+fixation/g, "visualization before fixation")
    .replace(/^(team|staff)\s+(?:appeared|seemed|was)\s+/i, "")
    .replace(/\s+(?:appeared|seemed|observed|noted|once)$/i, "")
    .trim();

  if (/organized|coordinated|comfortable|smooth|efficient/.test(phrase) && !/delay|confusion|setup|prep|visualization|fixation|bottleneck/i.test(phrase)) {
    return phrase.replace(/\s+/g, " ").trim();
  }

  return phrase.replace(/\s+/g, " ").trim();
}

function workflowQuestionUsesSlowWorkflow(phrase: string): boolean {
  return /visualization before fixation|visualization.*fixation|fixation.*visualization/i.test(phrase);
}

function lowercaseWorkflowLabel(label: string): string {
  return normalizeWorkflowQuestionPhrase(label);
}

function isProductFinding(finding: AggregatedFindingEvidence): boolean {
  if (finding.normalizedFindingId.startsWith("product_in_use:")) return true;
  if (finding.normalizedFindingId.startsWith("competitor_product:")) return true;
  return /current product|product in use|product observed|competitor product/i.test(finding.label);
}

function isWorkflowFinding(finding: AggregatedFindingEvidence): boolean {
  const id = finding.normalizedFindingId;
  if (WORKFLOW_BOTTLENECK_IDS.has(id)) return true;
  if (id.startsWith("workflow_")) return true;
  if (id === "visualization_challenge") return true;
  if (/workflow|delay|turnover|setup|prep|instrument|deployment|handling|coordination/i.test(id)) {
    return true;
  }
  return /workflow|delay|turnover|setup|prep|instrument|visualization|fixation|graft|deployment|handling/i.test(
    finding.label,
  );
}

function isProductFitFinding(finding: AggregatedFindingEvidence): boolean {
  if (PRODUCT_FIT_IDS.has(finding.normalizedFindingId)) return true;
  return /product.?fit|opportunity/i.test(finding.label);
}

export function resolveSignalTypeFromFinding(finding: AggregatedFindingEvidence): IntelligenceSignalType {
  const id = finding.normalizedFindingId;

  if (isProductFinding(finding)) {
    if (/competitor/i.test(finding.label)) return "competitor_product";
    return "observed_product";
  }

  if (
    STAFF_POSITIVE_IDS.has(id) ||
    id.startsWith("staff_efficiency:") ||
    finding.isPositiveStaffSignal ||
    /team appeared|team seemed|staff seemed|appeared organized|appeared coordinated|comfortable with current products|communication was good|case went smoothly/i.test(
      finding.label,
    )
  ) {
    return "staff_workflow_signal";
  }
  if (PROVIDER_PAIN_IDS.has(id) || /provider.*frustrat|clinical frustration|unmet need|provider\s+pain\s+(point|concept)/i.test(finding.label)) {
    return "provider_pain_point";
  }
  if (STAFF_PAIN_IDS.has(id) || /staff.*friction|staff burden|staff complaint|staff\s+pain\s+(point|concept)/i.test(finding.label)) {
    return "staff_pain_point";
  }
  if (TRAINING_IDS.has(id) || /training/i.test(finding.label)) return "training_need";
  if (OBJECTION_IDS.has(id) || /objection|barrier|hesitat/i.test(finding.label)) return "product_objection";
  if (isProductFitFinding(finding)) return "product_fit_opportunity";
  if (id === "staff_supply_setup_delay" || /handling|packaging|availability/i.test(finding.label)) {
    return "product_handling_issue";
  }
  if (/support issue|escalat|unresolved issue/i.test(finding.label)) return "support_issue";
  if (WORKFLOW_BOTTLENECK_IDS.has(id) || /bottleneck|delay|slowed|waiting/i.test(finding.label)) {
    return "workflow_bottleneck";
  }
  if (isWorkflowFinding(finding)) return "workflow_signal";
  if (/adopt|repeat use|interest in/i.test(finding.label)) return "product_adoption_signal";

  return "workflow_signal";
}

export function findingToIntelligenceSignal(
  finding: AggregatedFindingEvidence,
  context: { procedureContext?: string | null },
): IntelligenceSignal {
  const type = resolveSignalTypeFromFinding(finding);
  const label = cleanSignalLabel(finding.label);
  const productContext = isProductFinding(finding)
    ? (productNameFromFindingId(finding.normalizedFindingId) ?? cleanProductLabel(label))
    : null;
  const workflowStep =
    type === "workflow_signal" || type === "workflow_bottleneck" ? lowercaseWorkflowLabel(label) : null;

  return {
    label,
    type,
    subtype: type,
    procedureContext: context.procedureContext ?? null,
    productContext,
    workflowStep,
    evidenceCount: finding.observationCount,
    completedCaseCount: finding.completedObservationCount,
    confidence: finding.confidence,
    evidenceStatus: evidenceStatusFromFinding(finding),
    sourceCaseIds: finding.sourceCaseIds,
    lastObservedAt: null,
    normalizedFindingId: finding.normalizedFindingId,
    isPositiveStaffSignal: finding.isPositiveStaffSignal,
  };
}

function gapSignalsFromEvidenceProgress(
  evidenceProgress: EvidenceProgressItem[],
  procedureContext: string | null,
): IntelligenceSignal[] {
  return evidenceProgress
    .filter((entry) => entry.status === "missing")
    .map((entry) => ({
      label: entry.label,
      type: "unresolved_gap" as const,
      subtype: GAP_PILLAR_TO_SUBTYPE[entry.id] ?? entry.id,
      procedureContext,
      productContext: null,
      workflowStep: null,
      evidenceCount: 0,
      completedCaseCount: 0,
      confidence: "Low" as EvidenceConfidenceLevel,
      evidenceStatus: "missing" as EvidenceStatus,
      sourceCaseIds: [],
      lastObservedAt: null,
      normalizedFindingId: `unresolved_gap:${entry.id}`,
      isPositiveStaffSignal: false,
    }));
}

const STRUCTURED_CASE_SIGNAL_FIELDS: Array<{
  field: string;
  type: IntelligenceSignalType;
}> = [
  { field: "live_observation_workflow", type: "workflow_signal" },
  { field: "live_observation_competitors", type: "competitor_product" },
  { field: "live_observation_clinical_pain_points", type: "provider_pain_point" },
  { field: "live_observation_staff_process", type: "staff_pain_point" },
  { field: "live_observation_product_fit", type: "product_fit_opportunity" },
  { field: "live_observation_surgeon_reactions", type: "provider_pain_point" },
];

function linesFromStructuredField(raw: unknown): string[] {
  return String(raw ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function signalCoversLabel(existing: IntelligenceSignal[], label: string): boolean {
  const normalized = label.trim().toLowerCase();
  return existing.some((signal) => {
    const candidates = [
      signal.label.toLowerCase(),
      signal.workflowStep,
      signal.productContext?.toLowerCase(),
    ].filter(Boolean);
    return candidates.some(
      (candidate) =>
        candidate === normalized ||
        candidate!.includes(normalized) ||
        normalized.includes(candidate!),
    );
  });
}

function supplementSignalsFromStructuredCaseFields(
  priorCases: Array<Record<string, unknown>>,
  existing: IntelligenceSignal[],
  procedureContext: string | null,
): IntelligenceSignal[] {
  const supplemented = [...existing];

  for (const caseRow of priorCases) {
    const caseId = String(caseRow.id ?? "").trim() || `case-${supplemented.length}`;

    for (const mapping of STRUCTURED_CASE_SIGNAL_FIELDS) {
      for (const line of linesFromStructuredField(caseRow[mapping.field])) {
        if (signalCoversLabel(supplemented, line)) continue;

        let signalType = mapping.type;
        if (mapping.field === "live_observation_staff_process") {
          if (/training need|training gap|needs training/i.test(line)) signalType = "training_need";
          else if (/handling concern|product handling|support issue|escalat/i.test(line)) {
            signalType = "product_handling_issue";
          }
        }

        const workflowStep =
          signalType === "workflow_signal" || signalType === "workflow_bottleneck"
            ? line.toLowerCase()
            : null;
        const productContext =
          signalType === "observed_product" ||
          signalType === "competitor_product" ||
          signalType === "product_handling_issue"
            ? cleanProductLabel(line)
            : null;

        const positiveStaff = /team appeared|team seemed|staff seemed|appeared organized|appeared coordinated|comfortable|communication was good|case went smoothly/i.test(
          line,
        );

        supplemented.push({
          label: line,
          type: signalType,
          subtype: signalType,
          procedureContext,
          productContext,
          workflowStep,
          evidenceCount: 1,
          completedCaseCount: 1,
          confidence: "Low",
          evidenceStatus: "observed_once",
          sourceCaseIds: [caseId],
          lastObservedAt: null,
          normalizedFindingId: `structured:${mapping.field}:${line.toLowerCase().replace(/\s+/g, "_")}`,
          isPositiveStaffSignal: positiveStaff,
        });
      }
    }
  }

  return supplemented;
}

function supplementSignalsFromCaseContext(
  caseRow: Record<string, unknown>,
  existing: IntelligenceSignal[],
  procedureContext: string | null,
  priorCases: Array<Record<string, unknown>> = [],
): IntelligenceSignal[] {
  const supplemented = [...existing];
  const supportType = String(caseRow.support_type ?? caseRow.support_category ?? "").trim();
  if (supportType && !signalCoversLabel(supplemented, supportType)) {
    const type = /training/i.test(supportType)
      ? "training_need"
      : /handling|issue|concern|escalat/i.test(supportType)
        ? "product_handling_issue"
        : "support_issue";
    supplemented.push({
      label: supportType,
      type,
      subtype: type,
      procedureContext,
      productContext: null,
      workflowStep: null,
      evidenceCount: 1,
      completedCaseCount: 0,
      confidence: "Medium",
      evidenceStatus: "observed_once",
      sourceCaseIds: [],
      lastObservedAt: null,
      normalizedFindingId: `support_context:${supportType.toLowerCase().replace(/\s+/g, "_")}`,
      isPositiveStaffSignal: false,
    });
  }

  for (const row of [caseRow, ...priorCases]) {
    const noteText = [
      String(row.notes ?? ""),
      String(row.live_observation_staff_process ?? ""),
      String(row.live_observation_clinical_pain_points ?? ""),
    ].join(" ");
    if (/training need|training gap|needs training|unsure about/i.test(noteText)) {
      const label = "Possible training need";
      if (!signalCoversLabel(supplemented, label)) {
        supplemented.push({
          label,
          type: "training_need",
          subtype: "training_need",
          procedureContext,
          productContext: null,
          workflowStep: null,
          evidenceCount: 1,
          completedCaseCount: 0,
          confidence: "Medium",
          evidenceStatus: "observed_once",
          sourceCaseIds: [String(row.id ?? "")].filter(Boolean),
          lastObservedAt: null,
          normalizedFindingId: "context:training_need",
          isPositiveStaffSignal: false,
        });
      }
    }
  }

  return supplemented;
}

export function buildIntelligenceSignals(input: {
  findings: AggregatedFindingEvidence[];
  evidenceProgress?: EvidenceProgressItem[];
  procedureContext?: string | null;
  priorCases?: Array<Record<string, unknown>>;
  caseRow?: Record<string, unknown>;
}): IntelligenceSignal[] {
  const procedureContext = input.procedureContext ?? null;
  const fromFindings = input.findings.map((finding) =>
    findingToIntelligenceSignal(finding, { procedureContext }),
  );
  const withStructuredFields = supplementSignalsFromStructuredCaseFields(
    input.priorCases ?? [],
    fromFindings,
    procedureContext,
  );
  const withCaseContext = input.caseRow
    ? supplementSignalsFromCaseContext(
        input.caseRow,
        withStructuredFields,
        procedureContext,
        input.priorCases ?? [],
      )
    : withStructuredFields;
  const gaps = gapSignalsFromEvidenceProgress(input.evidenceProgress ?? [], procedureContext);
  return [...withCaseContext, ...gaps];
}

function procedurePhrase(procedureContext: string | null, fallback = "this case"): string {
  if (!procedureContext) return fallback;
  return procedureContext.toLowerCase();
}

function repeatDuringCasePhrase(procedureContext: string | null): string {
  const phrase = procedurePhrase(procedureContext);
  if (phrase === "this case") return "during this case";
  return `during ${phrase}`;
}

function signalPriorityRank(signal: IntelligenceSignal, debriefUnlocked: boolean): number {
  if (isPositiveStaffContextSignal(signal)) return 9;

  const unresolved = signal.evidenceStatus === "observed_once" || signal.evidenceStatus === "missing";
  const hasEvidence = signal.evidenceCount > 0 || signal.completedCaseCount > 0;

  switch (signal.type) {
    case "workflow_bottleneck":
    case "workflow_signal":
      if (signal.evidenceStatus === "repeated" && !debriefUnlocked) return 1;
      if (unresolved) return 1;
      return 5;
    case "provider_pain_point":
      return hasEvidence && unresolved ? 2 : 6;
    case "staff_pain_point":
      return hasEvidence && unresolved ? 3 : 6;
    case "product_fit_opportunity":
      return unresolved ? 4 : 6;
    case "observed_product":
    case "competitor_product":
      return unresolved ? 5 : 7;
    case "unresolved_gap":
      return 6;
    case "training_need":
    case "support_issue":
    case "product_handling_issue":
      return 2;
    case "procedure_type":
      return 7;
    default:
      return 8;
  }
}

const PRIMARY_QUESTION_EXCLUDED_TYPES = new Set<IntelligenceSignalType>([
  "staff_workflow_signal",
  "procedure_type",
  "repeated_pattern",
  "conflicting_evidence",
]);

function isEligiblePrimaryQuestionSignal(signal: IntelligenceSignal): boolean {
  if (signal.type === "unresolved_gap") return false;
  if (PRIMARY_QUESTION_EXCLUDED_TYPES.has(signal.type)) return false;
  if (isPositiveStaffContextSignal(signal)) return false;
  return true;
}

export function rankSignalsForPrimaryQuestion(
  signals: IntelligenceSignal[],
  debriefUnlocked: boolean,
): IntelligenceSignal[] {
  const eligible = signals.filter(isEligiblePrimaryQuestionSignal);

  return [...eligible].sort((left, right) => {
    const rankDelta = signalPriorityRank(left, debriefUnlocked) - signalPriorityRank(right, debriefUnlocked);
    if (rankDelta !== 0) return rankDelta;

    const confidenceRank = { High: 0, Medium: 1, Low: 2 };
    const confidenceDelta = confidenceRank[left.confidence] - confidenceRank[right.confidence];
    if (confidenceDelta !== 0) return confidenceDelta;

    return right.completedCaseCount - left.completedCaseCount;
  });
}

function resolvePrimarySignal(
  ranked: IntelligenceSignal[],
  contentSignals: IntelligenceSignal[],
): IntelligenceSignal | undefined {
  const top = ranked[0];
  const workflow =
    ranked.find((signal) => signal.type === "workflow_signal" || signal.type === "workflow_bottleneck") ??
    contentSignals.find((signal) => signal.type === "workflow_signal" || signal.type === "workflow_bottleneck");

  if (workflow && top && top.type !== "workflow_signal" && top.type !== "workflow_bottleneck") {
    if (top.type === "product_fit_opportunity" || top.type === "observed_product" || top.type === "competitor_product") {
      return workflow;
    }
  }

  return top;
}

function primaryQuestionForObservationFollowUp(
  topSignal: IntelligenceSignal | undefined,
  procedureContext: string | null,
  debriefUnlocked: boolean,
  observationsRemaining: number,
  completedObservations: number,
  contentSignals: IntelligenceSignal[],
): string {
  if (debriefUnlocked || (completedObservations >= 4 && observationsRemaining <= 1)) {
    return "What remaining evidence gaps need to close before provider debrief?";
  }

  const hasOnlyPositiveStaff =
    contentSignals.length > 0 &&
    contentSignals.every(isPositiveStaffContextSignal) &&
    !topSignal;

  if (hasOnlyPositiveStaff) {
    return "Capture any provider or staff pain points during this case.";
  }

  if (!topSignal) {
    return "What baseline workflow, product usage, and provider/staff pain points are present?";
  }

  switch (topSignal.type) {
    case "provider_pain_point":
    case "staff_pain_point":
      return `Does ${normalizeWorkflowQuestionPhrase(topSignal.label)} appear again during this case?`;
    case "workflow_bottleneck":
    case "workflow_signal": {
      const phrase = topSignal.workflowStep ?? normalizeWorkflowQuestionPhrase(topSignal.label);
      if (workflowQuestionUsesSlowWorkflow(phrase)) {
        return `Does ${phrase} slow workflow again?`;
      }
      return `Does ${phrase} repeat during this case?`;
    }
    case "product_fit_opportunity":
      return "Does the workflow create a product-fit opening during this case?";
    case "observed_product":
    case "competitor_product":
      return topSignal.productContext
        ? `Is ${topSignal.productContext} used again during this case?`
        : "Identify what product or device is used during this case.";
    case "training_need":
    case "support_issue":
    case "product_handling_issue":
      return "Is this a training need, product issue, or workflow issue?";
    default:
      return "What workflow, product, and pain-point signals repeat or change in this case?";
  }
}

function primaryQuestionForProductCovered(
  topSignal: IntelligenceSignal | undefined,
  productSignal: IntelligenceSignal | undefined,
  procedureContext: string | null,
): string {
  const during = repeatDuringCasePhrase(procedureContext);

  if (topSignal?.type === "workflow_signal" || topSignal?.type === "workflow_bottleneck") {
    return `Does ${topSignal.workflowStep ?? topSignal.label.toLowerCase()} repeat ${during}, and how does product performance show up in that step?`;
  }

  if (productSignal?.productContext) {
    return `How does ${productSignal.productContext} perform in the workflow ${during}?`;
  }

  return "How is product performance, adoption, and workflow impact showing up during this case?";
}

function primaryQuestionForSupport(
  topSignal: IntelligenceSignal | undefined,
  contentSignals: IntelligenceSignal[],
): string {
  const hasSupportSignals = contentSignals.some(
    (signal) =>
      signal.type === "training_need" ||
      signal.type === "support_issue" ||
      signal.type === "product_handling_issue",
  );
  if (hasSupportSignals || topSignal?.type === "training_need" || topSignal?.type === "product_handling_issue") {
    return "Is this a training need, product issue, or workflow issue?";
  }
  return "Was the issue resolved, and what usage friction, training need, or escalation risk remains?";
}

function secondaryCueForProduct(signal: IntelligenceSignal | undefined, uncertain: boolean): string | null {
  if (!signal?.productContext) {
    return "Current product identified?";
  }
  if (uncertain) {
    return `Confirm whether ${signal.productContext} is part of the normal workflow.`;
  }
  return `Is ${signal.productContext} used again?`;
}

function secondaryCueForMissingPain(gapSubtype: string | null): string | null {
  if (gapSubtype === "provider_pain_points") {
    return "Listen for provider frustration, hesitation, workaround, or unmet need.";
  }
  if (gapSubtype === "staff_pain_points") {
    return "Watch for staff burden, delay, confusion, workaround, or complaint.";
  }
  return null;
}

function secondaryCueForProductFit(): string | null {
  return "Does the workflow create a product-fit opening?";
}

function isVisualizationFixationTopic(text: string): boolean {
  return /visuali.*fixation|fixation.*visuali|visualization_fixation|visualization\/fixation/i.test(text);
}

function signalTopicText(signal: IntelligenceSignal): string {
  return `${signal.label} ${signal.workflowStep ?? ""} ${signal.normalizedFindingId} ${signal.productContext ?? ""}`;
}

function isVisualizationFixationSignal(signal: IntelligenceSignal): boolean {
  return isVisualizationFixationTopic(signalTopicText(signal));
}

function extractProductFitTopic(signal: IntelligenceSignal): string {
  const label = cleanSignalLabel(signal.label).replace(/\s+opportunity$/i, "").trim();
  if (isVisualizationFixationSignal(signal)) return "visualization/fixation workflow";
  return label.toLowerCase();
}

function productFitCueTopic(signal: IntelligenceSignal): string {
  if (isVisualizationFixationSignal(signal)) return "visualization/fixation";
  return extractProductFitTopic(signal);
}

function productDisplayName(signal: IntelligenceSignal): string {
  return cleanProductLabel(signal.productContext ?? signal.label);
}

function isProductObserved(signal: IntelligenceSignal): boolean {
  return signal.evidenceCount > 0 || signal.completedCaseCount > 0;
}

function priorEvidenceTextFromSignal(signal: IntelligenceSignal): string | null {
  const completed = repCompletedCaseCount(repFindingCountsFromSignal(signal));
  const countPhrase = formatRepPriorEvidenceCountPhrase(completed);

  if (isPositiveStaffContextSignal(signal)) {
    const base = formatRepStaffPositiveLine(signal.label, repFindingCountsFromSignal(signal));
    return completed <= 1 ? base : `${base} — ${countPhrase}`;
  }

  if (signal.type === "observed_product" || signal.type === "competitor_product") {
    const product = productDisplayName(signal);
    return `${product} ${countPhrase}`;
  }

  if (signal.type === "workflow_signal" || signal.type === "workflow_bottleneck") {
    if (isVisualizationFixationSignal(signal)) {
      return completed <= 1
        ? "Visualization before fixation observed in 1 completed case"
        : `Visualization before fixation ${countPhrase}`;
    }
    const workflow = signal.workflowStep ?? normalizeWorkflowQuestionPhrase(signal.label);
    return `${workflow} ${countPhrase}`;
  }

  if (signal.type === "product_fit_opportunity") {
    const topic = productFitCueTopic(signal);
    const capitalizedTopic = topic.charAt(0).toUpperCase() + topic.slice(1);
    return completed <= 1
      ? `Product-fit opportunity around ${topic} observed in 1 completed case`
      : `Product-fit opportunity around ${topic} ${countPhrase}`;
  }

  return `${cleanSignalLabel(signal.label)} ${countPhrase}`;
}

function providerContextTextFromSignal(signal: IntelligenceSignal): string {
  return priorEvidenceTextFromSignal(signal) ?? `${cleanSignalLabel(signal.label)} observed`;
}

function focusCueFromSignal(signal: IntelligenceSignal): string | null {
  if (isPositiveStaffContextSignal(signal)) return null;

  switch (signal.type) {
    case "observed_product":
    case "competitor_product":
      if (isProductObserved(signal)) {
        return `Is ${productDisplayName(signal)} used again?`;
      }
      return `Confirm whether ${productDisplayName(signal)} is used.`;
    case "workflow_signal":
    case "workflow_bottleneck": {
      const phrase = signal.workflowStep ?? normalizeWorkflowQuestionPhrase(signal.label);
      if (workflowQuestionUsesSlowWorkflow(phrase)) {
        return `Does ${phrase} slow the case?`;
      }
      return `Does ${phrase} happen again?`;
    }
    case "product_fit_opportunity": {
      const topic = extractProductFitTopic(signal);
      return `Does the ${topic} create a product-fit opening?`;
    }
    case "provider_pain_point":
      return "Does the provider react with hesitation, frustration, or workaround?";
    case "staff_pain_point":
      return "Does staff show burden, delay, confusion, or complaint?";
    default:
      return null;
  }
}

function parseEvidenceGapEntry(gap: string): ProviderIntelligenceContextEntry {
  if (/provider pain/i.test(gap)) {
    return {
      id: "gap-provider-pain",
      category: "evidence_gap",
      tone: "gap",
      contextText: "Provider frustrations not yet understood",
      focusCueRaw: "Does the provider react with hesitation, frustration, or workaround?",
      priorEvidenceText: null,
    };
  }

  if (/staff pain/i.test(gap)) {
    return {
      id: "gap-staff-pain",
      category: "evidence_gap",
      tone: "gap",
      contextText: "Staff frustrations not yet understood",
      focusCueRaw: "Does staff show burden, delay, confusion, or complaint?",
      priorEvidenceText: null,
    };
  }

  if (/repeat evidence needed for visualization\/fixation/i.test(gap)) {
    return {
      id: "gap-workflow-repeat",
      category: "evidence_gap",
      tone: "gap",
      contextText: "Need more cases to confirm visualization/fixation workflow",
      focusCueRaw: null,
      priorEvidenceText: null,
    };
  }

  if (/^repeat evidence needed for/i.test(gap)) {
    const topicMatch = gap.match(/^repeat evidence needed for\s+(.+)$/i);
    const topic = topicMatch?.[1]?.trim() ?? "workflow signal";
    return {
      id: `gap-repeat-${topic.toLowerCase().replace(/\s+/g, "-")}`,
      category: "evidence_gap",
      tone: "gap",
      contextText: gap,
      focusCueRaw: null,
      priorEvidenceText: null,
    };
  }

  if (/repeat evidence for visualization\/fixation/i.test(gap)) {
    return {
      id: "gap-workflow-repeat",
      category: "evidence_gap",
      tone: "gap",
      contextText: "Need more cases to confirm visualization/fixation workflow",
      focusCueRaw: null,
      priorEvidenceText: null,
    };
  }

  if (/^repeat evidence for/i.test(gap)) {
    const topic = gap.replace(/^repeat evidence for\s+/i, "").trim();
    return {
      id: `gap-repeat-${topic.toLowerCase().replace(/\s+/g, "-")}`,
      category: "evidence_gap",
      tone: "gap",
      contextText: `Need more cases to confirm ${topic}`,
      focusCueRaw: null,
      priorEvidenceText: null,
    };
  }

  const consistencyMatch = gap.match(/^confirm whether (.+?) use is consistent across completed cases$/i);
  if (consistencyMatch) {
    const product = consistencyMatch[1] ?? "current product";
    return {
      id: "gap-product-consistency",
      category: "evidence_gap",
      tone: "gap",
      contextText: gap,
      focusCueRaw: `Is ${product} used again?`,
      priorEvidenceText: null,
    };
  }

  return {
    id: `gap-${gap.toLowerCase().replace(/\s+/g, "-")}`,
    category: "evidence_gap",
    tone: "gap",
    contextText: gap,
    focusCueRaw: null,
    priorEvidenceText: null,
  };
}

function selectIntelligenceContextSignals(signals: IntelligenceSignal[]): IntelligenceSignal[] {
  const content = signals.filter((signal) => signal.type !== "unresolved_gap");
  const picked: IntelligenceSignal[] = [];

  const product = content.find(
    (signal) => signal.type === "observed_product" || signal.type === "competitor_product",
  );
  if (product) picked.push(product);

  const workflow =
    content.find(
      (signal) =>
        (signal.type === "workflow_signal" || signal.type === "workflow_bottleneck") &&
        isVisualizationFixationSignal(signal),
    ) ??
    content.find((signal) => signal.type === "workflow_signal" || signal.type === "workflow_bottleneck");
  if (workflow) picked.push(workflow);

  const productFit =
    content.find((signal) => signal.type === "product_fit_opportunity" && isVisualizationFixationSignal(signal)) ??
    content.find((signal) => signal.type === "product_fit_opportunity");
  if (productFit) picked.push(productFit);

  const staffPositive = [...content]
    .filter(isPositiveStaffContextSignal)
    .sort((left, right) => {
      const leftOrganized = /organized|coordinated/i.test(left.label) ? 0 : 1;
      const rightOrganized = /organized|coordinated/i.test(right.label) ? 0 : 1;
      return leftOrganized - rightOrganized;
    })[0];
  if (staffPositive) picked.push(staffPositive);

  for (const signal of content) {
    if (picked.some((entry) => entry.normalizedFindingId === signal.normalizedFindingId)) continue;
    if (isPositiveStaffContextSignal(signal)) continue;
    if (signal.type === "observed_product" || signal.type === "competitor_product") continue;
    if (signal.type === "product_fit_opportunity") continue;
    if (signal.type === "workflow_signal" || signal.type === "workflow_bottleneck") continue;
    if (
      (signal.type === "provider_pain_point" || signal.type === "staff_pain_point") &&
      (signal.evidenceCount > 0 || signal.completedCaseCount > 0)
    ) {
      picked.push(signal);
    }
  }

  return picked;
}

function selectPriorEvidenceSignals(signals: IntelligenceSignal[]): IntelligenceSignal[] {
  const content = signals.filter((signal) => signal.type !== "unresolved_gap");
  const orderedTypes: IntelligenceSignalType[] = [
    "observed_product",
    "competitor_product",
    "workflow_bottleneck",
    "workflow_signal",
    "product_fit_opportunity",
    "provider_pain_point",
    "staff_pain_point",
    "staff_workflow_signal",
  ];

  const candidates = content.filter(
    (signal) =>
      signal.type === "workflow_signal" ||
      signal.type === "workflow_bottleneck" ||
      signal.type === "observed_product" ||
      signal.type === "competitor_product" ||
      signal.type === "product_fit_opportunity" ||
      signal.type === "provider_pain_point" ||
      signal.type === "staff_pain_point" ||
      isPositiveStaffContextSignal(signal),
  );

  const ordered = [...candidates].sort((left, right) => {
    const leftIndex = orderedTypes.indexOf(left.type);
    const rightIndex = orderedTypes.indexOf(right.type);
    const leftRank = leftIndex === -1 ? 99 : leftIndex;
    const rightRank = rightIndex === -1 ? 99 : rightIndex;
    if (leftRank !== rightRank) return leftRank - rightRank;
    if (isPositiveStaffContextSignal(left) && isPositiveStaffContextSignal(right)) {
      const leftOrganized = /organized|coordinated/i.test(left.label) ? 0 : 1;
      const rightOrganized = /organized|coordinated/i.test(right.label) ? 0 : 1;
      if (leftOrganized !== rightOrganized) return leftOrganized - rightOrganized;
    }
    return right.completedCaseCount - left.completedCaseCount;
  });

  const picked: IntelligenceSignal[] = [];
  let staffPositiveAdded = false;

  for (const signal of ordered) {
    if (isPositiveStaffContextSignal(signal)) {
      if (staffPositiveAdded) continue;
      staffPositiveAdded = true;
    }

    const duplicate = picked.some((entry) => {
      if (entry.normalizedFindingId === signal.normalizedFindingId) return true;
      if (
        (entry.type === "workflow_signal" || entry.type === "workflow_bottleneck") &&
        (signal.type === "workflow_signal" || signal.type === "workflow_bottleneck") &&
        isVisualizationFixationSignal(entry) &&
        isVisualizationFixationSignal(signal)
      ) {
        return true;
      }
      if (
        entry.type === "product_fit_opportunity" &&
        signal.type === "product_fit_opportunity" &&
        isVisualizationFixationSignal(entry) &&
        isVisualizationFixationSignal(signal)
      ) {
        return true;
      }
      return false;
    });
    if (duplicate) continue;

    picked.push(signal);
  }

  return picked.slice(0, 4);
}

function focusCuePriority(entry: ProviderIntelligenceContextEntry): number {
  const raw = entry.focusCueRaw?.toLowerCase() ?? "";
  if (/^is .+ used again/.test(raw)) return 1;
  if (/^does .+ slow the case/.test(raw) || /^does .+ happen again/.test(raw)) return 2;
  if (entry.id === "gap-provider-pain") return 3;
  if (entry.id === "gap-staff-pain") return 4;
  if (/create a product-fit opening/.test(raw)) return 5;
  if (entry.id === "gap-product-consistency") return 6;
  return 7;
}

function buildFocusCuesFromContextEntries(
  entries: ProviderIntelligenceContextEntry[],
  kind: CaseBriefingKind,
): string[] {
  if (kind === "baseline" || kind === "support" || kind === "product_covered") {
    return [];
  }

  const cues: string[] = [];
  const seen = new Set<string>();

  const push = (text: string | null | undefined) => {
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    cues.push(text);
  };

  const orderedEntries = [...entries]
    .filter((entry) => entry.focusCueRaw)
    .sort((left, right) => focusCuePriority(left) - focusCuePriority(right));

  for (const entry of orderedEntries) {
    push(entry.focusCueRaw);
  }

  if (cues.length === 0) {
    push("Identify current product used.");
  }

  return cues.slice(0, 4);
}

export function buildProviderIntelligenceContext(input: {
  signals: IntelligenceSignal[];
  evidenceGaps: string[];
  kind: CaseBriefingKind;
}): {
  entries: ProviderIntelligenceContextEntry[];
  focusCuesRaw: string[];
  priorEvidence: string[];
} {
  const contextSignals = selectIntelligenceContextSignals(input.signals);
  const entries: ProviderIntelligenceContextEntry[] = [];

  for (const signal of contextSignals) {
    entries.push({
      id: `prior-${signal.normalizedFindingId}`,
      category: "prior_signal",
      tone: "prior",
      contextText: providerContextTextFromSignal(signal),
      focusCueRaw: focusCueFromSignal(signal),
      priorEvidenceText: priorEvidenceTextFromSignal(signal),
    });
  }

  for (const gap of input.evidenceGaps) {
    const parsed = parseEvidenceGapEntry(gap);
    const duplicate = entries.some(
      (entry) => entry.contextText.toLowerCase() === parsed.contextText.toLowerCase(),
    );
    if (!duplicate) entries.push(parsed);
  }

  for (const gapSignal of input.signals.filter((signal) => signal.type === "unresolved_gap")) {
    const parsed =
      gapSignal.subtype === "provider_pain_points"
        ? parseEvidenceGapEntry("Provider pain points still unknown")
        : gapSignal.subtype === "staff_pain_points"
          ? parseEvidenceGapEntry("Staff pain points still unknown")
          : parseEvidenceGapEntry(gapSignal.label);
    const duplicate = entries.some(
      (entry) =>
        entry.id === parsed.id || entry.contextText.toLowerCase() === parsed.contextText.toLowerCase(),
    );
    if (!duplicate) entries.push(parsed);
  }

  const priorEvidence = selectPriorEvidenceSignals(input.signals)
    .map((signal) => priorEvidenceTextFromSignal(signal))
    .filter((line): line is string => Boolean(line));

  const dedupedPriorEvidence = [...new Set(priorEvidence.map((line) => line.toLowerCase()))]
    .map((key) => priorEvidence.find((line) => line.toLowerCase() === key)!)
    .slice(0, 4);

  const focusCuesRaw = buildFocusCuesFromContextEntries(entries, input.kind);

  return {
    entries,
    focusCuesRaw,
    priorEvidence: dedupedPriorEvidence,
  };
}

export function buildSecondaryCues(input: {
  signals: IntelligenceSignal[];
  kind: CaseBriefingKind;
  productPatternUncertain?: boolean;
}): string[] {
  const cues: string[] = [];
  const seen = new Set<string>();

  const push = (text: string) => {
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    cues.push(text);
  };

  const productSignal = input.signals.find(
    (signal) => signal.type === "observed_product" || signal.type === "competitor_product",
  );
  const workflowSignal = input.signals.find(
    (signal) => signal.type === "workflow_signal" || signal.type === "workflow_bottleneck",
  );
  const productFitSignal = input.signals.find((signal) => signal.type === "product_fit_opportunity");
  const gapSignals = input.signals.filter((signal) => signal.type === "unresolved_gap");
  const supportSignal = input.signals.find(
    (signal) =>
      signal.type === "support_issue" ||
      signal.type === "training_need" ||
      signal.type === "product_handling_issue",
  );

  if (input.kind === "baseline") {
    push("Current products used");
    push("Workflow bottlenecks");
    push("Provider pain points");
    push("Staff pain points");
    push("Product-fit opportunities");
    return cues;
  }

  if (input.kind === "support") {
    push("Was the support issue resolved?");
    if (supportSignal) push(`Track whether ${supportSignal.label.toLowerCase()} repeats.`);
    push("Does anything suggest escalation risk?");
    push("Do staff or the provider need additional training?");
    return cues.slice(0, 4);
  }

  if (input.kind === "product_covered") {
    if (productSignal) push(secondaryCueForProduct(productSignal, Boolean(input.productPatternUncertain))!);
    push("What provider or staff feedback surfaces around product handling or outcomes?");
    push("Are there objections, workarounds, or repeat-use signals?");
    if (workflowSignal) push("Does staff handle the product confidently during workflow friction?");
    return cues.slice(0, 4);
  }

  if (productSignal) {
    push(secondaryCueForProduct(productSignal, Boolean(input.productPatternUncertain))!);
  } else if (input.kind === "follow_up") {
    push("Current product identified?");
  }

  for (const gap of gapSignals) {
    const cue = secondaryCueForMissingPain(gap.subtype);
    if (cue) push(cue);
  }

  if (productFitSignal || workflowSignal) {
    push(secondaryCueForProductFit()!);
  }

  return cues.slice(0, 4);
}

export function formatFocusCue(cue: string): string {
  const trimmed = cue.trim();

  const usedAgainMatch = trimmed.match(/^Is\s+(.+?)\s+used again\??$/i);
  if (usedAgainMatch) return `Is ${usedAgainMatch[1]} used again?`;

  if (/^does the provider react/i.test(trimmed)) {
    return trimmed.endsWith("?") ? trimmed : `${trimmed}?`;
  }
  if (/^listen for provider/i.test(trimmed)) {
    return "Does the provider react with hesitation, frustration, or workaround?";
  }

  if (/^does staff show/i.test(trimmed)) {
    return trimmed.endsWith("?") ? trimmed : `${trimmed}?`;
  }
  if (/^watch for staff/i.test(trimmed)) {
    return "Does staff show burden, delay, confusion, or complaint?";
  }

  if (/^does .+ slow the case/i.test(trimmed) || /^does .+ happen again/i.test(trimmed)) {
    return trimmed.endsWith("?") ? trimmed : `${trimmed}?`;
  }

  const productFitMatch = trimmed.match(/^does the (.+?) create a product-fit opening/i);
  if (productFitMatch) {
    return trimmed.endsWith("?") ? trimmed : `${trimmed}?`;
  }

  if (/^does the workflow create a product-fit opening/i.test(trimmed)) return "Product-fit opening?";
  if (/^confirm whether .+ is part of the normal workflow/i.test(trimmed)) {
    const productMatch = trimmed.match(/^confirm whether (.+?) is part of the normal workflow/i);
    if (productMatch) return `${productMatch[1]} in normal workflow?`;
  }
  const confirmUsedMatch = trimmed.match(/^confirm whether (.+?) is used\.?$/i);
  if (confirmUsedMatch) return `Confirm whether ${confirmUsedMatch[1]} is used.`;
  if (/^identify current product used/i.test(trimmed)) return "Identify current product used.";
  if (/^what provider or staff feedback/i.test(trimmed)) return "Provider/staff product feedback?";
  if (/^are there objections/i.test(trimmed)) return "Objections or repeat-use signals?";
  if (/^does staff handle the product confidently/i.test(trimmed)) return "Staff product handling confidence?";
  if (/^was the support issue resolved/i.test(trimmed)) return "Support issue resolved?";
  if (/^does anything suggest escalation/i.test(trimmed)) return "Escalation risk?";
  if (/^current product identified/i.test(trimmed)) return "Identify current product used.";
  if (/^do staff or the provider need additional training/i.test(trimmed)) return "Additional training needed?";

  return trimmed.endsWith("?") ? trimmed : trimmed;
}

function workflowEmphasisTopic(signal: IntelligenceSignal): string {
  if (isVisualizationFixationSignal(signal)) return "visualization/fixation";
  const raw = signal.workflowStep ?? normalizeWorkflowQuestionPhrase(signal.label);
  return raw.replace(/\s+(delay|delays|confusion|time|bottleneck|signal|challenge|challenges)$/i, "").trim();
}

function workflowFocusLabel(signal: IntelligenceSignal): string {
  if (isVisualizationFixationSignal(signal)) return "visualization/fixation workflow";
  return signal.workflowStep ?? normalizeWorkflowQuestionPhrase(signal.label);
}

function buildKnownSoFar(signals: IntelligenceSignal[], kind: CaseBriefingKind): string[] {
  if (kind === "baseline") {
    return ["No prior case evidence captured yet"];
  }

  const content = signals.filter((signal) => signal.type !== "unresolved_gap");
  const known: string[] = [];

  const push = (line: string | null) => {
    if (!line) return;
    if (known.some((entry) => entry.toLowerCase() === line.toLowerCase())) return;
    known.push(line);
  };

  const product = content.find(
    (signal) => signal.type === "observed_product" || signal.type === "competitor_product",
  );
  if (product) push(priorEvidenceTextFromSignal(product));

  const workflow =
    content.find(
      (signal) =>
        (signal.type === "workflow_signal" || signal.type === "workflow_bottleneck") &&
        isVisualizationFixationSignal(signal),
    ) ??
    content.find((signal) => signal.type === "workflow_signal" || signal.type === "workflow_bottleneck");
  if (workflow) push(priorEvidenceTextFromSignal(workflow));

  const productFit =
    content.find(
      (signal) => signal.type === "product_fit_opportunity" && isVisualizationFixationSignal(signal),
    ) ?? content.find((signal) => signal.type === "product_fit_opportunity");

  const painPoint = content.find(
    (signal) =>
      (signal.type === "provider_pain_point" || signal.type === "staff_pain_point") &&
      (signal.evidenceCount > 0 || signal.completedCaseCount > 0),
  );
  if (painPoint) push(priorEvidenceTextFromSignal(painPoint));

  const staffPositive = [...content]
    .filter(isPositiveStaffContextSignal)
    .sort((left, right) => {
      const leftOrganized = /organized|coordinated/i.test(left.label) ? 0 : 1;
      const rightOrganized = /organized|coordinated/i.test(right.label) ? 0 : 1;
      return leftOrganized - rightOrganized;
    })[0];
  if (staffPositive) push(priorEvidenceTextFromSignal(staffPositive));

  if (productFit && known.length < 3) {
    push(providerContextTextFromSignal(productFit));
  }

  return known.length > 0 ? known.slice(0, 4) : ["No prior case evidence captured yet"];
}

function buildStillMissing(input: {
  kind: CaseBriefingKind;
  signals: IntelligenceSignal[];
  evidenceGaps?: string[];
}): string[] {
  if (input.kind === "baseline") {
    return [...CASE_BRIEF_BASELINE_MISSING];
  }

  const missing: string[] = [];
  const seen = new Set<string>();

  const push = (item: string) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    missing.push(item);
  };

  const providerPainGap = hasEvidenceGap({
    signals: input.signals,
    evidenceGaps: input.evidenceGaps,
    pattern: /provider pain/i,
    subtype: "provider_pain_points",
  });
  const staffPainGap = hasEvidenceGap({
    signals: input.signals,
    evidenceGaps: input.evidenceGaps,
    pattern: /staff pain/i,
    subtype: "staff_pain_points",
  });

  if (providerPainGap) push("Provider pain points");
  if (staffPainGap) push("Staff pain points");

  for (const gap of input.evidenceGaps ?? []) {
    if (/provider pain/i.test(gap)) push("Provider pain points");
    else if (/staff pain/i.test(gap)) push("Staff pain points");
    else if (/repeat evidence needed for visualization\/fixation/i.test(gap)) {
      push("Repeat evidence for visualization/fixation workflow");
    } else if (/^repeat evidence needed for/i.test(gap)) {
      const topic = gap.replace(/^repeat evidence needed for\s+/i, "").trim();
      push(`Repeat evidence for ${topic}`);
    } else if (/repeat evidence for visualization\/fixation/i.test(gap)) {
      push("Repeat evidence for visualization/fixation workflow");
    } else if (/repeat evidence for/i.test(gap)) {
      const topic = gap.replace(/^repeat evidence for\s+/i, "").trim();
      push(`Repeat evidence for ${topic}`);
    } else if (/confirm whether .+ use is consistent/i.test(gap)) {
      const match = gap.match(/confirm whether (.+?) use is consistent/i);
      if (match?.[1]) push(`Confirm whether ${match[1]} repeats`);
    } else if (/more evidence for product-fit/i.test(gap)) {
      push("More evidence for product-fit opportunity");
    }
  }

  const content = input.signals.filter((signal) => signal.type !== "unresolved_gap");

  const workflow =
    content.find(
      (signal) =>
        (signal.type === "workflow_signal" || signal.type === "workflow_bottleneck") &&
        signal.evidenceStatus === "observed_once",
    ) ??
    content.find(
      (signal) =>
        (signal.type === "workflow_signal" || signal.type === "workflow_bottleneck") &&
        signal.evidenceStatus !== "validated",
    );
  if (workflow) {
    if (isVisualizationFixationSignal(workflow)) {
      push("Repeat evidence for visualization/fixation workflow");
    } else {
      push(`Repeat evidence for ${workflowFocusLabel(workflow)}`);
    }
  }

  const product = content.find(
    (signal) => signal.type === "observed_product" || signal.type === "competitor_product",
  );
  if (
    product &&
    isProductObserved(product) &&
    product.evidenceStatus !== "validated" &&
    product.evidenceStatus !== "repeated"
  ) {
    push(`Confirm whether ${productDisplayName(product)} repeats`);
  }

  const productFit = content.find((signal) => signal.type === "product_fit_opportunity");
  if (productFit && productFit.evidenceStatus === "observed_once") {
    push("More evidence for product-fit opportunity");
  }

  if (missing.length === 0) {
    return [...CASE_BRIEF_BASELINE_MISSING];
  }

  return missing.slice(0, 5);
}

function buildFocusToday(input: {
  kind: CaseBriefingKind;
  signals: IntelligenceSignal[];
  evidenceGaps?: string[];
}): string {
  if (input.kind === "baseline") {
    return "Capture baseline workflow, product usage, and provider/staff pain points.";
  }

  if (input.kind === "support") {
    return "Capture whether the issue is resolved, what caused it, and whether training or escalation is needed.";
  }

  const content = input.signals.filter((signal) => signal.type !== "unresolved_gap");
  const product = content.find(
    (signal) => signal.type === "observed_product" || signal.type === "competitor_product",
  );
  const workflow = content.find(
    (signal) =>
      (signal.type === "workflow_signal" || signal.type === "workflow_bottleneck") &&
      signal.evidenceStatus !== "validated",
  );
  const providerPainGap = hasEvidenceGap({
    signals: input.signals,
    evidenceGaps: input.evidenceGaps,
    pattern: /provider pain/i,
    subtype: "provider_pain_points",
  });
  const staffPainGap = hasEvidenceGap({
    signals: input.signals,
    evidenceGaps: input.evidenceGaps,
    pattern: /staff pain/i,
    subtype: "staff_pain_points",
  });
  const hasPainGap = providerPainGap || staffPainGap;

  if (product && workflow && hasPainGap) {
    const workflowTopic = isVisualizationFixationSignal(workflow)
      ? "visualization/fixation"
      : workflowEmphasisTopic(workflow);
    return `Pay attention to product use, provider/staff friction, and whether the ${workflowTopic} workflow issue repeats.`;
  }

  if (workflow) {
    const label = workflowFocusLabel(workflow);
    return `Watch whether ${label} repeats and whether it creates provider or staff friction.`;
  }

  if (product && isProductObserved(product)) {
    return `Confirm whether ${productDisplayName(product)} is used again and watch for any related workflow friction.`;
  }

  if (hasPainGap) {
    return "Watch for provider or staff friction.";
  }

  if (input.kind === "product_covered" && product) {
    return `Confirm whether ${productDisplayName(product)} is used again and watch for any related workflow friction.`;
  }

  if (content.some((signal) => signal.type === "product_fit_opportunity")) {
    return "Capture any product-fit opportunity and watch for related workflow friction.";
  }

  return "Capture baseline workflow, product usage, and provider/staff pain points.";
}

function hasEvidenceGap(input: {
  signals: IntelligenceSignal[];
  evidenceGaps?: string[];
  pattern: RegExp;
  subtype?: string;
}): boolean {
  if (input.evidenceGaps?.some((gap) => input.pattern.test(gap))) return true;
  return input.signals.some(
    (signal) => signal.type === "unresolved_gap" && (!input.subtype || signal.subtype === input.subtype),
  );
}

function buildSuggestedEmphasis(input: {
  kind: CaseBriefingKind;
  signals: IntelligenceSignal[];
  evidenceGaps?: string[];
}): string {
  return buildFocusToday(input);
}

export function buildPriorEvidenceLines(signals: IntelligenceSignal[]): string[] {
  const contentSignals = signals.filter((signal) => signal.type !== "unresolved_gap");
  const orderedTypes: IntelligenceSignalType[] = [
    "workflow_bottleneck",
    "workflow_signal",
    "observed_product",
    "competitor_product",
    "staff_workflow_signal",
    "provider_pain_point",
    "staff_pain_point",
    "product_fit_opportunity",
    "training_need",
    "support_issue",
    "product_handling_issue",
  ];

  const ordered = [...contentSignals].sort((left, right) => {
    const leftIndex = orderedTypes.indexOf(left.type);
    const rightIndex = orderedTypes.indexOf(right.type);
    const leftRank = leftIndex === -1 ? 99 : leftIndex;
    const rightRank = rightIndex === -1 ? 99 : rightIndex;
    if (leftRank !== rightRank) return leftRank - rightRank;
    if (isPositiveStaffContextSignal(left) && isPositiveStaffContextSignal(right)) {
      const leftOrganized = /organized|coordinated/i.test(left.label) ? 0 : 1;
      const rightOrganized = /organized|coordinated/i.test(right.label) ? 0 : 1;
      if (leftOrganized !== rightOrganized) return leftOrganized - rightOrganized;
    }
    return right.completedCaseCount - left.completedCaseCount;
  });

  const lines: string[] = [];
  const seen = new Set<string>();
  let staffPositiveAdded = false;

  for (const signal of ordered) {
    if (isPositiveStaffContextSignal(signal)) {
      if (staffPositiveAdded) continue;
      staffPositiveAdded = true;
    }

    const completed = repCompletedCaseCount(repFindingCountsFromSignal(signal));
    const countPhrase = formatRepPriorEvidenceCountPhrase(completed);
    let line: string;

    if (signal.isPositiveStaffSignal || signal.type === "staff_workflow_signal") {
      line = formatRepStaffPositiveLine(signal.label, repFindingCountsFromSignal(signal));
      if (completed >= 2) line = `${line} — ${countPhrase}`;
    } else if (signal.type === "observed_product" || signal.type === "competitor_product") {
      const product = productDisplayName(signal);
      line = `${product} ${countPhrase}`;
    } else if (signal.type === "workflow_signal" || signal.type === "workflow_bottleneck") {
      if (isVisualizationFixationSignal(signal)) {
        line =
          completed <= 1
            ? "Visualization before fixation observed in 1 completed case"
            : `Visualization before fixation ${countPhrase}`;
      } else {
        const workflow = signal.workflowStep ?? normalizeWorkflowQuestionPhrase(signal.label);
        line = `${workflow} ${countPhrase}`;
      }
    } else if (signal.type === "procedure_type") {
      line = `${signal.label} volume appears to be increasing.`;
    } else {
      line = `${cleanSignalLabel(signal.label)} ${countPhrase}`;
    }

    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(line);
  }

  return lines.slice(0, 3);
}

export function buildEvidenceGoal(input: {
  debriefUnlocked: boolean;
  observationsRemaining: number;
  hasWorkflowOrFitSignals: boolean;
  kind: CaseBriefingKind;
}): string {
  if (input.kind === "baseline") return "Establish baseline case intelligence.";
  if (input.kind === "support") return "Confirm issue resolution and reduce repeat support risk.";

  if (input.debriefUnlocked || input.observationsRemaining <= 1) {
    return "Close remaining evidence gaps before debrief";
  }
  if (input.hasWorkflowOrFitSignals) {
    return "Confirm whether early signals are repeatable before provider debrief";
  }
  return "Strengthen and validate product-fit hypothesis";
}

export function resolveProcedureContext(
  caseRow: Record<string, unknown>,
  priorCases: Array<Record<string, unknown>>,
): string | null {
  const procedures = new Set<string>();
  const current = String(caseRow.procedure_type ?? "").trim();
  if (current) procedures.add(current);
  for (const prior of priorCases) {
    const procedure = String(prior.procedure_type ?? "").trim();
    if (procedure) procedures.add(procedure);
  }
  if (procedures.size === 0) return null;
  if (procedures.size > 1) return null;
  return [...procedures][0] ?? null;
}

export function resolveCaseBriefingKind(
  caseRow: Record<string, unknown>,
  hasPrior: boolean,
): CaseBriefingKind {
  const caseType = String(caseRow.case_type ?? "observation").trim().toLowerCase();
  if (caseType === "product_support" || caseType === "product_covered_case") {
    const supportType = String(caseRow.support_type ?? caseRow.support_category ?? "").toLowerCase();
    if (/support|issue|training|escalat|handling concern/.test(supportType)) return "support";
    return "product_covered";
  }
  return hasPrior ? "follow_up" : "baseline";
}

export function buildCaseFocusFromSignals(input: {
  kind: CaseBriefingKind;
  signals: IntelligenceSignal[];
  procedureContext: string | null;
  debriefUnlocked: boolean;
  observationsRemaining: number;
  completedObservations: number;
  evidenceGaps?: string[];
  productPatternUncertain?: boolean;
}): CaseFocusView {
  return {
    knownSoFar: buildKnownSoFar(input.signals, input.kind),
    stillMissing: buildStillMissing({
      kind: input.kind,
      signals: input.signals,
      evidenceGaps: input.evidenceGaps,
    }),
    focusToday: buildFocusToday({
      kind: input.kind,
      signals: input.signals,
      evidenceGaps: input.evidenceGaps,
    }),
  };
}

export function findMatchingPriorSignal(
  current: IntelligenceSignal,
  priors: IntelligenceSignal[],
  options: {
    siblingCurrentSignals?: IntelligenceSignal[];
    matchOptions?: ReconciliationMatchOptions;
  } = {},
): IntelligenceSignal | undefined {
  void options.siblingCurrentSignals;
  const currentCanonical = toCanonicalFinding(current);
  const priorCanonicals = priors.map((prior) => toCanonicalFinding(prior));
  const match = findMatchingPriorFinding(currentCanonical, priorCanonicals, options.matchOptions ?? {});
  return match?.signal as IntelligenceSignal | undefined;
}

function workflowDisplayLabelFromSignal(signal: IntelligenceSignal): string {
  if (isVisualizationFixationSignal(signal)) return "Visualization/fixation workflow";
  const label = cleanSignalLabel(signal.label);
  return label
    .replace(/\s+(challenge|challenges|signal|observed|noted)$/i, "")
    .replace(/^extra\s+/i, "")
    .trim();
}

function isWorkflowDelaySignal(signal: IntelligenceSignal): boolean {
  return (
    signal.normalizedFindingId === "workflow_delay" ||
    /delay|slowed|slow the flow|slow workflow/i.test(`${signal.label} ${signal.workflowStep ?? ""}`)
  );
}

export function formatIntelligenceFindingLabel(
  finding: AggregatedFindingEvidence,
  context: { procedureContext?: string | null; coOccurringFindingIds?: string[] } = {},
): string {
  const signal = findingToIntelligenceSignal(finding, context);
  return buildObservationOnlyFindingTitle(finding, signal);
}

function isConflictingProductSignal(
  current: IntelligenceSignal,
  prior: IntelligenceSignal,
): boolean {
  const currentIsProduct = current.type === "observed_product" || current.type === "competitor_product";
  const priorIsProduct = prior.type === "observed_product" || prior.type === "competitor_product";
  if (!currentIsProduct || !priorIsProduct) return false;
  const currentKey = canonicalProductKey(current);
  const priorKey = canonicalProductKey(prior);
  if (!currentKey || !priorKey) return false;
  return currentKey !== priorKey;
}

function resolvedCompletedCaseCount(
  current: IntelligenceSignal,
  matchedPrior: IntelligenceSignal | undefined,
  caseComplete: boolean,
): number {
  const aggregated = current.completedCaseCount;
  if (aggregated >= 2) return aggregated;
  if (!caseComplete || !matchedPrior) return aggregated;
  const priorCount = matchedPrior.completedCaseCount;
  return Math.max(aggregated, priorCount + 1);
}

export function buildContextImpactText(
  current: IntelligenceSignal,
  prior: IntelligenceSignal | undefined,
  options: {
    caseComplete?: boolean;
    briefingKind?: CaseBriefingKind;
    priorSignals?: IntelligenceSignal[];
    siblingCurrentSignals?: IntelligenceSignal[];
    matchOptions?: ReconciliationMatchOptions;
  } = {},
): { text: string; tone: "adds" | "strengthens" | "resolves" | "conflicts" } {
  void options.siblingCurrentSignals;
  const matchOptions = options.matchOptions ?? {};
  const matchedPrior =
    prior ??
    (options.priorSignals
      ? findMatchingPriorSignal(current, options.priorSignals, { matchOptions })
      : undefined);
  const caseComplete = options.caseComplete ?? false;
  const kind = options.briefingKind ?? "follow_up";
  const currentCanonical = toCanonicalFinding(current, { caseComplete });
  const priorCanonicals = (options.priorSignals ?? []).map((signal) => toCanonicalFinding(signal));
  let priorCanonical = matchedPrior ? toCanonicalFinding(matchedPrior) : undefined;
  if (!priorCanonical) {
    priorCanonical = findConflictingPriorFinding(currentCanonical, priorCanonicals);
  }
  const noteResolved =
    kind === "support" &&
    /resolved|retrain|addressed|fixed/i.test(current.label);

  return buildProviderContextDisplayText({
    current: currentCanonical,
    prior: priorCanonical,
    caseComplete,
    briefingKind: kind,
    resolved: noteResolved,
    matchOptions,
  });
}

export function providerContextLineFromSignal(signal: IntelligenceSignal, _maturityLabel?: string): string {
  return providerContextTextFromSignal(signal);
}
