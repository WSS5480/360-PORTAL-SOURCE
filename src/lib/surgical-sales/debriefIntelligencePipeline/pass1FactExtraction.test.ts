import { describe, expect, it } from "vitest";
import { INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";
import { buildRegressionAtomicFactsFromDictation } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefRegressionAtomicFactStandIn";
import {
  flattenExtractedFacts,
  runPass1FactExtraction,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/pass1FactExtraction";

describe("pass1FactExtraction", () => {
  it("returns structured buckets without prose summaries", () => {
    const facts = buildRegressionAtomicFactsFromDictation(INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION);
    const extracted = runPass1FactExtraction(INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION, facts);

    expect(extracted.observationAccess.length).toBeGreaterThan(0);
    expect(extracted.workflowParticipants.length).toBeGreaterThan(0);
    expect(extracted.clinicalFocus.length).toBeGreaterThan(0);

    for (const record of [
      ...extracted.observationAccess,
      ...extracted.workflowParticipants,
      ...extracted.clinicalFocus,
      ...extracted.facilityIntelligence,
      ...extracted.followUpActions,
    ]) {
      expect(record.factKey).toMatch(/^[a-z0-9_]+$/);
      expect(record.evidenceQuote.length).toBeGreaterThan(8);
      expect(record.factKey).not.toMatch(/\s/);
    }
  });

  it("flattens to raw facts using fact_key as stable token", () => {
    const dictation = "Jennifer handles scheduling but I don't have her contact info yet.";
    const flat = flattenExtractedFacts(
      runPass1FactExtraction(dictation, buildRegressionAtomicFactsFromDictation(dictation)),
    );
    expect(flat.some((f) => f.fact_key === "scheduling_person_named")).toBe(true);
    expect(flat.every((f) => f.fact_text === f.fact_key)).toBe(true);
  });
});
