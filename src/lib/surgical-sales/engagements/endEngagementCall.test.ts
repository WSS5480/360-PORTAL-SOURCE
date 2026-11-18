import { describe, expect, it } from "vitest";

import { buildEngagementDebriefHref } from "@/lib/surgical-sales/engagements/engagementLifecycle";

describe("endEngagementCall", () => {
  it("builds debrief href for post-end navigation", () => {
    expect(buildEngagementDebriefHref("abc-123")).toBe("/portal/sales/engagements/abc-123/debrief");
  });
});
