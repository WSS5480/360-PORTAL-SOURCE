import { describe, expect, it } from "vitest";
import { buildObservationTakeaways, splitObservationTakeawayPreview } from "./buildObservationTakeaways";

describe("buildObservationTakeaways", () => {
  it("deduplicates and ranks takeaways with preview split", () => {
    const takeaways = buildObservationTakeaways({
      caseRow: { live_observation_competitors: "Competitor X tray" },
      activities: [
        { activity_type: "note", body: "Competitor rep in the room with rival tray." },
        { activity_type: "note", body: "Staff mentioned integrated instrumentation interest." },
        { activity_type: "note", body: "Visualization challenge during exposure." },
        { activity_type: "note", body: "Turnover delay before start." },
        { activity_type: "note", body: "Open to evaluating new vessel sealing technology." },
      ],
    });

    const { preview, hiddenCount } = splitObservationTakeawayPreview(takeaways);
    expect(takeaways.length).toBeGreaterThan(3);
    expect(preview.length).toBeGreaterThan(0);
    expect(preview.length).toBeLessThanOrEqual(5);
    expect(hiddenCount).toBe(Math.max(0, takeaways.length - preview.length));
  });

  it("deduplicates overlapping competitor and product signals from one note", () => {
    const takeaways = buildObservationTakeaways({
      caseRow: {},
      activities: [{ activity_type: "note", body: "Saw competitor tray in the room" }],
    });

    const competitorTakeaways = takeaways.filter((item) => /competitor/i.test(item.text));
    expect(competitorTakeaways).toHaveLength(1);
  });
});
