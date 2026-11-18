import { describe, expect, it } from "vitest";

import { adaptUniversalFactsToObservationFieldEvidenceCards } from "@/lib/surgical-sales/universalExtractor/adaptUniversalFactsToFieldEvidenceCards";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

function factRow(input: {
  concept: string;
  assertion_level: string;
  case_id: string;
  normalized_label?: string;
  evidence_text?: string;
}) {
  return {
    id: `fact-${input.concept}-${input.case_id}`,
    capture_id: "capture-1",
    provider_id: "provider-1",
    organization_id: null,
    case_id: input.case_id,
    encounter_id: null,
    concept: input.concept,
    normalized_label: input.normalized_label ?? "",
    assertion_level: input.assertion_level,
    source_type: "observation_case",
    evidence_text: input.evidence_text ?? input.normalized_label ?? "",
    confidence: "high" as const,
    negated: false,
    uncertain: false,
    suppressed: false,
    created_at: "2026-06-01T12:00:00Z",
  };
}

function observationRun(caseId: string, facts: ReturnType<typeof factRow>[]): UniversalFactExtractionRun[] {
  return [
    {
      capture_id: "capture-1",
      declared_source_type: "observation_case",
      extraction_model: "test",
      created_at: "2026-06-01T12:00:00Z",
      operational_note_id: null,
      facts,
    },
  ];
}

describe("adaptUniversalFactsToObservationFieldEvidenceCards", () => {
  it("builds observation and workflow cards from UF timeline excerpts", () => {
    const cards = adaptUniversalFactsToObservationFieldEvidenceCards({
      providerRuns: observationRun("case-2", [
        factRow({
          concept: "current_product",
          assertion_level: "observed",
          case_id: "case-2",
          normalized_label: "Bard Mesh was used during the case",
          evidence_text: "They're still using Bard Mesh.",
        }),
        factRow({
          concept: "visualization_or_access_issue",
          assertion_level: "observed",
          case_id: "case-2",
          normalized_label: "Extra time getting visualization before fixation",
          evidence_text:
            "the surgeon asked for a different angle because he wasn't getting the view he wanted before fixation",
        }),
      ]),
      primaryCaseId: "case-2",
      detailsHref: "/portal/sales/cases/case-2",
      programStatusLabel: "0 of 5 observation cases complete · 1 case note captured",
    });

    expect(cards).toHaveLength(2);
    expect(cards[0]?.title).toBe("Observation");
    expect(cards[0]?.excerpt).toMatch(/Bard Mesh/i);
    expect(cards[1]?.title).toBe("Workflow Pain Point");
    expect(cards[1]?.excerpt).toMatch(/visualization|view he wanted/i);
  });

  it("returns empty when no observation-source UF runs exist", () => {
    const cards = adaptUniversalFactsToObservationFieldEvidenceCards({
      providerRuns: [
        {
          capture_id: "capture-intro",
          declared_source_type: "intro_call",
          extraction_model: "test",
          created_at: "2026-06-01T12:00:00Z",
          operational_note_id: null,
          facts: [
            factRow({
              concept: "current_product",
              assertion_level: "provider_reported",
              case_id: "case-1",
              normalized_label: "Bard Mesh mentioned on intro call",
            }),
          ],
        },
      ],
      primaryCaseId: "case-1",
      detailsHref: null,
      programStatusLabel: "0 of 5 observation cases complete",
    });

    expect(cards).toEqual([]);
  });
});
