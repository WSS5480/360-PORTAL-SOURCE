import { describe, expect, it } from "vitest";
import {
  buildEngagementActiveHref,
  buildEngagementCallHref,
  buildEngagementDebriefHref,
  buildEngagementHubHref,
  buildEngagementLifecyclePrimaryHref,
  engagementLifecyclePrimaryCtaLabel,
} from "./engagementLifecycle";

describe("engagementLifecycle", () => {
  it("routes each workflow state to a distinct phase URL", () => {
    expect(buildEngagementLifecyclePrimaryHref("e1", "planned")).toContain("/prepare");
    expect(buildEngagementLifecyclePrimaryHref("e1", "prepared")).toContain("/prepare");
    expect(buildEngagementLifecyclePrimaryHref("e1", "in_progress")).toContain("/active");
    expect(buildEngagementLifecyclePrimaryHref("e1", "completed")).toBe(buildEngagementDebriefHref("e1"));
    expect(buildEngagementLifecyclePrimaryHref("e1", "closed")).toContain("/debrief?mode=review");
  });

  it("uses unified CTA labels", () => {
    expect(engagementLifecyclePrimaryCtaLabel("planned")).toBe("Prepare");
    expect(engagementLifecyclePrimaryCtaLabel("prepared")).toBe("Start Engagement");
    expect(engagementLifecyclePrimaryCtaLabel("in_progress")).toBe("Resume Engagement");
    expect(engagementLifecyclePrimaryCtaLabel("completed")).toBe("Continue Debrief");
    expect(engagementLifecyclePrimaryCtaLabel("closed")).toBe("View Debrief");
  });

  it("builds active and debrief paths", () => {
    expect(buildEngagementActiveHref("abc")).toBe("/portal/sales/engagements/abc/active");
    expect(buildEngagementCallHref("abc")).toBe("/portal/sales/engagements/abc/active");
    expect(buildEngagementDebriefHref("abc", true)).toContain("/debrief?mode=review");
  });
});
