import { describe, expect, it } from "vitest";
import { buildObservationMissionIntelligenceCards } from "./buildObservationMissionIntelligenceCards";

describe("buildObservationMissionIntelligenceCards", () => {
  it("builds canonical watch target cards with provider intel enrichment", () => {
    const cards = buildObservationMissionIntelligenceCards({
      caseRow: {
        observation_validation_targets: [
          {
            id: "watch-1",
            label: "Competitor presence",
            source: "chip",
            status: "planned",
            created_at: "2026-05-01T00:00:00.000Z",
          },
        ],
      },
      watchSignals: ["Current products used", "Workflow bottlenecks", "Staff frustrations"],
      learningQuestions: ["What products are being used?"],
      opportunityHypotheses: ["Product fit opportunity if clinical pain validates portfolio alignment."],
      providerContact: {
        provider_competitive_products: "Legacy mesh tray",
        provider_workflow_pain_points: "Fixation inconsistency between cases",
      },
    });

    expect(cards.watchTargets.map((card) => card.title)).toEqual(
      expect.arrayContaining([
        "Pain points to watch",
        "Current product usage",
        "Workflow friction",
        "Staff behavior",
        "Competitor presence",
      ]),
    );

    const competitor = cards.watchTargets.find((card) => card.title === "Competitor presence");
    expect(competitor?.status).toBe("watch");
    expect(competitor?.confidence).toBe("partial");
    expect(competitor?.detail).toMatch(/legacy mesh tray/i);

    const workflow = cards.watchTargets.find((card) => card.title === "Workflow friction");
    expect(workflow?.detail).toMatch(/fixation inconsistency/i);

    expect(cards.learningGaps).toHaveLength(1);
    expect(cards.learningGaps[0]?.status).toBe("validate");
    expect(cards.opportunities[0]?.status).toBe("hypothesis");
  });

  it("marks observed validation targets as confirmed with strong confidence", () => {
    const cards = buildObservationMissionIntelligenceCards({
      caseRow: {
        observation_validation_targets: [
          {
            id: "watch-2",
            label: "Staff workflow friction",
            source: "provider_signal",
            status: "observed",
            created_at: "2026-05-01T00:00:00.000Z",
          },
        ],
      },
      watchSignals: [],
      learningQuestions: [],
      opportunityHypotheses: [],
    });

    const staff = cards.watchTargets.find((card) => card.title === "Staff behavior");
    expect(staff?.status).toBe("confirmed");
    expect(staff?.confidence).toBe("strong");
    expect(staff?.sourceLabel).toBe("Provider intel");
  });
});
