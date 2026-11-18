import { buildUniversalConceptTimeline } from "@/lib/surgical-sales/universalExtractor/buildUniversalConceptTimeline";
import type { UniversalConceptTimelineEntry } from "@/lib/surgical-sales/universalExtractor/buildUniversalConceptTimeline";
import {
  isDebriefPrepPositiveContextConcept,
  isDebriefPrepPotentialTopicConcept,
} from "@/lib/surgical-sales/universalExtractor/debriefPrepareConceptDisplay";

export type DebriefPrepareConceptDigest = {
  concept: string;
  observed_count: number;
  validated_count: number;
  provider_reported_count: number;
  rejected_count: number;
  assertion_levels: string[];
  evidence_snippets: string[];
  source_types: string[];
};

export type DebriefPrepareConceptTimelineSummary = {
  strongest_debrief_topics: DebriefPrepareConceptDigest[];
  potential_topics_from_observations: DebriefPrepareConceptDigest[];
  mentioned_not_yet_confirmed: DebriefPrepareConceptDigest[];
  positive_context: DebriefPrepareConceptDigest[];
  ruled_out: DebriefPrepareConceptDigest[];
  meta: {
    concept_count: number;
    run_count: number;
    has_timeline_data: boolean;
  };
};

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

function digestConcept(entry: UniversalConceptTimelineEntry): DebriefPrepareConceptDigest {
  const events = entry.events;
  const assertionLevels = [...new Set(events.map((event) => event.assertion_level))];

  return {
    concept: entry.concept,
    observed_count: events.filter((event) => event.assertion_level === "observed").length,
    validated_count: events.filter((event) => event.assertion_level === "validated").length,
    provider_reported_count: events.filter((event) => event.assertion_level === "provider_reported")
      .length,
    rejected_count: events.filter((event) => event.assertion_level === "rejected").length,
    assertion_levels: assertionLevels,
    evidence_snippets: [
      ...new Set(events.flatMap((event) => event.evidence_snippets).filter(Boolean)),
    ].slice(0, 3),
    source_types: [...new Set(events.map((event) => event.declared_source_type))],
  };
}

function sortByCount(
  digests: DebriefPrepareConceptDigest[],
  pickCount: (digest: DebriefPrepareConceptDigest) => number,
): DebriefPrepareConceptDigest[] {
  return [...digests].sort((left, right) => pickCount(right) - pickCount(left));
}

function isProviderReportedOnly(digest: DebriefPrepareConceptDigest): boolean {
  return (
    digest.provider_reported_count > 0 &&
    digest.observed_count === 0 &&
    digest.validated_count === 0 &&
    digest.rejected_count === 0
  );
}

function hasPositiveContextSignal(digest: DebriefPrepareConceptDigest): boolean {
  return (
    digest.observed_count > 0 ||
    digest.validated_count > 0 ||
    digest.provider_reported_count > 0 ||
    digest.rejected_count > 0
  );
}

/** Summarize universal concept timeline for experimental Debrief Prepare briefing. */
export function summarizeUniversalConceptTimelineForDebriefPrepare(input: {
  runs: TimelineRunInput[];
}): DebriefPrepareConceptTimelineSummary {
  const timeline = buildUniversalConceptTimeline(input.runs);
  const digests = timeline.map(digestConcept);

  const strongest_debrief_topics = sortByCount(
    digests.filter((digest) => digest.observed_count > 0 && digest.validated_count > 0),
    (digest) => digest.validated_count * 10 + digest.observed_count,
  );

  const strongestConcepts = new Set(strongest_debrief_topics.map((digest) => digest.concept));

  const ruled_out = sortByCount(
    digests.filter((digest) => digest.rejected_count > 0),
    (digest) => digest.rejected_count,
  );

  const ruledOutConcepts = new Set(ruled_out.map((digest) => digest.concept));

  const positive_context = digests.filter(
    (digest) =>
      isDebriefPrepPositiveContextConcept(digest.concept) &&
      hasPositiveContextSignal(digest) &&
      !strongestConcepts.has(digest.concept) &&
      !ruledOutConcepts.has(digest.concept),
  );

  const positiveConcepts = new Set(positive_context.map((digest) => digest.concept));

  const potential_topics_from_observations = sortByCount(
    digests.filter(
      (digest) =>
        isDebriefPrepPotentialTopicConcept(digest.concept) &&
        digest.observed_count > 0 &&
        !strongestConcepts.has(digest.concept) &&
        !ruledOutConcepts.has(digest.concept) &&
        !positiveConcepts.has(digest.concept),
    ),
    (digest) => digest.observed_count,
  );

  const assignedConcepts = new Set([
    ...strongestConcepts,
    ...ruledOutConcepts,
    ...positiveConcepts,
    ...potential_topics_from_observations.map((digest) => digest.concept),
  ]);

  const mentioned_not_yet_confirmed = digests.filter(
    (digest) =>
      isProviderReportedOnly(digest) &&
      !isDebriefPrepPositiveContextConcept(digest.concept) &&
      !assignedConcepts.has(digest.concept),
  );

  return {
    strongest_debrief_topics,
    potential_topics_from_observations,
    mentioned_not_yet_confirmed,
    positive_context,
    ruled_out,
    meta: {
      concept_count: digests.length,
      run_count: input.runs.length,
      has_timeline_data: digests.length > 0,
    },
  };
}
