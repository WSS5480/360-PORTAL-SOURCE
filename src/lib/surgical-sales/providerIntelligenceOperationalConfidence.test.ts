import { describe, expect, it } from "vitest";
import { buildProviderIntelligenceStatusCards } from "./providerIntelligenceStatusCards";
import {
  formatSectionOperationalLabel,
  formatStatusCardOperationalLabel,
} from "./providerIntelligenceOperationalConfidence";

describe("providerIntelligenceOperationalConfidence", () => {
  it("uses operational status card labels instead of abstract confidence tiers", () => {
    const cards = buildProviderIntelligenceStatusCards({});
    const labels = cards.map((c) => c.confidenceLabel).join(" ");
    expect(labels).not.toMatch(/low confidence|partial confidence|strong confidence/i);
    expect(cards.some((c) => c.confidenceLabel.length > 8)).toBe(true);
  });

  it("surfaces coordinator and vendor gaps in plain language", () => {
    const cards = buildProviderIntelligenceStatusCards({
      provider_observation_feasibility: "easy",
      provider_observation_credentialing_needed: "pending",
    });
    const obs = cards.find((c) => c.id === "observation_pathway")!;
    expect(obs.confidenceLabel).toMatch(/coordinator|access pathway|credentialing/i);

    const commercial = buildProviderIntelligenceStatusCards({}).find(
      (c) => c.id === "commercial_influence",
    )!;
    expect(commercial.confidenceLabel).toMatch(/commercial|vendor|evaluation/i);
  });

  it("maps observation section to pathway language", () => {
    expect(
      formatSectionOperationalLabel("observation_readiness", {}, "validated"),
    ).toBe("Observation path validated");
    expect(
      formatSectionOperationalLabel(
        "observation_readiness",
        { provider_observation_feasibility: "easy" },
        "partial",
        "provider_observation_coordinator_contact",
      ),
    ).toBe("Coordinator still open");
  });

  it("maps workflow partial state", () => {
    expect(
      formatStatusCardOperationalLabel(
        "workflow_understanding",
        { provider_procedure_focus: "hernia" },
        "partial",
        null,
      ),
    ).toBe("Workflow partially mapped");
  });
});
