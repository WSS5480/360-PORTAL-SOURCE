import { describe, expect, it } from "vitest";
import { buildProviderOverviewConfirmedFacts } from "./buildProviderOverviewConfirmedFacts";

function validatedMeta() {
  return {
    source_type: "profile" as const,
    source_label: "Manual",
    updated_at: "2026-05-01T00:00:00.000Z",
    validated_at: "2026-05-01T00:00:00.000Z",
  };
}

describe("buildProviderOverviewConfirmedFacts", () => {
  it("returns rep-friendly confirmed facts without categories or scores", () => {
    const facts = buildProviderOverviewConfirmedFacts({
      organizationName: "Metro General",
      contact: {
        provider_observation_feasibility: "approved",
        provider_observation_coordinator_contact: "Karen Mitchell",
        provider_procedure_focus: "abdominal wall reconstruction",
        provider_competitive_products: "competitor mesh",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: validatedMeta(),
          provider_observation_coordinator_contact: validatedMeta(),
          provider_procedure_focus: validatedMeta(),
          provider_competitive_products: validatedMeta(),
        },
      },
    });

    expect(facts).toContain("Observation approved");
    expect(facts.some((f) => /Karen Mitchell/i.test(f))).toBe(true);
    expect(facts.some((f) => /Hospital affiliation confirmed/i.test(f))).toBe(true);
    expect(facts.some((f) => /abdominal wall reconstruction/i.test(f))).toBe(true);
    expect(facts.some((f) => /competitor mesh/i.test(f))).toBe(true);
    expect(facts.some((f) => /%|validating|unknown|readiness/i.test(f))).toBe(false);
  });

  it("returns empty list when nothing is confirmed", () => {
    const facts = buildProviderOverviewConfirmedFacts({
      contact: {},
    });
    expect(facts).toEqual([]);
  });
});
