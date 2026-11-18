import { describe, expect, it } from "vitest";
import {
  buildSalesCalendarEvents,
  mapCaseToCalendarEvent,
  mapEngagementToCalendarEvent,
  mapTaskToCalendarEvent,
  mapTimeOffToCalendarEvent,
} from "@/lib/surgical-sales/calendar/salesCalendarAdapters";
import { eventOccursOnYmd } from "@/lib/surgical-sales/calendar/salesCalendarDateUtils";
import { filterSalesCalendarEvents } from "@/lib/surgical-sales/calendar/salesCalendarFilters";
import { DEFAULT_SALES_CALENDAR_FILTERS } from "@/lib/surgical-sales/calendar/salesCalendarTypes";

describe("mapEngagementToCalendarEvent", () => {
  it("maps scheduled engagement with provider label", () => {
    const event = mapEngagementToCalendarEvent({
      id: "e1",
      engagement_type: "intro_call",
      engagement_type_label: "Intro Call",
      status: "planned",
      provider_label: "Dr. Smith",
      scheduled_at: "2026-06-10T14:00:00.000Z",
      engagement_date: "2026-06-10",
      pre_call_total: 0,
      pre_call_complete: false,
    });
    expect(event?.title).toBe("Intro Call — Dr. Smith");
    expect(event?.sourceType).toBe("engagement");
    expect(event?.requiresDebrief).toBe(false);
  });

  it("keeps engagement source type when debrief needed", () => {
    const event = mapEngagementToCalendarEvent({
      id: "e2",
      engagement_type: "follow_up",
      status: "completed",
      engagement_date: "2026-06-08",
      notes: "Quick call",
      pre_call_total: 0,
      debrief_completed: false,
    });
    expect(event?.requiresDebrief).toBe(true);
    expect(event?.sourceType).toBe("engagement");
  });

  it("clears debrief flag when debrief_completed is set", () => {
    const event = mapEngagementToCalendarEvent({
      id: "e3",
      engagement_type: "intro_call",
      status: "completed",
      engagement_date: "2026-06-08",
      debrief_completed: true,
      debrief_completed_at: "2026-06-09T10:00:00.000Z",
      pre_call_total: 0,
    });
    expect(event?.requiresDebrief).toBe(false);
    expect(event?.metadata?.debriefCompleted).toBe(true);
  });

  it("keeps engagement source type when prep needed", () => {
    const event = mapEngagementToCalendarEvent({
      id: "e4",
      engagement_type: "product_demo",
      status: "planned",
      engagement_date: "2026-06-12",
      pre_call_total: 4,
      pre_call_complete: false,
    });
    expect(event?.requiresPrep).toBe(true);
    expect(event?.sourceType).toBe("engagement");
  });

  it("shows planned engagements as scheduled until prep is complete", () => {
    const event = mapEngagementToCalendarEvent({
      id: "e5",
      engagement_type: "intro_call",
      engagement_type_label: "Intro Call",
      status: "planned",
      status_label: "Planned",
      engagement_date: "2026-06-12",
      pre_call_total: 4,
      pre_call_complete: false,
    });
    expect(event?.requiresPrep).toBe(true);
    expect(event?.status).toBe("Scheduled");
  });

  it("maps observation_request as observation when no prep/debrief", () => {
    const event = mapEngagementToCalendarEvent({
      id: "e6",
      engagement_type: "observation_request",
      status: "planned",
      engagement_date: "2026-06-15",
      organization_label: "Sinai",
      pre_call_total: 0,
    });
    expect(event?.sourceType).toBe("observation");
  });
});

describe("mapCaseToCalendarEvent", () => {
  it("maps observation case", () => {
    const event = mapCaseToCalendarEvent({
      id: "c1",
      case_number: "SC-001",
      case_date: "2026-06-20",
      status: "confirmed",
      case_type: "observation",
      account_name: "Sinai",
      case_implants_on_site: "Yes",
      case_trays_sterilization_status: "Ready",
      case_support_coverage: "Rep on site",
    });
    expect(event?.metadata?.recordType).toBe("observation");
    expect(event?.requiresPrep || event?.sourceType === "observation").toBe(true);
  });

  it("keeps observation source type when debrief needed on case", () => {
    const event = mapCaseToCalendarEvent({
      id: "c2",
      case_number: "SC-002",
      case_date: "2026-06-01",
      status: "completed",
      case_type: "observation",
    });
    expect(event?.requiresDebrief).toBe(true);
    expect(event?.sourceType).toBe("observation");
  });

  it("clears observation debrief flag when a field note has been captured", () => {
    const event = mapCaseToCalendarEvent({
      id: "c3",
      case_number: "SC-003",
      case_date: "2026-06-01",
      status: "completed",
      case_type: "observation",
      note_count: 1,
    });
    expect(event?.requiresDebrief).toBe(false);
    expect(event?.sourceType).toBe("observation");
  });
});

describe("mapTaskToCalendarEvent", () => {
  it("maps open task as follow_up", () => {
    const event = mapTaskToCalendarEvent({
      id: "t1",
      title: "Call Karen for scheduling",
      due_date: "2026-06-18",
    });
    expect(event?.sourceType).toBe("follow_up");
  });
});

describe("filters", () => {
  it("hides debrief events when debrief filter off", () => {
    const events = buildSalesCalendarEvents({
      engagements: [
        {
          id: "e1",
          engagement_type: "intro_call",
          status: "planned",
          engagement_date: "2026-06-10",
          pre_call_total: 0,
        },
        {
          id: "e2",
          engagement_type: "follow_up",
          status: "completed",
          engagement_date: "2026-06-09",
          pre_call_total: 0,
        },
      ],
    });
    const hidingDebriefs = filterSalesCalendarEvents(events, {
      ...DEFAULT_SALES_CALENDAR_FILTERS,
      debriefsNeeded: false,
    });
    expect(hidingDebriefs.some((e) => e.requiresDebrief)).toBe(false);
  });
});

describe("mapTimeOffToCalendarEvent", () => {
  it("maps approved multi-day PTO as all-day span", () => {
    const event = mapTimeOffToCalendarEvent({
      id: "pto1",
      request_type: "pto",
      start_date: "2026-06-10",
      end_date: "2026-06-12",
      status: "approved",
      notes: "Family trip",
    });
    expect(event?.sourceType).toBe("time_off");
    expect(event?.allDay).toBe(true);
    expect(event?.title).toBe("PTO / Vacation");
    expect(eventOccursOnYmd(event!, "2026-06-10")).toBe(true);
    expect(eventOccursOnYmd(event!, "2026-06-11")).toBe(true);
    expect(eventOccursOnYmd(event!, "2026-06-12")).toBe(true);
    expect(eventOccursOnYmd(event!, "2026-06-09")).toBe(false);
  });

  it("skips non-approved requests", () => {
    expect(
      mapTimeOffToCalendarEvent({
        id: "pto2",
        request_type: "sick",
        start_date: "2026-06-10",
        end_date: "2026-06-10",
        status: "pending",
      }),
    ).toBeNull();
  });

  it("can be filtered out with timeOff toggle", () => {
    const events = buildSalesCalendarEvents({
      timeOffRequests: [
        {
          id: "pto3",
          request_type: "personal",
          start_date: "2026-06-15",
          end_date: "2026-06-15",
          status: "approved",
        },
      ],
    });
    const hidden = filterSalesCalendarEvents(events, {
      ...DEFAULT_SALES_CALENDAR_FILTERS,
      timeOff: false,
    });
    expect(hidden).toHaveLength(0);
  });
});
