import { describe, expect, it } from "vitest";
import { buildObservationOverviewGoals } from "./observationOverviewGoals";

describe("buildObservationOverviewGoals", () => {
  it("merges case objectives, carried-forward signals, and engagement planning", () => {
    const goals = buildObservationOverviewGoals(
      {
        observation_goal: "Validate workflow fit",
        observation_key_questions: "Who owns scheduling?\nWhat fixation is used?",
        observation_validation_targets: [
          {
            id: "signal-1",
            label: "Scheduling owner unknown",
            source: "provider_signal",
            status: "planned",
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      },
      {
        observation_goal: "Validate workflow fit",
        pre_observation_probes: "Ask about trocar preference",
      },
    );

    expect(goals.map((goal) => goal.text)).toEqual([
      "Validate workflow fit",
      "Who owns scheduling?",
      "What fixation is used?",
      "Scheduling owner unknown",
      "Ask about trocar preference",
    ]);
    expect(goals.find((goal) => goal.source === "provider_signal")?.text).toBe("Scheduling owner unknown");
  });

  it("formats carried-forward provider signals for observation goals", () => {
    const goals = buildObservationOverviewGoals(
      {
        observation_validation_targets: [
          {
            id: "signal-1",
            label: "interest_in_acsis_discussed",
            source: "provider_signal",
            status: "planned",
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      },
      null,
    );

    expect(goals[0]?.text).toBe("ACSIS interest was discussed");
    expect(goals[0]?.text).not.toMatch(/_/);
  });
});
