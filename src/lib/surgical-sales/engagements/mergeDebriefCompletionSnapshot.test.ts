import { describe, expect, it } from "vitest";
import {
  applyDebriefCompletionSnapshotExtras,
  mergeDebriefCompletionAnalyzeSnapshot,
  readDebriefCompletionContextFromSnapshot,
  readDebriefNextStepFromSnapshot,
  readDebriefValidationResultsFromSnapshot,
} from "./mergeDebriefCompletionSnapshot";
import type { DebriefCompletionContext } from "./debriefCompletionValidationTypes";

describe("mergeDebriefCompletionAnalyzeSnapshot", () => {
  it("merges completion context without removing prepare workspace", () => {
    const existing = {
      debrief_prepare_workspace: { hypothesis: "Visualization delays may matter." },
      start_mission: { opened_at: "2026-06-01T12:00:00.000Z" },
    };

    const completionContext: DebriefCompletionContext = {
      loadedAt: "2026-06-12T12:00:00.000Z",
      completedObservationCount: 5,
      isPostObservationProviderDebrief: true,
      prepareWorkspace: { hypothesis: "Visualization delays may matter." } as never,
      observationPatterns: [{ label: "Extra visualization time before fixation", count: 2, total: 5 }],
      primaryHypothesisPattern: {
        label: "Extra visualization time before fixation",
        count: 2,
        total: 5,
      },
      hypothesisText: "Visualization delays may matter.",
      desiredOutcome: "follow_up",
      desiredOutcomeOther: "",
    };

    const merged = mergeDebriefCompletionAnalyzeSnapshot(existing, {
      completionContext,
      validationResults: [
        {
          normalized_pattern_key: "extra_visualization_time_before_fixation",
          pattern_label: "Extra visualization time before fixation",
          count: 2,
          total: 5,
          status: "qualified",
          provider_quote: "Only on large AWR cases.",
          reason: "Provider acknowledged the pattern with limits.",
          rep_accepted: true,
          recorded_at: "2026-06-12T12:05:00.000Z",
        },
      ],
      nextStep: {
        recommendation: "follow_up",
        label: "Follow Up",
        opportunity_strength: "low",
        provider_interest: "curious",
        reason: "Future conditional interest without evaluation request.",
        recorded_at: "2026-06-12T12:05:00.000Z",
      },
    });

    expect(merged.debrief_prepare_workspace).toEqual(existing.debrief_prepare_workspace);
    expect(readDebriefCompletionContextFromSnapshot(merged)?.hypothesisText).toBe(
      "Visualization delays may matter.",
    );
    expect(readDebriefCompletionContextFromSnapshot(merged)?.observationPatterns[0]?.normalizedKey).toBe(
      "extra_visualization_time_before_fixation",
    );
    expect(readDebriefValidationResultsFromSnapshot(merged)).toHaveLength(1);
    expect(readDebriefNextStepFromSnapshot(merged)?.provider_interest).toBe("curious");
  });
});

describe("applyDebriefCompletionSnapshotExtras", () => {
  it("copies completion validation keys onto the persisted debrief snapshot record", () => {
    const record = { version: 1, narrative: "Debrief notes." };
    const extras = {
      debrief_next_step: {
        recommendation: "evaluation",
        label: "Evaluation Case",
        opportunity_strength: "high",
        provider_interest: "interested",
        reason: "Provider agreed to evaluation.",
        recorded_at: "2026-06-16T12:00:00.000Z",
      },
      debrief_completion_context: {
        isPostObservationProviderDebrief: true,
        completedObservationCount: 5,
      },
    };

    const merged = applyDebriefCompletionSnapshotExtras(record, extras);
    expect(readDebriefNextStepFromSnapshot(merged)?.recommendation).toBe("evaluation");
    expect(readDebriefCompletionContextFromSnapshot(merged)?.isPostObservationProviderDebrief).toBe(true);
  });
});
