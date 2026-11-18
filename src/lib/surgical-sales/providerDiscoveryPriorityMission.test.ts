import { describe, expect, it } from "vitest";
import { buildDiscoveryPriorityMissionBrief } from "./providerDiscoveryPriorityMission";

describe("providerDiscoveryPriorityMission", () => {
  it("returns influence mission brief matching operational example", () => {
    const brief = buildDiscoveryPriorityMissionBrief({
      dbKey: "influence_level",
      sectionId: "relationship_intelligence",
      priorityScore: 80,
      stageTier: 1,
      drivers: ["missing_signal", "maturity_stage"],
    });
    expect(brief.operationalConsequence.fieldInefficiency).toMatch(/wrong stakeholder|non-deciders/i);
    expect(brief.operationalImpact).toMatch(/wrong stakeholder|non-deciders/i);
    expect(brief.unlockValue).toMatch(/economic buyer strategy/i);
    expect(brief.captureMethod).toMatch(/Office manager|supply chain/i);
    expect(brief.urgencyLabel).toBe("High priority");
    expect(brief.confidenceGain).toMatch(/Relationship intelligence/i);
  });
});
