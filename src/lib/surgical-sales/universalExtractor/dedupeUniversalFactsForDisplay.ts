type ConfidenceLevel = "high" | "medium" | "low" | string;

const CONFIDENCE_RANK: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export type UniversalFactMergeSource = {
  id: string;
  concept: string;
  normalized_label: string;
  assertion_level: string;
  source_type: string;
  confidence: ConfidenceLevel;
  evidence_text: string;
  uncertain: boolean;
  negated: boolean;
};

export type UniversalFactDisplayRow = {
  id: string;
  concept: string;
  normalized_label: string;
  assertion_level: string;
  source_type: string;
  confidence: ConfidenceLevel;
  uncertain: boolean;
  negated: boolean;
  evidence_count: number;
  evidence_snippets: string[];
  merged_fact_ids: string[];
};

function confidenceRank(confidence: ConfidenceLevel): number {
  return CONFIDENCE_RANK[confidence] ?? 0;
}

function pickPrimaryFact<T extends UniversalFactMergeSource>(facts: T[]): T {
  return [...facts].sort((left, right) => confidenceRank(right.confidence) - confidenceRank(left.confidence))[0];
}

function uniqueEvidenceSnippets(facts: UniversalFactMergeSource[]): string[] {
  const seen = new Set<string>();
  const snippets: string[] = [];
  for (const fact of facts) {
    const snippet = fact.evidence_text.trim();
    if (!snippet || seen.has(snippet)) continue;
    seen.add(snippet);
    snippets.push(snippet);
  }
  return snippets;
}

/** One display row per canonical concept within a single extraction run. */
export function dedupeUniversalFactsWithinRun<T extends UniversalFactMergeSource>(
  facts: T[],
): UniversalFactDisplayRow[] {
  const order: string[] = [];
  const grouped = new Map<string, T[]>();

  for (const fact of facts) {
    if (!grouped.has(fact.concept)) {
      order.push(fact.concept);
      grouped.set(fact.concept, []);
    }
    grouped.get(fact.concept)!.push(fact);
  }

  return order.map((concept) => {
    const group = grouped.get(concept) ?? [];
    const primary = pickPrimaryFact(group);
    const evidence_snippets = uniqueEvidenceSnippets(group);

    return {
      id: primary.id,
      concept: primary.concept,
      normalized_label: primary.normalized_label,
      assertion_level: primary.assertion_level,
      source_type: primary.source_type,
      confidence: primary.confidence,
      uncertain: group.some((fact) => fact.uncertain),
      negated: group.some((fact) => fact.negated),
      evidence_count: group.length,
      evidence_snippets,
      merged_fact_ids: group.map((fact) => fact.id),
    };
  });
}
