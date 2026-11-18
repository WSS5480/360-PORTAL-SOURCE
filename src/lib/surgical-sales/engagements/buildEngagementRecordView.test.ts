import { describe, expect, it } from "vitest";

import {
  buildEngagementRecordView,
  resolveEngagementObjective,
} from "./buildEngagementRecordView";
import {
  INTRO_CALL_START_MISSION_OBJECTIVE,
  INTRO_CALL_START_MISSION_PRIMARY_QUESTION,
} from "./introCallPathwayMission";

describe("buildEngagementRecordView", () => {
  it("builds mission-aware pathway record for a new intro call", () => {
    const view = buildEngagementRecordView({
      engagementId: "eng-1",
      engagement: {
        engagement_type: "intro_call",
        status: "planned",
        planning_mode: "quick_add",
        planning_status: "not_planned",
      },
    });

    expect(view.typeLabel).toBe("Intro Call");
    expect(view.statusLabel).toBe("Planned");
    expect(view.isPathwayMission).toBe(true);
    expect(view.isEmptyPlannedView).toBe(false);
    expect(view.objectiveLabel).toBe(INTRO_CALL_START_MISSION_OBJECTIVE);
    expect(view.primaryQuestionLabel).toBe(INTRO_CALL_START_MISSION_PRIMARY_QUESTION);
    expect(view.preparationLabel).toBe("Not Started");
    expect(view.detailPreparationLabel).toBe("Not Started");
    expect(view.statusBadgeVariant).toBe("planned");
    expect(view.openHref).toBe("/portal/sales/engagements/eng-1");
    expect(view.workflowState).toBe("planned");
    expect(view.detailPhase).toBe("planned");
    expect(view.showPreparationStatus).toBe(true);
    expect(view.showCompletedSummary).toBe(false);
    expect(view.detailActions.map((a) => a.label)).toEqual(["Edit Engagement", "Prepare"]);
  });

  it("shows pathway objective even when stored objective is absent", () => {
    const view = buildEngagementRecordView({
      engagementId: "eng-1",
      engagement: {
        engagement_type: "intro_call",
        status: "planned",
        planning_mode: "quick_add",
        planning_status: "planning_in_progress",
        pre_call_plan_updated_at: "2026-06-01T12:00:00.000Z",
      },
    });

    expect(view.isPathwayMission).toBe(true);
    expect(view.objectiveLabel).toBe(INTRO_CALL_START_MISSION_OBJECTIVE);
    expect(view.preparationLabel).toBe("Not Started");
  });

  it("prefers observation goal over engagement purpose for non-pathway types", () => {
    expect(
      resolveEngagementObjective({
        observation_goal: "Primary goal",
        engagement_purpose: "Secondary purpose",
      }),
    ).toBe("Primary goal");
  });

  it("uses empty planned labels for non-pathway engagements without prep", () => {
    expect(
      buildEngagementRecordView({
        engagementId: "eng-1",
        engagement: {
          engagement_type: "office_visit",
          status: "planned",
        },
      }).objectiveLabel,
    ).toBe("Not set yet");
  });
});
