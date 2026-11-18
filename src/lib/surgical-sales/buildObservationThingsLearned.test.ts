import { describe, expect, it } from "vitest";
import { buildObservationThingsLearned } from "./buildObservationThingsLearned";
import { collectObservationThingsLearnedFindingIds } from "./observationThingsLearnedFindings";

describe("buildObservationThingsLearned", () => {
  it("derives concise findings from notes and live observation fields", () => {
    const ids = collectObservationThingsLearnedFindingIds({
      caseRow: { live_observation_product_fit: "Vendor tray on preference card" },
      activities: [{ activity_type: "note", body: "Saw competitor tray in the room" }],
    });

    expect(ids).toContain("competitor_product");
    expect(ids).toContain("current_product");
    expect(buildObservationThingsLearned({
      caseRow: { live_observation_product_fit: "Vendor tray on preference card" },
      activities: [{ activity_type: "note", body: "Saw competitor tray in the room" }],
    })).toEqual([
      "Competitor product observed",
      "Current product observed",
    ]);
  });

  it("maps visualization and staff workflow notes to concise findings", () => {
    const items = buildObservationThingsLearned({
      caseRow: {},
      activities: [
        { activity_type: "note", body: "Visualization was difficult during fixation." },
        { activity_type: "note", body: "OR nurse mentioned a setup delay at turnover." },
      ],
    });

    expect(items).toContain("Visualization challenge observed");
    expect(items).toContain("Staff workflow issue observed");
    expect(items.some((item) => /signal|confidence|validated/i.test(item))).toBe(false);
  });

  it("deduplicates repeated finding types across notes", () => {
    const items = buildObservationThingsLearned({
      caseRow: {},
      activities: [
        { activity_type: "note", body: "Competitor rep in the room." },
        { activity_type: "note", body: "Another competitor tray on the field." },
      ],
    });

    expect(items.filter((item) => item === "Competitor product observed")).toHaveLength(1);
  });

  it("starts empty when nothing has been captured", () => {
    expect(buildObservationThingsLearned({ caseRow: {}, activities: [] })).toEqual([]);
  });
});
