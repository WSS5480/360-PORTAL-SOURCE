import { describe, expect, it } from "vitest";
import {
  PATHWAY_PROGRESSION_POLICY_LEAD,
  pathwayStageHardGateBlockers,
  isPathwayIntelligenceInformational,
  buildPathwayStageGateRequirements,
  isExecutionIntelligenceDbKey,
  intelligenceDbKeyBlocksPathwayAdvancement,
} from "./pathwayProgressionPolicy";
import { discoveryAccessReadyContact } from "@/lib/surgical-sales/salesPathwayTestFixtures";
import type { PathwayGateInput } from "@/lib/surgical-sales/pathwayStageGates";

describe("pathwayProgressionPolicy", () => {
  it("documents mission progression over data completeness", () => {
    expect(PATHWAY_PROGRESSION_POLICY_LEAD).toMatch(/mission progression/i);
    expect(PATHWAY_PROGRESSION_POLICY_LEAD).toMatch(/major execution milestones/i);
  });

  it("returns only hard gate blockers for discovery — not scheduler or credentialing", () => {
    const contact = { provider_observation_feasibility: "unknown" };
    const blockers = pathwayStageHardGateBlockers("discovery", { contact });
    expect(blockers).toHaveLength(1);
    expect(blockers[0].label).toBe("Observation permission confirmed");
    expect(blockers.some((b) => /scheduler|credential/i.test(b.label))).toBe(false);
  });

  it("buildPathwayStageGateRequirements returns only observation approval for discovery", () => {
    const reqs = buildPathwayStageGateRequirements("discovery", {
      contact: { provider_observation_feasibility: "interested" },
    });
    expect(reqs).toHaveLength(1);
    expect(reqs[0].label).toMatch(/observation permission confirmed/i);
    expect(reqs[0].met).toBe(false);
  });

  it("treats scheduler and credentialing db keys as execution intelligence only", () => {
    expect(isExecutionIntelligenceDbKey("provider_observation_coordinator_contact")).toBe(true);
    expect(isExecutionIntelligenceDbKey("provider_observation_credentialing_needed")).toBe(true);
    expect(intelligenceDbKeyBlocksPathwayAdvancement("provider_observation_coordinator_contact")).toBe(
      false,
    );
  });

  it("marks optional intelligence db keys as informational only", () => {
    expect(isPathwayIntelligenceInformational("provider_procedure_focus")).toBe(true);
    expect(isPathwayIntelligenceInformational("provider_champion_potential")).toBe(true);
    expect(isPathwayIntelligenceInformational("provider_observation_feasibility")).toBe(false);
  });

  it("does not block observation stage when optional intel is missing", () => {
    const contact = discoveryAccessReadyContact({
      provider_procedure_focus: "",
      provider_champion_potential: "",
      provider_preference_card_signals: "",
    });
    const input: PathwayGateInput = { contact, cases: [], engagements: [] };
    expect(pathwayStageHardGateBlockers("observe", input)).toHaveLength(1);
    expect(pathwayStageHardGateBlockers("observe", input)[0].label).toBe(
      "Observation sequence complete",
    );
  });
});
