export type UniversalConceptTimelineEvent = {
  capture_id: string;
  declared_source_type: string;
  assertion_level: string;
  created_at: string;
  evidence_snippets: string[];
};

export type UniversalConceptTimelineEntry = {
  concept: string;
  events: UniversalConceptTimelineEvent[];
};

export type UniversalConceptTimelineAssertionGroup = {
  assertion_level: string;
  assertion_label: string;
  events: UniversalConceptTimelineEvent[];
};

/** Display order for assertion lifecycle within a single concept timeline. */
export const UNIVERSAL_ASSERTION_TIMELINE_ORDER = [
  "provider_reported",
  "observed",
  "case_supported",
  "evaluated",
  "outcome_reported",
  "validated",
  "rejected",
] as const;

export const UNIVERSAL_ASSERTION_LEVEL_LABELS: Record<string, string> = {
  provider_reported: "Provider reported",
  observed: "Observed",
  case_supported: "Case supported",
  validated: "Validated",
  rejected: "Rejected",
  evaluated: "Evaluated",
  outcome_reported: "Outcome reported",
};

export function formatUniversalAssertionLevel(assertionLevel: string): string {
  return UNIVERSAL_ASSERTION_LEVEL_LABELS[assertionLevel] ?? assertionLevel;
}

export function formatConceptTimelineSourceLabel(declaredSourceType: string): string {
  const labels: Record<string, string> = {
    intro_call: "Intro call",
    office_visit: "Office visit",
    discovery_note: "Discovery note",
    observation_case: "Observation case",
    debrief_note: "Debrief note",
    debrief_validation: "Debrief validation",
    product_support_case: "Product support case",
    evaluation_note: "Evaluation note",
    outcome_note: "Outcome note",
  };
  return labels[declaredSourceType] ?? declaredSourceType;
}

/** Group a concept's events by assertion level for lifecycle display. */
export function groupConceptTimelineEventsByAssertion(
  events: UniversalConceptTimelineEvent[],
): UniversalConceptTimelineAssertionGroup[] {
  const groups = new Map<string, UniversalConceptTimelineEvent[]>();

  for (const event of events) {
    const bucket = groups.get(event.assertion_level) ?? [];
    bucket.push(event);
    groups.set(event.assertion_level, bucket);
  }

  const orderedLevels = [
    ...UNIVERSAL_ASSERTION_TIMELINE_ORDER.filter((level) => groups.has(level)),
    ...[...groups.keys()].filter(
      (level) => !UNIVERSAL_ASSERTION_TIMELINE_ORDER.includes(level as never),
    ),
  ];

  return orderedLevels.map((level) => ({
    assertion_level: level,
    assertion_label: formatUniversalAssertionLevel(level),
    events: groups.get(level) ?? [],
  }));
}

type TimelineRunInput = {
  capture_id: string;
  declared_source_type: string;
  created_at: string;
  facts: Array<{
    concept: string;
    assertion_level: string;
    evidence_snippets: string[];
  }>;
};

/** Oldest-to-newest assertion history per concept across saved extraction runs. */
export function buildUniversalConceptTimeline(runs: TimelineRunInput[]): UniversalConceptTimelineEntry[] {
  const conceptOrder: string[] = [];
  const eventsByConcept = new Map<string, UniversalConceptTimelineEvent[]>();

  for (const run of [...runs].reverse()) {
    for (const fact of run.facts) {
      if (!eventsByConcept.has(fact.concept)) {
        eventsByConcept.set(fact.concept, []);
        conceptOrder.push(fact.concept);
      }
      eventsByConcept.get(fact.concept)!.push({
        capture_id: run.capture_id,
        declared_source_type: run.declared_source_type,
        assertion_level: fact.assertion_level,
        created_at: run.created_at,
        evidence_snippets: fact.evidence_snippets,
      });
    }
  }

  return conceptOrder
    .map((concept) => ({
      concept,
      events: eventsByConcept.get(concept) ?? [],
    }))
    .filter((entry) => entry.events.length > 0);
}
