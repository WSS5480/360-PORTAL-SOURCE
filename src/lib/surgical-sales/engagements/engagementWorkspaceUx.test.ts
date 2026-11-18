import { describe, expect, it } from "vitest";

import { buildEngagementWorkspaceGuidance } from "./engagementWorkspaceUx";



describe("buildEngagementWorkspaceGuidance", () => {

  it("shows a clean planned touch for quick-add engagements", () => {
    const g = buildEngagementWorkspaceGuidance({
      engagementId: "eng-1",
      engagement: {
        status: "planned",
        engagement_type: "intro_call",
        planning_mode: "quick_add",
        planning_status: "not_planned",
      },
      engagementType: "intro_call",
      status: "planned",
      preparation: { is_prepared: false, prepared_at: null, prepared_at_label: null, checklist: [] },
      planProgress: { filled: 0, total: 4 },
      hasOutcomeNotes: false,
      provider: {
        id: "p1",
        provider_workflow_pain_points: "",
      },
      providerId: "p1",
    });

    expect(g.banner.id).toBe("planned_touch");
    expect(g.statusLabel).toBe("MISSION SCHEDULED");
    expect(g.readiness.discoveryObjectiveCount).toBe(0);
    expect(g.nextActionTitle).toBe("Mission scheduled");
    expect(g.nextActionBody).toContain("No prep was auto-generated");
  });

  it("uses discovery language for planned intro calls after briefing starts", () => {
    const g = buildEngagementWorkspaceGuidance({
      engagementId: "eng-1",
      engagement: {
        status: "planned",
        engagement_type: "intro_call",
        planning_mode: "plan_first",
        planning_status: "planning_in_progress",
        pre_call_plan_updated_at: "2026-06-01T12:00:00Z",
      },

      engagementType: "intro_call",

      status: "planned",

      preparation: { is_prepared: false, prepared_at: null, prepared_at_label: null, checklist: [] },

      planProgress: { filled: 0, total: 4 },

      hasOutcomeNotes: false,

      provider: {

        id: "p1",

        provider_workflow_pain_points: "",

      },

      providerId: "p1",

    });

    expect(g.banner.id).toBe("discovery_in_progress");

    expect(g.statusLabel).toBe("DISCOVERY IN PROGRESS");

    expect(g.statusLabel).not.toContain("INCOMPLETE");

    expect(g.primaryCtaHref).toContain("/prepare");

  });



  it("opens debrief from workspace when post-visit", () => {

    const g = buildEngagementWorkspaceGuidance({

      engagementId: "eng-1",

      engagement: { status: "in_progress", engagement_type: "intro_call" },

      engagementType: "intro_call",

      status: "in_progress",

      preparation: { is_prepared: true, prepared_at: "2026-01-01", prepared_at_label: "Jan 1", checklist: [] },

      planProgress: { filled: 4, total: 4 },

      hasOutcomeNotes: false,

    });

    expect(g.banner.id).toBe("post_visit_debrief_required");

    expect(g.primaryCtaHref).toContain("panel=debrief");

  });



  it("shows early discovery touch when intro is prepared", () => {

    const g = buildEngagementWorkspaceGuidance({

      engagementId: "eng-1",

      engagement: { status: "planned", engagement_type: "intro_call", prepared_at: "2026-01-01T12:00:00Z" },

      engagementType: "intro_call",

      status: "planned",

      preparation: {

        is_prepared: true,

        prepared_at: "2026-01-01",

        prepared_at_label: "Jan 1",

        checklist: [],

      },

      planProgress: { filled: 4, total: 4 },

      hasOutcomeNotes: false,

      provider: null,

    });

    expect(g.banner.id).toBe("early_discovery_touch");

    expect(g.statusLabel).toBe("EARLY DISCOVERY TOUCH");

  });

});

