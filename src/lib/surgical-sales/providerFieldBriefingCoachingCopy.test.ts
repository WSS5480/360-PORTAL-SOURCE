import { describe, expect, it } from "vitest";
import {
  EARLY_DISCOVERY_READINESS_COACHING,
  buildBriefingCoachingNote,
  buildBriefingReadinessCoaching,
  softenBriefingRiskToCoaching,
} from "./providerFieldBriefingCoachingCopy";

describe("providerFieldBriefingCoachingCopy", () => {
  it("softens judgmental risk phrasing into coaching", () => {
    expect(softenBriefingRiskToCoaching("Risk: OR access not confirmed")).toBe(
      "Do not request OR time until access path is clearer.",
    );
    expect(softenBriefingRiskToCoaching("Not yet viable for field deployment")).toBe(
      "Keep this touch focused on workflow and next-step clarity.",
    );
  });

  it("uses early discovery posture coaching", () => {
    expect(
      buildBriefingReadinessCoaching({
        relationshipStage: "early_discovery",
        commercialStage: "early_discovery",
        fieldTimeState: "high_wasted_field_risk",
      }),
    ).toBe(EARLY_DISCOVERY_READINESS_COACHING);
  });

  it("prefers access coaching over raw risk scan in early discovery", () => {
    expect(
      buildBriefingCoachingNote({
        relationshipStage: "prospect",
        commercialStage: "early_discovery",
        fieldTimeState: "high_wasted_field_risk",
        primaryRiskScan: "OR access — not confirmed on file",
        primaryRiskHeadline: "OR access not confirmed",
      }),
    ).toBe("Do not request OR time until access path is clearer.");
  });
});
