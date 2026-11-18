import type {
  FieldBriefingEvidenceCard,
  FieldBriefingEvidenceImpact,
} from "@/lib/surgical-sales/buildProviderIntelligenceKnowledgeDashboardView";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import { PROCEDURE_VOLUME_PATTERNS } from "@/lib/surgical-sales/sharedIntelligence/procedurePatterns";
import type {
  UniversalFactExtractionRun,
  UniversalSurgicalFactRow,
} from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import {
  intelligenceChipTextFromFact,
  intelligenceEvidenceQuoteFromFact,
  intelligenceSourceLabelFromRun,
  shouldSkipUniversalFactIntelligenceDisplay,
  universalEmergingChipFromFact,
  type UniversalEmergingChip,
} from "@/lib/surgical-sales/universalExtractor/intelligenceDisplayFromFact";
import { reviewProposedValueFromFact } from "@/lib/surgical-sales/universalExtractor/reviewProposedValueFromFact";
import {
  adaptUniversalFactsToWhatWeKnowLines,
  UNIVERSAL_FACTS_SURGICAL_READ_CONCEPTS,
} from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";

export type { UniversalEmergingChip };

const WHAT_WE_KNOW_CHIP_LIMIT = 8;

const PROVIDER_CLINICAL_SOURCE_TYPES = new Set([
  "intro_call",
  "office_visit",
  "discovery_note",
  "observation_case",
  "debrief_note",
  "debrief_validation",
]);

const PRODUCT_CONCEPTS = new Set(["current_product", "competitor_product"]);

const WORKFLOW_CATEGORY_CONCEPTS = new Set([
  "workflow_or_timing_issue",
  "visualization_or_access_issue",
  "product_performance_issue",
  "inventory_availability_issue",
  "staff_workflow",
  "placement_or_positioning_issue",
  "training_or_familiarity_issue",
  "support_needed",
  "sizing_or_fit_issue",
]);

const WORKFLOW_EVIDENCE_CONCEPTS = new Set([
  ...WORKFLOW_CATEGORY_CONCEPTS,
  "requested_item",
  "unavailable_item",
  "alternative_used",
]);

function isSurgicalReadConcept(concept: string): boolean {
  return (UNIVERSAL_FACTS_SURGICAL_READ_CONCEPTS as readonly string[]).includes(concept);
}

function factText(fact: UniversalSurgicalFactRow): string {
  return `${fact.normalized_label ?? ""} ${fact.evidence_text ?? ""}`.trim();
}

function hasProcedureVolumeEvidence(fact: UniversalSurgicalFactRow): boolean {
  const text = factText(fact);
  if (!text) return false;
  if (PROCEDURE_VOLUME_PATTERNS.some(({ pattern }) => pattern.test(text))) return true;
  return /increas|growing|higher volume|more .{0,60} (?:repairs|cases)|uptick/i.test(text);
}

function isEligibleFact(fact: UniversalSurgicalFactRow): boolean {
  if (fact.suppressed || fact.negated || fact.uncertain || fact.assertion_level === "rejected") {
    return false;
  }
  const concept = String(fact.concept);
  return (
    isSurgicalReadConcept(concept) ||
    PRODUCT_CONCEPTS.has(concept) ||
    hasProcedureVolumeEvidence(fact)
  );
}

function clinicalRuns(runs: UniversalFactExtractionRun[]): UniversalFactExtractionRun[] {
  return runs.filter((run) => PROVIDER_CLINICAL_SOURCE_TYPES.has(run.declared_source_type));
}

function flattenFacts(runs: UniversalFactExtractionRun[]): UniversalSurgicalFactRow[] {
  return runs.flatMap((run) => run.facts).filter(isEligibleFact);
}

function cardImpact(label: string, validated = false): FieldBriefingEvidenceImpact {
  return { label, impact: validated ? "validated" : "created" };
}

