import { describe, expect, it } from "vitest";

import { INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";
import { buildDebriefReviewFromUniversalFacts } from "@/lib/surgical-sales/universalExtractor/buildDebriefReviewFromUniversalFacts";
import { extractUniversalSurgicalFacts } from "@/lib/surgical-sales/universalExtractor/extractUniversalSurgicalFacts";
import { runUniversalSurgicalExtraction } from "@/lib/surgical-sales/universalExtractor/runUniversalSurgicalExtraction";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

function ufRunsFromDictation(dictation: string): UniversalFactExtractionRun[] {
  const extraction = runUniversalSurgicalExtraction({
    raw_note: dictation,
    declared_source_type: "intro_call",
  });
  return [
    {
      capture_id: "capture-test",
      declared_source_type: "intro_call",
      extraction_model: extraction.model,
      created_at: extraction.extracted_at,
      operational_note_id: null,
      facts: extraction.facts.map((fact, index) => ({
        ...fact,
        id: `uf-fact-${index}`,
        capture_id: "capture-test",
        provider_id: null,
        organization_id: null,
        case_id: null,
        encounter_id: null,
        suppressed: false,
        created_at: extraction.extracted_at,
      })),
    },
  ];
}

describe("buildDebriefReviewFromUniversalFacts", () => {
  it("builds clinical/product cards from UF runs without DIP atomic facts", () => {
    const debriefRuns = ufRunsFromDictation(INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION);
    const result = buildDebriefReviewFromUniversalFacts({
      dictation: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
      debriefRuns,
      logUpdate: null,
    });

    expect(result.actionableCards.length).toBeGreaterThan(0);
    expect(result.actionableCards.every((card) => card.id.startsWith("uf:"))).toBe(true);
    expect(
      result.actionableCards.some(
        (card) => card.category === "clinical_focus" || card.category === "product_intelligence",
      ),
    ).toBe(true);
    expect(Object.keys(result.ufFactIdsByCardId).length).toBe(result.actionableCards.length);
    expect(result.brief.clinicalInsights.length + result.brief.productIntelligence.length).toBeGreaterThan(0);
  });

  it("emits access and contact cards from UF facts when present", () => {
    const dictation =
      "He mentioned that Jennifer in his office usually handles a lot of the scheduling coordination. When I asked about observation access he said it's usually not a problem once credentialing is complete.";
    const { facts } = extractUniversalSurgicalFacts({
      raw_note: dictation,
      declared_source_type: "intro_call",
    });
    expect(facts.some((fact) => fact.concept === "contact_role")).toBe(true);
    expect(facts.some((fact) => fact.concept === "access_pathway")).toBe(true);

    const debriefRuns = ufRunsFromDictation(dictation);
    const result = buildDebriefReviewFromUniversalFacts({
      dictation,
      debriefRuns,
    });

    expect(result.actionableCards.some((card) => card.category === "workflow_participant")).toBe(true);
    expect(result.actionableCards.some((card) => card.category === "observation_access")).toBe(true);
  });
});
