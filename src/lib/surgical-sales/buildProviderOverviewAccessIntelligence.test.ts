import { describe, expect, it } from "vitest";
import { buildProviderOverviewAccessIntelligence } from "./buildProviderOverviewAccessIntelligence";

describe("buildProviderOverviewAccessIntelligence", () => {
  it("builds observation-access reference rows without scoring metadata", () => {
    const view = buildProviderOverviewAccessIntelligence({
      contact: {
        provider_observation_feasibility: "approved",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            source_type: "profile",
            source_label: "Manual",
            updated_at: "2026-05-01T00:00:00.000Z",
            validated_at: "2026-05-01T00:00:00.000Z",
          },
        },
        provider_observation_coordinator_contact: "Karen Mitchell",
        provider_observation_access_path: "Check in at vendor desk before 6am",
      },
    });

    expect(view.capturedCount).toBeGreaterThan(0);
    expect(view.rows.some((row) => row.label === "Observation approved" && row.captured)).toBe(true);
    expect(view.rows.some((row) => /Karen Mitchell/i.test(row.value))).toBe(true);
    expect(JSON.stringify(view)).not.toMatch(/validated|partial|readiness|percent/i);
  });

  it("marks observation denied when access is blocked", () => {
    const view = buildProviderOverviewAccessIntelligence({
      contact: {
        provider_observation_feasibility: "no",
        provider_evaluation_openness: "closed",
      },
    });

    expect(view.rows.some((row) => row.label === "Observation denied" && row.captured)).toBe(true);
  });

  it("returns zero badge count when nothing is captured", () => {
    const view = buildProviderOverviewAccessIntelligence({ contact: {} });
    expect(view.capturedCount).toBe(0);
    expect(view.rows.every((row) => !row.captured)).toBe(true);
  });
});
