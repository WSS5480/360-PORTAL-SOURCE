import { describe, expect, it } from "vitest";
import { buildRapidDiscoveryPathwayImpact } from "./buildRapidDiscoveryPathwayImpact";

describe("buildRapidDiscoveryPathwayImpact", () => {
  it("returns pathway lines and requirement link for coordinator answer", () => {
    const impact = buildRapidDiscoveryPathwayImpact({
      dbKey: "provider_observation_coordinator_contact",
      operationalStatus: "cleared",
      contactName: "Jane Smith",
    });
    expect(impact.lines).toContain("Scheduling owner identified");
    expect(impact.requirementLink?.requirementLabel).toBe("Identify scheduling ownership");
  });

  it("flags blocked observation logistics", () => {
    const impact = buildRapidDiscoveryPathwayImpact({
      dbKey: "provider_observation_feasibility",
      operationalStatus: "blocked",
    });
    expect(impact.lines.some((l) => /blocked/i.test(l))).toBe(true);
  });
});
