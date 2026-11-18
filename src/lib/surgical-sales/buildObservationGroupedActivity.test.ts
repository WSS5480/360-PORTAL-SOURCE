import { describe, expect, it } from "vitest";
import { groupObservationActivities } from "./buildObservationGroupedActivity";

describe("groupObservationActivities", () => {
  it("groups consecutive case_updated events into one row", () => {
    const items = groupObservationActivities(
      [
        { id: "1", activity_type: "case_updated", body: "", created_at: "2026-05-29T14:23:00Z" },
        { id: "2", activity_type: "case_updated", body: "", created_at: "2026-05-29T14:22:00Z" },
        { id: "3", activity_type: "case_updated", body: "", created_at: "2026-05-29T14:21:00Z" },
        { id: "4", activity_type: "note", body: "Spoke with scheduler", created_at: "2026-05-29T13:00:00Z" },
      ],
      "Rep",
      3,
    );

    expect(items).toHaveLength(2);
    expect(items[0].label).toBe("Case details updated 3 times");
    expect(items[0].count).toBe(3);
    expect(items[1].label).toBe("Note");
    expect(items[1].preview).toContain("Spoke with scheduler");
  });

  it("groups non-consecutive case_updated events into one row", () => {
    const items = groupObservationActivities(
      [
        { id: "1", activity_type: "case_updated", body: "", created_at: "2026-05-29T14:23:00Z" },
        { id: "2", activity_type: "note", body: "Spoke with scheduler", created_at: "2026-05-29T13:00:00Z" },
        { id: "3", activity_type: "case_updated", body: "", created_at: "2026-05-29T12:00:00Z" },
      ],
      "Rep",
      3,
    );

    expect(items).toHaveLength(2);
    expect(items[0].label).toBe("Case details updated 2 times");
    expect(items[0].count).toBe(2);
    expect(items[1].label).toBe("Note");
  });
});
