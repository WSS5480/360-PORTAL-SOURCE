import { describe, expect, it } from "vitest";
import {
  buildObservationDebriefDiscussionTopics,
  observationHasSufficientNotesForDebriefPlanning,
} from "./buildObservationDebriefDiscussionTopics";

describe("buildObservationDebriefDiscussionTopics", () => {
  it("returns no topics before sufficient notes exist", () => {
    expect(observationHasSufficientNotesForDebriefPlanning({ caseRow: {}, activities: [] })).toBe(false);
    expect(buildObservationDebriefDiscussionTopics({ caseRow: {}, activities: [] })).toEqual([]);
  });

  it("builds three to five discussion topics from observation findings", () => {
    const topics = buildObservationDebriefDiscussionTopics({
      caseRow: { live_observation_product_fit: "Vendor tray on preference card" },
      activities: [{ activity_type: "note", body: "Saw competitor tray in the room" }],
    });

    expect(topics.length).toBeGreaterThanOrEqual(3);
    expect(topics.length).toBeLessThanOrEqual(5);
    expect(topics[0]).toMatch(/competitive product/i);
    expect(topics.some((topic) => /signal|readiness|confidence/i.test(topic))).toBe(false);
  });

  it("pads to at least three topics when only one finding exists", () => {
    const topics = buildObservationDebriefDiscussionTopics({
      caseRow: {},
      activities: [{ activity_type: "note", body: "Competitor rep was in the room." }],
    });

    expect(topics.length).toBeGreaterThanOrEqual(3);
    expect(topics.length).toBeLessThanOrEqual(5);
  });
});
