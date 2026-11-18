import { describe, expect, it } from "vitest";
import { buildProviderIntelligenceOperationalStory } from "./buildProviderIntelligenceOperationalStory";
import { PROVIDER_INTELLIGENCE_STORY_LAYER_LABELS } from "./buildProviderIntelligenceOperationalStory";

describe("buildProviderIntelligenceOperationalStory", () => {
  it("returns guided hierarchy layers for early prospect", () => {
    const story = buildProviderIntelligenceOperationalStory({
      contact: { provider_relationship_stage: "prospect" },
      planning: {
        sections: [
          {
            id: "observation_readiness",
            label: "Observation",
            confidence: "unknown",
            captured_count: 0,
            total_count: 8,
            last_updated_at: null,
          },
          {
            id: "clinical_workflow",
            label: "Clinical",
            confidence: "unknown",
            captured_count: 0,
            total_count: 5,
            last_updated_at: null,
          },
          {
            id: "or_environment",
            label: "OR",
            confidence: "unknown",
            captured_count: 0,
            total_count: 4,
            last_updated_at: null,
          },
          {
            id: "relationship_intelligence",
            label: "Relationship",
            confidence: "unknown",
            captured_count: 0,
            total_count: 6,
            last_updated_at: null,
          },
          {
            id: "commercial_signals",
            label: "Commercial",
            confidence: "unknown",
            captured_count: 0,
            total_count: 4,
            last_updated_at: null,
          },
        ],
      },
      relationshipStage: "prospect",
      engagements: [],
    });

    expect(story).not.toBeNull();
    expect(story!.operationalState.label).toBe(
      PROVIDER_INTELLIGENCE_STORY_LAYER_LABELS.operationalState,
    );
    expect(story!.deploymentRisk.label).toBe(
      PROVIDER_INTELLIGENCE_STORY_LAYER_LABELS.deploymentRisk,
    );
    expect(story!.leverageAction.label).toBe(
      PROVIDER_INTELLIGENCE_STORY_LAYER_LABELS.leverageAction,
    );
    expect(story!.operationalState.headline.length).toBeGreaterThan(12);
    expect(story!.leverageAction.cta.sectionId).toBeTruthy();
  });
});
