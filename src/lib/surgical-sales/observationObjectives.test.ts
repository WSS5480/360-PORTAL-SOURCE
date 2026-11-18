import { describe, expect, it } from "vitest";
import { appendObservationSignalsLine } from "./observationObjectives";

describe("appendObservationSignalsLine", () => {
  it("appends a new signal line", () => {
    expect(appendObservationSignalsLine("", "Scheduling owner not confirmed")).toBe(
      "Scheduling owner not confirmed",
    );
  });

  it("does not duplicate an existing line", () => {
    const current = "ACSIS interest was discussed\nScheduling owner not confirmed";
    expect(appendObservationSignalsLine(current, "Scheduling owner not confirmed")).toBe(current);
    expect(appendObservationSignalsLine(current, "acsis interest was discussed")).toBe(current);
  });
});
