/**
 * Provider-scoped prior evidence pool for intelligence reconciliation.
 */

import {
  buildCanonicalConceptKey,
  buildCanonicalFindingKeyFromSignal,
  conceptsMatch,
  type CanonicalIntelligenceType,
  type IntelligenceScope,
} from "@/lib/surgical-sales/canonicalFindingIdentity";
import {
  findingToIntelligenceSignal,
  resolveProcedureContext,
  type IntelligenceSignal,
} from "@/lib/surgical-sales/caseIntelligenceSignals";
import { toCanonicalFinding } from "@/lib/surgical-sales/caseIntelligenceReconciliation";
import type { AggregatedFindingEvidence } from "@/lib/surgical-sales/observationFindingEvidenceConfidence";
import { runObservationIntelligencePipeline } from "@/lib/surgical-sales/observationIntelligence/observationIntelligencePipeline";
import { extractObservationFacts } from "@/lib/surgical-sales/observationIntelligence/extractObservationFacts";
import { isValidatedStoredIntelligence } from "@/lib/surgical-sales/observationIntelligence/observationFactSupplement";
import type { StoredObservationNoteIntelligence } from "@/lib/surgical-sales/observationIntelligence/observationFactTypes";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { parseProviderIntelligenceFieldMetadata } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import type { ProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import { isObservationCaseComplete } from "@/lib/surgical-sales/observationProgramGate";
import { formatObservationFindingForRepDisplay } from "@/lib/surgical-sales/observationIntelligenceDisplayLabels";

export type PriorEvidenceSourceType =
  | "prior_case_row"
  | "prior_case_activity"
  | "prior_case_snapshot"
  | "current_case_baseline"
  | "current_case_snapshot"
  | "provider_intelligence"
  | "provider_field_metadata";

export type ProviderPriorEvidence = {
  canonicalKey: string;
  conceptKey: string;
  type: CanonicalIntelligenceType;
  normalizedConcept: string;
  productIdentity: string | null;
  workflowConcept: string | null;
  painPointConcept: string | null;
  sourceType: PriorEvidenceSourceType;
  sourceCaseId: string | null;
  sourceActivityId: string | null;
  caseStatus: string | null;
  completed: boolean;
  confidence: number;
  scope: IntelligenceScope;
  displayLabel: string;
  signal: IntelligenceSignal;
  finding: AggregatedFindingEvidence;
};

type NoteActivity = {
  id?: string;
  activity_type?: string;
  body?: string;
  metadata_json?: Record<string, unknown> | null;
};

export type BuildProviderPriorEvidencePoolInput = {
  providerId?: string | null;
  currentCaseId: string;
  caseRow: Record<string, unknown>;
  activities?: NoteActivity[];
  priorCases?: Array<Record<string, unknown> & { activities?: NoteActivity[] }>;
  providerContact?: Record<string, unknown> | null;
  providerIntelligence?: ProviderIntelligenceSnapshot | null;
  providerFieldMetadata?: ProviderIntelligenceFieldMetadataMap | null;
};

const PROVIDER_INTEL_FIELDS = [
  "provider_product_preferences",
  "provider_competitive_products",
  "provider_preference_card_signals",
  "provider_dissatisfaction_areas",
  "provider_observation_access_path",
  "provider_ideal_observation_cases",
  "provider_observation_best_days_case_types",
  "provider_workflow_pain_points",
] as const;

function caseIdFromRow(caseRow: Record<string, unknown>, fallback: string): string {
  return String(caseRow.id ?? "").trim() || fallback;
}

function confidenceScore(level: "Low" | "Medium" | "High"): number {
  if (level === "High") return 0.85;
  if (level === "Medium") return 0.65;
  return 0.45;
}

function mapSignalTypeToCanonical(type: string): CanonicalIntelligenceType {
  switch (type) {
    case "observed_product":
      return "product_used";
    case "competitor_product":
      return "competitor_product_used";
    case "workflow_bottleneck":
      return "workflow_bottleneck";
    case "staff_workflow_signal":
      return "staff_workflow_signal";
    case "provider_pain_point":
      return "provider_pain_point";
    case "staff_pain_point":
      return "staff_pain_point";
    case "product_fit_opportunity":
      return "product_fit_opportunity";
    default:
      return "workflow_signal";
  }
}

function conceptKeyFromSignal(signal: IntelligenceSignal): string {
  return buildCanonicalConceptKey({
    type: signal.type,
    label: signal.label,
    normalizedFindingId: signal.normalizedFindingId,
    procedureContext: signal.procedureContext,
    productContext: signal.productContext,
    workflowStep: signal.workflowStep,
    isPositiveStaffSignal: signal.isPositiveStaffSignal,
  });
}

function normalizedConceptFromConceptKey(conceptKey: string): string {
  const parts = conceptKey.split(":");
  return parts.slice(1).join(":") || conceptKey;
}

function inferSourceType(
  priorCase: Record<string, unknown> | undefined,
  finding: AggregatedFindingEvidence,
  currentCaseId: string,
): PriorEvidenceSourceType {
  if (!priorCase) {
    return finding.sourceCaseIds.includes(currentCaseId) ? "current_case_baseline" : "prior_case_row";
  }
  if (priorCase.observation_workflow_intelligence_snapshot) return "prior_case_snapshot";
  if (Array.isArray(priorCase.activities) && priorCase.activities.length > 0) {
    return "prior_case_activity";
  }
  return "prior_case_row";
}

function flattenPipelineFindings(input: {
  caseRow: Record<string, unknown>;
  activities?: NoteActivity[];
  priorCases?: Array<Record<string, unknown> & { activities?: NoteActivity[] }>;
}): AggregatedFindingEvidence[] {
  const pipeline = runObservationIntelligencePipeline(input);
  const seen = new Set<string>();
  const flat: AggregatedFindingEvidence[] = [];
  for (const category of pipeline.learnedCategories) {
    for (const finding of category.findings) {
      const key = finding.normalizedFindingId || finding.matchKey;
      if (seen.has(key)) continue;
      seen.add(key);
      flat.push(finding);
    }
  }
  return flat;
}

function evidenceFromFinding(
  finding: AggregatedFindingEvidence,
  input: {
    procedureContext: string | null;
    sourceType: PriorEvidenceSourceType;
    sourceCaseId: string | null;
    sourceActivityId: string | null;
    caseStatus: string | null;
    completed: boolean;
    scope?: IntelligenceScope;
  },
): ProviderPriorEvidence {
  const signal = findingToIntelligenceSignal(finding, { procedureContext: input.procedureContext });
  const scope = input.scope ?? "provider";
  const conceptKey = conceptKeyFromSignal(signal);
  const canonicalKey = buildCanonicalFindingKeyFromSignal(signal, scope);
  const type = mapSignalTypeToCanonical(signal.type);
  const normalizedConcept = normalizedConceptFromConceptKey(conceptKey);

  return {
    canonicalKey,
    conceptKey,
    type,
    normalizedConcept,
    productIdentity:
      type === "product_used" || type === "competitor_product_used" ? normalizedConcept : null,
    workflowConcept:
      type === "workflow_signal" || type === "workflow_bottleneck" ? normalizedConcept : null,
    painPointConcept:
      type === "provider_pain_point" || type === "staff_pain_point" ? normalizedConcept : null,
    sourceType: input.sourceType,
    sourceCaseId: input.sourceCaseId,
    sourceActivityId: input.sourceActivityId,
    caseStatus: input.caseStatus,
    completed: input.completed,
    confidence: confidenceScore(finding.confidence),
    scope,
    displayLabel: formatObservationFindingForRepDisplay(finding, {
      procedureContext: input.procedureContext,
      mode: "established_pattern",
    }),
    signal,
    finding,
  };
}

function addEvidence(
  pool: ProviderPriorEvidence[],
  seen: Set<string>,
  evidence: ProviderPriorEvidence,
): void {
  if (evidence.scope === "organization") return;
  const dedupeKey = `${evidence.scope}:${evidence.conceptKey}`;
  if (seen.has(dedupeKey)) return;
  seen.add(dedupeKey);
  pool.push(evidence);
}

/**
 * §6c evidence-pool gate: when the case has at least one v2 validated note,
 * provider-field free text must not be regex-fact-ized into observation
 * evidence — validated stored facts are the only fact source for pilot cases.
 */
function caseHasValidatedExtraction(input: {
  activities?: NoteActivity[];
  priorCases?: Array<Record<string, unknown> & { activities?: NoteActivity[] }>;
}): boolean {
  const allActivities = [
    ...(input.activities ?? []),
    ...(input.priorCases ?? []).flatMap((priorCase) => priorCase.activities ?? []),
  ];
  return allActivities.some((activity) => {
    const raw = activity.metadata_json?.ai_extraction;
    if (!raw || typeof raw !== "object") return false;
    return isValidatedStoredIntelligence(raw as StoredObservationNoteIntelligence);
  });
}

function evidenceFromProviderFields(input: {
  providerContact: Record<string, unknown>;
  providerFieldMetadata: ProviderIntelligenceFieldMetadataMap;
  procedureContext: string | null;
  /** §6c: suppress the regex re-parse of provider field text for v2 cases. */
  skipFieldTextReparse?: boolean;
}): ProviderPriorEvidence[] {
  const results: ProviderPriorEvidence[] = [];

  for (const fieldKey of PROVIDER_INTEL_FIELDS) {
    const raw = input.providerContact[fieldKey];
    if (!fieldHasIntelligenceSignal(fieldKey, raw)) continue;
    const meta = input.providerFieldMetadata[fieldKey];
    if (meta?.organization_inheritance && !meta.validated_at && !meta.confirmed_at) continue;

    const text = String(meta?.evidence_text ?? raw ?? "").trim();
    if (!text) continue;

    if (fieldKey === "provider_product_preferences" || fieldKey === "provider_competitive_products") {
      const leadingProduct = text.match(/\b([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2})\b/);
      const productLabel = leadingProduct?.[1]?.trim() || text.split(/[.;]/)[0]?.trim() || text;
      const mockFinding: AggregatedFindingEvidence = {
        label: productLabel,
        matchKey: `provider_intel:${fieldKey}:${productLabel.toLowerCase().replace(/\s+/g, "_")}`,
        normalizedFindingId: `product_in_use:${productLabel.toLowerCase().replace(/\s+/g, "_")}`,
        observationCount: 1,
        completedObservationCount: meta?.validated_at || meta?.confirmed_at ? 1 : 0,
        capturedFromCurrentNote: false,
        isPositiveStaffSignal: false,
        isEarlySignal: false,
        confidence: meta?.validated_at || meta?.confirmed_at ? "Medium" : "Low",
        evidenceLabel: "From saved provider intelligence",
        sourceCaseIds: meta?.source_case_id ? [String(meta.source_case_id)] : [],
      };
      results.push(
        evidenceFromFinding(mockFinding, {
          procedureContext: input.procedureContext,
          sourceType: meta?.validated_at ? "provider_intelligence" : "provider_field_metadata",
          sourceCaseId: meta?.source_case_id ? String(meta.source_case_id) : null,
          sourceActivityId: null,
          caseStatus: null,
          completed: Boolean(meta?.validated_at || meta?.confirmed_at),
          scope: "provider",
        }),
      );
      continue;
    }

    // §6c: for pilot (v2) cases, hand-typed provider field text is not
    // re-parsed into observation facts. The field still displays elsewhere.
    if (input.skipFieldTextReparse) continue;

    const facts = extractObservationFacts(text).facts;
    for (const fact of facts) {
      const label = fact.value.trim();
      if (!label) continue;
      const mockFinding: AggregatedFindingEvidence = {
        label,
        matchKey: `provider_field:${fieldKey}:${label.toLowerCase().replace(/\s+/g, "_")}`,
        normalizedFindingId:
          fieldKey.includes("product") || fieldKey.includes("competitive")
            ? `product_in_use:${label.toLowerCase().replace(/\s+/g, "_")}`
            : `provider_field:${fieldKey}`,
        observationCount: 1,
        completedObservationCount: meta?.validated_at || meta?.confirmed_at ? 1 : 0,
        capturedFromCurrentNote: false,
        isPositiveStaffSignal: false,
        isEarlySignal: false,
        confidence: meta?.validated_at || meta?.confirmed_at ? "Medium" : "Low",
        evidenceLabel: "From saved provider intelligence",
        sourceCaseIds: meta?.source_case_id ? [String(meta.source_case_id)] : [],
      };
      results.push(
        evidenceFromFinding(mockFinding, {
          procedureContext: input.procedureContext,
          sourceType: meta?.validated_at ? "provider_intelligence" : "provider_field_metadata",
          sourceCaseId: meta?.source_case_id ? String(meta.source_case_id) : null,
          sourceActivityId: null,
          caseStatus: null,
          completed: Boolean(meta?.validated_at || meta?.confirmed_at),
          scope: "provider",
        }),
      );
    }
  }

  return results;
}

export function buildProviderPriorEvidencePool(
  input: BuildProviderPriorEvidencePoolInput,
): ProviderPriorEvidence[] {
  const pool: ProviderPriorEvidence[] = [];
  const seen = new Set<string>();
  const currentCaseId = input.currentCaseId.trim() || "current";
  const priorCases = input.priorCases ?? [];
  const procedureContext = resolveProcedureContext(input.caseRow, priorCases);

  const fullFindings = flattenPipelineFindings({
    caseRow: input.caseRow,
    activities: input.activities,
    priorCases,
  });

  for (const finding of fullFindings) {
    const sourceCaseId =
      finding.sourceCaseIds.find((id) => id !== currentCaseId) ?? finding.sourceCaseIds[0] ?? null;
    if (!sourceCaseId || sourceCaseId === currentCaseId) continue;

    const priorCase = priorCases.find((row) => caseIdFromRow(row, "") === sourceCaseId);
    const completed = priorCase
      ? isObservationCaseComplete(priorCase)
      : finding.completedObservationCount > 0;

    addEvidence(
      pool,
      seen,
      evidenceFromFinding(finding, {
        procedureContext,
        sourceType: inferSourceType(priorCase, finding, currentCaseId),
        sourceCaseId,
        sourceActivityId: null,
        caseStatus: priorCase ? String(priorCase.status ?? "") : null,
        completed,
        scope: "provider",
      }),
    );
  }

  const baselineFindings = flattenPipelineFindings({
    caseRow: input.caseRow,
    activities: [],
    priorCases,
  });
  for (const finding of baselineFindings) {
    if (!finding.sourceCaseIds.includes(currentCaseId)) continue;
    addEvidence(
      pool,
      seen,
      evidenceFromFinding(finding, {
        procedureContext,
        sourceType: input.caseRow.observation_workflow_intelligence_snapshot
          ? "current_case_snapshot"
          : "current_case_baseline",
        sourceCaseId: currentCaseId,
        sourceActivityId: null,
        caseStatus: String(input.caseRow.status ?? ""),
        completed: isObservationCaseComplete(input.caseRow),
        scope: "provider",
      }),
    );
  }

  const noteActivities = (input.activities ?? []).filter(
    (a) => String(a.activity_type ?? "").trim().toLowerCase() === "note",
  );
  if (noteActivities.length > 1) {
    for (let end = noteActivities.length - 1; end >= 1; end -= 1) {
      const sliceFindings = flattenPipelineFindings({
        caseRow: input.caseRow,
        activities: noteActivities.slice(0, end),
        priorCases,
      });
      for (const finding of sliceFindings) {
        if (!finding.sourceCaseIds.includes(currentCaseId)) continue;
        addEvidence(
          pool,
          seen,
          evidenceFromFinding(finding, {
            procedureContext,
            sourceType: "current_case_baseline",
            sourceCaseId: currentCaseId,
            sourceActivityId: noteActivities[end - 1]?.id ? String(noteActivities[end - 1]!.id) : null,
            caseStatus: String(input.caseRow.status ?? ""),
            completed: false,
            scope: "provider",
          }),
        );
      }
    }
  }

  const fieldMetadata =
    input.providerFieldMetadata ??
    parseProviderIntelligenceFieldMetadata(input.providerContact?.provider_intelligence_field_metadata);

  if (input.providerContact && fieldMetadata) {
    for (const evidence of evidenceFromProviderFields({
      providerContact: input.providerContact,
      providerFieldMetadata: fieldMetadata,
      procedureContext,
      skipFieldTextReparse: caseHasValidatedExtraction({
        activities: input.activities,
        priorCases,
      }),
    })) {
      addEvidence(pool, seen, evidence);
    }
  }

  return pool;
}

export function priorEvidencePoolToFindings(pool: ProviderPriorEvidence[]): AggregatedFindingEvidence[] {
  const seen = new Set<string>();
  const findings: AggregatedFindingEvidence[] = [];
  for (const evidence of pool) {
    const dedupeKey = `${evidence.scope}:${evidence.conceptKey}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    findings.push(evidence.finding);
  }
  return findings;
}

export function priorEvidencePoolToSignals(pool: ProviderPriorEvidence[]): IntelligenceSignal[] {
  return pool.map((evidence) => evidence.signal);
}

export function findMatchingPriorEvidence(
  currentSignal: IntelligenceSignal,
  pool: ProviderPriorEvidence[],
): ProviderPriorEvidence | undefined {
  if (!pool.length) return undefined;

  const currentConceptKey = conceptKeyFromSignal(currentSignal);
  const currentCanonicalKey = buildCanonicalFindingKeyFromSignal(currentSignal, "provider");
  const currentConcept = normalizedConceptFromConceptKey(currentConceptKey);
  const currentType = mapSignalTypeToCanonical(currentSignal.type);

  const exact = pool.find((prior) => prior.canonicalKey === currentCanonicalKey);
  if (exact) return exact;

  return pool.find((prior) => {
    if (!typesCompatible(prior.type, currentType)) return false;
    if (prior.conceptKey === currentConceptKey) return true;
    return conceptsMatch(prior.normalizedConcept, currentConcept);
  });
}

function typesCompatible(left: CanonicalIntelligenceType, right: CanonicalIntelligenceType): boolean {
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
  return false;
}

export function priorEvidenceToCanonicalFinding(
  evidence: ProviderPriorEvidence,
  input: { caseComplete?: boolean } = {},
) {
  return toCanonicalFinding(evidence.signal, {
    caseComplete: input.caseComplete ?? evidence.completed,
    sourceCaseId: evidence.sourceCaseId,
  });
}

export function buildPriorEvidencePoolDedupeKey(evidence: ProviderPriorEvidence): string {
  return `${evidence.scope}:${evidence.conceptKey}`;
}

export function sameCasePriorCanonicalKeysFromPool(
  pool: ProviderPriorEvidence[],
  currentCaseId: string,
): string[] {
  return pool
    .filter(
      (evidence) =>
        evidence.sourceCaseId === currentCaseId &&
        (evidence.sourceType === "current_case_baseline" ||
          evidence.sourceType === "current_case_snapshot"),
    )
    .map((evidence) => evidence.conceptKey);
}
