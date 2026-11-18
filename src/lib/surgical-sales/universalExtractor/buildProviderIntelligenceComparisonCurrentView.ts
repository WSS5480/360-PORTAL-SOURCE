import type {
  FieldBriefingChip,
  FieldBriefingEvidenceCard,
  ProviderIntelligenceFieldBriefingView,
} from "@/lib/surgical-sales/buildProviderIntelligenceKnowledgeDashboardView";
import type { ProviderCaseIntelligenceRollup } from "@/lib/surgical-sales/buildProviderObservationIntelligenceRollup";
import {
  formatProviderIntelligenceComparisonLabel,
  sortProviderIntelligenceComparisonTopics,
  type ProviderIntelligenceComparisonSnapshot,
  type ProviderIntelligenceComparisonTopicRow,
} from "@/lib/surgical-sales/universalExtractor/providerIntelligenceComparisonTypes";

type TopicAccumulator = {
  observed_count: number;
  validated_count: number;
  evidence_snippet: string | null;
};

function emptyAccumulator(): TopicAccumulator {
  return { observed_count: 0, validated_count: 0, evidence_snippet: null };
}

function inferComparisonConceptKey(text: string): string | null {
  const lower = text.toLowerCase();
  if (/visualization|access|fixation/.test(lower)) return "visualization_or_access_issue";
  if (/sizing|\bfit\b/.test(lower)) return "sizing_or_fit_issue";
  if (/inventory|availability|stock/.test(lower)) return "inventory_availability_issue";
  if (/workflow|timing|turnover/.test(lower)) return "workflow_or_timing_issue";
  if (/placement|positioning/.test(lower)) return "placement_or_positioning_issue";
  if (/training|familiarity|learning curve/.test(lower)) return "training_or_familiarity_issue";
  if (/product performance|device performance|malfunction/.test(lower)) return "product_performance_issue";
  if (/staff|circulator|scrub|organized|team/.test(lower)) return "staff_workflow";
  if (/routine|no issue|uneventful/.test(lower)) return "no_issue_or_routine";
  if (/case outcome|successful case|good outcome/.test(lower)) return "case_outcome";
  if (/current product|product identified|using [a-z0-9]/i.test(lower)) return "current_product";
  if (/competitor|bard|ethicon|competing/.test(lower)) return "competitor_product";
  if (/sentiment|attitude|receptive|resistant/.test(lower)) return "provider_sentiment";
  return null;
}

function cardTitleConceptKey(title: string): string | null {
  const lower = title.toLowerCase();
  if (lower.includes("workflow pain")) return "visualization_or_access_issue";
  if (lower.includes("clinical trend")) return "workflow_or_timing_issue";
  if (lower.includes("product interest")) return "current_product";
  if (lower.includes("observation")) return null;
  return null;
}

function addSignal(
  map: Map<string, TopicAccumulator>,
  text: string,
  kind: "observed" | "validated",
  evidence?: string | null,
) {
  const concept = inferComparisonConceptKey(text);
  if (!concept) return;

  const current = map.get(concept) ?? emptyAccumulator();
  if (kind === "validated") current.validated_count += 1;
  else current.observed_count += 1;
  if (!current.evidence_snippet && evidence?.trim()) {
    current.evidence_snippet = evidence.trim();
  }
  map.set(concept, current);
}

function addEvidenceCard(map: Map<string, TopicAccumulator>, card: FieldBriefingEvidenceCard) {
  const titleConcept = cardTitleConceptKey(card.title);
  const excerpt = card.excerpt ?? card.sourceQuote ?? null;

  for (const impact of card.intelligenceImpacts) {
    const concept =
      inferComparisonConceptKey(impact.label) ??
      titleConcept ??
      inferComparisonConceptKey(`${card.title} ${impact.label}`);
    if (!concept) continue;

    const current = map.get(concept) ?? emptyAccumulator();
    if (impact.impact === "validated") current.validated_count += 1;
    else current.observed_count += 1;
    if (!current.evidence_snippet && excerpt) current.evidence_snippet = excerpt;
    map.set(concept, current);
  }

  if (card.intelligenceImpacts.length === 0 && excerpt) {
    addSignal(map, `${card.title} ${excerpt}`, "observed", excerpt);
  }
}

function addChipSignals(map: Map<string, TopicAccumulator>, chips: FieldBriefingChip[]) {
  for (const chip of chips) {
    addSignal(map, chip.text, chip.tone === "known" ? "validated" : "observed", chip.evidenceQuote);
  }
}

function addCaseRollupSignals(
  map: Map<string, TopicAccumulator>,
  rollup: ProviderCaseIntelligenceRollup | null | undefined,
) {
  if (!rollup?.visible) return;

  for (const signal of rollup.emergingCaseSignals) {
    addSignal(map, signal, "observed", rollup.observationCaseNoteExcerpt);
  }
  for (const signal of rollup.needsMoreEvidence) {
    addSignal(map, signal, "observed", rollup.observationCaseNoteExcerpt);
  }
  if (rollup.productEvidence?.emergingSignalLabel) {
    addSignal(
      map,
      rollup.productEvidence.emergingSignalLabel,
      "observed",
      rollup.productEvidence.evidenceExcerpt,
    );
  }
}

function mapToSnapshot(map: Map<string, TopicAccumulator>): ProviderIntelligenceComparisonSnapshot {
  const topics = [...map.entries()]
    .filter(([, counts]) => counts.observed_count > 0 || counts.validated_count > 0)
    .map(([concept, counts]) => ({
      concept,
      label: formatProviderIntelligenceComparisonLabel(concept),
      observed_count: counts.observed_count,
      validated_count: counts.validated_count,
      evidence_snippet: counts.evidence_snippet,
    }));

  const sorted = sortProviderIntelligenceComparisonTopics(topics);
  return {
    topics: sorted,
    has_data: sorted.length > 0,
  };
}

/** Read-only comparison snapshot from existing Provider Intelligence view model. */
export function buildProviderIntelligenceComparisonCurrentView(
  view: Pick<
    ProviderIntelligenceFieldBriefingView,
    "fieldEvidence" | "emergingSignals" | "needsMoreEvidence" | "caseIntelligence" | "hasFieldEvidence"
  >,
): ProviderIntelligenceComparisonSnapshot {
  const map = new Map<string, TopicAccumulator>();

  if (!view.hasFieldEvidence) {
    return { topics: [], has_data: false };
  }

  for (const card of view.fieldEvidence) addEvidenceCard(map, card);
  addChipSignals(map, view.emergingSignals);
  addChipSignals(map, view.needsMoreEvidence);
  addCaseRollupSignals(map, view.caseIntelligence);

  return mapToSnapshot(map);
}
