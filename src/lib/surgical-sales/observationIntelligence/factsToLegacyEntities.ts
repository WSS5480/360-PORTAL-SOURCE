import type { ObservationNoteExtraction } from "@/lib/surgical-sales/extractObservationNoteEntities";
import { generateObservationIntelligenceFromFacts } from "./generateObservationIntelligence";
import { resolveNormalizedFindingFromFact } from "./normalizedObservationFindings";
import type { ObservationFact, ObservationFactExtraction } from "./observationFactTypes";

const FACT_ENTITY_MAP: Partial<
  Record<ObservationFact["type"], { type: string; label: string; category: string }>
> = {
  competitor_product: {
    type: "competitor_signal",
    label: "Competitor Product",
    category: "Competitor Products",
  },
  current_product: {
    type: "product_signal",
    label: "Current Product",
    category: "Current Products",
  },
  workflow_issue: {
    type: "workflow_friction_signal",
    label: "Workflow Friction",
    category: "Workflow Friction",
  },
  visualization_challenge: {
    type: "workflow_friction_signal",
    label: "Workflow Friction",
    category: "Workflow Friction",
  },
  fixation_challenge: {
    type: "clinical_pain_signal",
    label: "Clinical Pain Point",
    category: "Clinical Pain Points",
  },
  provider_frustration: {
    type: "clinical_pain_signal",
    label: "Clinical Pain Point",
    category: "Clinical Pain Points",
  },
  staff_issue: {
    type: "staff_signal",
    label: "Staff Observation",
    category: "Staff Observations",
  },
  staff_efficiency: {
    type: "staff_signal",
    label: "Staff Workflow",
    category: "Staff Workflow",
  },
  product_interest: {
    type: "product_signal",
    label: "Product Signal",
    category: "Product Fit Signals",
  },
  product_fit_signal: {
    type: "product_signal",
    label: "Product Signal",
    category: "Product Fit Signals",
  },
  workflow_delay: {
    type: "workflow_friction_signal",
    label: "Workflow Friction",
    category: "Workflow Friction",
  },
  room_turnover_issue: {
    type: "workflow_friction_signal",
    label: "Workflow Friction",
    category: "Workflow Friction",
  },
};

/** Bridge facts pipeline output to legacy entity extraction shape. */
export function factsExtractionToLegacyNoteExtraction(
  extraction: ObservationFactExtraction,
): ObservationNoteExtraction {
  const intelligence = generateObservationIntelligenceFromFacts(extraction.facts);
  const entities = intelligence.map((item) => {
    const fact = extraction.facts.find((entry) => {
      const normalized = resolveNormalizedFindingFromFact(entry);
      return normalized?.normalizedFindingId === item.normalizedFindingId;
    });
    const mapping = fact ? FACT_ENTITY_MAP[fact.type] : null;
    return {
      type: (mapping?.type ?? "workflow_signal") as ObservationNoteExtraction["entities"][number]["type"],
      label: mapping?.label ?? "Observation",
      category: mapping?.category ?? "Workflow",
      finding: item.label,
      evidence: fact?.evidence ?? item.label,
      confidence: "High" as const,
      value: item.label,
      // §5 staff routing fix — carries the originating fact's polarity so the
      // provider-promotion loop can skip positive staff signals. Undefined for
      // legacy facts; every existing reader ignores it.
      ...(fact?.polarity ? { polarity: fact.polarity } : {}),
    };
  });

  return {
    entities: entities.slice(0, 8),
    primaryCategory: entities[0]?.category ?? null,
    extractedAt: extraction.extractedAt,
    model: "rules",
  };
}

export function mergeFactsIntoStoredIntelligence(
  factExtraction: ObservationFactExtraction,
): Record<string, unknown> {
  const legacy = factsExtractionToLegacyNoteExtraction(factExtraction);
  return {
    ...legacy,
    facts: factExtraction.facts,
    model: factExtraction.model,
    extractedAt: factExtraction.extractedAt,
  };
}
