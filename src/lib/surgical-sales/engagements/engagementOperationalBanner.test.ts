import { describe, expect, it } from "vitest";
import {
  buildEngagementOperationalBanner,
  resolveEngagementOperationalBannerId,
} from "./engagementOperationalBanner";

describe("engagementOperationalBanner", () => {
  it("shows a clean planned touch for quick-add engagements", () => {
    const banner = buildEngagementOperationalBanner({
      status: "planned",
      engagementType: "intro_call",
      preparation: {
        is_prepared: false,
        prepared_at: null,
        prepared_at_label: null,
        checklist: [],
      },
      planProgress: { filled: 0, total: 4 },
      hasOutcomeNotes: false,
      provider: {
        id: "p1",
        relationship_stage: "prospect",
        provider_workflow_pain_points: "",
        influence_level: "",
      },
      engagement: {
        status: "planned",
        engagement_type: "intro_call",
        planning_mode: "quick_add",
        planning_status: "not_planned",
      },
    });
    expect(banner.id).toBe("planned_touch");
    expect(banner.discoveryObjectiveCount).toBe(0);
    expect(banner.title).toBe("Mission scheduled");
  });

  it("shows early discovery touch for intro calls without treating gaps as blockers", () => {
    const banner = buildEngagementOperationalBanner({
      status: "planned",
      engagementType: "intro_call",
      preparation: {
        is_prepared: false,
        prepared_at: null,
        prepared_at_label: null,
        checklist: [],
      },
      planProgress: { filled: 0, total: 4 },
      hasOutcomeNotes: false,
      provider: {
        id: "p1",
        relationship_stage: "prospect",
        provider_workflow_pain_points: "",
        influence_level: "",
      },
    });
    expect(banner.id).toBe("discovery_in_progress");
    expect(banner.preVisitBlockerCount).toBe(0);
    expect(banner.discoveryObjectiveCount).toBeGreaterThan(0);
    expect(banner.title).not.toContain("Incomplete");
  });

  it("shows discovery in progress for plan-first intro calls with briefing progress", () => {
    const banner = buildEngagementOperationalBanner({
      status: "planned",
      engagementType: "intro_call",
      preparation: {
        is_prepared: false,
        prepared_at: null,
        prepared_at_label: null,
        checklist: [],
      },
      planProgress: { filled: 0, total: 4 },
      hasOutcomeNotes: false,
      provider: {
        id: "p1",
        relationship_stage: "prospect",
        provider_workflow_pain_points: "",
        influence_level: "",
      },
      engagement: {
        status: "planned",
        engagement_type: "intro_call",
        planning_mode: "plan_first",
        planning_status: "planning_in_progress",
        pre_call_plan_updated_at: "2026-06-01T12:00:00Z",
      },
    });
    expect(banner.id).toBe("discovery_in_progress");
  });

  it("shows pre-visit blockers for observation when OR gates are open", () => {
    const banner = buildEngagementOperationalBanner({
      status: "planned",
      engagementType: "observation_request",
      preparation: {
        is_prepared: true,
        prepared_at: "2026-05-01T12:00:00Z",
        prepared_at_label: "May 1",
        checklist: [],
      },
      planProgress: { filled: 4, total: 4 },
      hasOutcomeNotes: false,
      provider: {
        id: "p1",
        relationship_stage: "prospect",
        provider_observation_access_path: "",
        provider_observation_coordinator_contact: "",
      },
      providerId: "p1",
    });
    expect(banner.id).toBe("pre_visit_blockers");
    expect(banner.preVisitBlockerCount).toBeGreaterThan(0);
  });

  it("shows field touch ready when prep marked and no blockers", () => {
    const banner = buildEngagementOperationalBanner({
      status: "planned",
      engagementType: "observation_request",
      preparation: {
        is_prepared: true,
        prepared_at: "2026-05-01T12:00:00Z",
        prepared_at_label: "May 1",
        checklist: [],
      },
      planProgress: { filled: 4, total: 4 },
      hasOutcomeNotes: false,
      provider: null,
    });
    expect(banner.id).toBe("field_touch_ready");
    expect(banner.subtitle).toContain("Pre-visit");
  });

  it("requires post-visit debrief after touch is in progress", () => {
    expect(
      resolveEngagementOperationalBannerId({
        status: "in_progress",
        engagementType: "intro_call",
        preparation: { is_prepared: true },
        readiness: { preVisitBlockerCount: 0, discoveryObjectiveCount: 3 },
      }),
    ).toBe("post_visit_debrief_required");
  });
});
