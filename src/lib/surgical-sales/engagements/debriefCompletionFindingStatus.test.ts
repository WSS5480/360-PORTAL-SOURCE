import { describe, expect, it } from "vitest";
import {
  canonicalizeDebriefFindingKey,
  formatDebriefProfileUpdateDisplay,
  mergeDebriefPatternValidationsByCanonicalKey,
  resolveCommercialFindingStatus,
} from "./debriefCompletionFindingStatus";
import type { DebriefPatternValidationResult } from "./debriefCompletionValidationTypes";

describe("debriefCompletionFindingStatus", () => {
  it("canonicalizes clinically equivalent visualization phrases to one key", () => {
    const keyA = canonicalizeDebriefFindingKey("Extra visualization time before fixation");
    const keyB = canonicalizeDebriefFindingKey("Visualization issue");
    const keyC = canonicalizeDebriefFindingKey("Visualization challenge in complex cases");
    expect(keyA).toBe("visualization_exposure_workflow");
    expect(keyB).toBe(keyA);
    expect(keyC).toBe(keyA);
  });

  it("merges duplicate clinical findings by normalized key", () => {
    const merged = mergeDebriefPatternValidationsByCanonicalKey([
      {
        normalized_pattern_key: "visualization_exposure_workflow",
        canonical_finding_key: "visualization_exposure_workflow",
        pattern_label: "Extra visualization time before fixation",
        count: 2,
        total: 5,
        status: "qualified",
        commercial_status: "qualified_issue",
        rep_accepted: true,
        recorded_at: "2026-06-12T12:00:00.000Z",
      },
      {
        normalized_pattern_key: "visualization_issue",
        canonical_finding_key: "visualization_exposure_workflow",
        pattern_label: "Visualization issue",
        count: 1,
        total: 5,
        status: "unmentioned",
        commercial_status: "mentioned_only",
        rep_accepted: true,
        recorded_at: "2026-06-12T12:00:00.000Z",
      },
    ] as DebriefPatternValidationResult[]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.commercial_status).toBe("qualified_issue");
  });

  it("maps mentioned-only topics without creating validated pain or opportunity", () => {
    expect(
      resolveCommercialFindingStatus({
        status: "unmentioned",
        patternLabel: "Extra visualization time before fixation",
        narrative: "We discussed visualization during the debrief.",
        topicMentioned: true,
      }),
    ).toBe("mentioned_only");

    expect(
      resolveCommercialFindingStatus({
        status: "confirmed",
        patternLabel: "Extra visualization time before fixation",
        narrative: "Provider confirmed visualization slows him down enough to be worth addressing.",
        topicMentioned: true,
      }),
    ).toBe("validated_pain_point");
  });

  it("formats profile updates with rep-facing labels instead of database field names", () => {
    expect(formatDebriefProfileUpdateDisplay("provider_observation_feasibility", "interested")).toEqual({
      label: "Observation Access",
      detail: "Status: Interested",
    });
    expect(formatDebriefProfileUpdateDisplay("provider_competitive_products", "Bard Mesh")).toEqual({
      label: "Current Product / Standard Product",
      detail: "Bard Mesh",
    });
  });
});
