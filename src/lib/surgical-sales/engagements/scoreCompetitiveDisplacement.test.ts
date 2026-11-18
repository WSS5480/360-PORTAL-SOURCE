import { describe, expect, it } from "vitest";
import { buildDebriefCommercialSynthesis } from "./buildDebriefCommercialSynthesis";
import { buildProviderDebriefPlan } from "./buildProviderDebriefPlan";
import { scoreCompetitiveDisplacementSignals } from "./scoreCompetitiveDisplacement";
import {
  JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
  JOHN_APPLE_CURRENT_ACTIVITIES,
  JOHN_APPLE_CURRENT_CASE,
  JOHN_APPLE_OBSERVATION_NOTES,
  JOHN_APPLE_PRIOR_COMPLETED_CASES,
  JOHN_APPLE_PROVIDER_CONTACT,
} from "./johnAppleCommercialReadiness.fixture";

describe("scoreCompetitiveDisplacementSignals", () => {
  it("scores low displacement when incumbent is present without dissatisfaction", () => {
    const plan = buildProviderDebriefPlan({
      caseRow: JOHN_APPLE_CURRENT_CASE,
      activities: JOHN_APPLE_CURRENT_ACTIVITIES,
      providerName: "John Apple",
      priorObservationCases: JOHN_APPLE_PRIOR_COMPLETED_CASES,
      providerContact: JOHN_APPLE_PROVIDER_CONTACT,
    });

    const synthesis = buildDebriefCommercialSynthesis({
      plan,
      providerName: "John Apple",
      organizationName: null,
      completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
      pathwayStageLabel: "Debrief",
      observationNotes: JOHN_APPLE_OBSERVATION_NOTES,
      productKnowledge: [],
    });

    const signals = scoreCompetitiveDisplacementSignals({
      synthesis,
      plan,
      observationNotes: JOHN_APPLE_OBSERVATION_NOTES,
    });

    expect(signals.hasIncumbentPresence).toBe(true);
    expect(signals.hasIncumbentDissatisfaction).toBe(false);
    expect(signals.totalScore).toBeGreaterThanOrEqual(24);
    expect(signals.totalScore).toBeLessThanOrEqual(32);
  });

  it("scores higher displacement when incumbent dissatisfaction is explicit", () => {
    const signals = scoreCompetitiveDisplacementSignals({
      synthesis: {
        providerName: "Dr. Test",
        organizationName: null,
        procedureFocus: "Ventral hernia",
        observationMission: null,
        completedObservationCount: 3,
        pathwayStageLabel: "Debrief",
        observationNotes: ["Surgeon frustrated with Bard Mesh tack workflow during closure."],
        findings: [],
        recurringPatterns: [],
        competitorUsage: [
          {
            summary: "Competitive product activity (Bard Mesh) has appeared in 2 observations",
            observationCount: 2,
          },
        ],
        providerHistory: [],
        validationNeeds: [],
        productCandidates: [],
        beliefSummary: null,
        beliefRationale: [],
        hasSubstantiveEvidence: true,
      },
      plan: buildProviderDebriefPlan({
        caseRow: {
          id: "case-test",
          procedure_type: "Ventral hernia",
          live_observation_competitors: "Bard Mesh",
        },
        activities: [
          {
            activity_type: "note",
            body: "Surgeon frustrated with Bard Mesh tack workflow during closure.",
          },
        ],
      }),
      observationNotes: ["Surgeon frustrated with Bard Mesh tack workflow during closure."],
    });

    expect(signals.hasIncumbentDissatisfaction).toBe(true);
    expect(signals.totalScore).toBeGreaterThanOrEqual(45);
  });
});
