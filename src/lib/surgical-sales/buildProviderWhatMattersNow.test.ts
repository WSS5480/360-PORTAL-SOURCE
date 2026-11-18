import { describe, expect, it } from "vitest";
import { buildProviderWhatMattersNow } from "./buildProviderWhatMattersNow";

describe("buildProviderWhatMattersNow", () => {
  it("prioritizes early relationship, intel gap, and next action for prospect", () => {
    const bullets = buildProviderWhatMattersNow({
      providerId: "00000000-0000-4000-8000-000000000001",
      relationshipStage: "prospect",
      newEngagementHref: "/portal/sales/engagements/new?provider_id=1",
      intelligenceHref: "/portal/sales/providers/1?tab=intelligence",
      engagements: [],
      planning: null,
      contact: { provider_relationship_stage: "prospect" },
      cases: [],
      opportunities: [],
    });

    expect(bullets.length).toBeGreaterThanOrEqual(2);
    expect(bullets.length).toBeLessThanOrEqual(5);
    expect(bullets.some((b) => b.text.includes("No established operational relationship"))).toBe(true);
    expect(bullets.some((b) => b.isNextAction && b.actionLabel)).toBe(true);
    expect(bullets[bullets.length - 1].isNextAction).toBe(true);
  });

  it("notes no completed engagements when some exist but none done", () => {
    const bullets = buildProviderWhatMattersNow({
      providerId: "00000000-0000-4000-8000-000000000001",
      relationshipStage: "engagement_active",
      newEngagementHref: "/portal/sales/engagements/new",
      intelligenceHref: "/portal/sales/providers/1?tab=intelligence",
      engagements: [
        {
          id: "e1",
          engagement_type: "intro_call",
          engagement_type_label: "Intro Call",
          status: "planned",
          status_label: "Planned",
          pre_call_filled: 0,
          pre_call_total: 5,
          pre_call_complete: false,
          outcome_label: "",
        },
      ],
      planning: {
        status: "in_progress",
        percent: 50,
        sections: [],
      } as never,
      contact: {},
    });

    expect(bullets.some((b) => b.text.includes("No engagements completed"))).toBe(true);
  });
});
