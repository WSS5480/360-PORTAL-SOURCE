import { describe, expect, it } from "vitest";
import {
  buildProviderOverviewMissionStatus,
  hasActiveProviderOverviewEngagement,
  resolveProviderOverviewActiveEngagementPresentation,
  resolveProviderOverviewFieldBriefingDisplayStatus,
} from "./buildProviderOverviewMissionStatus";
import { ENGAGEMENT_WORKFLOW_NEXT_STEP } from "@/lib/surgical-sales/engagements/engagementWorkflowState";
import { ENGAGEMENT_CONTINUE_DEBRIEF_LABEL } from "@/lib/surgical-sales/engagements/engagementUiLabels";
import { INTRO_PREPARE_LABEL } from "@/lib/surgical-sales/introCallEngagementLifecycle";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";

function engagement(partial: Partial<ProviderEngagementSummary> & { id: string }): ProviderEngagementSummary {
  return {
    id: partial.id,
    engagement_type: partial.engagement_type ?? "intro_call",
    engagement_type_label: partial.engagement_type_label ?? "Intro call",
    status: partial.status ?? "planned",
    status_label: partial.status_label ?? "Planned",
    pre_call_filled: partial.pre_call_filled ?? 0,
    pre_call_total: partial.pre_call_total ?? 0,
    pre_call_complete: partial.pre_call_complete ?? false,
    briefing_status: partial.briefing_status ?? "not_planned",
    briefing_status_label: partial.briefing_status_label ?? "Not Started",
    planning_status: partial.planning_status ?? partial.briefing_status ?? "not_planned",
    planning_status_label: partial.planning_status_label ?? partial.briefing_status_label ?? "Not Started",
    outcome_label: partial.outcome_label ?? "Planned",
    scheduled_at: partial.scheduled_at ?? "2099-06-15T14:00:00.000Z",
    ...partial,
  };
}

const emptyHero = {
  stageLabel: "Discovery",
  missionLine: "",
  tacticalSummary: "",
  nextMove: "Prepare Intro Call",
  metrics: [],
  actions: [],
};

const defaultMissionInput = {
  contact: { provider_relationship_stage: "early_discovery" },
  providerId: "prov-test",
};

