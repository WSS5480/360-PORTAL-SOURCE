import { describe, expect, it } from "vitest";

import {
  combineVisibilityStates,
  deploymentTierToVisibilityState,
  formatVisibilityConfidenceIndex,
  operationalVisibilityStateLabel,
  visibilityBecauseFragment,
} from "./operationalVisibilityVocabulary";

describe("operationalVisibilityVocabulary", () => {
  it("maps deployment tiers to qualitative visibility states", () => {
    expect(deploymentTierToVisibilityState("low")).toBe("early");
    expect(deploymentTierToVisibilityState("building")).toBe("developing");
    expect(deploymentTierToVisibilityState("high")).toBe("strong");
  });

  it("combines conservatively to the lowest visibility", () => {
    expect(combineVisibilityStates(["strong", "developing", "validated"])).toBe("developing");
  });

  it("formats confidence index as visibility not completion", () => {
    expect(formatVisibilityConfidenceIndex(55)).toBe("55% field visibility");
  });

  it("builds because fragments for dimension copy", () => {
    expect(visibilityBecauseFragment("OR access", "developing")).toBe(
      "OR access partially understood",
    );
    expect(operationalVisibilityStateLabel("validated")).toBe("Validated");
  });
});
