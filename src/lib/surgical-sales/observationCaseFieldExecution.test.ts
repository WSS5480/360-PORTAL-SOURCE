import { describe, expect, it } from "vitest";
import { buildObservationTakeaways } from "./buildObservationTakeaways";
import { buildProviderObservationIntelligenceSnapshot } from "./buildProviderObservationIntelligenceSnapshot";
import {
  DISCOVERY_ACCESS_INTELLIGENCE_DB_KEYS,
  extractFieldObservationNoteEntities,
  PROVIDER_OBSERVATION_INTELLIGENCE_DB_KEYS,
} from "./fieldObservationIntelligence";
import { buildOpportunityIntelligencePatchesFromObservationExtraction } from "./promoteOpportunityIntelligenceFromObservation";

describe("observation case field execution intelligence", () => {
  it("filters scheduling contacts from field observation extraction", () => {
    const extraction = extractFieldObservationNoteEntities(
      "Karen handles scheduling and competitor tray was on the field.",
    );

    expect(extraction.entities.some((entity) => entity.type === "scheduling_contact")).toBe(false);
    expect(extraction.entities.some((entity) => entity.type === "competitor_signal")).toBe(true);
  });

  it("creates competitor product takeaway from competitor note", () => {
    const takeaways = buildObservationTakeaways({
      caseRow: {},
      activities: [{ activity_type: "note", body: "Competitor rep brought rival energy device tray." }],
    });

    expect(takeaways.some((item) => /competitor/i.test(item.text))).toBe(true);
  });

  it("creates visualization frustration takeaway from clinical note", () => {
    const takeaways = buildObservationTakeaways({
      caseRow: {},
      activities: [
        {
          activity_type: "note",
          body: "Visualization was difficult with exposure in larger patients.",
        },
      ],
    });

    expect(takeaways.some((item) => /visualization/i.test(item.text))).toBe(true);
  });

  it("creates workflow bottleneck takeaway from turnover note", () => {
    const takeaways = buildObservationTakeaways({
      caseRow: {},
      activities: [{ activity_type: "note", body: "Room turnover took longer than expected." }],
    });

    expect(
      takeaways.some((item) => /turnover|workflow|friction/i.test(item.text)),
    ).toBe(true);
  });

  it("builds provider intelligence snapshot after multiple observations", () => {
    const snapshot = buildProviderObservationIntelligenceSnapshot({
      providerContact: {
        provider_competitive_products: "Uses Competitor X as primary",
        provider_workflow_pain_points: "Long turnover times",
      },
      priorCases: [
        { id: "c1", live_observation_competitors: "Competitor tray seen" },
        { id: "c2", live_observation_workflow: "Setup delay" },
        { id: "c3", live_observation_product_fit: "Open to trial" },
        { id: "c4", live_observation_staff_process: "Staff interested in integrated trays" },
      ],
    });

    expect(snapshot).not.toBeNull();
    expect(snapshot?.themes.length).toBeGreaterThanOrEqual(3);
    expect(snapshot?.sourceCaseIds).toHaveLength(4);
  });

  it("writes only provider observation fields from note extraction", () => {
    const extraction = extractFieldObservationNoteEntities("Competitor tray and staff workflow delay.");
    const patches = buildOpportunityIntelligencePatchesFromObservationExtraction(extraction, {});

    for (const patch of patches) {
      expect(PROVIDER_OBSERVATION_INTELLIGENCE_DB_KEYS).toContain(patch.dbKey);
      expect(DISCOVERY_ACCESS_INTELLIGENCE_DB_KEYS.has(patch.dbKey)).toBe(false);
    }
  });
});
