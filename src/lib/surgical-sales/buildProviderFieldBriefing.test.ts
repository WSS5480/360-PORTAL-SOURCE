import { describe, expect, it } from "vitest";

import {
  buildProviderFieldBriefing,
  PROVIDER_FIELD_BRIEFING_SECTION,
  PROVIDER_FIELD_OPS_CTA,
} from "./buildProviderFieldBriefing";
import {
  fieldBriefingObjectiveForTouch,
  resolveFieldBriefingTouchContext,
} from "./providerFieldBriefingTouch";

const BANNED_BRIEFING_RE =
  /deal velocity|economic buyer|commercial influence|maturity score|deployment readiness|not yet viable/i;

function draftTouch() {
  const ctx = resolveFieldBriefingTouchContext({
    engagements: [],
    touchParam: "intro_call",
    providerId: "p1",
  });
  if (ctx.status !== "ready") throw new Error("expected ready");
  return ctx.touch;
}

function briefingText(briefing: ReturnType<typeof buildProviderFieldBriefing>): string {
  return JSON.stringify(briefing);
}

describe("buildProviderFieldBriefing", () => {
  it("assembles a tactical prep sheet without CRM or intelligence-dashboard copy", () => {
    const activeTouch = draftTouch();
    const briefing = buildProviderFieldBriefing({
      contact: {
        provider_procedure_focus: "hernia repair",
        provider_observation_feasibility: "restricted",
        provider_observation_access_path: "committee|credentialing gates",
        influence_level: "high",
        provider_decision_maker_status: "decision_maker",
      },
      planning: {
        status: "in_progress",
        sections: [],
      },
      providerName: "Stan Lee",
      facilityName: "Test Hospital",
      intelligenceHref: "/providers/p1?tab=intelligence",
      newEngagementHref: "/engagements/new?provider_id=p1",
      providerId: "p1",
      activeTouch,
    });

    expect(briefing.touch.isDraft).toBe(true);
    expect(briefing.meetingObjective.providerName).toBe("Stan Lee");
    expect(briefing.meetingObjective.objective).toBe(
      fieldBriefingObjectiveForTouch("intro_call"),
    );
    expect(briefing.meetingObjective.touchContext).toMatch(/draft prep/i);
    expect(briefing.priorityAsks.length).toBeGreaterThan(0);
    expect(briefing.priorityAsks.some((a) => a.id.includes("credentialing"))).toBe(false);
    expect(briefing.successCriteria).toContain("One workflow insight you can repeat back");
    expect(briefingText(briefing)).not.toMatch(BANNED_BRIEFING_RE);
    expect("accountSnapshot" in briefing).toBe(false);
    expect("maturityLabel" in briefing).toBe(false);
    expect(PROVIDER_FIELD_OPS_CTA.logFieldUpdate).toMatch(/log field update/i);
  });

  it("uses touch-specific avoid and learn chips for restricted access", () => {
    const activeTouch = draftTouch();
    const briefing = buildProviderFieldBriefing({
      contact: {
        provider_observation_feasibility: "restricted",
        provider_observation_access_path: "committee|rep_limit",
      },
      intelligenceHref: "/providers/p1?tab=intelligence",
      newEngagementHref: "/engagements/new?provider_id=p1",
      providerId: "p1",
      activeTouch,
    });

    expect(briefing.tacticalWarnings.some((l) => /credentialing|economic buyer/i.test(l))).toBe(
      true,
    );
    expect(briefing.tacticalWarnings.some((l) => /^risk:/i.test(l))).toBe(false);
    const askIds = new Set(briefing.priorityAsks.map((a) => a.id));
    expect(briefing.criticalUnknowns.every((c) => !askIds.has(c.id))).toBe(true);
  });

  it("does not route log field update to new engagement when a touch is scheduled", () => {
    const ctx = resolveFieldBriefingTouchContext({
      engagements: [
        {
          id: "e1",
          engagement_type: "intro_call",
          engagement_type_label: "Intro call",
          status: "planned",
          scheduled_at: "2026-06-01T14:00:00Z",
          pre_call_filled: 0,
          pre_call_total: 5,
          pre_call_complete: false,
          outcome_label: "",
        },
      ],
      providerId: "p1",
    });
    if (ctx.status !== "ready") throw new Error("expected ready");
    const briefing = buildProviderFieldBriefing({
      contact: {},
      intelligenceHref: "/portal/sales/providers/p1?tab=intelligence",
      newEngagementHref: "/portal/sales/engagements/new?provider_id=p1",
      providerId: "p1",
      activeTouch: ctx.touch,
    });
    expect(ctx.touch.isDraft).toBe(false);
    expect(briefing.footer.logFieldUpdateHref).toBeNull();
  });

  it("exposes field-prep section labels for the six prep questions", () => {
    expect(PROVIDER_FIELD_BRIEFING_SECTION.objective).toBe("Objective");
    expect(PROVIDER_FIELD_BRIEFING_SECTION.askThese).toBe("Ask these");
    expect(PROVIDER_FIELD_BRIEFING_SECTION.avoid).toBe("Avoid");
    expect(PROVIDER_FIELD_BRIEFING_SECTION.useThisTouchToLearn).toBe("Use this touch to learn");
    expect(PROVIDER_FIELD_BRIEFING_SECTION.goodTouchGetsYou).toBe("A good touch gets you");
    expect(PROVIDER_FIELD_BRIEFING_SECTION.afterTouch).toBe("After the touch");
  });
});
