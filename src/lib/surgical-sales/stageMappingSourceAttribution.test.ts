import { describe, expect, it } from "vitest";
import {
  classifyDiscoveryMappingSource,
  formatDiscoveryMappingAttributionLine,
  inferStageMappingValidationStatus,
  isDebriefExtractionSource,
  seedStageMappingValidationStatuses,
} from "./stageMappingSourceAttribution";

describe("stageMappingSourceAttribution", () => {
  it("classifies manual mapping and debrief sources", () => {
    expect(
      classifyDiscoveryMappingSource({
        source_type: "profile",
        source_label: "Manual mapping",
        updated_at: new Date().toISOString(),
      }),
    ).toBe("manual_mapping");

    expect(
      classifyDiscoveryMappingSource({
        source_type: "engagement",
        source_label: "Intro Call debrief",
        updated_at: new Date().toISOString(),
      }),
    ).toBe("debrief_extraction");

    expect(isDebriefExtractionSource({
      source_type: "engagement",
      source_label: "Intro Call debrief",
      updated_at: new Date().toISOString(),
    })).toBe(true);
  });

  it("formats compact attribution lines", () => {
    const manual = formatDiscoveryMappingAttributionLine({
      meta: {
        source_type: "profile",
        source_label: "Manual mapping",
        updated_at: new Date().toISOString(),
      },
      validationStatus: "confirmed",
    });
    expect(manual).toMatch(/^Field capture · Today$/);

    const debrief = formatDiscoveryMappingAttributionLine({
      meta: {
        source_type: "engagement",
        source_label: "Intro Call debrief",
        updated_at: new Date().toISOString(),
        discovery_stance: "needs_validation",
      },
      validationStatus: "needs_validation",
    });
    expect(debrief).toBe("Debrief extraction · Needs validation");
  });

  it("defaults debrief-sourced intelligence to needs validation", () => {
    const status = inferStageMappingValidationStatus({
      meta: {
        source_type: "engagement",
        source_label: "Intro Call debrief",
        updated_at: new Date().toISOString(),
        discovery_stance: "needs_validation",
      },
    });
    expect(status).toBe("needs_validation");
  });

  it("seeds per-signal validation from contact metadata", () => {
    const seeded = seedStageMappingValidationStatuses({
      contact: {
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            source_type: "engagement",
            source_label: "Intro Call debrief",
            updated_at: "2026-05-20T12:00:00.000Z",
            discovery_stance: "needs_validation",
          },
        },
      },
      signalIds: ["observation_approval"],
    });
    expect(seeded.observation_approval).toBe("needs_validation");
  });
});
