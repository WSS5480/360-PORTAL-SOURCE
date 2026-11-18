import { buildUniversalConceptTimeline } from "@/lib/surgical-sales/universalExtractor/buildUniversalConceptTimeline";
import {
  formatProviderIntelligenceComparisonLabel,
  sortProviderIntelligenceComparisonTopics,
  type ProviderIntelligenceComparisonSnapshot,
  type ProviderIntelligenceComparisonTopicRow,
} from "@/lib/surgical-sales/universalExtractor/providerIntelligenceComparisonTypes";

type UniversalFactsRunInput = {
  capture_id: string;
  declared_source_type: string;
  created_at: string;
  facts: Array<{
    concept: string;
    assertion_level: string;
    evidence_snippets: string[];
  }>;
};

function buildTopicRow(
  concept: string,
  observed_count: number,
  validated_count: number,
  evidence_snippet: string | null,
): ProviderIntelligenceComparisonTopicRow {
  return {
    concept,
    label: formatProviderIntelligenceComparisonLabel(concept),
    observed_count,
    validated_count,
    evidence_snippet,
  };
}

/** Experimental provider intelligence read model — Universal Facts only. */
export function buildProviderIntelligenceFromUniversalFacts(input: {
  runs: UniversalFactsRunInput[];
}): ProviderIntelligenceComparisonSnapshot {
  const timeline = buildUniversalConceptTimeline(input.runs);

  const topics = timeline
    .map((entry) => {
      const observed_count = entry.events.filter((event) => event.assertion_level === "observed").length;
      const validated_count = entry.events.filter((event) => event.assertion_level === "validated").length;
      if (observed_count === 0 && validated_count === 0) return null;

      const evidence_snippet =
        [...new Set(entry.events.flatMap((event) => event.evidence_snippets).filter(Boolean))][0] ?? null;

      return buildTopicRow(entry.concept, observed_count, validated_count, evidence_snippet);
    })
    .filter((row): row is ProviderIntelligenceComparisonTopicRow => row !== null);

  const sorted = sortProviderIntelligenceComparisonTopics(topics);

  return {
    topics: sorted,
    has_data: sorted.length > 0,
  };
}
