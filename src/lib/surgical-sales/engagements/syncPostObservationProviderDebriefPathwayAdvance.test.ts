import { describe, expect, it } from "vitest";
import {
  resolveEvaluationPathFromDebriefNextStep,
  shouldAdvancePathwayFromDebriefNextStep,
} from "./syncPostObservationProviderDebriefPathwayAdvance";
import type { DebriefNextStepSnapshot } from "./debriefCompletionValidationTypes";

describe("syncPostObservationProviderDebriefPathwayAdvance helpers", () => {
  it("maps evaluation recommendation to Product Trial path", () => {
    const nextStep = {
      recommendation: "evaluation",
    } as DebriefNextStepSnapshot;
    expect(resolveEvaluationPathFromDebriefNextStep(nextStep)).toBe("Product Trial");
    expect(shouldAdvancePathwayFromDebriefNextStep(nextStep)).toBe(true);
  });

  it("does not advance for follow up only", () => {
    const nextStep = {
      recommendation: "follow_up",
    } as DebriefNextStepSnapshot;
    expect(shouldAdvancePathwayFromDebriefNextStep(nextStep)).toBe(false);
  });

  it("advances from next step alone when completion context is absent", async () => {
    const nextStep = {
      recommendation: "evaluation",
    } as DebriefNextStepSnapshot;
    expect(shouldAdvancePathwayFromDebriefNextStep(nextStep)).toBe(true);
    expect(resolveEvaluationPathFromDebriefNextStep(nextStep)).toBe("Product Trial");
  });
});
