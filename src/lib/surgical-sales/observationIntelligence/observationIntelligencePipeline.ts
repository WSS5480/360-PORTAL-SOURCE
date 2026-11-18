import {
  OBSERVATION_LEARNING_CATEGORY_LABELS,
  OBSERVATION_LEARNING_CATEGORY_ORDER,
  type ObservationLearningCategory,
  type ObservationLearningCategoryId,
  type ObservationLearningFinding,
} from "./observationLearningTypes";
import { aggregateFindingEvidenceAcrossCases } from "@/lib/surgical-sales/observationFindingEvidenceConfidence";
import { isObservationCaseComplete } from "@/lib/surgical-sales/observationProgramGate";
import { extractObservationFacts } from "./extractObservationFacts";
import {
  acceptedFactsFromValidatedIntelligence,
  factsFromStoredIntelligence,
  isValidatedStoredIntelligence,
  supplementObservationFacts,
} from "./observationFactSupplement";
import {
  generateObservationIntelligenceFromFacts,
  groupIntelligenceFindingsByCategory,
} from "./generateObservationIntelligence";
import type { ObservationFact, StoredObservationNoteIntelligence } from "./observationFactTypes";
import { scoreObservationEvidenceFromFacts, type EvidencePillarScore } from "./scoreObservationEvidence";

type NoteActivity = {
  activity_type?: string;
  body?: string;
  metadata_json?: Record<string, unknown> | null;
};

function readStoredIntelligence(
  metadata: Record<string, unknown> | null | undefined,
): StoredObservationNoteIntelligence | null {
  const raw = metadata?.ai_extraction;
  if (!raw || typeof raw !== "object") return null;
  return raw as StoredObservationNoteIntelligence;
}

function readStoredFacts(metadata: Record<string, unknown> | null | undefined): ObservationFact[] | null {
  const stored = readStoredIntelligence(metadata);
  if (!stored) return null;
  const facts = factsFromStoredIntelligence(stored);
  return facts.length > 0 ? facts : null;
}

function collectFactsFromNoteBody(body: string): ObservationFact[] {
  return extractObservationFacts(body).facts;
}

const CASE_ROW_FACT_FIELDS = [
  "live_observation_competitors",
  "live_observation_workflow",
  "live_observation_clinical_pain_points",
  "live_observation_staff_process",
  "live_observation_product_fit",
  "live_observation_surgeon_reactions",
  "notes",
] as const;

function collectSnapshotText(snapshotRaw: unknown): string {
  if (snapshotRaw == null) return "";

  let parsed: Record<string, unknown>;
  if (typeof snapshotRaw === "string") {
    const trimmed = snapshotRaw.trim();
    if (!trimmed) return "";
    try {
      const json = JSON.parse(trimmed) as unknown;
      if (!json || typeof json !== "object") return "";
      parsed = json as Record<string, unknown>;
    } catch {
      return "";
    }
  } else if (typeof snapshotRaw === "object") {
    parsed = snapshotRaw as Record<string, unknown>;
  } else {
    return "";
  }

  const lines: string[] = [];
  const pushValue = (raw: unknown) => {
    if (raw == null) return;
    const values = Array.isArray(raw) ? raw : [raw];
    for (const value of values) {
      const text = String(value ?? "").trim();
      if (text) lines.push(text);
    }
  };

  for (const bucket of [parsed.categories, parsed.sections]) {
    if (!Array.isArray(bucket)) continue;
    for (const entry of bucket) {
      if (!entry || typeof entry !== "object") continue;
      const row = entry as Record<string, unknown>;
      pushValue(row.items ?? row.signals ?? row.notes ?? row.value);
    }
  }

  for (const [key, value] of Object.entries(parsed)) {
    if (key === "categories" || key === "sections" || key === "extracted_at" || key === "updated_at") {
      continue;
    }
    pushValue(value);
  }

  return lines.join(". ");
}

function collectFactsFromCaseRow(caseRow: Record<string, unknown>): ObservationFact[] {
  const snapshotFacts = factsFromStoredIntelligence(
    caseRow.observation_workflow_intelligence_snapshot as StoredObservationNoteIntelligence | null,
  );
  const text = [
    ...CASE_ROW_FACT_FIELDS.map((field) => String(caseRow[field] ?? "").trim()).filter(Boolean),
    collectSnapshotText(caseRow.observation_workflow_intelligence_snapshot),
  ]
    .filter(Boolean)
    .join(". ");
  const parsedFacts = text ? extractObservationFacts(text).facts : [];
  return mergeFacts(snapshotFacts, parsedFacts);
}

