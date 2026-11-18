import { describe, expect, it } from "vitest";
import { ANDY_KAREN_DEBRIEF_REGRESSION_NOTE } from "@/lib/surgical-sales/debriefPartialIntelligenceEnrichment";
import {
  classifyEngagementOutcomeFromDebrief,
  resolveProviderObservationStatusForEngagementOutcome,
} from "@/lib/surgical-sales/engagements/classifyEngagementOutcomeFromDebrief";

describe("classifyEngagementOutcomeFromDebrief", () => {
  it("does not classify positive sentiment as Observation Approved", () => {
    const result = classifyEngagementOutcomeFromDebrief(ANDY_KAREN_DEBRIEF_REGRESSION_NOTE);
    expect(result.outcomeId).toBe("follow_up_needed");
    expect(result.label).toBe("Follow Up Needed");
  });

  it("classifies explicit approval only when clearly stated", () => {
    expect(
      classifyEngagementOutcomeFromDebrief(
        "She approved observation for next month. Call Karen to schedule.",
      ).outcomeId,
    ).toBe("observation_approved");
  });

  it("classifies clear denial", () => {
    expect(
      classifyEngagementOutcomeFromDebrief(
        "They will not allow vendor observation at this facility.",
      ).outcomeId,
    ).toBe("observation_denied");
  });

  it("classifies empty notes as No Meaningful Update", () => {
    expect(classifyEngagementOutcomeFromDebrief("").outcomeId).toBe("no_meaningful_update");
    expect(classifyEngagementOutcomeFromDebrief("ok thanks").outcomeId).toBe("no_meaningful_update");
  });

  it("maps rep-selected Observation Approved to permission_not_yet_confirmed when debrief lacks explicit approval", () => {
    expect(
      resolveProviderObservationStatusForEngagementOutcome({
        outcomeId: "observation_approved",
        debriefText: ANDY_KAREN_DEBRIEF_REGRESSION_NOTE,
      }),
    ).toBe("permission_not_yet_confirmed");
  });

  it("maps rep-selected Observation Approved to permission_confirmed when debrief explicitly approves", () => {
    expect(
      resolveProviderObservationStatusForEngagementOutcome({
        outcomeId: "observation_approved",
        debriefText: "Observation approved — cleared to observe next week.",
      }),
    ).toBe("permission_confirmed");
  });

  it("maps rep-selected Observation Approved to permission_confirmed when no debrief notes were captured", () => {
    expect(
      resolveProviderObservationStatusForEngagementOutcome({
        outcomeId: "observation_approved",
        debriefText: "",
      }),
    ).toBe("permission_confirmed");
  });

  it("maps rep-selected Follow Up Needed even without debrief notes", () => {
    expect(
      resolveProviderObservationStatusForEngagementOutcome({
        outcomeId: "follow_up_needed",
        debriefText: "",
      }),
    ).toBe("permission_not_yet_confirmed");
  });

  it("does not sync provider observation status for No Meaningful Update", () => {
    expect(
      resolveProviderObservationStatusForEngagementOutcome({
        outcomeId: "no_meaningful_update",
        debriefText: "Quick hello, nothing else.",
      }),
    ).toBeNull();
  });
});
