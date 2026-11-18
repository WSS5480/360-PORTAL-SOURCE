import { describe, expect, it } from "vitest";
import type { CaseIdentity } from "./buildCaseIdentity";
import {
  buildObservationCaseSidebarView,
  buildObservationIntelligenceSidebarMetrics,
  deriveObservationCaseSidebarAction,
} from "./buildObservationCaseSidebarView";

function mockIdentity(overrides: Partial<CaseIdentity> = {}): CaseIdentity {
  return {
    caseTypeLabel: "Observation Case",
    providerName: "Smith",
    specialty: null,
    facilityName: "Metro General",
    procedureType: null,
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

describe("buildObservationCaseSidebarView", () => {
  it("builds discovery focus, intelligence metrics, and recommended action", () => {
    const view = buildObservationCaseSidebarView({
      identity: mockIdentity({ openQuestionsCount: 2 }),
      caseRow: {
        case_type: "observation",
        case_date: "2026-06-04",
        status: "scheduled",
        observation_goal: "Validate ACSIS fit during robotic hernia workflow.",
        observation_signals_to_validate: "Workflow fit",
        live_observation_clinical_pain_points: "Fixation inconsistency\nVisualization delay",
        live_observation_competitors: "Competitor drill on field",
        live_observation_workflow: "Extra setup steps\nTurnover delay\nDock delay\nTray delay",
        live_observation_product_fit: "ACSIS may improve visualization\nStrong product interest",
      },
      activities: [],
      today: "2026-06-01",
    });

    expect(view.discoveryFocus.map((item) => item.label)).toEqual([
      "Mission",
      "Watch For",
    ]);
    expect(view.discoveryFocus[0]?.completionLabel).toBe("Briefed");
    expect(view.discoveryFocus[0]?.status).toBe("confirmed");
    expect(view.intelligenceMetrics).toEqual([
      expect.objectContaining({
        shortLabel: "Pain Points",
        count: 2,
        status: "identified",
        statusLabel: "2 identified",
      }),
      expect.objectContaining({
        shortLabel: "Competitors",
        count: 1,
        status: "identified",
        statusLabel: "1 identified",
      }),
      expect.objectContaining({
        shortLabel: "Workflow Issues",
        count: 4,
        status: "identified",
        statusLabel: "4 identified",
      }),
      expect.objectContaining({
        shortLabel: "Product Signals",
        count: 2,
        status: "identified",
        statusLabel: "2 identified",
      }),
    ]);
    expect(view.recommendedAction.label).toBe("Perform Observation");
  });
});

describe("deriveObservationCaseSidebarAction", () => {
  const identity = mockIdentity({ readyForDebrief: false });

  it("recommends capture notes when no notes exist on case day", () => {
    const action = deriveObservationCaseSidebarAction({
      identity,
      caseRow: {
        case_type: "observation",
        case_date: "2026-05-29",
        status: "scheduled",
        observation_access_pathway: "Approved",
      },
      activities: [],
      today: "2026-05-29",
    });

    expect(action.label).toBe("Capture Observation Notes");
  });

  it("recommends review intelligence when findings exist", () => {
    const action = deriveObservationCaseSidebarAction({
      identity,
      caseRow: {
        case_type: "observation",
        case_date: "2026-05-29",
        status: "scheduled",
        live_observation_clinical_pain_points: "Fixation inconsistency",
      },
      activities: [{ activity_type: "note" }],
      today: "2026-05-29",
    });

    expect(action.label).toBe("Review Intelligence");
  });

  it("recommends generate debrief only after observation program threshold", () => {
    const action = deriveObservationCaseSidebarAction({
      identity: { ...identity, readyForDebrief: true },
      caseRow: {
        case_type: "observation",
        case_date: "2026-05-28",
        status: "completed",
        observation_goal: "Validate workflow fit",
      },
      activities: [{ activity_type: "note" }],
      today: "2026-05-29",
    });

    expect(action.label).toBe("Prepare Debrief");
  });

  it("recommends review intelligence after completed observation before threshold", () => {
    const action = deriveObservationCaseSidebarAction({
      identity,
      caseRow: {
        case_type: "observation",
        case_date: "2026-05-28",
        status: "completed",
        observation_goal: "Validate workflow fit",
        live_observation_clinical_pain_points: "Fixation inconsistency",
      },
      activities: [{ activity_type: "note" }],
      today: "2026-05-29",
    });

    expect(action.label).toBe("Review Intelligence");
  });
});

describe("buildObservationIntelligenceSidebarMetrics", () => {
  it("returns watch-state copy before observation capture", () => {
    const metrics = buildObservationIntelligenceSidebarMetrics({ caseRow: {} });
    expect(metrics).toEqual([
      expect.objectContaining({
        id: "pain_points",
        count: 0,
        status: "watch",
        statusLabel: "None identified yet",
      }),
      expect.objectContaining({
        id: "competitors",
        count: 0,
        status: "watch",
        statusLabel: "Not observed",
      }),
      expect.objectContaining({
        id: "workflow_issues",
        count: 0,
        status: "watch",
        statusLabel: "Not observed",
      }),
      expect.objectContaining({
        id: "product_signals",
        count: 0,
        status: "watch",
        statusLabel: "Not observed",
      }),
    ]);
  });

  it("returns identified counts after field capture", () => {
    const metrics = buildObservationIntelligenceSidebarMetrics({
      caseRow: {
        live_observation_clinical_pain_points: "Fixation inconsistency\nVisualization delay",
        live_observation_competitors: "Competitor drill",
        live_observation_workflow: "Setup delay\nTurnover delay",
        live_observation_product_fit: "ACSIS fit",
      },
    });

    expect(metrics.map((metric) => metric.statusLabel)).toEqual([
      "2 identified",
      "1 identified",
      "2 identified",
      "1 identified",
    ]);
  });

  it("uses post-capture empty copy when observation ran but category is empty", () => {
    const metrics = buildObservationIntelligenceSidebarMetrics({
      caseRow: { live_observation_competitors: "Competitor drill" },
    });

    expect(metrics.find((metric) => metric.id === "pain_points")).toMatchObject({
      count: 0,
      status: "watch",
      statusLabel: "None identified",
    });
    expect(metrics.find((metric) => metric.id === "competitors")).toMatchObject({
      count: 1,
      status: "identified",
      statusLabel: "1 identified",
    });
  });
});
