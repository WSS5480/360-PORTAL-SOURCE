import { describe, expect, it } from "vitest";
import {
  buildProviderEngagementWorkflowAction,
  buildProviderOverviewDebriefRecommendedMove,
  pickActiveWorkflowEngagement,
  pickEngagementNeedingDebrief,
  PROVIDER_OVERVIEW_DEBRIEF_NOW_CTA,
} from "./buildProviderEngagementWorkflowAction";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";

function engagement(
  overrides: Partial<ProviderEngagementSummary> & { id: string; status: string },
): ProviderEngagementSummary {
  return {
    engagement_type: "intro_call",
    engagement_type_label: "Intro call",
    status_label: overrides.status === "in_progress" ? "In progress" : "Planned",
    pre_call_filled: 0,
    pre_call_total: 0,
    pre_call_complete: false,
    outcome_label: "",
    ...overrides,
  };
}

describe("buildProviderEngagementWorkflowAction", () => {
  it("prioritizes in-progress engagement over planned calendar item", () => {
    const picked = pickActiveWorkflowEngagement([
      engagement({
        id: "planned-1",
        status: "planned",
        engagement_date: "2099-06-01",
      }),
      engagement({ id: "active-1", status: "in_progress" }),
    ]);
    expect(picked?.id).toBe("active-1");
  });

  it("returns Field Briefing CTA for in-progress intro call", () => {
    const action = buildProviderEngagementWorkflowAction({
      engagements: [engagement({ id: "e1", status: "in_progress" })],
      briefingHref: "/providers/p1?tab=briefing",
      fallbackAction: {
        label: "Confirm OR scheduling owner",
        href: "/providers/p1?tab=intelligence",
        reason: "Blocker reason",
      },
    });
    expect(action?.phase).toBe("run_touch");
    expect(action?.headline).toMatch(/in progress/i);
    expect(action?.ctaLabel).toBe("Resume Engagement");
    expect(action?.ctaHref).toContain("/active");
    expect(action?.ctaHref).not.toContain("/debrief");
  });

  it("returns prepare CTA for planned engagement needing prep", () => {
    const action = buildProviderEngagementWorkflowAction({
      engagements: [
        engagement({
          id: "e2",
          status: "planned",
          pre_call_total: 5,
          pre_call_filled: 1,
          pre_call_complete: false,
        }),
      ],
      briefingHref: "/providers/p1?tab=briefing",
      fallbackAction: {
        label: "Plan next",
        href: "/engagements/new",
        reason: "No calendar",
      },
    });
    expect(action?.phase).toBe("prepare");
    expect(action?.ctaLabel).toBe("Prepare");
    expect(action?.ctaHref).toContain("/prepare");
  });

  it("returns debrief CTA for completed engagement missing tactical debrief", () => {
    const action = buildProviderEngagementWorkflowAction({
      engagements: [engagement({ id: "e3", status: "completed", notes: "No debrief yet" })],
      briefingHref: "/providers/p1?tab=briefing",
      fallbackAction: {
        label: "Plan next",
        href: "/engagements/new",
        reason: "No calendar",
      },
    });
    expect(action?.phase).toBe("awaiting_debrief");
    expect(action?.ctaHref).toContain("/debrief");
    expect(action?.ctaHref).not.toContain("panel=debrief");
  });

  it("picks completed engagement missing debrief for debrief promotion", () => {
    const needing = pickEngagementNeedingDebrief([
      engagement({ id: "e3", status: "completed", notes: "No debrief yet" }),
    ]);
    expect(needing?.id).toBe("e3");
  });

  it("builds recommended move copy from engagement type label", () => {
    expect(
      buildProviderOverviewDebriefRecommendedMove({ engagementTypeLabel: "Intro call" }),
    ).toBe(
      "Debrief the recent Intro call so intelligence can be mapped while details are fresh.",
    );
  });

  it("uses Debrief now CTA label constant", () => {
    expect(PROVIDER_OVERVIEW_DEBRIEF_NOW_CTA).toBe("Debrief");
  });

  it("does not require debrief after debrief_completed_at is set", () => {
    const completed = engagement({
      id: "e-done",
      status: "completed",
      notes: "Quick notes only",
      debrief_completed_at: "2026-05-27T12:00:00.000Z",
    });
    expect(pickEngagementNeedingDebrief([completed])).toBeNull();
    const action = buildProviderEngagementWorkflowAction({
      engagements: [completed],
      briefingHref: "/providers/p1?tab=briefing",
      fallbackAction: { label: "Plan next", href: "/engagements/new", reason: "No calendar" },
    });
    expect(action?.phase).not.toBe("awaiting_debrief");
  });

  it("does not require debrief when notes include tactical debrief marker", () => {
    const completed = engagement({
      id: "e-done",
      status: "completed",
      notes: "--- tactical debrief ---\n\nWhat happened:\nMet with surgeon.",
    });
    expect(pickEngagementNeedingDebrief([completed])).toBeNull();
  });
});
