import { describe, expect, it } from "vitest";
import { buildObservationTimeline, formatObservationTimelineTime } from "./buildObservationTimeline";

describe("buildObservationTimeline", () => {
  it("returns chronological note entries only", () => {
    const timeline = buildObservationTimeline([
      {
        id: "2",
        activity_type: "note",
        body: "Robotic hernia focus.",
        created_at: "2026-05-29T13:51:00.000Z",
      },
      {
        id: "1",
        activity_type: "note",
        body: "Karen coordinates scheduling.",
        created_at: "2026-05-29T13:42:00.000Z",
        metadata_json: {
          ai_extraction: {
            entities: [
              {
                type: "scheduling_contact",
                label: "Scheduling Contact",
                value: "Karen",
                category: "Workflow",
                confidence: "High",
              },
            ],
            primaryCategory: "Workflow",
            extractedAt: "2026-05-29T13:42:01.000Z",
            model: "rules",
          },
        },
      },
      {
        id: "3",
        activity_type: "status_change",
        body: "",
        created_at: "2026-05-29T14:00:00.000Z",
      },
    ]);

    expect(timeline.map((entry) => entry.text)).toEqual([
      "Karen coordinates scheduling.",
      "Robotic hernia focus.",
    ]);
    expect(timeline[0]?.extraction?.[0]).toMatchObject({
      label: "Scheduling Contact",
      value: "Karen",
      category: "Workflow",
      confidence: "High",
    });
    expect(timeline[0]?.primaryCategory).toBe("Workflow");
    expect(timeline[1]?.extraction).toBeNull();
  });

  it("formats timeline clock labels", () => {
    const label = formatObservationTimelineTime("2026-05-29T14:02:00.000Z");
    expect(label).toMatch(/\d/);
  });
});
