import { describe, expect, it } from "vitest";
import {
  buildDefaultObservationObjective,
  buildObservationBriefingEffectiveContent,
  OBSERVATION_BRIEFING_DEFAULT_OBJECTIVE_BASE,
  OBSERVATION_BRIEFING_GENERIC_WATCH_SIGNALS,
} from "./observationBriefingDefaults";

describe("observationBriefingDefaults", () => {
  it("uses the generic mission when no prior intelligence exists", () => {
    const objective = buildDefaultObservationObjective({
      caseRow: { case_type: "observation" },
    });

    expect(objective.text).toBe(OBSERVATION_BRIEFING_DEFAULT_OBJECTIVE_BASE);
    expect(objective.source).toBe("template");
  });

  it("personalizes the mission from procedure context", () => {
    const objective = buildDefaultObservationObjective({
      caseRow: { case_type: "observation", procedure_type: "General Surgery" },
      procedureLabel: "General Surgery",
    });

    expect(objective.text).toBe("Assess product fit during General Surgery.");
    expect(objective.source).toBe("template");
  });

  it("pre-fills mission-plan sections from templates", () => {
    const effective = buildObservationBriefingEffectiveContent({
      caseRow: { case_type: "observation" },
    });

    expect(effective.whyHere).toBe(OBSERVATION_BRIEFING_DEFAULT_OBJECTIVE_BASE);
    expect(effective.watchSignals).toEqual(expect.arrayContaining([...OBSERVATION_BRIEFING_GENERIC_WATCH_SIGNALS]));
    expect(effective.learningQuestions[0]).toMatch(/What products are currently being used/i);
    expect(effective.opportunityHypotheses[0]).toMatch(/Potential fit opportunity/i);
    expect(effective.sources.watch_signals).toBe("template");
  });

  it("adds product-specific watch signals when product focus exists", () => {
    const effective = buildObservationBriefingEffectiveContent({
      caseRow: { case_type: "observation", product_focus: "ACSIS" },
      engagement: { product_focus: "ACSIS" },
    });

    expect(effective.watchSignals.some((item) => /ACSIS fit signals/i.test(item))).toBe(true);
    expect(
      effective.learningQuestions.some((item) => /What problems would ACSIS need to solve/i.test(item)),
    ).toBe(true);
  });
});
