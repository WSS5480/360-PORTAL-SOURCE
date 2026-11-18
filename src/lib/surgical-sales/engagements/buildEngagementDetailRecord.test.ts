import { describe, expect, it } from "vitest";
import {
  buildEngagementDetailRecord,
  parseIntelligenceChangesFromEngagementNotes,
  resolveEngagementDetailPhase,
} from "./buildEngagementDetailRecord";
import { buildEngagementIntelligenceReadiness } from "./engagementIntelligenceReadiness";

describe("buildEngagementDetailRecord", () => {
  it("prioritizes capture debrief after visit", () => {
    const record = buildEngagementDetailRecord({
      engagementId: "eng-1",
      engagement: {
        status: "in_progress",
        engagement_type: "office_visit",
        engagement_date: "2026-05-20",
      },
      preparation: { is_prepared: true, prepared_at: null, prepared_at_label: null, checklist: [] },
      planProgress: { filled: 2, total: 4 },
      readiness: buildEngagementIntelligenceReadiness({
        engagementType: "office_visit",
        provider: null,
      }),
    });
    expect(record.phase).toBe("during_visit");
    expect(record.primaryCta.label).toBe("Resume Engagement");
    expect(record.primaryCta.href).toContain("/active");
    expect(record.primaryCta.href).not.toContain("/debrief");
  });

  it("parses intelligence bullets from debrief notes", () => {
    const bullets = parseIntelligenceChangesFromEngagementNotes(
      "What happened:\nMet scheduler.\n\nOperational intelligence captured:\n• Added scheduling participant\n• Workflow confidence increased",
    );
    expect(bullets).toEqual(["Added scheduling participant", "Workflow confidence increased"]);
  });

  it("shows compact objectives only before visit", () => {
    const readiness = buildEngagementIntelligenceReadiness({
      engagementType: "intro_call",
      provider: {
        id: "p1",
        relationship_stage: "prospect",
        provider_observation_access_path: "",
        provider_workflow_pain_points: "",
      },
      providerId: "p1",
    });
    const pre = buildEngagementDetailRecord({
      engagementId: "eng-1",
      engagement: {
        status: "planned",
        engagement_type: "intro_call",
        observation_goal: "Secure observation approval.",
      },
      preparation: { is_prepared: false, prepared_at: null, prepared_at_label: null, checklist: [] },
      planProgress: { filled: 0, total: 4 },
      readiness,
      providerId: "p1",
    });
    expect(pre.keyObjectives.length).toBeGreaterThan(0);

    const post = buildEngagementDetailRecord({
      engagementId: "eng-1",
      engagement: {
        status: "completed",
        engagement_type: "intro_call",
        debrief_completed: true,
        notes: "--- tactical debrief ---\n\nWhat happened:\nGood call",
      },
      preparation: { is_prepared: true, prepared_at: null, prepared_at_label: null, checklist: [] },
      planProgress: { filled: 4, total: 4 },
      readiness,
      providerId: "p1",
    });
    expect(post.keyObjectives).toHaveLength(0);
    expect(post.debriefStatus.id).toBe("completed");
    expect(post.primaryCta.label).toBe("View Debrief");
    expect(post.primaryCta.href).toContain("/engagements/eng-1");
    expect(post.primaryCta.href).not.toContain("/prepare");
  });
});

describe("resolveEngagementDetailPhase", () => {
  it("maps completed status to closed", () => {
    expect(resolveEngagementDetailPhase("completed", { is_completed: true, is_post_meeting: true })).toBe(
      "closed",
    );
  });
});
