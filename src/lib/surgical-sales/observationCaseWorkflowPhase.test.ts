import { describe, expect, it } from "vitest";
import {
  hasObservationNotesCaptured,
  observationCasePhaseShowsPostCaptureSections,
  resolveObservationCaseWorkflowPhase,
} from "./observationCaseWorkflowPhase";

describe("observationCaseWorkflowPhase", () => {
  it("starts in prepare before any notes", () => {
    expect(
      resolveObservationCaseWorkflowPhase({
        activities: [],
        caseRow: {},
      }),
    ).toBe("prepare");
    expect(observationCasePhaseShowsPostCaptureSections("prepare")).toBe(false);
  });

  it("enters observe after a note is saved", () => {
    expect(
      resolveObservationCaseWorkflowPhase({
        activities: [{ activity_type: "note" }],
        caseRow: {},
      }),
    ).toBe("observe");
    expect(observationCasePhaseShowsPostCaptureSections("observe")).toBe(true);
  });

  it("enters debrief when intelligence is extracted", () => {
    expect(
      resolveObservationCaseWorkflowPhase({
        activities: [{ activity_type: "note" }],
        caseRow: { live_observation_product_fit: "Tray A" },
      }),
    ).toBe("debrief");
  });

  it("detects notes from intelligence fields without activity rows", () => {
    expect(
      hasObservationNotesCaptured([], {
        live_observation_workflow: "Long turnover",
      }),
    ).toBe(true);
  });
});
