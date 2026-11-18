import { describe, expect, it } from "vitest";
import {
  isIntroCallCompleted,
  isIntroCallScheduled,
} from "./discoveryIntroCallActivity";

describe("discoveryIntroCallActivity", () => {
  it("detects scheduled intro call from upcoming engagement type", () => {
    expect(isIntroCallScheduled({ upcomingEngagementType: "intro_call" })).toBe(true);
    expect(isIntroCallScheduled({ upcomingEngagementType: "or_visit" })).toBe(false);
  });

  it("detects completed intro call from engagement history or last contact", () => {
    expect(
      isIntroCallCompleted({
        engagements: [{ id: "e1", engagement_type: "intro_call", status: "completed" }],
      }),
    ).toBe(true);
    expect(isIntroCallCompleted({ lastContactedAt: "2026-05-01T12:00:00.000Z" })).toBe(true);
    expect(isIntroCallCompleted({})).toBe(false);
  });
});
