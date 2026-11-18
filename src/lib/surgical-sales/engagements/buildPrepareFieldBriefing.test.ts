import { describe, expect, it } from "vitest";
import { buildPrepareFieldBriefing } from "./buildPrepareFieldBriefing";
import type { PrepareForMeetingView } from "./buildPrepareForMeetingView";
import { buildPrepareOutcomeCaptureContext } from "./prepareOutcomeCaptureContext";
import { buildIntelligenceCaptureScopeFromEngagement } from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureScope";

function minimalPrepareView(overrides: Partial<PrepareForMeetingView> = {}): PrepareForMeetingView {
  return {
    engagement_id: "eng-1",
    provider_snapshot: {
      provider_id: "prov-1",
      display_name: "Dr. Smith",
      specialty: "General Surgery",
      organization_name: "Metro Hospital",
      location_label: "Austin, TX",
      relationship_status_label: "Developing",
      influence_level_label: "Decision maker",
      last_engagement_date_label: "Mar 1",
      last_engagement_title: "Intro call",
      last_engagement_href: "/portal/sales/engagements/prior",
    },
    upcoming_engagement: {
      title: "Intro",
      engagement_type: "intro_call",
      type_label: "Intro call",
      status: "planned",
      status_label: "Planned",
      datetime_label: "Thu, May 22, 9:00 AM",
      organization_name: "Metro Hospital",
      opportunity_label: null,
      opportunity_href: null,
      office_visit_context: null,
    },
    at_a_glance_stats: [
      { key: "engagements", label: "Engagements", value: "3" },
      { key: "obs", label: "OR obs", value: "1" },
    ],
    known_intelligence: { bullets: [], last_key_insight: null },
    recent_activity: { items: [], timeline_href: "/portal/sales/providers/prov-1?tab=activity" },
    suggested_talking_points: { points: ["Probe OR access path"], context_label: null },
    suggested_goal: {
      goal: "Determine whether OR observation is realistic for highest-volume workflows within the next 60 days.",
      why: "This interaction should confirm observation access.",
    },
    risks_barriers: { risks: [{ key: "cred", label: "Credentialing not started" }] },
    recommended_next_actions: {
      actions: ["Schedule observation"],
      primary_cta: {
        kind: "open_engagement",
        label: "Refine Prep",
        href: "/portal/sales/engagements/eng-1?focus=pre_call",
      },
    },
    what_matters_most: {
      title: "Today",
      lines: [
        { id: "discovery_goal", label: "Discovery focus", value: "Clear picture of workflow" },
        { id: "important_unknown", label: "Operational unknown", value: "Map OR access path" },
        { id: "relationship_risk", label: "Deployment Risk", value: "Credentialing not started" },
        { id: "next_step_opportunity", label: "Next-Step Opportunity", value: "Schedule observation" },
      ],
    },
    preparation: {
      is_prepared: false,
      prepared_at: null,
      prepared_at_label: null,
      checklist: [],
    },
    outcome: buildPrepareOutcomeCaptureContext({ status: "planned" }),
    plan_fields: {
      observation_goal: "Determine whether OR observation is realistic for highest-volume workflows within the next 60 days.",
      pre_observation_probes: "Probe OR access path",
      pre_observation_value_hypothesis: null,
      pre_observation_planned_close: null,
      engagement_purpose: null,
      next_action: null,
    },
    tactical_asks: [],
    edit_plan_href: "/portal/sales/engagements/eng-1?focus=pre_call",
    provider_href: "/portal/sales/providers/prov-1?tab=overview",
    capture_scope: buildIntelligenceCaptureScopeFromEngagement({
      engagementId: "eng-1",
      providerId: "prov-1",
      providerLabel: "Dr. Smith",
      organizationLabel: "Metro Hospital",
      engagementType: "intro_call",
    }),
    debrief_intelligence_snapshot: null,
    provider_debrief_briefing: {
      is_provider_debrief: false,
      plan_mode: "generic",
      completed_observation_count: 0,
      plan: null,
      linked_case_id: null,
      linked_case_href: null,
      missing_case_message: null,
    },
    live_session: null,
    ...overrides,
  };
}

