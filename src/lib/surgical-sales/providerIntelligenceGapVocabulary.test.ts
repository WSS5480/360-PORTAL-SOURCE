import { describe, expect, it } from "vitest";
import {
  DISCOVERY_COACHING_PROMPTS,
  INTELLIGENCE_GAP_STATE_LABELS,
  discoveryCoachingPrompt,
  intelligenceGapStateLabel,
} from "./providerIntelligenceGapVocabulary";

describe("providerIntelligenceGapVocabulary", () => {
  it("uses concise state labels for learning gaps", () => {
    expect(intelligenceGapStateLabel("provider_observation_coordinator_contact", "unknown")).toBe(
      "OR scheduling owner not named",
    );
    expect(intelligenceGapStateLabel("provider_observation_cadence_preference", "unknown")).toBe(
      "How OR days actually get posted not clear",
    );
    expect(intelligenceGapStateLabel("influence_level", "unknown")).toBe(
      "Who moves product choices on cases not clear",
    );
    expect(intelligenceGapStateLabel("provider_decision_maker_status", "unknown")).toBe(
      "Who approves evaluations not identified",
    );
  });

  it("uses coaching prompts for discovery priorities", () => {
    expect(discoveryCoachingPrompt("provider_observation_coordinator_contact")).toBe(
      "Ask who coordinates vendor observation scheduling",
    );
    expect(discoveryCoachingPrompt("provider_observation_best_days_case_types")).toBe(
      "Ask how far in advance observation requests should be submitted",
    );
    expect(discoveryCoachingPrompt("provider_observation_feasibility")).toBe(
      "Ask if they are open to vendor observation for workflow learning",
    );
    expect(discoveryCoachingPrompt("provider_workflow_pain_points", undefined, "provider_surgeon")).toBe(
      "Ask what creates the most workflow friction today",
    );
  });

  it("does not repeat identical wording between state and coaching for the same field", () => {
    for (const dbKey of Object.keys(INTELLIGENCE_GAP_STATE_LABELS)) {
      const state = INTELLIGENCE_GAP_STATE_LABELS[dbKey]!.unknown.toLowerCase();
      const coaching = (DISCOVERY_COACHING_PROMPTS[dbKey] ?? "").toLowerCase();
      if (!coaching) continue;
      expect(state).not.toBe(coaching);
      expect(coaching.includes(state) && state.length > 12).toBe(false);
    }
  });
});
