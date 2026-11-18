import { describe, expect, it } from "vitest";
import { buildObservationAccessSummary } from "./observationBriefingScope";
import { buildObservationBriefingEffectiveContent } from "./observationBriefingDefaults";

describe("buildObservationAccessSummary", () => {
  it("surfaces access-planning fields separately from mission briefing", () => {
    const summary = buildObservationAccessSummary({
      caseRow: {
        case_date: "2026-06-04",
        case_time: "07:30",
        observation_access_scheduling_owner: "OR coordinator",
        observation_access_pathway: "Approved via OR leadership",
        observation_access_credentialing: "in_progress",
      },
      providerContact: {},
    });

    expect(summary.some((item) => item.label === "Observation date")).toBe(true);
    expect(summary.some((item) => item.value === "OR coordinator")).toBe(true);
    expect(summary.some((item) => item.value === "Approved via OR leadership")).toBe(true);
  });
});

describe("observation mission briefing scope", () => {
  it("excludes access-planning signals from watch list defaults", () => {
    const effective = buildObservationBriefingEffectiveContent({
      caseRow: { case_type: "observation" },
      providerContact: {
        provider_workflow_pain_points: "Visualization delay during closure",
        provider_observation_coordinator_contact: "",
      },
    });

    expect(effective.watchSignals.some((item) => /Current products used/i.test(item))).toBe(true);
    expect(effective.watchSignals.some((item) => /scheduling owner unknown/i.test(item))).toBe(false);
    expect(effective.watchSignals.some((item) => /vendor pathway unclear/i.test(item))).toBe(false);
    expect(effective.watchSignals.some((item) => /observation timing unknown/i.test(item))).toBe(false);
  });

  it("filters saved access-planning lines from watch signals", () => {
    const effective = buildObservationBriefingEffectiveContent({
      caseRow: {
        case_type: "observation",
        observation_signals_to_validate:
          "Scheduling owner unknown\nVisualization challenges\nVendor pathway unclear",
      },
    });

    expect(effective.watchSignals.some((item) => /visualization/i.test(item))).toBe(true);
    expect(effective.watchSignals.some((item) => /scheduling owner/i.test(item))).toBe(false);
    expect(effective.watchSignals.some((item) => /vendor pathway/i.test(item))).toBe(false);
  });
});
