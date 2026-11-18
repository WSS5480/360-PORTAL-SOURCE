import type { CaseBriefingKind } from "@/lib/surgical-sales/caseIntelligenceSignals";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import type { UniversalSurgicalFactRow } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import {
  completedObservationCaseIds,
  priorCompletedObservationCaseIds,
  UNIVERSAL_FACTS_SURGICAL_READ_CONCEPTS,
} from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import type {
  UfCoachingGuidanceInputs,
  UfConceptMaturity,
  UfLearningGapCategory,
  UfProgramSignalSummary,
} from "@/lib/surgical-sales/universalExtractor/coachingGuidanceInputsTypes";

const SURGICAL_READ_CONCEPT_SET = new Set<string>(UNIVERSAL_FACTS_SURGICAL_READ_CONCEPTS);

function isEligibleFact(fact: UniversalSurgicalFactRow): boolean {
  return (
    !fact.suppressed &&
    !fact.negated &&
    !fact.uncertain &&
    fact.assertion_level !== "rejected" &&
    SURGICAL_READ_CONCEPT_SET.has(String(fact.concept))
  );
}

function flattenFacts(runs: UniversalFactExtractionRun[]): UniversalSurgicalFactRow[] {
  return runs.flatMap((run) => run.facts).filter(isEligibleFact);
}

function conceptSampleEvidence(facts: UniversalSurgicalFactRow[]): string | null {
  for (const fact of facts) {
    const evidence = fact.evidence_text?.trim();
    if (evidence && evidence.length <= 200) return evidence;
    const label = fact.normalized_label?.trim();
    if (label) return label;
  }
  return null;
}

function conceptProductMentioned(facts: UniversalSurgicalFactRow[]): string | null {
  return facts.map((fact) => fact.product_mentioned?.trim()).find(Boolean) ?? null;
}

function summarizeConceptOnCases(input: {
  facts: UniversalSurgicalFactRow[];
  caseIds: Set<string>;
}): UfProgramSignalSummary[] {
  const concepts = new Set(input.facts.map((fact) => String(fact.concept)));
  const summaries: UfProgramSignalSummary[] = [];

  for (const concept of concepts) {
    const conceptFacts = input.facts.filter(
      (fact) =>
        String(fact.concept) === concept &&
        fact.case_id &&
        input.caseIds.has(String(fact.case_id)),
    );
    if (conceptFacts.length === 0) continue;

    const validatedCaseIds = new Set(
      conceptFacts
        .filter((fact) => fact.assertion_level === "validated" && fact.case_id)
        .map((fact) => String(fact.case_id)),
    );
    const observedCaseIds = new Set(
      conceptFacts
        .filter(
          (fact) =>
            (fact.assertion_level === "observed" || fact.assertion_level === "case_supported") &&
            fact.case_id,
        )
        .map((fact) => String(fact.case_id)),
    );

    const completedCaseCount = validatedCaseIds.size > 0 ? validatedCaseIds.size : observedCaseIds.size;
    let maturity: UfConceptMaturity = "absent";
    if (validatedCaseIds.size > 0 || observedCaseIds.size >= 2) {
      maturity = "established";
    } else if (observedCaseIds.size === 1) {
      maturity = "observed_once";
    }

    summaries.push({
      concept,
      maturity,
      completedCaseCount,
      validatedCaseCount: validatedCaseIds.size,
      sampleEvidence: conceptSampleEvidence(conceptFacts),
      productMentioned: conceptProductMentioned(conceptFacts),
    });
  }

  return summaries.sort((left, right) => left.concept.localeCompare(right.concept));
}

function programFactsBlob(
  facts: UniversalSurgicalFactRow[],
  concepts: readonly string[],
): string {
  const conceptSet = new Set(concepts);
  return facts
    .filter((fact) => conceptSet.has(String(fact.concept)))
    .map((fact) => `${fact.normalized_label ?? ""} ${fact.evidence_text ?? ""}`)
    .join(" ")
    .toLowerCase();
}

function hasSmoothProgramEvidence(programFacts: UniversalSurgicalFactRow[]): boolean {
  const blob = programFactsBlob(programFacts, [
    "case_outcome",
    "no_issue_or_routine",
    "staff_workflow",
    "provider_sentiment",
  ]);
  return /smooth|efficient|coordinated|organized|routine|went well|went smoothly|nothing negative|no frustration|team seemed|pretty efficient/.test(
    blob,
  );
}

