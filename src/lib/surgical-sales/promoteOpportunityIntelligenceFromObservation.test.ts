import { describe, expect, it } from "vitest";
import { extractObservationNoteEntities } from "./extractObservationNoteEntities";
import { buildOpportunityIntelligencePatchesFromObservationExtraction } from "./promoteOpportunityIntelligenceFromObservation";

describe("promoteOpportunityIntelligenceFromObservation", () => {
  it("maps observation extraction entities to opportunity intelligence fields", () => {
    const extraction = extractObservationNoteEntities(
      "Competitor rep was in the room. Nursing staff frustrated with turnover delays. Follow up on peel-pack trial next month.",
    );
    const patches = buildOpportunityIntelligencePatchesFromObservationExtraction(extraction, {});

    expect(patches.some((patch) => patch.dbKey === "provider_competitive_products")).toBe(true);
    expect(patches.some((patch) => patch.dbKey === "provider_staff_frustrations")).toBe(true);
    expect(patches.some((patch) => patch.dbKey === "provider_future_opportunity_signals")).toBe(true);
  });

  it("skips fields that already have intelligence on file", () => {
    const extraction = extractObservationNoteEntities("Competitor rep was in the room.");
    const patches = buildOpportunityIntelligencePatchesFromObservationExtraction(extraction, {
      provider_competitive_products: "Stryker active in hernia cases",
    });

    expect(patches.some((patch) => patch.dbKey === "provider_competitive_products")).toBe(false);
  });
});
