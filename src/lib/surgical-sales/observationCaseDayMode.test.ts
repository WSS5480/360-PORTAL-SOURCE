import { describe, expect, it } from "vitest";
import type { CaseIdentity } from "./buildCaseIdentity";
import {
  appendObservationLiveFieldLine,
  observationLiveFieldCapturePatch,
} from "./observationLiveFieldCapture";
import {
  buildObservationCaseDayModeView,
  buildObservationIntelligenceStillMissing,
  buildObservationLiveCoachingPrompt,
  isObservationCaseDayEligible,
  OBSERVATION_LIVE_COACHING_COPY,
  resolveObservationNextThingToWatchFor,
} from "./observationCaseDayMode";
import { buildObservationMissionBriefLayout } from "./buildObservationMissionBriefLayout";

function mockIdentity(overrides: Partial<CaseIdentity> = {}): CaseIdentity {
  return {
    caseTypeLabel: "Observation Case",
    providerName: "Smith",
    specialty: null,
    facilityName: "Metro General",
    procedureType: "Robotic hernia",
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

describe("isObservationCaseDayEligible", () => {
  it("returns true on case day for scheduled observation cases", () => {
    expect(
      isObservationCaseDayEligible(
        {
          case_type: "observation",
          case_date: "2026-06-04",
          status: "scheduled",
        },
        "2026-06-04",
      ),
    ).toBe(true);
  });

  it("returns false before case day", () => {
    expect(
      isObservationCaseDayEligible(
        {
          case_type: "observation",
          case_date: "2026-06-05",
          status: "scheduled",
        },
        "2026-06-04",
      ),
    ).toBe(false);
  });
});

describe("buildObservationCaseDayModeView", () => {
  it("surfaces signals to watch from the mission briefing", () => {
    const view = buildObservationCaseDayModeView({
      identity: mockIdentity(),
      caseRow: {
        case_type: "observation",
        case_date: "2026-06-04",
        status: "scheduled",
        observation_signals_to_validate: "Workflow fit\nCompetitor tray usage",
      },
      today: "2026-06-04",
    });

    expect(view.eligible).toBe(true);
    expect(view.signalsToWatch.some((signal) => /workflow fit/i.test(signal))).toBe(true);
    expect(view.signalsToWatch.some((signal) => /competitor tray/i.test(signal))).toBe(true);
  });

  it("computes missing intelligence and next watch target from briefing", () => {
    const identity = mockIdentity();
    const caseRow = {
      case_type: "observation",
      case_date: "2026-06-04",
      status: "scheduled",
      observation_signals_to_validate: "Current product utilization\nCompetitor tray usage",
      observation_learning_questions:
        "What products are currently being used?\nWhat frustrates the surgeon during this case?",
    };

    const view = buildObservationCaseDayModeView({
      identity,
      caseRow,
      today: "2026-06-04",
    });

    expect(view.intelligenceStillMissing.some((item) => /product/i.test(item))).toBe(true);
    expect(view.nextThingToWatchFor).toMatch(/product utilization|products are currently/i);
    expect(view.liveCoachingPrompt).toBe(OBSERVATION_LIVE_COACHING_COPY.start);
  });

  it("narrows coaching once live capture starts", () => {
    const identity = mockIdentity();
    const caseRow = {
      case_type: "observation",
      case_date: "2026-06-04",
      status: "scheduled",
      observation_signals_to_validate: "Current product utilization\nCompetitor tray usage",
      live_observation_clinical_pain_points: "Dock delay",
    };

    const view = buildObservationCaseDayModeView({
      identity,
      caseRow,
      today: "2026-06-04",
    });

    expect(view.intelligenceStillMissing.some((item) => /competitor/i.test(item))).toBe(true);
    expect(view.liveCoachingPrompt).toMatch(/competitor|product|on track/i);
  });
});

describe("observation live coaching helpers", () => {
  it("prioritizes the first unresolved watch signal", () => {
    const layout = buildObservationMissionBriefLayout({
      identity: mockIdentity(),
      caseRow: {
        observation_signals_to_validate: "Workflow fit\nCompetitor tray usage",
      },
      procedureLabel: "Robotic hernia",
    });
    const caseRow = { live_observation_workflow: "Turnover delay" };

    const missing = buildObservationIntelligenceStillMissing({ layout, caseRow });
    const next = resolveObservationNextThingToWatchFor({
      layout,
      caseRow,
      intelligenceStillMissing: missing,
    });

    expect(missing.some((item) => /competitor/i.test(item))).toBe(true);
    expect(next).toMatch(/competitor tray/i);
  });

  it("returns all-briefed coaching when nothing is missing", () => {
    const layout = buildObservationMissionBriefLayout({
      identity: mockIdentity(),
      caseRow: {
        observation_signals_to_validate: "Current product utilization",
      },
      procedureLabel: "Robotic hernia",
    });
    const caseRow = {
      live_observation_product_fit: "Portfolio mesh tray",
      live_observation_competitors: "Rival vendor",
      live_observation_clinical_pain_points: "Dock delay",
      live_observation_workflow: "Turnover delay",
    };

    const missing = buildObservationIntelligenceStillMissing({ layout, caseRow });
    const coaching = buildObservationLiveCoachingPrompt({
      caseRow,
      intelligenceStillMissing: missing,
      nextThingToWatchFor: null,
    });

    expect(missing).toHaveLength(0);
    expect(coaching).toBe(OBSERVATION_LIVE_COACHING_COPY.allBriefed);
  });
});

describe("observationLiveFieldCapture", () => {
  it("appends unique lines to multiline live fields", () => {
    expect(appendObservationLiveFieldLine("Fixation delay", "Visualization delay")).toBe(
      "Fixation delay\nVisualization delay",
    );
    expect(appendObservationLiveFieldLine("Fixation delay", "Fixation delay")).toBe("Fixation delay");
  });

  it("builds patch payloads for quick capture", () => {
    expect(
      observationLiveFieldCapturePatch(
        "live_observation_clinical_pain_points",
        "Dock delay",
        { live_observation_clinical_pain_points: "Setup friction" },
      ),
    ).toEqual({
      live_observation_clinical_pain_points: "Setup friction\nDock delay",
    });
  });
});