function dedupeImpacts(impacts: FieldBriefingEvidenceImpact[]): FieldBriefingEvidenceImpact[] {
  const seen = new Set<string>();
  return impacts.filter((impact) => {
    const key = `${impact.label}::${impact.impact}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractProcedureVolumeHits(facts: UniversalSurgicalFactRow[]): string[] {
  const procedures: string[] = [];
  const hasVolumeLanguage = facts.some((fact) =>
    /increas|growing|higher volume|more .{0,60} (?:repairs|cases)|uptick/i.test(factText(fact)),
  );

  for (const { procedure, pattern } of PROCEDURE_VOLUME_PATTERNS) {
    if (facts.some((fact) => pattern.test(factText(fact)))) {
      procedures.push(procedure);
    }
  }

  if (procedures.length === 0 && hasVolumeLanguage) {
    for (const fact of facts) {
      const label = fact.normalized_label?.trim();
      if (label && /repair|reconstruction|hernia|procedure|fracture|trauma/i.test(label) && label.length <= 80) {
        procedures.push(label);
      }
    }
  }

  return [...new Set(procedures)];
}

function bestFactForProcedure(
  facts: UniversalSurgicalFactRow[],
  procedure: string,
): UniversalSurgicalFactRow | null {
  const needle = procedure.toLowerCase();
  const matches = facts.filter((fact) => factText(fact).toLowerCase().includes(needle.split(" ")[0] ?? needle));
  const pool = matches.length > 0 ? matches : facts;
  return [...pool].sort((left, right) => right.created_at.localeCompare(left.created_at))[0] ?? null;
}

function bestRunForFact(
  runs: UniversalFactExtractionRun[],
  fact: UniversalSurgicalFactRow,
): UniversalFactExtractionRun | null {
  return runs.find((run) => run.facts.some((row) => row.id === fact.id)) ?? runs[0] ?? null;
}

function pushUniqueEmergingChip(
  rows: UniversalEmergingChip[],
  seen: Set<string>,
  chip: UniversalEmergingChip | null,
): void {
  if (!chip) return;
  const key = chip.text.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  rows.push(chip);
}

function chipIdPart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

/** Row 24 — Clinical Trend evidence cards from UF captures (intro / debrief / observation). */
export function adaptUniversalFactsToClinicalTrendEvidenceCards(input: {
  providerRuns: UniversalFactExtractionRun[];
}): FieldBriefingEvidenceCard[] {
  const runs = clinicalRuns(input.providerRuns);
  const facts = flattenFacts(runs);
  const procedures = extractProcedureVolumeHits(facts);
  if (procedures.length === 0) return [];

  return procedures.slice(0, 3).map((procedure) => {
    const fact = bestFactForProcedure(facts, procedure);
    const run = fact ? bestRunForFact(runs, fact) : null;
    const excerpt = scanLine(
      (fact ? intelligenceEvidenceQuoteFromFact(fact) : null) ??
        `Increasing ${procedure.toLowerCase()} volume noted.`,
      180,
    );

    return {
      id: `evidence-clinical-uf-${procedure.toLowerCase().replace(/\s+/g, "-")}`,
      icon: "clinical_signal" as const,
      title: "Clinical Trend",
      dateLabel: "—",
      excerpt,
      whyItMatters: "Shows commercial opportunity and clinical fit.",
      intelligenceImpacts: dedupeImpacts([
        cardImpact(`${procedure} — volume increasing`),
        cardImpact("Increasing procedure volume"),
      ]),
      href: null,
      sourceTypeLabel: run ? intelligenceSourceLabelFromRun(run) : "Field Note",
      sourceQuote: excerpt,
      mappedFieldLabel: "Procedure focus",
    };
  });
}

/** Row 25 — Product Interest evidence card from UF product concepts. */
export function adaptUniversalFactsToProductInterestEvidenceCard(input: {
  providerRuns: UniversalFactExtractionRun[];
  detailsHref?: string | null;
  primaryCaseId?: string | null;
  programCompletedCount?: number;
  completedCaseIds?: string[];
}): FieldBriefingEvidenceCard | null {
  const runs = clinicalRuns(input.providerRuns);
  const facts = flattenFacts(runs).filter((fact) => PRODUCT_CONCEPTS.has(String(fact.concept)));
  if (facts.length === 0) return null;

  const latest = [...facts].sort((left, right) => right.created_at.localeCompare(left.created_at))[0]!;
  const run = bestRunForFact(runs, latest);
  const productName =
    latest.product_mentioned?.trim() ||
    latest.normalized_label?.replace(/^competitor product:\s*/i, "").trim() ||
    latest.evidence_text?.trim() ||
    "Product";

  const observedInCase =
    (input.programCompletedCount ?? 0) > 0 &&
    String(latest.case_id ?? "").trim() &&
    (input.completedCaseIds ?? []).includes(String(latest.case_id));

  const evidenceExcerpt = intelligenceEvidenceQuoteFromFact(latest);
  const excerpt = scanLine(
    observedInCase
      ? `${productName} was observed in ${input.programCompletedCount} observation case${input.programCompletedCount === 1 ? "" : "s"}. Confirm whether usage is consistent across additional cases.`
      : evidenceExcerpt ??
          `${productName} was mentioned, but product usage should be confirmed during the first observation.`,
    220,
  );

  const impactLabel = observedInCase
    ? (latest.normalized_label?.trim() || productName)
    : `Current product identified: ${productName}`;

  return {
    id: `evidence-obs-product-uf-${productName.toLowerCase().replace(/\s+/g, "-")}`,
    icon: observedInCase ? "observation" : "clinical_signal",
    title: "Product Interest",
    dateLabel: "—",
    excerpt,
    whyItMatters: observedInCase
      ? "Observation evidence informs whether current product use is consistent across cases."
      : "Early product context informs observation focus and evaluation planning.",
    intelligenceImpacts: dedupeImpacts([
      cardImpact(impactLabel, false),
      ...(observedInCase ? [] : [cardImpact("Needs confirmation during observation", false)]),
    ]),
    href: input.detailsHref ?? null,
    sourceTypeLabel: observedInCase ? "Observation" : run ? intelligenceSourceLabelFromRun(run) : "Field Note",
    mappedFieldLabel: "Competitive products",
    sourceQuote: evidenceExcerpt ?? excerpt,
  };
}

/** Workflow & Priorities evidence cards from UF intro/debrief captures. */
export function adaptUniversalFactsToWorkflowEvidenceCards(input: {
  providerRuns: UniversalFactExtractionRun[];
}): FieldBriefingEvidenceCard[] {
  const cards: FieldBriefingEvidenceCard[] = [];
  const seen = new Set<string>();

  for (const run of clinicalRuns(input.providerRuns)) {
    for (const fact of run.facts.filter(isEligibleFact)) {
      if (!WORKFLOW_EVIDENCE_CONCEPTS.has(String(fact.concept))) continue;
      if (shouldSkipUniversalFactIntelligenceDisplay(fact)) continue;

      const proposed = reviewProposedValueFromFact(fact);
      if (!proposed || proposed.length < 16) continue;

      const key = proposed.toLowerCase().slice(0, 96);
      if (seen.has(key)) continue;
      seen.add(key);

      const excerpt = scanLine(intelligenceEvidenceQuoteFromFact(fact) ?? proposed, 220);
      cards.push({
        id: `evidence-workflow-uf-${fact.id}`,
        icon: "clinical_signal",
        title: "Workflow & Priorities",
        dateLabel: "—",
        excerpt,
        whyItMatters: "Workflow priorities guide observation focus and evaluation planning.",
        intelligenceImpacts: dedupeImpacts([cardImpact(scanLine(proposed, 100), false)]),
        href: null,
        sourceTypeLabel: intelligenceSourceLabelFromRun(run),
        mappedFieldLabel: "Workflow pain points",
        sourceQuote: intelligenceEvidenceQuoteFromFact(fact) ?? excerpt,
      });
    }
  }

  return cards.slice(0, 4);
}

/** Row 30 — Emerging chips: procedure / volume trends. */
export function adaptUniversalFactsToProcedureVolumeEmergingChips(input: {
  providerRuns: UniversalFactExtractionRun[];
  completedCaseIds: string[];
  programCompletedCount: number;
}): UniversalEmergingChip[] {
  const runs = clinicalRuns(input.providerRuns);
  const facts = flattenFacts(runs);
  const rows: UniversalEmergingChip[] = [];
  const seen = new Set<string>();

  if (input.programCompletedCount > 0) {
    for (const line of adaptUniversalFactsToWhatWeKnowLines({
      programRuns: input.providerRuns,
      completedCaseIds: input.completedCaseIds,
      programCompletedCount: input.programCompletedCount,
    })) {
      pushUniqueEmergingChip(rows, seen, {
        id: `uf-program-${line.toLowerCase().replace(/\s+/g, "-").slice(0, 40)}`,
        text: line,
        evidenceQuote: null,
        evidenceSource: "Observation",
        evidenceCapturedAt: null,
      });
    }
  }

  const procedures = extractProcedureVolumeHits(facts);
  const hasVolume = facts.some((fact) => /increas|growing|higher volume|more /i.test(factText(fact)));

  const pushProcedureChip = (text: string, fact: UniversalSurgicalFactRow | null) => {
    const run = (fact ? bestRunForFact(runs, fact) : null) ?? runs[0] ?? null;
    pushUniqueEmergingChip(rows, seen, {
      id: `uf-proc-${fact?.id ?? "derived"}-${chipIdPart(text)}`,
      text,
      evidenceQuote: fact ? intelligenceEvidenceQuoteFromFact(fact) : null,
      evidenceSource: run ? intelligenceSourceLabelFromRun(run) : null,
      evidenceCapturedAt: run?.created_at ?? null,
    });
  };

  if (procedures.length >= 2 && hasVolume) {
    const fact = bestFactForProcedure(facts, procedures[0]!) ?? facts[0] ?? null;
    pushProcedureChip(`${procedures[0]} / ${procedures[1]} volume increasing`, fact);
  } else {
    for (const procedure of procedures) {
      pushProcedureChip(
        hasVolume ? `${procedure} volume increasing` : procedure,
        bestFactForProcedure(facts, procedure),
      );
    }
    if (hasVolume && procedures.length === 1) {
      pushProcedureChip("Increasing procedure volume", bestFactForProcedure(facts, procedures[0]!));
    }
  }

  return rows.slice(0, WHAT_WE_KNOW_CHIP_LIMIT);
}

/** Emerging chips: workflow and operational priorities (not access/contacts/clinical duplicates). */
export function adaptUniversalFactsToCategoryEmergingChips(input: {
  providerRuns: UniversalFactExtractionRun[];
}): UniversalEmergingChip[] {
  const rows: UniversalEmergingChip[] = [];
  const seen = new Set<string>();

  for (const run of clinicalRuns(input.providerRuns)) {
    for (const fact of run.facts.filter(isEligibleFact)) {
      if (!WORKFLOW_CATEGORY_CONCEPTS.has(String(fact.concept))) continue;
      pushUniqueEmergingChip(rows, seen, universalEmergingChipFromFact(fact, run));
    }
  }

  return rows.slice(0, WHAT_WE_KNOW_CHIP_LIMIT);
}

/** Row 31 — Emerging chips: current product / competitor (not commercial opportunity). */
export function adaptUniversalFactsToProductEmergingChips(input: {
  providerRuns: UniversalFactExtractionRun[];
  executionStage: boolean;
}): UniversalEmergingChip[] {
  const runs = clinicalRuns(input.providerRuns);
  const facts = flattenFacts(runs).filter((fact) => PRODUCT_CONCEPTS.has(String(fact.concept)));
  if (facts.length === 0) return [];

  const rows: UniversalEmergingChip[] = [];
  const seen = new Set<string>();

  for (const fact of [...facts].sort((left, right) => right.created_at.localeCompare(left.created_at))) {
    const product =
      fact.product_mentioned?.trim() ||
      fact.normalized_label?.replace(/^competitor product:\s*/i, "").trim();
    if (!product) continue;

    const text = input.executionStage
      ? `${product} mentioned in field capture`
      : intelligenceChipTextFromFact(fact) ?? `Current product identified: ${product}`;

    const run = bestRunForFact(runs, fact)!;
    pushUniqueEmergingChip(rows, seen, {
      id: `uf-product-${fact.id}`,
      text,
      evidenceQuote: intelligenceEvidenceQuoteFromFact(fact),
      evidenceSource: intelligenceSourceLabelFromRun(run),
      evidenceCapturedAt: run.created_at,
    });
    break;
  }

  return rows;
}
