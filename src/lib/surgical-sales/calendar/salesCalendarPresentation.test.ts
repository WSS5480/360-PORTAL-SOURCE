import { describe, expect, it } from "vitest";
import {
  buildCalendarEventChips,
  calendarEventTypeLabel,
} from "./salesCalendarPresentation";
import type { SalesCalendarEvent } from "./salesCalendarTypes";

function engagementEvent(overrides: Partial<SalesCalendarEvent> = {}): SalesCalendarEvent {
  return {
    id: "engagement:e1",
    sourceType: "engagement",
    sourceId: "e1",
    title: "Intro Call — John Smith",
    start: "2026-06-10T14:00:00.000Z",
    end: "2026-06-10T15:00:00.000Z",
    allDay: false,
    status: "in_progress",
    priority: "high",
    providerName: "John Smith",
    organizationName: "Test Hospital",
    requiresDebrief: true,
    metadata: {
      recordType: "engagement",
      engagementType: "intro_call",
      href: "/portal/sales/engagements/e1",
      prepareHref: "/portal/sales/engagements/e1/prepare",
    },
    ...overrides,
  };
}

describe("buildCalendarEventChips", () => {
  it("shows intro call type and one debrief needed chip", () => {
    const chips = buildCalendarEventChips(engagementEvent(), { includeStatus: true });
    expect(chips.map((c) => c.label)).toEqual([
      "Intro Call",
      "Debrief needed",
      "in_progress",
    ]);
  });

  it("does not duplicate debrief when legacy sourceType is debrief", () => {
    const chips = buildCalendarEventChips(
      engagementEvent({ sourceType: "debrief" }),
      { includeStatus: true },
    );
    const debriefLabels = chips.filter((c) => /debrief/i.test(c.label));
    expect(debriefLabels).toHaveLength(1);
    expect(debriefLabels[0]?.label).toBe("Debrief needed");
    expect(calendarEventTypeLabel(engagementEvent({ sourceType: "debrief" }))).toBe("Intro Call");
  });
});
