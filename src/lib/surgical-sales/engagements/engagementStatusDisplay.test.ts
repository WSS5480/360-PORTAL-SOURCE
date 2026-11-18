import { describe, expect, it } from "vitest";

import {
  engagementDetailShowsPreparationStatus,
  formatEngagementDebriefDisplayStatus,
  formatEngagementDisplayStatus,
  formatEngagementDisplayStatusForRow,
  formatEngagementPreparationDisplayStatus,
  isEngagementPreparationApplicable,
  resolveEngagementDebriefDisplayId,
  resolveEngagementPreparationDisplayId,
} from "./engagementStatusDisplay";

describe("engagementStatusDisplay", () => {
  it("formats engagement status with only Planned, In Progress, Completed", () => {
    expect(formatEngagementDisplayStatus("planned")).toBe("Planned");
    expect(formatEngagementDisplayStatus("in_progress")).toBe("Active");
    expect(formatEngagementDisplayStatus("completed")).toBe("Completed");
    expect(formatEngagementDisplayStatus("cancelled")).toBe("Completed");
  });

  it("shows Debrief Needed when the touch is complete but debrief is pending", () => {
    expect(
      formatEngagementDisplayStatus("completed", { needsDebrief: true }),
    ).toBe("Debrief Needed");
    expect(
      formatEngagementDisplayStatusForRow({ status: "completed", notes: null }),
    ).toBe("Debrief Needed");
  });

  it("shows preparation only while the touch is planned", () => {
    expect(isEngagementPreparationApplicable({ status: "planned" })).toBe(true);
    expect(isEngagementPreparationApplicable({ status: "in_progress" })).toBe(false);
    expect(isEngagementPreparationApplicable({ status: "completed" })).toBe(false);
    expect(formatEngagementPreparationDisplayStatus({ status: "completed" })).toBeNull();
    expect(engagementDetailShowsPreparationStatus({ status: "completed" })).toBe(false);
  });

  it("formats preparation as Not Started or Ready only", () => {
    expect(formatEngagementPreparationDisplayStatus({ status: "planned" })).toBe("Not Started");
    expect(
      resolveEngagementPreparationDisplayId({
        pre_call_hospital_name: "General",
        pre_call_surgeon_name: "Smith",
        observation_goal: "Goal",
        pre_observation_impact_opening_statement: "Opening",
        pre_observation_probes: "Q",
        pre_observation_tools_resources: "T",
        pre_observation_value_hypothesis: "V",
        pre_observation_planned_close: "C",
        pre_observation_additional_notes: "Notes",
      }),
    ).toBe("ready");
    expect(formatEngagementPreparationDisplayStatus({ prepared_at: "2026-06-01T12:00:00.000Z" })).toBe(
      "Ready",
    );
  });

  it("formats debrief as Pending or Completed when applicable", () => {
    expect(formatEngagementDebriefDisplayStatus({ status: "planned" })).toBeNull();
    expect(formatEngagementDebriefDisplayStatus({ status: "completed" })).toBe("Pending");
    expect(
      formatEngagementDebriefDisplayStatus({
        status: "completed",
        notes: "--- tactical debrief ---\nMet with team.",
      }),
    ).toBe("Completed");
    expect(resolveEngagementDebriefDisplayId({ status: "in_progress" })).toBeNull();
  });
});
