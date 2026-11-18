import { describe, expect, it } from "vitest";

import {
  adaptUniversalFactsToClinicalReferenceSignalGroups,
  adaptUniversalFactsToProductNeedsConfirmation,
  factMatchesProviderScope,
  filterProviderScopedFactRuns,
} from "@/lib/surgical-sales/universalExtractor/adaptUniversalFactsToProviderIntelligenceClinicalReads";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

const figContact = {
  first_name: "Karen",
  last_name: "Fig",
};

function figRuns(): UniversalFactExtractionRun[] {
  return [
    {
      capture_id: "cap-fig",
      declared_source_type: "debrief_note",
      created_at: "2026-06-15T13:47:32.608462+00:00",
      facts: [
        {
          id: "fact-product",
          capture_id: "cap-fig",
          provider_id: "p1",
          organization_id: null,
          case_id: null,
          encounter_id: "eng-1",
          concept: "competitor_product",
          normalized_label: "Competitor product: Bard Mesh",
          assertion_level: "provider_reported",
          source_type: "debrief_note",
          evidence_text:
            "He stated that he is currently using Bard Mesh for the majority of these repairs.",
          confidence: "high",
          negated: false,
          uncertain: false,
          suppressed: false,
          product_mentioned: "Bard Mesh",
          created_at: "2026-06-15T13:47:32.608462+00:00",
        },
        {
          id: "fact-volume",
          capture_id: "cap-fig",
          provider_id: "p1",
          organization_id: null,
          case_id: null,
          encounter_id: "eng-1",
          concept: "case_outcome",
          normalized_label: "Routine or smooth case progression",
          assertion_level: "provider_reported",
          source_type: "debrief_note",
          evidence_text:
            "Dr. Fig shared robotic ventral hernia and abdominal wall reconstruction with increasing volume.",
          confidence: "high",
          negated: false,
          uncertain: false,
          suppressed: false,
          created_at: "2026-06-15T13:16:31.069039+00:00",
        },
      ],
    },
    {
      capture_id: "cap-plum",
      declared_source_type: "debrief_note",
      created_at: "2026-06-15T13:35:06.606134+00:00",
      facts: [
        {
          id: "fact-plum",
          capture_id: "cap-plum",
          provider_id: "p1",
          organization_id: null,
          case_id: null,
          encounter_id: "eng-1",
          concept: "no_issue_or_routine",
          normalized_label: "No meaningful intelligence issue identified",
          assertion_level: "provider_reported",
          source_type: "debrief_note",
          evidence_text: "Spoke with Dr. Plum today for an introductory conversation.",
          confidence: "medium",
          negated: false,
          uncertain: false,
          suppressed: false,
          created_at: "2026-06-15T13:35:06.606134+00:00",
        },
      ],
    },
  ];
}

describe("adaptUniversalFactsToProviderIntelligenceClinicalReads", () => {
  it("filters cross-provider UF facts by doctor name in evidence", () => {
    expect(
      factMatchesProviderScope(
        {
          id: "x",
          capture_id: "c",
          provider_id: "p1",
          organization_id: null,
          case_id: null,
          encounter_id: null,
          concept: "case_outcome",
          normalized_label: "x",
          assertion_level: "provider_reported",
          source_type: "debrief_note",
          evidence_text: "Spoke with Dr. Plum today",
          confidence: "high",
          negated: false,
          uncertain: false,
          suppressed: false,
          created_at: "2026-06-15T00:00:00.000Z",
        },
        figContact,
      ),
    ).toBe(false);

    const scoped = filterProviderScopedFactRuns(figRuns(), figContact);
    expect(scoped).toHaveLength(1);
    expect(scoped[0]?.facts.map((fact) => fact.id)).toEqual(["fact-product", "fact-volume"]);
  });

  it("builds clinical reference groups from UF without CRM procedure_focus", () => {
    const groups = adaptUniversalFactsToClinicalReferenceSignalGroups({
      providerRuns: filterProviderScopedFactRuns(figRuns(), figContact),
      contact: figContact,
    });

    const procedureFocus = groups.find((group) => group.id === "procedure-focus");
    expect(procedureFocus?.items.join(" | ")).toMatch(/Robotic ventral hernia repair/i);
    expect(procedureFocus?.items.join(" | ")).toMatch(/Abdominal wall reconstruction/i);
  });

  it("resolves product confirmation from UF competitor_product facts", () => {
    const product = adaptUniversalFactsToProductNeedsConfirmation({
      providerRuns: filterProviderScopedFactRuns(figRuns(), figContact),
      contact: figContact,
    });

    expect(product?.productName).toBe("Bard Mesh");
    expect(product?.sourceText).toMatch(/Bard Mesh/i);
  });
});
