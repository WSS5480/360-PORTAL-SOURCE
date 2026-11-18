import { describe, expect, it } from "vitest";
import {
  isDebriefValidationEngagementType,
  isPostObservationProviderDebrief,
} from "./isPostObservationProviderDebrief";
import { PROVIDER_DEBRIEF_ENGAGEMENT_TYPE } from "./providerDebriefEngagement";

describe("isPostObservationProviderDebrief", () => {
  it("returns true for provider debrief with completed observations", () => {
    expect(
      isPostObservationProviderDebrief({
        engagementType: PROVIDER_DEBRIEF_ENGAGEMENT_TYPE,
        completedObservationCount: 1,
      }),
    ).toBe(true);
  });

  it("returns true for observation_debrief alias with completed observations", () => {
    expect(
      isPostObservationProviderDebrief({
        engagementType: "observation_debrief",
        completedObservationCount: 3,
      }),
    ).toBe(true);
    expect(isDebriefValidationEngagementType("observation_debrief")).toBe(true);
  });

  it("returns false for provider debrief before any completed observation", () => {
    expect(
      isPostObservationProviderDebrief({
        engagementType: PROVIDER_DEBRIEF_ENGAGEMENT_TYPE,
        completedObservationCount: 0,
      }),
    ).toBe(false);
  });

  it("returns false for intro call even with observations", () => {
    expect(
      isPostObservationProviderDebrief({
        engagementType: "intro_call",
        completedObservationCount: 5,
      }),
    ).toBe(false);
  });
});
