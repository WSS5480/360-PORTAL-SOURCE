import { describe, expect, it } from "vitest";
import { discoveryIntelligenceRowActionsFlat } from "./discoveryIntelligenceRowActions";

describe("discoveryIntelligenceRowActions observation approval", () => {
  it("does not expose one-click confirm approval actions", () => {
    const actions = discoveryIntelligenceRowActionsFlat({
      signalId: "observation_approval",
      statusLabel: "Unknown",
    });

    expect(actions.map((action) => action.label)).toEqual(["Update observation status"]);
    expect(actions.some((action) => action.apiAction === "mark_observation_approved")).toBe(false);
  });
});
