import { describe, expect, it } from "vitest";
import { buildObservationFocusGuidance } from "./buildObservationFocusGuidance";

describe("buildObservationFocusGuidance", () => {
  it("surfaces competitor focus from provider commercial intelligence", () => {
    const guidance = buildObservationFocusGuidance({
      caseRow: {},
      providerContact: {
        provider_competitive_products: "Uses Competitor X as primary energy device",
      },
    });

    expect(guidance.some((item) => item.label === "Competitor products used")).toBe(true);
  });

  it("surfaces workflow focus from prior observation cases", () => {
    const guidance = buildObservationFocusGuidance({
      caseRow: {},
      priorCases: [{ live_observation_workflow: "Long room turnover delays" }],
    });

    expect(guidance.some((item) => item.label === "Workflow bottlenecks")).toBe(true);
  });

  it("falls back to standard guidance when no intelligence exists", () => {
    const guidance = buildObservationFocusGuidance({ caseRow: {} });
    expect(guidance.length).toBeGreaterThanOrEqual(3);
    expect(guidance.every((item) => typeof item.label === "string")).toBe(true);
  });
});
