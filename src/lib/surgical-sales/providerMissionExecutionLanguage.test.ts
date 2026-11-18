import { describe, expect, it } from "vitest";
import {
  MISSION_ACCESS_HEADLINE_LABELS,
  MISSION_EXECUTION_PILLARS,
  MISSION_INTELLIGENCE_CONFIDENCE_LABELS,
  softenMissionExecutionCopy,
} from "./providerMissionExecutionLanguage";

describe("providerMissionExecutionLanguage", () => {
  it("defines the three mission pillars", () => {
    expect(MISSION_EXECUTION_PILLARS.knownFacts).toBe("Known facts");
    expect(MISSION_EXECUTION_PILLARS.openQuestions).toBe("Open questions");
    expect(MISSION_EXECUTION_PILLARS.recommendedNextActions).toBe("Recommended next actions");
  });

  it("uses mission-forward access headlines", () => {
    expect(MISSION_ACCESS_HEADLINE_LABELS.interested).toBe("Observation interest captured");
    expect(MISSION_ACCESS_HEADLINE_LABELS.approved).toBe("Observation access confirmed");
  });

  it("softens punitive execution copy", () => {
    expect(softenMissionExecutionCopy("Missing scheduler contact")).toBe(
      "Scheduling process still being learned",
    );
    expect(softenMissionExecutionCopy("Low intelligence confidence")).toBe(
      MISSION_INTELLIGENCE_CONFIDENCE_LABELS.low,
    );
    expect(softenMissionExecutionCopy("Clinical understanding missing")).toBe(
      "Clinical context not yet captured",
    );
    expect(softenMissionExecutionCopy("Access Status: Blocked")).toBe(
      "Observation permission not yet confirmed",
    );
  });
});
