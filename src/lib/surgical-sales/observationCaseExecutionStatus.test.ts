import { describe, expect, it } from "vitest";
import {
  formatObservationCaseExecutionStatusLabel,
  observationCaseShowsDebriefPlanning,
  resolveObservationCaseExecutionStatus,
} from "./observationCaseExecutionStatus";

describe("resolveObservationCaseExecutionStatus", () => {
  it("returns scheduled for a newly logged case", () => {
    expect(
      resolveObservationCaseExecutionStatus({
        caseRow: { status: "scheduled", case_date: "2026-06-10" },
      }),
    ).toBe("scheduled");
  });

  it("stays scheduled until the rep explicitly starts observation", () => {
    expect(
      resolveObservationCaseExecutionStatus({
        caseRow: { status: "scheduled", case_date: "2026-06-10" },
        activities: [{ activity_type: "note" }],
      }),
    ).toBe("scheduled");
  });

  it("returns in progress when status is confirmed", () => {
    expect(
      resolveObservationCaseExecutionStatus({
        caseRow: { status: "confirmed", case_date: "2026-06-10" },
      }),
    ).toBe("in_progress");
  });

  it("returns completed for completed cases", () => {
    expect(
      resolveObservationCaseExecutionStatus({
        caseRow: { status: "completed" },
      }),
    ).toBe("completed");
  });

  it("returns debrief planned when a provider debrief activity exists", () => {
    expect(
      resolveObservationCaseExecutionStatus({
        caseRow: { status: "completed" },
        activities: [{ activity_type: "provider_debrief_planned" }],
      }),
    ).toBe("debrief_planned");
  });

  it("returns closed for closed cases", () => {
    expect(
      resolveObservationCaseExecutionStatus({
        caseRow: { status: "closed" },
      }),
    ).toBe("closed");
  });

  it("returns rescheduled for rescheduled cases", () => {
    expect(
      resolveObservationCaseExecutionStatus({
        caseRow: { status: "rescheduled" },
      }),
    ).toBe("rescheduled");
  });

  it("returns cancelled for cancelled cases", () => {
    expect(
      resolveObservationCaseExecutionStatus({
        caseRow: { status: "cancelled" },
      }),
    ).toBe("cancelled");
  });
});

describe("formatObservationCaseExecutionStatusLabel", () => {
  it("formats execution status labels for reps", () => {
    expect(formatObservationCaseExecutionStatusLabel("in_progress")).toBe("In Progress");
    expect(formatObservationCaseExecutionStatusLabel("debrief_planned")).toBe("Debrief Planned");
  });
});

describe("observationCaseShowsDebriefPlanning", () => {
  it("shows debrief planning after completion", () => {
    expect(
      observationCaseShowsDebriefPlanning({
        caseRow: { status: "completed" },
      }),
    ).toBe(true);
  });

  it("hides debrief planning before completion", () => {
    expect(
      observationCaseShowsDebriefPlanning({
        caseRow: { status: "scheduled" },
      }),
    ).toBe(false);
  });
});
