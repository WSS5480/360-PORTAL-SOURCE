import { describe, expect, it } from "vitest";
import {
  progressionStatusLabel,
  requirementStatusLabel,
  resolveExecutionUnlockCopy,
} from "./providerOverviewStatusPresentation";

describe("providerOverviewStatusPresentation", () => {
  it("maps requirement status to readable labels", () => {
    expect(requirementStatusLabel("complete")).toBe("Confirmed");
    expect(requirementStatusLabel("open")).toBe("Awaiting validation");
    expect(requirementStatusLabel("not_started")).toBe("Not started yet");
    expect(requirementStatusLabel("deferred")).toBe("Deferred");
    expect(requirementStatusLabel("prepare_early")).toBe("Can prepare early");
    expect(requirementStatusLabel("pending")).toBe("Pending");
  });

  it("maps progression tone to readable labels", () => {
    expect(progressionStatusLabel("blocked")).toBe("Pending provider response");
  });

  it("returns operational unlock copy for primary actions", () => {
    expect(
      resolveExecutionUnlockCopy({
        primaryActionId: "briefing",
        operationalPhase: "operational_access",
      }),
    ).toBe("Unlocks observation workflow and scheduling access");
  });
});
