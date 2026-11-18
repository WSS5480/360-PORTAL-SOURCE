import type {
  FieldBriefingEvidenceCard,
  FieldBriefingEvidenceImpact,
} from "@/lib/surgical-sales/buildProviderIntelligenceKnowledgeDashboardView";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import { buildUniversalConceptTimeline } from "@/lib/surgical-sales/universalExtractor/buildUniversalConceptTimeline";
import { formatDebriefPrepareConceptRepLabel } from "@/lib/surgical-sales/universalExtractor/debriefPrepareConceptDisplay";
import type {
  UniversalFactExtractionRun,
  UniversalSurgicalFactRow,
} from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import { UNIVERSAL_FACTS_SURGICAL_READ_CONCEPTS } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";

const OBSERVATION_SOURCE_TYPES = new Set(["observation_case", "debrief_validation", "debrief_note"]);

const WORKFLOW_CONCEPTS = new Set([
  "visualization_or_access_issue",
  "workflow_or_timing_issue",
  "placement_or_positioning_issue",
]);

function isSurgicalReadConcept(concept: string): boolean {
  return (UNIVERSAL_FACTS_SURGICAL_READ_CONCEPTS as readonly string[]).includes(concept);
}

function isEligibleFact(fact: UniversalSurgicalFactRow): boolean {
  return (
    !fact.suppressed &&
    !fact.negated &&
    !fact.uncertain &&
    fact.assertion_level !== "rejected" &&
    isSurgicalReadConcept(String(fact.concept))
  );
}

function flattenFacts(runs: UniversalFactExtractionRun[]): UniversalSurgicalFactRow[] {
  return runs.flatMap((run) => run.facts).filter(isEligibleFact);
}

function observationRuns(runs: UniversalFactExtractionRun[]): UniversalFactExtractionRun[] {
  return runs.filter((run) => OBSERVATION_SOURCE_TYPES.has(run.declared_source_type));
}

function bestExcerpt(fact: UniversalSurgicalFactRow): string {
  const label = fact.normalized_label?.trim();
  if (label && label.length <= 220) return label;
  const evidence = fact.evidence_text?.trim();
  if (evidence) return evidence;
  return formatDebriefPrepareConceptRepLabel(String(fact.concept));
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

function runsToTimelineInput(runs: UniversalFactExtractionRun[]) {
  return runs.map((run) => ({
    capture_id: run.capture_id,
    declared_source_type: run.declared_source_type,
    created_at: run.created_at,
    facts: run.facts.filter(isEligibleFact).map((fact) => ({
      concept: String(fact.concept),
      assertion_level: String(fact.assertion_level),
      evidence_snippets: [fact.evidence_text.trim()].filter(Boolean),
    })),
  }));
}

function latestFactForCase(
  runs: UniversalFactExtractionRun[],
  primaryCaseId: string | null,
): UniversalSurgicalFactRow | null {
  const scopedRuns = primaryCaseId
    ? runs.filter((run) => run.facts.some((fact) => String(fact.case_id ?? "") === primaryCaseId))
    : runs;
  const facts = flattenFacts(scopedRuns.length > 0 ? scopedRuns : runs);
  if (facts.length === 0) return null;
  return [...facts].sort((left, right) => right.created_at.localeCompare(left.created_at))[0] ?? null;
}

/** Provider Intelligence evidence cards — observation + workflow excerpts from UF timeline. */
export function adaptUniversalFactsToObservationFieldEvidenceCards(input: {
  providerRuns: UniversalFactExtractionRun[];
  primaryCaseId: string | null;
  detailsHref: string | null;
  programStatusLabel: string;
}): FieldBriefingEvidenceCard[] {
  const scopedRuns = observationRuns(input.providerRuns);
  if (scopedRuns.length === 0) return [];

  const cards: FieldBriefingEvidenceCard[] = [];
  const latestFact = latestFactForCase(scopedRuns, input.primaryCaseId);
  const noteExcerpt = scanLine(latestFact ? bestExcerpt(latestFact) : input.programStatusLabel, 220);

  cards.push({
    id: `evidence-observation-note-${input.primaryCaseId ?? "uf"}`,
    icon: "observation",
    title: "Observation",
    dateLabel: "—",
    excerpt: noteExcerpt,
    whyItMatters: "Observation notes feed provider-level evidence maturity and next best actions.",
    intelligenceImpacts: dedupeImpacts([cardImpact(input.programStatusLabel)]),
    href: input.detailsHref,
    sourceTypeLabel: "Observation",
    sourceQuote: noteExcerpt,
  });

  const timeline = buildUniversalConceptTimeline(runsToTimelineInput(scopedRuns));
  const workflowEntry = timeline.find((entry) => WORKFLOW_CONCEPTS.has(entry.concept));
  if (workflowEntry) {
    const latestEvent = workflowEntry.events[workflowEntry.events.length - 1];
    const snippet =
      latestEvent?.evidence_snippets[0]?.trim() ||
      formatDebriefPrepareConceptRepLabel(workflowEntry.concept);
    const workflowExcerpt = scanLine(snippet, 220);
    const validated = latestEvent?.assertion_level === "validated";

    cards.push({
      id: `evidence-workflow-signal-${input.primaryCaseId ?? "uf"}`,
      icon: "clinical_signal",
      title: "Workflow Pain Point",
      dateLabel: "—",
      excerpt: workflowExcerpt,
      whyItMatters: "Workflow friction or opportunity signals guide evaluation focus.",
      intelligenceImpacts: dedupeImpacts([cardImpact(workflowExcerpt, validated)]),
      href: input.detailsHref,
      sourceTypeLabel: "Observation",
      mappedFieldLabel: "Workflow pain points",
      sourceQuote: workflowExcerpt,
    });
  }

  return cards;
}
