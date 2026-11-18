import { describe, expect, it } from "vitest";
import {
  accountUnderstandingCaptureHelper,
  accountUnderstandingPrimaryUnknown,
  accountUnderstandingNextMove,
} from "./accountUnderstandingUncertaintyCopy";
import type { IntelligenceLearningGap } from "./providerIntelligenceLearningGaps";

function gap(dbKey: string): IntelligenceLearningGap {
  return {
    dbKey,
    sectionId: "or_environment",
    phrase: "Still open",
    state: "unknown",
    priorityScore: 10,
    bestLearnedFrom: "OR scheduler",
    unlocksNext: "Reliable OR access planning",
    operationalImpact: "Observation access may fail on case day.",
    operationalConsequence: {
      summary: "Observation access may fail on case day.",
      fieldInefficiency: "",
      deploymentRisk: "",
    },
    fieldGuidance: {
      bestSource: "OR scheduler or credentialing office",
      bestInteraction: "Vendor access conversation",
      idealTiming: "Before first case day",
    },
  };
}

describe("accountUnderstandingUncertaintyCopy", () => {
  it("uses one plain sentence for primary unknown", () => {
    expect(accountUnderstandingPrimaryUnknown(gap("provider_credentialing_status"))).toBe(
      "How vendor clearance works here still unclear.",
    );
    expect(accountUnderstandingPrimaryUnknown(gap("provider_observation_coordinator_contact"))).toBe(
      "Who owns OR scheduling still unclear.",
    );
    expect(accountUnderstandingPrimaryUnknown(gap("provider_decision_maker_status"))).toBe(
      "Who approves evaluations still unclear.",
    );
  });

  it("uses operational next move labels", () => {
    expect(accountUnderstandingNextMove(gap("provider_credentialing_status"))).toBe(
      "Validate vendor clearance",
    );
  });

  it("builds contextual capture helper from best source", () => {
    expect(accountUnderstandingCaptureHelper("OR scheduler or coordinator")).toBe(
      "Log what you learned from the scheduler or office.",
    );
  });
});
