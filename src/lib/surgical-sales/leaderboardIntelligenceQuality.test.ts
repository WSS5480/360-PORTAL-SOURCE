import { describe, expect, it } from "vitest";
import { RepIntelligenceDeduper } from "@/lib/surgical-sales/executionLeaderboardSafeguards";
import { extractObservationNoteEntities } from "@/lib/surgical-sales/extractObservationNoteEntities";
import {
  collectLeaderboardUnitsFromExtraction,
  entityQualifiesForLeaderboardScore,
  observationEntityLeaderboardMetric,
  qualifiesCompetitorContent,
  qualifiesPainPointContent,
  scoreCaseObservationIntelligence,
} from "@/lib/surgical-sales/leaderboardIntelligenceQuality";

describe("leaderboardIntelligenceQuality", () => {
  it("maps AI extraction entities to validated intelligence metric", () => {
    const extraction = extractObservationNoteEntities(
      "Fixation visibility is inconsistent and creates a clinical pain point during the case.",
    );
    const pain = extraction.entities.find((entity) => entity.type === "clinical_pain_signal");
    expect(pain).toBeDefined();
    expect(observationEntityLeaderboardMetric(pain!)).toBe("validated_intelligence_captured");
    expect(entityQualifiesForLeaderboardScore(pain!)).toBe(true);
  });

  it("rejects low-confidence fallback extractions", () => {
    const extraction = extractObservationNoteEntities("Maybe something happened in the room.");
    const lowConfidence = extraction.entities.find((entity) => entity.confidence === "Low");
    if (lowConfidence) {
      expect(entityQualifiesForLeaderboardScore(lowConfidence)).toBe(false);
    } else {
      expect(collectLeaderboardUnitsFromExtraction(extraction)).toHaveLength(0);
    }
  });

  it("requires competitor identification for competitor scoring", () => {
    expect(qualifiesCompetitorContent("Competitor rep was in the room for the tray.")).toBe(true);
    expect(qualifiesCompetitorContent("Staff seemed busy today.")).toBe(false);
  });

  it("dedupes duplicate intelligence within the same observation case", () => {
    const deduper = new RepIntelligenceDeduper();
    const extraction = extractObservationNoteEntities(
      "Turnover delay creates workflow friction during every case.",
    );
    const first = scoreCaseObservationIntelligence(deduper, "case-1", [{ extraction }]);
    const second = scoreCaseObservationIntelligence(deduper, "case-1", [{ extraction }]);
    expect(first.validated_intelligence_captured ?? 0).toBeGreaterThan(0);
    expect(second.validated_intelligence_captured ?? 0).toBe(0);
  });

  it("applies validated intelligence multiplier", () => {
    const deduper = new RepIntelligenceDeduper();
    const weight = deduper.scoreObservationIntelligence({
      caseId: "case-2",
      metric: "validated_intelligence_captured",
      content: "Validated fixation pain point during the case",
      confidence: "validated",
    });
    expect(weight).toBe(1.25);
  });

  it("does not score generic note text without AI-validated pain language", () => {
    expect(qualifiesPainPointContent("Note entered")).toBe(false);
    expect(collectLeaderboardUnitsFromExtraction(extractObservationNoteEntities("Note entered"))).toHaveLength(0);
  });
});
