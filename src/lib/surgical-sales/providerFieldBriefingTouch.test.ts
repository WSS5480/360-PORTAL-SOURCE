import { describe, expect, it } from "vitest";
import { PROVIDER_FIELD_BRIEFING_SECTION } from "./buildProviderFieldBriefing";
import {
  FIELD_BRIEFING_TOUCH_OPTIONS,
  fieldBriefingAvoidForTouch,
  fieldBriefingObjectiveForTouch,
  fieldBriefingTouchSuccessOutcomes,
  resolveFieldBriefingTouchContext,
} from "./providerFieldBriefingTouch";

describe("resolveFieldBriefingTouchContext", () => {
  const upcoming = {
    id: "e1",
    engagement_type: "intro_call",
    engagement_type_label: "Intro call",
    status: "planned",
    scheduled_at: "2026-06-01T14:00:00Z",
    pre_call_filled: 0,
    pre_call_total: 5,
    pre_call_complete: false,
    outcome_label: "",
  };

  it("uses upcoming engagement when present", () => {
    const ctx = resolveFieldBriefingTouchContext({
      engagements: [upcoming],
      providerId: "p1",
    });
    expect(ctx.status).toBe("ready");
    if (ctx.status === "ready") {
      expect(ctx.touch.kind).toBe("engagement");
      expect(ctx.touch.engagementId).toBe("e1");
      expect(ctx.touch.isDraft).toBe(false);
      expect(ctx.touch.prepareHref).toContain("e1");
    }
  });

  it("returns empty when no engagement and no touch param", () => {
    const ctx = resolveFieldBriefingTouchContext({
      engagements: [],
      providerId: "p1",
    });
    expect(ctx.status).toBe("empty");
  });

  it("returns draft briefing for touch param without upcoming", () => {
    const ctx = resolveFieldBriefingTouchContext({
      engagements: [],
      touchParam: "intro_call",
      providerId: "p1",
    });
    expect(ctx.status).toBe("ready");
    if (ctx.status === "ready") {
      expect(ctx.touch.isDraft).toBe(true);
      expect(ctx.touch.touchLabel).toBe("Intro call");
      expect(ctx.touch.createEngagementHref).toContain("intro_call");
    }
  });

  it("maps setup touch options to selectable engagement types", () => {
    expect(FIELD_BRIEFING_TOUCH_OPTIONS).toHaveLength(1);
    expect(FIELD_BRIEFING_TOUCH_OPTIONS.map((o) => o.engagementType)).toEqual(["intro_call"]);
  });
});

describe("fieldBriefingObjectiveForTouch", () => {
  it("returns touch-only objectives without discovery priority bleed", () => {
    const intro = fieldBriefingObjectiveForTouch("intro_call");
    expect(intro).toMatch(/workflow friction/i);
    expect(intro).not.toMatch(/economic buyer|deal velocity/i);
  });
});

describe("fieldBriefingAvoidForTouch", () => {
  it("blocks economic-buyer framing on intro call", () => {
    const lines = fieldBriefingAvoidForTouch("intro_call", null);
    expect(lines.some((l) => /economic-buyer/i.test(l))).toBe(true);
    expect(lines.some((l) => /credentialing/i.test(l))).toBe(true);
  });
});

describe("fieldBriefingTouchSuccessOutcomes", () => {
  it("uses concrete touch outcomes, not CRM abstractions", () => {
    const intro = fieldBriefingTouchSuccessOutcomes("intro_call");
    expect(intro).toContain("One workflow insight you can repeat back");
    expect(intro).toContain("One next contact or coordinator name");
    expect(intro.some((l) => /deal velocity|economic buyer|commercial influence/i.test(l))).toBe(
      false,
    );

    const office = fieldBriefingTouchSuccessOutcomes("office_visit_360");
    expect(office).toContain("Scheduling owner identified");
    expect(office).toContain("Credentialing or clearance path understood");

    const obs = fieldBriefingTouchSuccessOutcomes("observation_request");
    expect(obs).toContain("Observation feasibility confirmed");
    expect(obs).toContain("Timing or scheduling path clarified");
  });

  it("uses field prep section label for success outcomes", () => {
    expect(PROVIDER_FIELD_BRIEFING_SECTION.goodTouchGetsYou).toBe("A good touch gets you");
  });
});
