import { describe, expect, it } from "vitest";
import {
  observationFocusChipsFromCaseRow,
  serializeObservationFocusChips,
  toggleObservationFocusChip,
} from "./observationCaseFocusChips";

describe("observationCaseFocusChips", () => {
  it("reads selected chips from observation_key_questions", () => {
    expect(
      observationFocusChipsFromCaseRow({
        observation_key_questions: "Competitor products\nWorkflow bottlenecks",
      }),
    ).toEqual(["Competitor products", "Workflow bottlenecks"]);
  });

  it("serializes chips in display order", () => {
    expect(
      serializeObservationFocusChips(["Workflow bottlenecks", "Current products used"]),
    ).toBe("Current products used\nWorkflow bottlenecks");
  });

  it("toggles chip selection", () => {
    expect(toggleObservationFocusChip(["Provider frustrations"], "Staff frustrations")).toEqual([
      "Provider frustrations",
      "Staff frustrations",
    ]);
    expect(toggleObservationFocusChip(["Provider frustrations"], "Provider frustrations")).toEqual([]);
  });
});
