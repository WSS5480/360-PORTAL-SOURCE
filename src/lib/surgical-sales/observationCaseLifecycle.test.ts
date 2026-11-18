import { describe, expect, it } from "vitest";
import {
  buildObservationCaseCompletionSummary,
  canCompleteObservationLifecycle,
  canContinueObservationLifecycle,
  canStartObservationLifecycle,
  canViewObservationFindings,
  countObservationIntelligenceItems,
} from "./observationCaseLifecycle";

describe("observationCaseLifecycle", () => {
  it("gates lifecycle actions by execution status", () => {
    expect(canStartObservationLifecycle("scheduled")).toBe(true);
    expect(canStartObservationLifecycle("rescheduled")).toBe(true);
    expect(canStartObservationLifecycle("in_progress")).toBe(false);
    expect(canContinueObservationLifecycle("in_progress")).toBe(true);
    expect(canCompleteObservationLifecycle("in_progress")).toBe(true);
    expect(canCompleteObservationLifecycle("scheduled")).toBe(false);
    expect(canViewObservationFindings("completed")).toBe(true);
    expect(canViewObservationFindings("in_progress")).toBe(false);
  });

  it("builds completion summary from captured notes and insights", () => {
    const summary = buildObservationCaseCompletionSummary({
      caseRow: {
        observation_completed_at: "2026-06-05T18:00:00Z",
        live_observation_competitors: "Competitor tray observed",
      },
      activities: [
        { activity_type: "note", body: "Saw competitor tray" },
        { activity_type: "note", body: "Long turnover" },
      ],
    });

    expect(summary.notesCapturedCount).toBe(2);
    expect(summary.intelligenceItemsCount).toBeGreaterThan(0);
    expect(summary.completedAt).toBe("2026-06-05T18:00:00Z");
  });

  it("counts intelligence items from case-captured learnings only", () => {
    const count = countObservationIntelligenceItems({
      caseRow: { live_observation_workflow: "Setup delay" },
      providerContact: { provider_competitive_products: "Uses Competitor X" },
      activities: [],
    });

    expect(count).toBe(1);
  });
});
