import { describe, expect, it } from "vitest";
import { guideContainsObservationInstructions } from "./buildProviderDebriefConversationGuide";
import { formatDebriefObservedFact } from "./debriefGuidanceFormatUtils";
import { buildDebriefGuidanceIntelligence } from "./buildDebriefGuidanceIntelligence";
import type { DebriefPrioritizedPattern } from "./debriefIntelligencePrioritization";

function pattern(label: string, count: number, total = 5): DebriefPrioritizedPattern {
  return { label, count, total, importance: 0 };
}

describe("debrief guidance format utilities", () => {
  it("formats observed facts without re-processing generated questions", () => {
    expect(formatDebriefObservedFact("Incumbent mesh used consistently (5 of 5 observations)")).toBe(
      "Incumbent mesh was used across observed cases.",
    );
  });
});

describe("legacy guideContainsObservationInstructions", () => {
  it("detects observation-era instructions in rendered guide text", () => {
    expect(
      guideContainsObservationInstructions({
        whatToValidate: ["Listen for provider frustration during the case"],
        conversationStarters: [],
      }),
    ).toBe(true);

    const intelligence = buildDebriefGuidanceIntelligence({
      patterns: [pattern("Extra visualization time before fixation", 2)],
      unresolvedObservationPrompts: ["Listen for provider frustration during the case"],
    });

    expect(
      guideContainsObservationInstructions({
        whatToValidate: intelligence.whatToValidate,
        conversationStarters: intelligence.conversationStarters,
        primaryHypothesis: intelligence.primaryHypothesis,
      }),
    ).toBe(false);
  });
});
