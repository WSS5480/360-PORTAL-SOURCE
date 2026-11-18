import { describe, expect, it } from "vitest";
import type { CaseIdentity } from "./buildCaseIdentity";
import { buildObservationMissionBriefing } from "./buildObservationMissionBriefing";
import {
  OBSERVATION_BRIEFING_DEFAULT_OBJECTIVE_BASE,
  OBSERVATION_BRIEFING_GENERIC_WATCH_SIGNALS,
} from "./observationBriefingDefaults";
import { OBSERVATION_MISSION_BRIEFING_SECTION_LABELS } from "./observationCaseDetailVocabulary";

function mockIdentity(overrides: Partial<CaseIdentity> = {}): CaseIdentity {
  return {
    caseTypeLabel: "Observation Case",
    providerName: "Smith",
    specialty: null,
    facilityName: "Metro General",
    procedureType: "General Surgery",
    dateLine: "Jun 4, 2026",
    dateLineWithTime: "Jun 4, 2026 · 7:30 AM",
    statusLabel: "Scheduled",
    openQuestionsCount: 2,
    readyForDebrief: false,
    optionalSignals: [],
    internalCaseNumber: null,
    ...overrides,
  };
}

describe("buildObservationMissionBriefing", () => {
  it("pre-fills empty briefing sections with mission-plan templates", () => {
    const briefing = buildObservationMissionBriefing({
      identity: mockIdentity({ procedureType: null }),
      caseRow: {
        case_type: "observation",
      },
    });

    expect(briefing.missionLead).toBe(OBSERVATION_BRIEFING_DEFAULT_OBJECTIVE_BASE);
    expect(briefing.pillars).toHaveLength(4);
    expect(briefing.pillars[0]?.status).toBe("prefilled");
    expect(briefing.pillars[1]?.items).toEqual(
      expect.arrayContaining([...OBSERVATION_BRIEFING_GENERIC_WATCH_SIGNALS]),
    );
    expect(briefing.pillars[2]?.items[0]).toMatch(/What products are currently being used/i);
    expect(briefing.pillars[3]?.items[0]).toMatch(/Potential fit opportunity/i);
  });

  it("structures the four mission-plan briefing sections", () => {
    const briefing = buildObservationMissionBriefing({
      identity: mockIdentity(),
      caseRow: {
        case_type: "observation",
        observation_goal: "Assess ACSIS fit during robotic hernia workflow.",
        observation_signals_to_validate: "Workflow bottlenecks\nCompetitor products",
        observation_key_questions: "What products are currently being used?",
        live_observation_product_fit: "ACSIS may improve visualization",
      },
    });

    expect(briefing.missionLead).toMatch(/ACSIS fit/i);
    expect(briefing.pillars.map((pillar) => pillar.question)).toEqual([
      OBSERVATION_MISSION_BRIEFING_SECTION_LABELS.whyHere,
      OBSERVATION_MISSION_BRIEFING_SECTION_LABELS.watchSignals,
      OBSERVATION_MISSION_BRIEFING_SECTION_LABELS.stillToLearn,
      OBSERVATION_MISSION_BRIEFING_SECTION_LABELS.opportunities,
    ]);
    expect(briefing.pillars[2]?.items[0]).toMatch(/products are currently being used/i);
    expect(briefing.pillars[0]?.status).toBe("ready");
    expect(briefing.hasCapturedIntelligence).toBe(true);
  });

  it("personalizes the mission from procedure context", () => {
    const briefing = buildObservationMissionBriefing({
      identity: mockIdentity({ procedureType: "General Surgery" }),
      caseRow: { case_type: "observation" },
    });

    expect(briefing.missionLead).toMatch(/Assess product fit during General Surgery/i);
  });

  it("does not include access-planning content in watch signals", () => {
    const briefing = buildObservationMissionBriefing({
      identity: mockIdentity(),
      caseRow: {
        observation_signals_to_validate: "Scheduling owner\nCurrent products used",
      },
      providerContact: {
        provider_observation_coordinator_contact: "Karen handles scheduling",
      },
    });

    const watchItems = briefing.pillars.find((pillar) => pillar.id === "watch_signals")?.items ?? [];
    expect(watchItems.some((item) => /scheduling owner/i.test(item))).toBe(false);
    expect(watchItems.some((item) => /current products used/i.test(item))).toBe(true);
  });
});
