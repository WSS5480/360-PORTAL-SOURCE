import { describe, expect, it } from "vitest";
import {
  discoveryActionChipLabel,
  intelligenceGapChipLabel,
  operationalIntelligenceChipLabel,
  OPERATIONAL_INTELLIGENCE_CHIP_LABELS,
} from "./providerIntelligenceBriefing";
import { discoveryCoachingPrompt } from "./providerIntelligenceGapVocabulary";

describe("providerIntelligenceBriefing", () => {
  it("uses operational chip labels instead of CRM-style field names", () => {
    expect(operationalIntelligenceChipLabel("provider_responsiveness")).toBe(
      "Office response time",
    );
    expect(operationalIntelligenceChipLabel("provider_follow_up_approach")).toBe(
      "Between-visit follow-up",
    );
    expect(operationalIntelligenceChipLabel("provider_communication_style")).toBe(
      "Rep interaction model",
    );
    expect(operationalIntelligenceChipLabel("provider_observation_credentialing_needed")).toBe(
      "Vendor approval path",
    );
    expect(operationalIntelligenceChipLabel("influence_level")).toBe("Who influences cases");
    expect(operationalIntelligenceChipLabel("provider_observation_coordinator_contact")).toBe(
      "OR scheduling owner",
    );
  });

  it("keeps discovery coaching prompts distinct from chip labels", () => {
    expect(discoveryActionChipLabel("provider_responsiveness")).not.toBe(
      discoveryCoachingPrompt("provider_responsiveness"),
    );
    expect(OPERATIONAL_INTELLIGENCE_CHIP_LABELS.provider_responsiveness).not.toMatch(
      /response speed/i,
    );
    expect(OPERATIONAL_INTELLIGENCE_CHIP_LABELS.provider_follow_up_approach).not.toMatch(
      /follow-up cadence/i,
    );
  });

  it("formats gap chips with operational shorthand", () => {
    expect(intelligenceGapChipLabel("provider_responsiveness", "unknown")).toMatch(
      /Office response/i,
    );
    expect(intelligenceGapChipLabel("provider_observation_coordinator_contact", "unknown")).toBe(
      "No OR scheduling owner",
    );
  });
});