function mergeFacts(...groups: ObservationFact[][]): ObservationFact[] {
  const seen = new Set<string>();
  const merged: ObservationFact[] = [];
  for (const group of groups) {
    for (const fact of group) {
      const key = `${fact.type}:${fact.value.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(fact);
    }
  }
  return merged;
}

type ActivityFactCollection = {
  /** Facts from legacy notes — body re-parse + stored extraction, today's behavior. */
  legacy: ObservationFact[];
  /** Facts from v2 validated notes — stored accepted facts are the truth (§6 gate). */
  validated: ObservationFact[];
};

function collectFactsFromActivities(activities: NoteActivity[] | undefined): ActivityFactCollection {
  const legacy: ObservationFact[] = [];
  const validated: ObservationFact[] = [];

  for (const activity of activities ?? []) {
    if (String(activity.activity_type ?? "").trim().toLowerCase() !== "note") continue;
    const stored = readStoredIntelligence(activity.metadata_json ?? null);

    if (isValidatedStoredIntelligence(stored)) {
      // §6 per-note gate: new-pipeline note — stored validated facts only.
      // NO body re-parse, NO entity re-extraction, NO supplement for this note.
      validated.push(...acceptedFactsFromValidatedIntelligence(stored!));
      continue;
    }

    const body = String(activity.body ?? "").trim();
    const storedFacts = readStoredFacts(activity.metadata_json ?? null);
    if (storedFacts?.length) {
      legacy.push(...storedFacts);
    }
    // Supplement stored extraction with body parsing so partial ai_extraction
    // metadata cannot hide workflow bottlenecks captured in the note text.
    if (body) legacy.push(...collectFactsFromNoteBody(body));
  }

  return { legacy, validated };
}

function caseIdFromRow(caseRow: Record<string, unknown>, fallback: string): string {
  const id = String(caseRow.id ?? "").trim();
  return id || fallback;
}

const VISUALIZATION_FIXATION_OPPORTUNITY_LABEL =
  "Visualization/fixation workflow opportunity";
const VISUALIZATION_FIXATION_OPPORTUNITY_ID = "product_fit_visualization_fixation_workflow";
const WORKFLOW_VISUALIZATION_FINDING_ID = "workflow_visualization_before_fixation";

function inferProductFitOpportunityFromWorkflow(
  buckets: Record<
    ObservationLearningCategoryId,
    Array<{ label: string; normalizedFindingId: string; isInferred?: boolean }>
  >,
): boolean {
  const hasWorkflowVisualization = buckets.workflow_findings.some(
    (finding) =>
      finding.normalizedFindingId === WORKFLOW_VISUALIZATION_FINDING_ID ||
      finding.normalizedFindingId === "visualization_challenge",
  );
  const alreadyPresent = buckets.product_fit_signals.some(
    (finding) => finding.normalizedFindingId === VISUALIZATION_FIXATION_OPPORTUNITY_ID,
  );
  if (!hasWorkflowVisualization || alreadyPresent) return false;

  buckets.product_fit_signals.push({
    label: VISUALIZATION_FIXATION_OPPORTUNITY_LABEL,
    normalizedFindingId: VISUALIZATION_FIXATION_OPPORTUNITY_ID,
    isInferred: true,
  });
  return true;
}

function appendInferredProductFitFacts(
  factsByCase: Array<{ caseId: string; caseComplete: boolean; facts: ObservationFact[] }>,
  bucketsByCase: Array<{
    caseId: string;
    buckets: Record<ObservationLearningCategoryId, Array<{ label: string; normalizedFindingId: string }>>;
  }>,
): void {
  for (const source of bucketsByCase) {
    const inferred = source.buckets.product_fit_signals.some(
      (finding) => finding.normalizedFindingId === VISUALIZATION_FIXATION_OPPORTUNITY_ID,
    );
    if (!inferred) continue;

    const caseFacts = factsByCase.find((entry) => entry.caseId === source.caseId);
    if (!caseFacts) continue;

    const value = "visualization and fixation workflow opportunity";
    const key = `product_fit_signal:${value}`;
    if (caseFacts.facts.some((fact) => `${fact.type}:${fact.value.toLowerCase()}` === key)) {
      continue;
    }

    caseFacts.facts.push({
      type: "product_fit_signal",
      value,
      evidence: "Inferred from visualization/fixation workflow findings",
    });
  }
}

function aggregateCategoryFindingsFromBuckets(
  sources: Array<{
    caseId: string;
    caseComplete?: boolean;
    isCurrentCase?: boolean;
    buckets: Record<ObservationLearningCategoryId, Array<{ label: string; normalizedFindingId: string }>>;
  }>,
): Record<ObservationLearningCategoryId, ObservationLearningFinding[]> {
  const aggregated: Record<ObservationLearningCategoryId, ObservationLearningFinding[]> = {
    competitor_products: [],
    workflow_findings: [],
    provider_pain_points: [],
    staff_pain_points: [],
    staff_workflow: [],
    product_fit_signals: [],
    current_products: [],
  };

  for (const categoryId of OBSERVATION_LEARNING_CATEGORY_ORDER) {
    const caseSources = sources
      .map((source) => ({
        caseId: source.caseId,
        caseComplete: source.caseComplete,
        isCurrentCase: source.isCurrentCase,
        findings: source.buckets[categoryId],
      }))
      .filter((source) => source.findings.length > 0);

    aggregated[categoryId] = aggregateFindingEvidenceAcrossCases(caseSources);
  }

  return aggregated;
}

export type ObservationIntelligencePipelineResult = {
  factsByCase: Array<{ caseId: string; caseComplete: boolean; facts: ObservationFact[] }>;
  allFacts: ObservationFact[];
  learnedCategories: ObservationLearningCategory[];
  aggregatedByCategory: Record<ObservationLearningCategoryId, ObservationLearningFinding[]>;
  evidencePillars: EvidencePillarScore[];
  evidenceProgressSignalCount: number;
  evidenceProgressValidatedCount: number;
};

/** Note → facts → intelligence → evidence scoring. */
export function runObservationIntelligencePipeline(input: {
  caseRow: Record<string, unknown>;
  activities?: NoteActivity[];
  priorCases?: Array<Record<string, unknown> & { activities?: NoteActivity[] }>;
  priorCaseActivities?: Record<string, NoteActivity[]>;
}): ObservationIntelligencePipelineResult {
  const currentCaseId = caseIdFromRow(input.caseRow, "current");
  const currentCaseComplete = isObservationCaseComplete(input.caseRow);
  const factsByCase: Array<{ caseId: string; caseComplete: boolean; facts: ObservationFact[] }> = [];

  for (const [index, priorCase] of (input.priorCases ?? []).entries()) {
    const priorCaseId = caseIdFromRow(priorCase, `prior-${index + 1}`);
    const priorActivities =
      priorCase.activities ?? input.priorCaseActivities?.[priorCaseId] ?? undefined;
    const priorActivityFacts = collectFactsFromActivities(priorActivities);
    factsByCase.push({
      caseId: priorCaseId,
      caseComplete: isObservationCaseComplete(priorCase),
      facts: mergeFacts(
        collectFactsFromCaseRow(priorCase),
        priorActivityFacts.legacy,
        priorActivityFacts.validated,
      ),
    });
  }

  // §6 supplement gate: supplement (evidence re-parse + companion-fact inference)
  // runs only over legacy-derived facts. Validated v2 facts merge in untouched.
  const currentActivityFacts = collectFactsFromActivities(input.activities);
  factsByCase.push({
    caseId: currentCaseId,
    caseComplete: currentCaseComplete,
    facts: mergeFacts(
      supplementObservationFacts(
        mergeFacts(currentActivityFacts.legacy, collectFactsFromCaseRow(input.caseRow)),
      ),
      currentActivityFacts.validated,
    ),
  });

  const allFacts = factsByCase.flatMap((source) => source.facts);

  const bucketsByCase = factsByCase.map((source) => {
    const caseFacts = source.facts;
    const caseGenerated = generateObservationIntelligenceFromFacts(caseFacts);
    const buckets = groupIntelligenceFindingsByCategory(caseGenerated);
    inferProductFitOpportunityFromWorkflow(buckets);
    return {
      caseId: source.caseId,
      caseComplete: source.caseComplete,
      isCurrentCase: source.caseId === currentCaseId,
      buckets,
    };
  });

  appendInferredProductFitFacts(factsByCase, bucketsByCase);

  const aggregatedByCategory = aggregateCategoryFindingsFromBuckets(bucketsByCase);

  const learnedCategories = OBSERVATION_LEARNING_CATEGORY_ORDER.map((id) => ({
    id,
    title: OBSERVATION_LEARNING_CATEGORY_LABELS[id],
    findings: aggregatedByCategory[id],
  })).filter((category) => category.findings.length > 0);

  const evidence = scoreObservationEvidenceFromFacts({ factsByCase });

  return {
    factsByCase,
    allFacts,
    learnedCategories,
    aggregatedByCategory,
    evidencePillars: evidence.pillars,
    evidenceProgressSignalCount: evidence.signalCount,
    evidenceProgressValidatedCount: evidence.validatedCount,
  };
}

export { extractObservationFacts, generateObservationIntelligenceFromFacts, scoreObservationEvidenceFromFacts };
