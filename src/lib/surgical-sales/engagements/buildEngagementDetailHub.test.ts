import { describe, expect, it } from "vitest";

import {
  buildEngagementCompletedSummary,
  buildEngagementDetailHubActions,
  ENGAGEMENT_DETAIL_RESUME_ENGAGEMENT_LABEL,
  ENGAGEMENT_DETAIL_START_ENGAGEMENT_LABEL,
  resolveEngagementDetailHubPhase,
} from "./buildEngagementDetailHub";
import { engagementDetailShowsPreparationStatus } from "./engagementStatusDisplay";
import { ENGAGEMENT_DETAIL_PREPARE_LABEL } from "./engagementLifecycle";
import {
  ENGAGEMENT_CONTINUE_DEBRIEF_LABEL,
  ENGAGEMENT_VIEW_DEBRIEF_LABEL,
} from "./engagementUiLabels";

describe("buildEngagementDetailHub", () => {
  it("maps workflow states to detail hub phases", () => {
    expect(resolveEngagementDetailHubPhase("planned")).toBe("planned");
    expect(resolveEngagementDetailHubPhase("prepared")).toBe("planned");
    expect(resolveEngagementDetailHubPhase("in_progress")).toBe("active");
    expect(resolveEngagementDetailHubPhase("completed")).toBe("debrief_needed");
    expect(resolveEngagementDetailHubPhase("closed")).toBe("completed");
  });

  it("returns phase-specific action labels", () => {
    const planned = buildEngagementDetailHubActions({
      engagementId: "e1",
      phase: "planned",
      workflowState: "planned",
    });
    expect(planned.map((a) => a.label)).toEqual(["Edit Engagement", ENGAGEMENT_DETAIL_PREPARE_LABEL]);

    const prepared = buildEngagementDetailHubActions({
      engagementId: "e1",
      phase: "planned",
      workflowState: "prepared",
    });
    expect(prepared.map((a) => a.label)).toEqual([
      "Edit Engagement",
      ENGAGEMENT_DETAIL_PREPARE_LABEL,
      ENGAGEMENT_DETAIL_START_ENGAGEMENT_LABEL,
    ]);

    const active = buildEngagementDetailHubActions({ engagementId: "e1", phase: "active" });
    expect(active.map((a) => a.label)).toEqual([
      ENGAGEMENT_DETAIL_RESUME_ENGAGEMENT_LABEL,
      "Edit Engagement",
    ]);

    const debrief = buildEngagementDetailHubActions({ engagementId: "e1", phase: "debrief_needed" });
    expect(debrief[0]).toMatchObject({ label: ENGAGEMENT_CONTINUE_DEBRIEF_LABEL });

    const done = buildEngagementDetailHubActions({ engagementId: "e1", phase: "completed" });
    expect(done[0]).toMatchObject({ label: ENGAGEMENT_VIEW_DEBRIEF_LABEL });
    expect(done[0]).toMatchObject({ href: "/portal/sales/engagements/e1/debrief?mode=review" });
  });

  it("adds intro call quick completion actions before debrief is needed", () => {
    const plannedIntro = buildEngagementDetailHubActions({
      engagementId: "e1",
      phase: "planned",
      workflowState: "planned",
      engagementType: "intro_call",
    });
    expect(plannedIntro.map((a) => a.label)).toEqual([
      "Edit Engagement",
      ENGAGEMENT_DETAIL_PREPARE_LABEL,
      "Dictate & Complete",
      "Mark Complete",
    ]);

    const activeIntro = buildEngagementDetailHubActions({
      engagementId: "e1",
      phase: "active",
      workflowState: "in_progress",
      engagementType: "intro_call",
    });
    expect(activeIntro.map((a) => a.label)).toEqual([
      ENGAGEMENT_DETAIL_RESUME_ENGAGEMENT_LABEL,
      "Dictate & Complete",
      "Mark Complete",
      "Edit Engagement",
    ]);
  });

  it("shows preparation only for planned engagements", () => {
    expect(engagementDetailShowsPreparationStatus({ status: "planned" })).toBe(true);
    expect(engagementDetailShowsPreparationStatus({ status: "in_progress" })).toBe(false);
    expect(engagementDetailShowsPreparationStatus({ status: "completed" })).toBe(false);
  });

  it("builds completed summary from visit outcome and debrief notes", () => {
    const summary = buildEngagementCompletedSummary({
      status: "completed",
      updated_at: "2026-06-02T18:00:00.000Z",
      next_action: "Follow Up Needed",
      follow_up_tasks: "Schedule OR observation",
      notes: "--- tactical debrief ---\nWhat happened:\nStrong interest.",
      debrief_intelligence_snapshot: {
        version: 1,
        savedAt: "2026-06-02T18:00:00.000Z",
        narrative: "Strong interest.",
        visitOutcome: {
          outcomeId: "observation_approved",
          label: "Observation Approved",
          rationale: "Debrief save",
          recordedAt: "2026-06-02T18:00:00.000Z",
        },
        start_mission: {
          opened_at: "2026-06-02T17:00:00.000Z",
          outcome_label: "Observation Approved",
          outcome_id: "observation_approved",
          outcome_recorded_at: "2026-06-02T17:30:00.000Z",
        },
      },
    });

    expect(summary.outcome).toBe("Observation Approved");
    expect(summary.completionDateLabel).toContain("2026");
    expect(summary.summary).toContain("Strong interest");
    expect(summary.nextStep).toBe("Schedule OR observation");
  });
});
