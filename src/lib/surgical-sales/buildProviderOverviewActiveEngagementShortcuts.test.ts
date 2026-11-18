import { describe, expect, it } from "vitest";
import {
  buildProviderOverviewActiveEngagementShortcuts,
} from "./buildProviderOverviewActiveEngagementShortcuts";
import {
  INTRO_DICTATE_COMPLETE_LABEL,
  INTRO_JUST_COMPLETE_LABEL,
  INTRO_PREPARE_LABEL,
} from "./introCallEngagementLifecycle";

describe("buildProviderOverviewActiveEngagementShortcuts", () => {
  it("mirrors mission board discovery shortcuts for intro in progress", () => {
    const shortcuts = buildProviderOverviewActiveEngagementShortcuts({
      contact: {},
      providerId: "prov-1",
      stageId: "discovery",
      engagements: [
        {
          id: "intro-1",
          engagement_type: "intro_call",
          engagement_type_label: "Intro call",
          status: "in_progress",
          status_label: "In progress",
          prepared_at: "2026-06-01T12:00:00Z",
          planning_status: "planned",
          planning_status_label: "Planned",
          pre_call_filled: 5,
          pre_call_total: 5,
          pre_call_complete: true,
          briefing_status: "planned",
          briefing_status_label: "Planned",
          outcome_label: "",
        },
      ],
    });

    const ids = shortcuts.map((action) => action.missionBoardShortcutId);
    expect(ids).toContain("dictate");
    expect(ids).toContain("intro_prepare");
    expect(shortcuts.find((a) => a.missionBoardShortcutId === "intro_prepare")?.label).toBe(
      INTRO_PREPARE_LABEL,
    );
    expect(shortcuts.find((a) => a.missionBoardShortcutId === "intro_dictate_complete")?.label).toBe(
      INTRO_DICTATE_COMPLETE_LABEL,
    );
    expect(shortcuts.find((a) => a.missionBoardShortcutId === "intro_just_complete")?.label).toBe(
      INTRO_JUST_COMPLETE_LABEL,
    );
    expect(ids).toContain("observation_status");
  });

  it("returns no shortcuts when there is no active workflow engagement", () => {
    expect(
      buildProviderOverviewActiveEngagementShortcuts({
        contact: {},
        providerId: "prov-1",
        stageId: "discovery",
        engagements: [],
      }),
    ).toEqual([]);
  });
});
