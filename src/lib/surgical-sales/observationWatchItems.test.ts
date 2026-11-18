import { describe, expect, it } from "vitest";
import {
  addObservationWatchItem,
  formatObservationWatchItemLabel,
  parseObservationWatchItems,
  removeObservationWatchItem,
  setObservationWatchItemStatus,
} from "./observationWatchItems";

describe("observationWatchItems", () => {
  it("parses and updates watch item status", () => {
    const items = parseObservationWatchItems([
      {
        id: "a",
        label: "Workflow fit",
        source: "chip",
        status: "planned",
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ]);

    const observed = setObservationWatchItemStatus(items, "a", "observed");
    expect(observed[0]?.status).toBe("observed");
  });

  it("adds and removes watch items without duplicates", () => {
    const first = addObservationWatchItem([], "Workflow fit", "chip");
    const second = addObservationWatchItem(first, "Workflow fit", "chip");
    const removed = removeObservationWatchItem(second, second[0]!.id);
    expect(second).toHaveLength(1);
    expect(removed).toHaveLength(0);
  });

  it("formats provider signal labels for display", () => {
    expect(formatObservationWatchItemLabel("interest_in_acsis_discussed")).toBe("ACSIS interest was discussed");
    expect(formatObservationWatchItemLabel("observe_a_case_to_validate_fit_strength")).toBe(
      "Observe a case to validate fit",
    );
  });
});
