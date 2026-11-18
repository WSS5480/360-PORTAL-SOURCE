import { describe, expect, it } from "vitest";
import { buildProviderOverviewMissionCardView } from "./buildProviderOverviewMissionCardView";
import { ENGAGEMENT_CONTINUE_DEBRIEF_LABEL } from "@/lib/surgical-sales/engagements/engagementUiLabels";
import { INTRO_PREPARE_LABEL, INTRO_START_LABEL } from "./introCallEngagementLifecycle";

describe("buildProviderOverviewMissionCardView", () => {
  it("builds discovery mission card with fixed quick actions", () => {
    const view = buildProviderOverviewMissionCardView({
      contact: { provider_relationship_stage: "early_discovery" },
      providerId: "prov-1",
      stageId: "discovery",
      newEngagementHref: "/engagements/new",
      noteHref: "/note",
      intelligenceHref: "/intel",
    });

    expect(view.missionTitle).toBe("Discovery Mission");
    expect(view.objective).toMatch(/permission to observe/i);
    expect(view.quickActions.map((a) => a.label)).toEqual([
      "Field note",
      "Add support contact",
    ]);
    expect(view.quickActions.some((action) => action.id === "update_permission_status")).toBe(false);
    expect(view.secondary?.label).toBe("Schedule intro call");
    const addIntel = view.quickActions.find((action) => action.id === "add_intelligence");
    expect(addIntel?.href).toBeUndefined();
    expect(addIntel?.missionBoardShortcutId).toBe("dictate");
    expect(addIntel?.customAction).toBeUndefined();
    expect(view.primary.label).toBe("Update Permission Status");
  });

  it("routes planned intro to Prepare with mission-board shortcuts on active card", () => {
    const view = buildProviderOverviewMissionCardView({
      contact: {},
      providerId: "prov-1",
      stageId: "discovery",
      newEngagementHref: "/engagements/new?provider_id=prov-1",
      noteHref: "/note",
      intelligenceHref: "/intel",
      engagements: [
        {
          id: "e1",
          engagement_type: "intro_call",
          engagement_type_label: "Intro call",
          status: "planned",
          status_label: "Planned",
          pre_call_filled: 0,
          pre_call_total: 0,
          pre_call_complete: false,
          briefing_status: "not_started",
          briefing_status_label: "Not started",
          planning_status: "not_started",
          planning_status_label: "Not started",
          outcome_label: "",
        },
      ],
    });

    expect(view.primary.label).toBe(INTRO_PREPARE_LABEL);
    expect(view.primary.href).toContain("/prepare");
    expect(view.primary.href).not.toContain("/active");
    const shortcutIds = view.activeEngagementShortcuts.map((a) => a.missionBoardShortcutId);
    expect(shortcutIds).toContain("intro_dictate_complete");
    expect(shortcutIds).toContain("intro_just_complete");
    expect(shortcutIds).toContain("observation_status");
    expect(view.secondary).toBeUndefined();
    expect(view.quickActions.some((action) => action.id === "schedule_intro_call")).toBe(false);
  });

  it("routes prepared intro to Start Intro Call with full mission-board shortcuts", () => {
    const view = buildProviderOverviewMissionCardView({
      contact: {},
      providerId: "prov-1",
      stageId: "discovery",
      newEngagementHref: "/engagements/new?provider_id=prov-1",
      noteHref: "/note",
      intelligenceHref: "/intel",
      engagements: [
        {
          id: "e1",
          engagement_type: "intro_call",
          engagement_type_label: "Intro call",
          status: "planned",
          status_label: "Planned",
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

    expect(view.primary.label).toBe(INTRO_START_LABEL);
    expect(view.primary.href).toContain("/active");
    const shortcutIds = view.activeEngagementShortcuts.map((a) => a.missionBoardShortcutId);
    expect(shortcutIds).toContain("intro_prepare");
    expect(shortcutIds).toContain("intro_dictate_complete");
    expect(shortcutIds).toContain("intro_just_complete");
    expect(shortcutIds).toContain("observation_status");
    expect(view.secondary).toBeUndefined();
  });

  it("promotes Plan Provider Debrief after five completed observations", () => {
    const completedCases = Array.from({ length: 5 }, (_, index) => ({
      id: `case-${index + 1}`,
      case_type: "observation",
      status: "completed",
    }));

    const view = buildProviderOverviewMissionCardView({
      contact: { provider_observation_feasibility: "approved" },
      providerId: "prov-debrief",
      stageId: "debrief",
      newEngagementHref: "/portal/sales/engagements/new?provider_id=prov-debrief",
      noteHref: "/note",
      intelligenceHref: "/intel",
      cases: completedCases,
    });

    expect(view.missionTitle).toBe("Debrief Mission");
    expect(view.primary.label).toBe("Schedule Debrief");
    expect(view.recommendedNextMove).toMatch(/Schedule provider debrief/i);
    expect(view.primary.label).not.toBe("Add Observation Case");
  });

  it("prioritizes intro debrief over observe-stage add-case CTA", () => {
    const view = buildProviderOverviewMissionCardView({
      contact: { provider_observation_feasibility: "approved" },
      providerId: "prov-onion",
      stageId: "observe",
      newEngagementHref: "/portal/sales/engagements/new?provider_id=prov-onion",
      noteHref: "/note",
      intelligenceHref: "/intel",
      engagements: [
        {
          id: "intro-1",
          engagement_type: "intro_call",
          engagement_type_label: "Intro call",
          status: "completed",
          status_label: "Completed",
          pre_call_filled: 0,
          pre_call_total: 0,
          pre_call_complete: false,
          briefing_status: "complete",
          briefing_status_label: "Complete",
          planning_status: "complete",
          planning_status_label: "Complete",
          outcome_label: "Completed",
          engagement_date: "2026-06-15",
        },
      ],
      cases: [
        {
          id: "case-1",
          case_type: "observation",
          status: "completed",
        },
      ],
    });

    expect(view.primary.label).toBe(ENGAGEMENT_CONTINUE_DEBRIEF_LABEL);
    expect(view.primary.href).toContain("/debrief");
    expect(view.primary.label).not.toBe("Add Next Observation Case");
  });
});
