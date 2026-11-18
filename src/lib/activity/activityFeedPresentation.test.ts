import { describe, expect, it } from "vitest";

import {
  activityFeedItemIsDeletable,
  legacyFeedIdToActivityId,
} from "@/lib/activity/activityFeedPresentation";

describe("activityFeedItemIsDeletable", () => {
  it("allows deleting note and ai capture items", () => {
    expect(
      activityFeedItemIsDeletable({
        id: "event-1",
        category: "notes",
        title: "Note added",
        summary: "Quick field note",
        timestamp: "2026-07-09T12:00:00.000Z",
        userLabel: "Rep",
        deletable: true,
      }),
    ).toBe(true);

    expect(
      activityFeedItemIsDeletable({
        id: "event-2",
        category: "ai",
        title: "AI capture",
        summary: "Dictated update",
        timestamp: "2026-07-09T12:00:00.000Z",
        userLabel: "Rep",
        eventType: "AI_INTELLIGENCE_CAPTURED",
        deletable: true,
      }),
    ).toBe(true);
  });

  it("blocks deleting legacy contact notes blob and system workflow rows", () => {
    expect(
      activityFeedItemIsDeletable({
        id: "legacy-contact-notes",
        category: "notes",
        title: "Contact notes",
        summary: "Long notes blob",
        timestamp: "2026-07-09T12:00:00.000Z",
        userLabel: "Rep",
      }),
    ).toBe(false);

    expect(
      activityFeedItemIsDeletable({
        id: "workflow-1",
        category: "workflow",
        title: "Planning updated",
        summary: "Provider planning section completed",
        timestamp: "2026-07-09T12:00:00.000Z",
        userLabel: "Rep",
      }),
    ).toBe(false);
  });
});

describe("legacyFeedIdToActivityId", () => {
  it("extracts uuid from legacy feed ids", () => {
    expect(
      legacyFeedIdToActivityId("provider_activity-550e8400-e29b-41d4-a716-446655440000"),
    ).toBe("550e8400-e29b-41d4-a716-446655440000");
  });
});
