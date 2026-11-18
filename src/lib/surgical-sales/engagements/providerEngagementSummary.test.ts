import { describe, expect, it } from "vitest";
import {
  formatEngagementPreparationStatus,
  pickNextUpcomingEngagement,
  sortUpcomingEngagements,
  type ProviderEngagementSummary,
} from "./providerEngagementSummary";

function eng(partial: Partial<ProviderEngagementSummary> & Pick<ProviderEngagementSummary, "id">): ProviderEngagementSummary {
  return {
    engagement_type: "intro_call",
    engagement_type_label: "Intro Call",
    status: "planned",
    status_label: "Planned",
    pre_call_filled: 0,
    pre_call_total: 5,
    pre_call_complete: false,
    briefing_status: "not_planned",
    briefing_status_label: "Not Started",
    planning_status: "not_planned",
    planning_status_label: "Not Started",
    outcome_label: "Planned",
    ...partial,
  };
}

describe("pickNextUpcomingEngagement", () => {
  it("returns soonest planned or in-progress engagement", () => {
    const next = pickNextUpcomingEngagement([
      eng({
        id: "later",
        scheduled_at: "2026-06-10T10:00:00Z",
      }),
      eng({
        id: "soon",
        scheduled_at: "2026-05-01T14:00:00Z",
      }),
      eng({ id: "done", status: "completed", status_label: "Completed" }),
    ]);
    expect(next?.id).toBe("soon");
  });

  it("returns null when no upcoming engagements", () => {
    expect(
      pickNextUpcomingEngagement([eng({ id: "x", status: "completed", status_label: "Completed" })]),
    ).toBeNull();
  });
});

describe("formatEngagementPreparationStatus", () => {
  it("shows Ready when meeting is prepared", () => {
    expect(
      formatEngagementPreparationStatus(
        eng({ id: "1", prepared_at: "2026-05-01T12:00:00Z", is_meeting_prepared: true }),
      ),
    ).toBe("Ready");
  });

  it("returns null when preparation has not started", () => {
    expect(
      formatEngagementPreparationStatus(
        eng({
          id: "2",
          pre_call_filled: 2,
          pre_call_total: 5,
          pre_call_complete: false,
          briefing_status: "planning_in_progress",
          briefing_status_label: "Not Started",
        }),
      ),
    ).toBeNull();
  });
});

describe("sortUpcomingEngagements", () => {
  it("excludes completed engagements", () => {
    const sorted = sortUpcomingEngagements([
      eng({ id: "a", status: "completed", status_label: "Completed" }),
      eng({ id: "b", status: "planned", status_label: "Planned" }),
    ]);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].id).toBe("b");
  });
});