function hasExplicitNoMajorIssueEvidence(facts: UniversalSurgicalFactRow[]): boolean {
  const blob = facts
    .map((fact) => `${fact.normalized_label ?? ""} ${fact.evidence_text ?? ""}`)
    .join(" ")
    .toLowerCase();
  return /\b(?:no major issues?|no commitments?|wasn't evaluating|not evaluating|no formal evaluation)\b/i.test(blob);
}

/** Provider frustration is assessed when sentiment was captured or multiple smooth cases showed none. */
export function isProviderFrictionAssessed(input: {
  conceptSet: Set<string>;
  programFacts: UniversalSurgicalFactRow[];
  programCompletedCount: number;
}): boolean {
  if (input.conceptSet.has("provider_sentiment")) return true;
  if (input.conceptSet.has("no_issue_or_routine")) return true;
  if (input.programCompletedCount >= 2 && hasSmoothProgramEvidence(input.programFacts)) return true;
  return false;
}

/** Staff friction is assessed when positive workflow, friction, or timing issues were captured. */
export function isStaffFrictionAssessed(input: {
  conceptSet: Set<string>;
  programFacts: UniversalSurgicalFactRow[];
  programCompletedCount: number;
}): boolean {
  const staffBlob = programFactsBlob(input.programFacts, ["staff_workflow", "case_outcome"]);
  const hasStaffFrictionEvidence =
    /friction|complaint|workaround|burden|frustrat/.test(staffBlob) &&
    !/nobody appeared frustrated|didn't seem angry|not frustrated|no frustration|wasn't frustrated/i.test(
      staffBlob,
    );
  if (hasStaffFrictionEvidence) return true;

  const hasPositiveStaffWorkflow =
    /organized|coordinated|smooth|positive staff|worked smoothly|know what they were doing|worked well|efficient|communication|strong|consistent team|retention|satisfaction|team seemed|pretty efficient/.test(
      staffBlob,
    );
  if (hasPositiveStaffWorkflow) return true;
  if (input.conceptSet.has("workflow_or_timing_issue")) return true;
  if (input.programCompletedCount >= 2 && staffBlob.trim().length > 0) return true;
  return false;
}

function deriveUfLearningGaps(input: {
  priorSignals: UfProgramSignalSummary[];
  currentCaseSignals: UfProgramSignalSummary[];
  priorCompletedCaseCount: number;
  programCompletedCount: number;
  programFacts: UniversalSurgicalFactRow[];
}): UfLearningGapCategory[] {
  const gaps = new Set<UfLearningGapCategory>();
  const allSignals = [...input.priorSignals, ...input.currentCaseSignals];
  const conceptSet = new Set(allSignals.map((signal) => signal.concept));
  const noMajorIssueEvidence = hasExplicitNoMajorIssueEvidence(input.programFacts);

  if (
    !noMajorIssueEvidence &&
    !isProviderFrictionAssessed({ conceptSet, programFacts: input.programFacts, programCompletedCount: input.programCompletedCount })
  ) {
    gaps.add("provider_friction_unknown");
  }

  if (
    !noMajorIssueEvidence &&
    !isStaffFrictionAssessed({ conceptSet, programFacts: input.programFacts, programCompletedCount: input.programCompletedCount })
  ) {
    gaps.add("staff_friction_unknown");
  }

  if (!conceptSet.has("current_product") && !conceptSet.has("competitor_product")) {
    gaps.add("product_usage_unknown");
  }

  for (const signal of input.priorSignals) {
    if (signal.maturity === "observed_once") {
      gaps.add("repeat_confirmation_needed");
    }
  }

  if (input.priorCompletedCaseCount > 0 && input.priorSignals.length === 0) {
    gaps.add("repeat_confirmation_needed");
  }

  return [...gaps];
}

/** Read-only UF coaching signal summary for guidance-input comparison (Phase A). */
export function summarizeUfCoachingGuidanceInputs(input: {
  programRuns: UniversalFactExtractionRun[];
  caseRuns?: UniversalFactExtractionRun[];
  caseRow: Record<string, unknown>;
  priorCases?: Array<Record<string, unknown>>;
  briefingKind: CaseBriefingKind;
  programCompletedCount: number;
}): UfCoachingGuidanceInputs {
  const priorCaseIds = new Set(
    priorCompletedObservationCaseIds({
      caseRow: input.caseRow,
      priorCases: input.priorCases,
    }).map(String),
  );
  const currentCaseId = String(input.caseRow.id ?? "").trim();
  const programFacts = flattenFacts(input.programRuns);
  const caseFacts = flattenFacts(input.caseRuns ?? []);
  const gapFacts = [...programFacts, ...caseFacts];

  const priorSignals = summarizeConceptOnCases({
    facts: programFacts,
    caseIds: priorCaseIds,
  });
  const currentCaseSignals = summarizeConceptOnCases({
    facts: caseFacts.length > 0 ? caseFacts : programFacts,
    caseIds: new Set([currentCaseId]),
  });

  return {
    source: "uf",
    briefingKind: input.briefingKind,
    programCompletedCount: input.programCompletedCount,
    priorCompletedCaseCount: priorCaseIds.size,
    priorSignals,
    currentCaseSignals,
    gaps: deriveUfLearningGaps({
      priorSignals,
      currentCaseSignals,
      priorCompletedCaseCount: priorCaseIds.size,
      programCompletedCount: input.programCompletedCount,
      programFacts: gapFacts,
    }),
  };
}

/** Exported for tests — counts completed observation cases in program scope. */
export function ufProgramCompletedCaseIds(input: {
  caseRow: Record<string, unknown>;
  priorCases?: Array<Record<string, unknown>>;
}): string[] {
  return completedObservationCaseIds(input);
}
