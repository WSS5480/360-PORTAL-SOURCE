import { describe, expect, it } from "vitest";
import {
  deriveProviderOverviewWorkflowActions,
  isFieldBriefingLabel,
  resolveFieldBriefingHref,
  PROVIDER_OVERVIEW_WORKFLOW_CTA,
} from "./deriveProviderOverviewWorkflowActions";
import { PROVIDER_FIELD_OPS_CTA } from "./providerFieldOperationsUiLabels";

const NEW_ENG = "/portal/sales/engagements/new?provider_id=p1";

describe("deriveProviderOverviewWorkflowActions", () => {
  it("does not surface field briefing without logged engagements", () => {
    const actions = deriveProviderOverviewWorkflowActions({
      engagements: [],
      workflow: null,
      newEngagementHref: NEW_ENG,
      nextBestAction: {
        label: "Open Field Briefing",
        detail: "x",
        href: "/providers/p1?tab=briefing",
      },
    });

    expect(actions[0]?.label).toBe(PROVIDER_OVERVIEW_WORKFLOW_CTA.startFirstEngagement);
    expect(actions[0]?.href).toBe(NEW_ENG);
    expect(actions.some((a) => isFieldBriefingLabel(a.label))).toBe(false);
  });

  it("filters briefing from next-best secondary when no engagements exist", () => {
    const actions = deriveProviderOverviewWorkflowActions({
      engagements: [],
      workflow: null,
      newEngagementHref: NEW_ENG,
      nextBestAction: {
        label: "Schedule intro call",
        detail: "x",
        href: "/intro",
      },
    });

    expect(actions[0]?.label).toBe(PROVIDER_OVERVIEW_WORKFLOW_CTA.startFirstEngagement);
    expect(actions[1]?.label).toBe("Schedule intro call");
    expect(actions.some((a) => a.label === PROVIDER_FIELD_OPS_CTA.logFieldIntel)).toBe(false);
  });

  it("resolves briefing href only from engagement prepare flow", () => {
    expect(
      resolveFieldBriefingHref({
        engagements: [],
        workflow: null,
      }),
    ).toBeNull();

    expect(
      resolveFieldBriefingHref({
        engagements: [
          {
            id: "e1",
            title: "Intro",
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
        workflow: null,
      }),
    ).toContain("/engagements/e1/prepare");
  });

  it("shows field briefing and record outcome when workflow is run_touch with prepared engagement", () => {
    const actions = deriveProviderOverviewWorkflowActions({
      engagements: [
        {
          id: "e1",
          title: "Intro",
          engagement_type: "intro_call",
          engagement_type_label: "Intro call",
          status: "planned",
          status_label: "Planned",
          scheduled_at: new Date().toISOString(),
          engagement_date: null,
          is_meeting_prepared: true,
          pre_call_filled: 3,
          pre_call_total: 3,
          pre_call_complete: true,
          outcome_label: null,
          updated_at: new Date().toISOString(),
        },
      ],
      workflow: {
        phase: "run_touch",
        headline: "Intro upcoming",
        detail: null,
        ctaLabel: "Open Field Briefing",
        ctaHref: "/engagements/e1/prepare",
        engagementId: "e1",
        engagementTypeLabel: "Intro call",
      },
      newEngagementHref: NEW_ENG,
      nextBestAction: { label: "Schedule intro call", detail: "x", href: NEW_ENG },
    });

    expect(actions[0]?.label).toMatch(/field briefing/i);
    expect(actions[0]?.href).toContain("/engagements/e1/prepare");
    expect(actions.some((action) => action.label === "Debrief")).toBe(true);
  });

  it("adds briefing and outcome for planned or_visit in prepare phase", () => {
    const actions = deriveProviderOverviewWorkflowActions({
      engagements: [
        {
          id: "e-or",
          title: "OR visit",
          engagement_type: "or_visit",
          engagement_type_label: "OR visit",
          status: "planned",
          status_label: "Planned",
          scheduled_at: new Date().toISOString(),
          engagement_date: null,
          pre_call_filled: 0,
          pre_call_total: 2,
          pre_call_complete: false,
          briefing_status: "not_started",
          briefing_status_label: "Not started",
          planning_status: "not_started",
          planning_status_label: "Not started",
          outcome_label: "",
          updated_at: new Date().toISOString(),
        },
      ],
      workflow: {
        phase: "prepare",
        headline: "OR visit upcoming",
        detail: null,
        ctaLabel: "Continue Prep",
        ctaHref: "/engagements/e-or/prepare",
        engagementId: "e-or",
        engagementTypeLabel: "OR visit",
      },
      newEngagementHref: NEW_ENG,
      nextBestAction: { label: "Schedule intro call", detail: "x", href: NEW_ENG },
    });

    expect(actions.some((action) => action.href?.includes("/engagements/e-or/prepare"))).toBe(true);
    expect(actions.some((action) => action.href?.includes("/engagements/e-or/debrief"))).toBe(true);
  });
});
