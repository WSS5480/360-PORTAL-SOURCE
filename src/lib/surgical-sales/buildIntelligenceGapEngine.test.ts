import { describe, expect, it } from "vitest";
import { buildIntelligenceGapEngine } from "./buildIntelligenceGapEngine";
import {
  emptyProviderCommercialIntelligence,
} from "./providerCommercialIntelligenceModel";

describe("buildIntelligenceGapEngine", () => {
  it("assesses domains on empty discovery profile without inventing open questions", () => {
    const view = buildIntelligenceGapEngine({ contact: {}, stageId: "discovery" });

    expect(view.domains.map((d) => d.id)).toEqual(["access", "workflow", "clinical"]);
    expect(view.gaps).toEqual([]);
  });

  it("does not surface speculative gaps when observation is interested but not approved", () => {
    const view = buildIntelligenceGapEngine({
      contact: {
        provider_observation_feasibility: "yes",
        provider_relationship_stage: "early_discovery",
      },
      maxGaps: 8,
    });

    const gapText = view.gaps.map((g) => g.text.toLowerCase()).join(" ");
    expect(/evaluation|procedure mix|first[- ]case validation/i.test(gapText)).toBe(false);
    expect(view.gaps.length).toBeLessThanOrEqual(3);
  });

  it("marks workflow domain known when procedure focus is validated and other fields unmentioned", () => {
    const view = buildIntelligenceGapEngine({
      contact: {
        provider_procedure_focus: "Minimally invasive general surgery",
        provider_intelligence_field_metadata: {
          provider_procedure_focus: {
            lifecycle_state: "validated",
            validated_at: "2026-06-01T00:00:00.000Z",
          },
        },
      },
      stageId: "discovery",
    });

    const workflow = view.domains.find((d) => d.id === "workflow");
    expect(workflow?.completeness).toBe("known");
    const procedureTopic = workflow?.topics.find((t) => t.topicId === "procedure_types");
    expect(procedureTopic?.completeness).toBe("known");
  });

  it("surfaces clinical gaps from commercial intelligence bridge", () => {
    const commercial = emptyProviderCommercialIntelligence();
    commercial.updated_at = "2026-06-01T00:00:00.000Z";
    commercial.observation.interest = "yes";

    const view = buildIntelligenceGapEngine({
      contact: {
        provider_commercial_intelligence: JSON.stringify(commercial),
        provider_observation_feasibility: "yes",
      },
    });

    expect(view.gaps.length).toBe(0);
    expect(view.domains.find((d) => d.id === "clinical")).toBeTruthy();
  });

  it("does not emit duplicate gap phrases", () => {
    const view = buildIntelligenceGapEngine({ contact: {}, maxGaps: 24 });
    const phrases = view.gaps.map((g) => g.text.toLowerCase());
    expect(new Set(phrases).size).toBe(phrases.length);
  });

  it("sorts gaps high before medium before low", () => {
    const view = buildIntelligenceGapEngine({ contact: {}, maxGaps: 12 });
    const rank = { high: 0, medium: 1, low: 2 };
    for (let i = 1; i < view.gaps.length; i += 1) {
      expect(rank[view.gaps[i]!.priority]).toBeGreaterThanOrEqual(rank[view.gaps[i - 1]!.priority]!);
    }
  });
});