describe("buildProviderOverviewMissionStatus", () => {
  it("shows scheduled intro mission with Prepare Intro Call primary CTA", () => {
    const status = buildProviderOverviewMissionStatus({
      ...defaultMissionInput,
      engagements: [engagement({ id: "e1", briefing_status: "not_planned", planning_status: "not_planned" })],
      workflow: {
        phase: "prepare",
        headline: "Intro call on the calendar",
        detail: null,
        ctaLabel: "Continue prep",
        ctaHref: "/portal/sales/engagements/e1/prepare",
        engagementId: "e1",
        engagementTypeLabel: "Intro call",
      },
      upcoming: {
        state: "upcoming",
        title: "Intro call",
        whenLabel: "Jun 15",
        briefingHref: "/portal/sales/engagements/e1/prepare",
        ctaLabel: "Open briefing",
      },
      currentGoal: "Secure observation approval",
      nextBestAction: {
        label: "Prepare Intro Call",
        detail: "Finish prep before you walk in.",
        href: "/portal/sales/engagements/e1/prepare",
      },
      hero: emptyHero,
      newEngagementHref: "/portal/sales/engagements/new",
    });

    expect(status.mode).toBe("scheduled_mission");
    if (status.mode !== "scheduled_mission") return;

    expect(status.engagementTypeLabel).toBe("Intro Call");
    expect(status.missionPanel.missionObjective).toMatch(/permission to observe/i);
    expect(status.briefingStatus.lines.length).toBeGreaterThan(0);
    expect(status.fieldBriefingStatus).toBe("not_started");
    expect(status.primaryCta.label).toBe(INTRO_PREPARE_LABEL);
    expect(status.primaryCta.href).toContain("/prepare");
    expect(status.primaryCta.href).not.toContain("/active");
    expect(status.openHref).toContain("/prepare");
    expect(status.nextStepLine).toBe(ENGAGEMENT_WORKFLOW_NEXT_STEP.planned);
    expect(status.secondaryActions.some((action) => action.label === "Debrief")).toBe(false);
    expect(status.secondaryActions.some((action) => action.customAction === "editMissionSchedule")).toBe(true);
    expect(status.secondaryActions.some((action) => action.label === "Reschedule")).toBe(false);
  });

  it("uses Prepare Intro Call when planning is in progress", () => {
    const status = buildProviderOverviewMissionStatus({
      ...defaultMissionInput,
      engagements: [
        engagement({
          id: "e1",
          briefing_status: "planning_in_progress",
          planning_status: "planning_in_progress",
          pre_call_filled: 2,
          pre_call_total: 5,
        }),
      ],
      workflow: null,
      upcoming: null,
      currentGoal: "Secure observation approval",
      nextBestAction: { label: "Prepare Intro Call", detail: "", href: "/x" },
      hero: emptyHero,
      newEngagementHref: "/portal/sales/engagements/new",
    });

    expect(status.mode).toBe("scheduled_mission");
    if (status.mode !== "scheduled_mission") return;
    expect(status.fieldBriefingStatus).toBe("not_started");
    expect(status.primaryCta.label).toBe(INTRO_PREPARE_LABEL);
  });

  it("describes active engagement presentation for unfinished touches", () => {
    const status = buildProviderOverviewMissionStatus({
      ...defaultMissionInput,
      engagements: [engagement({ id: "e-live", status: "in_progress", status_label: "In Progress" })],
      workflow: {
        phase: "run_touch",
        headline: "Intro call in progress",
        detail: null,
        ctaLabel: "Resume Engagement",
        ctaHref: "/portal/sales/engagements/e-live/active",
        engagementId: "e-live",
        engagementTypeLabel: "Intro call",
      },
      upcoming: null,
      currentGoal: "Advance pathway",
      nextBestAction: { label: "Continue", detail: "", href: "/x" },
      hero: emptyHero,
      newEngagementHref: "/portal/sales/engagements/new",
    });

    expect(hasActiveProviderOverviewEngagement(status)).toBe(true);
    if (status.mode !== "scheduled_mission") return;
    const active = resolveProviderOverviewActiveEngagementPresentation(status);
    expect(active.badgeLabel).toBe("In progress");
    expect(active.tone).toBe("live");
    expect(active.headline).toBeTruthy();
    expect(active.primaryCta.href).toContain("/active");
  });

  it("includes quick edit data on debrief missions so overview edit/delete work", () => {
    const status = buildProviderOverviewMissionStatus({
      ...defaultMissionInput,
      contact: { provider_relationship_stage: "debrief" },
      engagements: [
        engagement({
          id: "e-debrief",
          status: "completed",
          status_label: "Completed",
          debrief_completed: false,
        }),
      ],
      workflow: {
        phase: "debrief",
        headline: "Log outcome",
        detail: null,
        ctaLabel: "Open",
        ctaHref: "/portal/sales/engagements/e-debrief/prepare?panel=debrief",
        engagementId: "e-debrief",
        engagementTypeLabel: "Intro call",
      },
      upcoming: { state: "debrief_needed", title: "Intro call", whenLabel: "Today", briefingHref: "/x", ctaLabel: "Debrief" },
      currentGoal: "Capture outcome",
      nextBestAction: { label: "Debrief", detail: "", href: "/x" },
      hero: emptyHero,
      newEngagementHref: "/portal/sales/engagements/new",
      completedObservationCount: 1,
    });

    expect(status.mode).toBe("debrief_mission");
    if (status.mode !== "debrief_mission") return;
    expect(status.quickEdit.engagementId).toBe("e-debrief");
    expect(status.secondaryActions.some((action) => action.customAction === "editMissionSchedule")).toBe(true);
    expect(status.secondaryActions.some((action) => action.customAction === "deleteEngagement")).toBe(true);
  });

  it("uses intro debrief CTA on observe stage instead of add next observation case", () => {
    const status = buildProviderOverviewMissionStatus({
      ...defaultMissionInput,
      contact: {
        provider_relationship_pathway_stage_id: "observe",
        provider_observation_feasibility: "approved",
      },
      engagements: [
        engagement({
          id: "e-debrief",
          status: "completed",
          status_label: "Completed",
          debrief_completed: false,
          engagement_date: "2026-06-15",
        }),
      ],
      workflow: {
        phase: "awaiting_debrief",
        headline: "Intro call complete",
        detail: null,
        ctaLabel: ENGAGEMENT_CONTINUE_DEBRIEF_LABEL,
        ctaHref: "/portal/sales/engagements/e-debrief/debrief",
        engagementId: "e-debrief",
        engagementTypeLabel: "Intro call",
      },
      upcoming: null,
      currentGoal: "Complete observations",
      nextBestAction: { label: "Add Next Observation Case", detail: "", href: "/cases/new" },
      hero: emptyHero,
      newEngagementHref: "/portal/sales/engagements/new",
      completedObservationCount: 1,
      cases: [{ id: "case-1", case_type: "observation", status: "completed" }],
    });

    expect(status.mode).toBe("debrief_mission");
    if (status.mode !== "debrief_mission") return;

    expect(status.primaryCta?.label).toBe(ENGAGEMENT_CONTINUE_DEBRIEF_LABEL);
    expect(status.primaryCta?.href).toContain("/debrief");

    const active = resolveProviderOverviewActiveEngagementPresentation(status);
    expect(active.badgeLabel).toBe("Finish debrief");
    expect(active.primaryCta.label).toBe(ENGAGEMENT_CONTINUE_DEBRIEF_LABEL);
    expect(active.primaryCta.label).not.toBe("Add Next Observation Case");
  });

  it("falls back to intelligence-driven posture when no scheduled engagement exists", () => {
    const status = buildProviderOverviewMissionStatus({
      ...defaultMissionInput,
      engagements: [],
      workflow: null,
      upcoming: null,
      currentGoal: "Secure observation approval",
      nextBestAction: {
        label: "Schedule Intro Call",
        detail: "",
        href: "/portal/sales/engagements/new?type=intro_call",
      },
      hero: {
        ...emptyHero,
        actions: [
          {
            id: "start-intro",
            label: "Schedule Intro Call",
            href: "/portal/sales/engagements/new?type=intro_call",
            kind: "link",
            emphasis: "primary",
          },
        ],
      },
      newEngagementHref: "/portal/sales/engagements/new",
    });

    expect(status.mode).toBe("fallback");
    if (status.mode !== "fallback") return;
    expect(status.nextActionLabel).toMatch(/intro call/i);
    expect(status.primaryCta?.label).toMatch(/intro|schedule/i);
    expect(status.briefingStatus.lines.length).toBeGreaterThan(0);
  });
});

describe("resolveProviderOverviewFieldBriefingDisplayStatus", () => {
  it("maps ready when meeting is marked prepared", () => {
    expect(
      resolveProviderOverviewFieldBriefingDisplayStatus(
        engagement({ id: "e1", prepared_at: "2026-06-01T00:00:00.000Z", briefing_status: "planned" }),
      ),
    ).toBe("ready");
  });
});
