import { describe, expect, it } from "vitest";
import {
  intelligenceContextualCaptureCta,
  intelligenceContextualStatusCardCta,
} from "./providerIntelligenceContextualCtas";

describe("providerIntelligenceContextualCtas", () => {
  it("uses operational verbs not generic capture language", () => {
    expect(intelligenceContextualCaptureCta("provider_observation_coordinator_contact")).toBe(
      "Confirm OR scheduling owner",
    );
    expect(intelligenceContextualCaptureCta("provider_credentialing_status")).toBe(
      "Confirm vendor clearance",
    );
    expect(intelligenceContextualCaptureCta("provider_workflow_pain_points")).toBe(
      "Confirm workflow friction",
    );
    expect(intelligenceContextualCaptureCta("influence_level")).toBe("Confirm who influences cases");
    expect(intelligenceContextualCaptureCta("provider_observation_access_path")).toBe(
      "Confirm OR access path",
    );
    expect(intelligenceContextualCaptureCta("provider_observation_cadence_preference")).toBe(
      "Confirm OR posting rhythm",
    );
    expect(intelligenceContextualCaptureCta("provider_observation_feasibility")).not.toMatch(
      /capture signal/i,
    );
  });

  it("builds review CTAs by strategic area", () => {
    const cta = intelligenceContextualStatusCardCta({
      cardId: "workflow_understanding",
      confidence: "validated",
      topGap: null,
    });
    expect(cta.ctaLabel).toBe("Review workflow map");
    expect(cta.ctaMode).toBe("review");
  });
});