describe("buildPrepareFieldBriefing", () => {
  it("prefers saved probes over suggested talking points for top asks", () => {
    const brief = buildPrepareFieldBriefing(
      minimalPrepareView({
        plan_fields: {
          observation_goal: "Determine whether OR observation is realistic for highest-volume workflows within the next 60 days.",
          pre_observation_probes: "Saved probe one?\nSaved probe two?",
          pre_observation_value_hypothesis: null,
          pre_observation_planned_close: null,
          engagement_purpose: null,
          next_action: null,
        },
        suggested_talking_points: { points: ["Suggested only"], context_label: null },
      }),
    );
    expect(brief.learn.talkingPoints[0]).toMatch(/Saved probe one/);
  });

  it("maps scan summary and section payloads from prepare view", () => {
    const brief = buildPrepareFieldBriefing(minimalPrepareView());
    expect(brief.whatMattersMost.lines).toHaveLength(4);
    expect(brief.summary.displayName).toBe("Dr. Smith");
    expect(brief.summary.goal).toContain("OR observation");
    expect(brief.summary.topRisk).toMatch(/Credentialing/);
    expect(brief.summary.primaryNext).toMatch(/Schedule/);
    expect(brief.learn.talkingPoints).toHaveLength(1);
    expect(brief.risks.items[0]).toMatch(/Credentialing/);
    expect(brief.next.actions[0]).toMatch(/Schedule/);
  });

  it("caps discoveries to top three for mobile scan", () => {
    const manyPoints = Array.from({ length: 8 }, (_, i) => `Point ${i}?`);
    const brief = buildPrepareFieldBriefing(
      minimalPrepareView({
        plan_fields: {
          observation_goal: "Goal",
          pre_observation_probes: manyPoints.join("\n"),
          pre_observation_value_hypothesis: null,
          pre_observation_planned_close: null,
          engagement_purpose: null,
          next_action: null,
        },
        suggested_talking_points: { points: manyPoints, context_label: null },
      }),
    );
    expect(brief.learn.talkingPoints).toHaveLength(3);
  });

  it("routes counts and timeline into supporting drawers not primary learn", () => {
    const brief = buildPrepareFieldBriefing(minimalPrepareView());
    expect(brief.supporting.account.metrics).toHaveLength(2);
    expect(brief.supporting.account.summaryLabel).toMatch(/stat/);
    expect(brief.supporting.activity.recentTeaser).toHaveLength(0);
    expect(brief.learn.intelligenceLines).toHaveLength(0);
  });

  it("routes overflow risks and next actions into reference prep flags", () => {
    const brief = buildPrepareFieldBriefing(
      minimalPrepareView({
        risks_barriers: {
          risks: [
            { key: "a", label: "Risk A" },
            { key: "b", label: "Risk B" },
            { key: "c", label: "Risk C" },
          ],
        },
        recommended_next_actions: {
          actions: ["Primary next", "Secondary next"],
          primary_cta: {
            kind: "open_engagement",
            label: "Refine Prep",
            href: "/portal/sales/engagements/eng-1?focus=pre_call",
          },
        },
      }),
    );
    expect(brief.risks.items).toHaveLength(2);
    expect(brief.supporting.extraFlags.moreRisks).toEqual(["Risk C"]);
    expect(brief.supporting.extraFlags.moreNextActions).toEqual(["Secondary next"]);
  });

  it("assigns stable unique ids to activity teaser rows", () => {
    const brief = buildPrepareFieldBriefing(
      minimalPrepareView({
        recent_activity: {
          timeline_href: "/portal/sales/providers/prov-1?tab=activity",
          items: [
            {
              id: "eng-act-1",
              kind: "engagement",
              icon: "◆",
              title: "Pre-Call Plan created",
              at: "2026-05-21T10:00:00Z",
              at_label: "May 21",
              summary: "Intro call",
              href: "/portal/sales/engagements/eng-1",
            },
            {
              id: "eng-act-2",
              kind: "engagement",
              icon: "◆",
              title: "Pre-Call Plan created",
              at: "2026-05-21T11:00:00Z",
              at_label: "May 21",
              summary: "Follow-up",
              href: "/portal/sales/engagements/eng-2",
            },
          ],
        },
      }),
    );
    const ids = brief.supporting.activity.recentTeaser.map((r) => r.id);
    expect(ids).toEqual(["eng-act-1", "eng-act-2"]);
    expect(new Set(ids).size).toBe(2);
  });
});
