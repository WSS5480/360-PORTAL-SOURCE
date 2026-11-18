import { describe, expect, it } from "vitest";
import type { CaseIdentity } from "./buildCaseIdentity";
import {
  buildObservationFocusAreas,
  buildObservationMissionBriefLayout,
  normalizeObservationFocusAreaLabel,
} from "./buildObservationMissionBriefLayout";

function mockIdentity(overrides: Partial<CaseIdentity> = {}): CaseIdentity {
  return {
    caseTypeLabel: "Observation Case",
    providerName: "Dr. Smith",
    specialty: null,
    facilityName: "Metro General",
    procedureType: "Abdominal wall reconstruction",
    dateLine: "Jun 4, 2026",
    dateLineWithTime: "Jun 4, 2026 · 7:30 AM",
    statusLabel: "Scheduled",
    openQuestionsCount: null,
    readyForDebrief: false,
    optionalSignals: [],
    internalCaseNumber: null,
    ...overrides,
  };
}

describe("buildObservationMissionBriefLayout", () => {
  it("builds mission header fields from briefing pillars", () => {
    const layout = buildObservationMissionBriefLayout({
      identity: mockIdentity({ procedureType: null }),
      caseRow: { case_type: "observation" },
      providerContact: {
        provider_procedure_focus: "Complex abdominal wall reconstruction",
        provider_competitive_products: "Legacy mesh tray",
      },
    });

    expect(layout.missionObjective).toMatch(/portfolio/i);
    expect(layout.focusAreas.length).toBeGreaterThan(0);
    expect(layout.providerIntelligenceSummary.some((line) => /Procedure focus/i.test(line))).toBe(true);
    expect(layout.learningQuestions.length).toBeGreaterThan(0);
    expect(layout.opportunityHypotheses.length).toBeGreaterThan(0);
    expect(layout.nextSteps.length).toBeGreaterThan(0);
  });

  it("normalizes watch signals into focus area chips", () => {
    expect(normalizeObservationFocusAreaLabel("Workflow bottleneck: Fixation inconsistency")).toBe(
      "Fixation challenges",
    );
    expect(
      buildObservationFocusAreas([
        "Workflow bottlenecks",
        "Clinical frustrations",
        "Competitor products present: Stryker",
      ]),
    ).toEqual(expect.arrayContaining(["Workflow bottlenecks", "Clinical frustrations", "Competitor products"]));
  });
});
