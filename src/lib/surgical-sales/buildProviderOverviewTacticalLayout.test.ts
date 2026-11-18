import { describe, expect, it } from "vitest";
import {
  buildProviderOverviewPrimaryActions,
  buildProviderOverviewTacticalHero,
  buildProviderOverviewTacticalProgression,
  buildProviderOverviewUpcomingTouch,
} from "./buildProviderOverviewTacticalLayout";
import {
  buildProviderEngagementWorkflowAction,
  PROVIDER_OVERVIEW_DEBRIEF_NOW_CTA,
} from "./buildProviderEngagementWorkflowAction";
import { buildStoredTacticalDebriefNotes } from "./engagements/engagementTacticalDebrief";
import { buildProviderDiscoveryStageProgression } from "./buildProviderDiscoveryStageProgression";

describe("buildProviderOverviewTacticalLayout", () => {
  const discovery = buildProviderDiscoveryStageProgression({
    contact: { provider_relationship_stage: "prospect" },
    engagements: [],
  });

  const pathway = {
    stageId: "discovery" as const,
    stageLabel: "Discovery",
    stageObjective: "Gain observation visibility.",
    progressPercent: 24,
    riskLevel: "Moderate",
    confidenceLevel: "Partial",
    requirements: [],
    discoveryProgression: discovery,
    hasFieldEvidence: false,
  };

  it("builds hero with stage label and metric pills", () => {
    const hero = buildProviderOverviewTacticalHero({
      pathway,
      contact: { provider_relationship_stage: "prospect" },
      engagements: [],
      nextBestAction: {
        label: "Schedule intro call",
        detail: "Secure scheduling ownership through intro call.",
        href: "/engagements/new",
      },
      briefingHref: "/briefing",
      newEngagementHref: "/engagements/new",
      workflow: null,
    });

    expect(hero.stageLabel).toBe("Discovery");
    expect(hero.tacticalSummary).toBe("");
    expect(hero.metrics).toHaveLength(0);
    expect(hero.missionLine).toBe("");
    expect(hero.actions[0].label).toBe("Start Intro Call");
  });

  it("summarizes progression target and gap count", () => {
    const progression = buildProviderOverviewTacticalProgression({
      pathway,
      contact: { provider_relationship_stage: "prospect" },
    });
    expect(progression.nextTarget).toBeTruthy();
    expect(progression.gapCount).toBeGreaterThanOrEqual(0);
    expect(progression.openItems.length + progression.details.length).toBeGreaterThanOrEqual(0);
  });

  it("promotes debrief as primary CTA when workflow awaits debrief", () => {
    const actions = buildProviderOverviewPrimaryActions({
      engagements: [
        {
          id: "e1",
          title: "Intro Call",
          engagement_type: "intro_call",
          engagement_type_label: "Intro call",
          status: "completed",
          status_label: "Completed",
          scheduled_at: new Date().toISOString(),
          engagement_date: null,
          pre_call_filled: 0,
          pre_call_total: 0,
          pre_call_complete: false,
          outcome_label: null,
          updated_at: new Date().toISOString(),
        },
      ],
      briefingHref: "/providers/p1?tab=briefing",
      newEngagementHref: "/engagements/new",
      workflow: {
        phase: "awaiting_debrief",
        headline: "Intro call complete",
        detail: null,
        ctaLabel: "Debrief intro call",
        ctaHref: "/engagements/e1/prepare?panel=debrief",
        engagementId: "e1",
        engagementTypeLabel: "Intro call",
      },
      nextBestAction: {
        label: "Schedule intro call",
        detail: "x",
        href: "/new",
      },
    });

    const debrief = actions.find((a) => a.id === "debrief");
    const briefing = actions.find((a) => a.id === "briefing");
    expect(debrief?.emphasis).toBe("primary");
    expect(debrief?.label).toBe(PROVIDER_OVERVIEW_DEBRIEF_NOW_CTA);
    expect(debrief?.href).toContain("panel=debrief");
    expect(briefing?.emphasis).toBe("secondary");
    expect(briefing?.href).toContain("/engagements/e1/prepare");
  });

  it("promotes debrief as primary CTA when engagement is in progress", () => {
    const actions = buildProviderOverviewPrimaryActions({
      engagements: [
        {
          id: "e1",
          title: "Intro Call",
          engagement_type: "intro_call",
          engagement_type_label: "Intro call",
          status: "in_progress",
          status_label: "In progress",
          scheduled_at: new Date().toISOString(),
          engagement_date: null,
          pre_call_filled: 0,
          pre_call_total: 0,
          pre_call_complete: false,
          outcome_label: null,
          updated_at: new Date().toISOString(),
        },
      ],
      briefingHref: "/providers/p1?tab=briefing",
      newEngagementHref: "/engagements/new",
      workflow: {
        phase: "in_progress",
        headline: "Intro call in progress",
        detail: null,
        ctaLabel: "Debrief intro call",
        ctaHref: "/engagements/e1/prepare?panel=debrief",
        engagementId: "e1",
        engagementTypeLabel: "Intro call",
      },
      nextBestAction: { label: "Schedule intro call", detail: "x", href: "/new" },
    });

    expect(actions.find((a) => a.id === "debrief")?.emphasis).toBe("primary");
    expect(actions.find((a) => a.id === "briefing")?.emphasis).toBe("secondary");
  });

  it("formats upcoming engagement when scheduled", () => {
    const upcoming = buildProviderOverviewUpcomingTouch({
      engagements: [
        {
          id: "e1",
          title: "Intro Call",
          engagement_type: "intro_call",
          engagement_type_label: "Intro call",
          status: "planned",
          status_label: "Planned",
          scheduled_at: new Date().toISOString(),
          engagement_date: null,
          pre_call_filled: 0,
          pre_call_total: 0,
          pre_call_complete: false,
          outcome_label: null,
          updated_at: new Date().toISOString(),
        },
      ],
    });

    expect(upcoming?.state).toBe("upcoming");
    expect(upcoming?.title).toBe("Intro Call");
    expect(upcoming?.whenLabel).toMatch(/Today/i);
  });

  it("surfaces debrief-needed engagement before upcoming calendar item", () => {
    const upcoming = buildProviderOverviewUpcomingTouch({
      engagements: [
        {
          id: "e-planned",
          title: "Follow-up",
          engagement_type: "follow_up",
          engagement_type_label: "Follow-up",
          status: "planned",
          status_label: "Planned",
          scheduled_at: new Date(Date.now() + 86400000).toISOString(),
          engagement_date: null,
          pre_call_filled: 0,
          pre_call_total: 0,
          pre_call_complete: false,
          outcome_label: null,
          updated_at: new Date().toISOString(),
        },
        {
          id: "e-done",
          title: "Intro Call",
          engagement_type: "intro_call",
          engagement_type_label: "Intro call",
          status: "completed",
          status_label: "Completed",
          scheduled_at: new Date().toISOString(),
          engagement_date: null,
          notes: "Quick notes only",
          pre_call_filled: 0,
          pre_call_total: 0,
          pre_call_complete: false,
          outcome_label: null,
          updated_at: new Date().toISOString(),
        },
      ],
      briefingHref: "/providers/p1?tab=briefing",
    });

    expect(upcoming?.state).toBe("debrief_needed");
    expect(upcoming?.title).toBe("Intro call");
    expect(upcoming?.ctaLabel).toBe(PROVIDER_OVERVIEW_DEBRIEF_NOW_CTA);
    expect(upcoming?.debriefHref).toContain("panel=debrief");
  });

  it("clears debrief-needed overview state after debrief is saved", () => {
    const needingDebrief = {
      id: "e-done",
      title: "Intro Call",
      engagement_type: "intro_call",
      engagement_type_label: "Intro call",
      status: "completed",
      status_label: "Completed",
      scheduled_at: new Date().toISOString(),
      engagement_date: null,
      notes: "Quick notes only",
      pre_call_filled: 0,
      pre_call_total: 0,
      pre_call_complete: false,
      outcome_label: null,
      updated_at: new Date().toISOString(),
    };
    const debriefed = {
      ...needingDebrief,
      notes: buildStoredTacticalDebriefNotes({ narrative: "Strong interest in observation access." }),
      debrief_completed: true,
      debrief_completed_at: new Date().toISOString(),
    };

    const beforeTouch = buildProviderOverviewUpcomingTouch({
      engagements: [needingDebrief],
      briefingHref: "/providers/p1?tab=briefing",
    });
    const beforeWorkflow = buildProviderEngagementWorkflowAction({
      engagements: [needingDebrief],
      briefingHref: "/providers/p1?tab=briefing",
      fallbackAction: { label: "Plan next", href: "/new", reason: "x" },
    });
    const beforeActions = buildProviderOverviewPrimaryActions({
      engagements: [needingDebrief],
      briefingHref: "/providers/p1?tab=briefing",
      newEngagementHref: "/engagements/new",
      workflow: beforeWorkflow,
      nextBestAction: { label: "Schedule intro call", detail: "x", href: "/new" },
    });

    expect(beforeTouch?.state).toBe("debrief_needed");
    expect(beforeActions.find((a) => a.id === "debrief")).toBeTruthy();

    const afterTouch = buildProviderOverviewUpcomingTouch({
      engagements: [debriefed],
      briefingHref: "/providers/p1?tab=briefing",
    });
    const afterWorkflow = buildProviderEngagementWorkflowAction({
      engagements: [debriefed],
      briefingHref: "/providers/p1?tab=briefing",
      fallbackAction: { label: "Plan next", href: "/new", reason: "x" },
    });
    const afterActions = buildProviderOverviewPrimaryActions({
      engagements: [debriefed],
      briefingHref: "/providers/p1?tab=briefing",
      newEngagementHref: "/engagements/new",
      workflow: afterWorkflow,
      nextBestAction: { label: "Schedule intro call", detail: "x", href: "/new" },
    });

    expect(afterTouch).toBeNull();
    expect(afterActions.find((a) => a.id === "debrief")).toBeUndefined();
    expect(afterActions.find((a) => a.id === "briefing")).toBeUndefined();
  });
});
