import { describe, expect, it } from "vitest";

import {
  briefingIdForPlannedEngagement,
  isEngagementEmptyPlannedView,
  resolveEngagementPlanningStatus,
  resolvePlanningModeOnCreate,
  resolvePlanningStatusOnCreate,
  syncEngagementPlanningPatch,
} from "./engagementPlanningModel";
import { mapEngagementRowForProviderProfile } from "./providerEngagementSummary";

describe("engagementPlanningModel", () => {
  it("detects empty planned view before prep or outcome", () => {
    expect(
      isEngagementEmptyPlannedView({
        status: "planned",
        engagement_type: "intro_call",
        planning_mode: "quick_add",
        planning_status: "not_planned",
      }),
    ).toBe(true);
    expect(
      isEngagementEmptyPlannedView({
        status: "planned",
        pre_call_plan_updated_at: "2026-06-01T12:00:00.000Z",
      }),
    ).toBe(false);
    expect(
      isEngagementEmptyPlannedView({
        status: "planned",
        notes: "Captured after visit",
      }),
    ).toBe(false);
  });

  it("quick add always creates not_planned status", () => {
    expect(
      resolvePlanningStatusOnCreate({
        planningMode: "quick_add",
        engagementRow: { observation_goal: "Should be ignored" },
      }),
    ).toBe("not_planned");
  });

  it("plan first without prep stays not_planned until Prepare Mission", () => {
    expect(
      resolvePlanningStatusOnCreate({
        planningMode: "plan_first",
        engagementRow: {},
      }),
    ).toBe("not_planned");
  });

  it("prepared engagement resolves to planned", () => {
    expect(
      resolveEngagementPlanningStatus({
        prepared_at: "2026-06-01T12:00:00.000Z",
      }),
    ).toBe("planned");
  });

  it("reads legacy briefing_status column when planning_status is absent", () => {
    expect(
      resolveEngagementPlanningStatus({
        briefing_status: "planning_in_progress",
      }),
    ).toBe("planning_in_progress");
  });

  it("sync attaches briefing_id when planned", () => {
    const synced = syncEngagementPlanningPatch(
      {
        prepared_at: "2026-06-01T12:00:00.000Z",
      },
      "00000000-0000-4000-8000-000000000099",
    );
    expect(synced.planning_status).toBe("planned");
    expect(synced.briefing_id).toBe("00000000-0000-4000-8000-000000000099");
  });

  it("briefing_id is null until planned", () => {
    expect(briefingIdForPlannedEngagement("abc", "not_planned")).toBeNull();
    expect(briefingIdForPlannedEngagement("abc", "planned")).toBe("abc");
  });

  it("legacy engagement rows without planning columns receive safe defaults", () => {
    const legacyRow = {
      id: "legacy-1",
      engagement_type: "follow_up",
      status: "planned",
      provider_id: "00000000-0000-4000-8000-000000000001",
      engagement_date: "2026-05-01",
    };

    expect(() => resolveEngagementPlanningStatus(legacyRow)).not.toThrow();
    expect(resolveEngagementPlanningStatus(legacyRow)).toBe("not_planned");
    expect(resolvePlanningModeOnCreate({ engagementRow: legacyRow })).toBe("quick_add");
  });

  it("maps legacy engagement rows for provider profile without runtime errors", () => {
    const mapped = mapEngagementRowForProviderProfile(
      {
        id: "legacy-2",
        engagement_type: "or_visit",
        status: "planned",
        provider_id: "00000000-0000-4000-8000-000000000001",
        engagement_date: "2026-05-01",
        pre_observation_impact_opening_statement: "Legacy prep note",
        pre_call_plan_updated_at: "2026-04-01T12:00:00.000Z",
      },
      new Map(),
      new Map(),
      new Map(),
    );

    expect(mapped.planning_status).toBe("planning_in_progress");
    expect(mapped.briefing_status).toBe("planning_in_progress");
    expect(mapped.planning_status_label).toBe("Not Started");
  });
});
