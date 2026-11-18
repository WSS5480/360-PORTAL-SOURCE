import type {
  ProductSupportIntelligenceItem,
  ProductSupportIntelligenceSection,
} from "@/lib/surgical-sales/buildProductSupportCaseIntelligenceView";
import { intelligenceChipTextFromFact } from "@/lib/surgical-sales/universalExtractor/intelligenceDisplayFromFact";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import { resolveReadModelSection } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";

const SECTION_TITLES: Record<string, string> = {
  surgeon_feedback: "Surgeon Feedback",
  staff_feedback: "Staff Feedback",
  workflow: "Workflow Insights",
  product_signals: "Product Signals",
  risks: "Risks",
  case_outcome: "Case Outcome",
};

const CONCEPT_TO_SECTION: Record<string, string> = {
  provider_sentiment: "surgeon_feedback",
  procedure_focus: "surgeon_feedback",
  procedure_volume_trend: "surgeon_feedback",
  technology_preference: "surgeon_feedback",
  staff_workflow: "staff_feedback",
  workflow_or_timing_issue: "workflow",
  visualization_or_access_issue: "workflow",
  placement_or_positioning_issue: "workflow",
  inventory_availability_issue: "workflow",
  training_or_familiarity_issue: "workflow",
  current_product: "product_signals",
  competitor_product: "product_signals",
  alternative_used: "product_signals",
  requested_item: "product_signals",
  unavailable_item: "product_signals",
  product_performance_issue: "risks",
  sizing_or_fit_issue: "risks",
  support_needed: "risks",
  case_outcome: "case_outcome",
};

function sectionForConcept(concept: string): string {
  return CONCEPT_TO_SECTION[concept] ?? "product_signals";
}

function flattenProductSupportFacts(runs: UniversalFactExtractionRun[]) {
  return runs
    .filter((run) => run.declared_source_type === "product_support_case")
    .flatMap((run) => run.facts)
    .filter(
      (fact) =>
        !fact.suppressed &&
        !fact.negated &&
        !fact.uncertain &&
        fact.assertion_level !== "rejected" &&
        fact.concept !== "unknown" &&
        fact.concept !== "next_action" &&
        fact.concept !== "no_issue_or_routine",
    );
}

function pushItem(
  map: Map<string, ProductSupportIntelligenceItem[]>,
  sectionId: string,
  item: ProductSupportIntelligenceItem,
) {
  const bucket = map.get(sectionId) ?? [];
  const key = item.text.toLowerCase();
  if (bucket.some((existing) => existing.text.toLowerCase() === key)) return;
  bucket.push(item);
  map.set(sectionId, bucket);
}

export function adaptUniversalFactsToProductSupportSections(input: {
  caseRuns: UniversalFactExtractionRun[];
}): Map<string, ProductSupportIntelligenceItem[]> {
  const map = new Map<string, ProductSupportIntelligenceItem[]>();
  const facts = flattenProductSupportFacts(input.caseRuns);

  facts.forEach((fact, index) => {
    const text = intelligenceChipTextFromFact(fact) ?? fact.evidence_text?.trim() ?? fact.normalized_label?.trim();
    if (!text) return;
    const sectionId = sectionForConcept(String(fact.concept));
    pushItem(map, sectionId, {
      id: `uf:${fact.id ?? index}`,
      text,
      sourceLabel: "Field note · Universal facts",
      sourceKind: "field_note",
      timestamp: fact.created_at,
    });
  });

  return map;
}

export function mergeProductSupportIntelligenceSections(input: {
  oieSections: ProductSupportIntelligenceSection[];
  caseRuns?: UniversalFactExtractionRun[] | null;
}): ProductSupportIntelligenceSection[] {
  const ufMap =
    input.caseRuns?.length
      ? adaptUniversalFactsToProductSupportSections({ caseRuns: input.caseRuns })
      : new Map<string, ProductSupportIntelligenceItem[]>();

  const oieById = new Map(input.oieSections.map((section) => [section.id, section]));
  const sectionIds = new Set([...oieById.keys(), ...ufMap.keys()]);

  const sections: ProductSupportIntelligenceSection[] = [];
  for (const sectionId of sectionIds) {
    const oieSection = oieById.get(sectionId);
    const ufItems = ufMap.get(sectionId) ?? [];
    const oieItems = oieSection?.items ?? [];
    const items = resolveReadModelSection(ufItems, () => oieItems);
    if (items.length === 0) continue;
    sections.push({
      id: sectionId,
      title: oieSection?.title ?? SECTION_TITLES[sectionId] ?? sectionId,
      items,
    });
  }

  return sections.filter((section) => section.id !== "opportunities");
}
