import { describe, expect, it } from "vitest";
import {
  ENGAGEMENT_TIME_TBD_LABEL,
  buildEngagementScheduleFieldsFromBasics,
  formatEngagementTouchWhenLabel,
  formatEngagementWhenLabel,
  formatEngagementWhenLabelFromBasics,
  hasEngagementScheduledTime,
} from "./engagementScheduleDisplay";

describe("engagementScheduleDisplay", () => {
  it("shows Time TBD when only engagement_date is set", () => {
    expect(
      formatEngagementWhenLabel({
        engagement_date: "2026-06-15",
        scheduled_at: null,
      }),
    ).toContain(ENGAGEMENT_TIME_TBD_LABEL);
    expect(hasEngagementScheduledTime({ engagement_date: "2026-06-15" })).toBe(false);
  });

  it("shows time when scheduled_at is set", () => {
    const label = formatEngagementWhenLabel({
      engagement_date: "2026-06-15",
      scheduled_at: "2026-06-15T14:30:00.000Z",
    });
    expect(label).not.toContain(ENGAGEMENT_TIME_TBD_LABEL);
    expect(hasEngagementScheduledTime({ scheduled_at: "2026-06-15T14:30:00.000Z" })).toBe(true);
  });

  it("builds schedule fields from wizard basics without time", () => {
    expect(
      buildEngagementScheduleFieldsFromBasics({
        engagement_date: "2026-06-15",
        engagement_time: "",
      }),
    ).toEqual({ engagement_date: "2026-06-15", scheduled_at: null });
  });

  it("builds scheduled_at when date and time provided", () => {
    const fields = buildEngagementScheduleFieldsFromBasics({
      engagement_date: "2026-06-15",
      engagement_time: "09:30",
    });
    expect(fields.engagement_date).toBe("2026-06-15");
    expect(fields.scheduled_at).toBeTruthy();
  });

  it("formats wizard preview with Time TBD", () => {
    expect(
      formatEngagementWhenLabelFromBasics({
        engagement_date: "2026-06-15",
        engagement_time: "",
      }),
    ).toContain(ENGAGEMENT_TIME_TBD_LABEL);
  });

  it("touch line uses Time TBD instead of midnight parse", () => {
    const touch = formatEngagementTouchWhenLabel({ engagement_date: "2099-06-01" });
    expect(touch).toContain(ENGAGEMENT_TIME_TBD_LABEL);
    expect(touch).not.toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
  });
});
