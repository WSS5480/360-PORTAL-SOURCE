import { describe, expect, it } from "vitest";
import { buildNewCaseUnresolvedProviderSignals } from "./buildNewCaseUnresolvedProviderSignals";

describe("buildNewCaseUnresolvedProviderSignals", () => {
  it("returns plain-English signals without snake_case or enum keys", () => {
    const signals = buildNewCaseUnresolvedProviderSignals({
      provider_evaluation_openness: "interest_in_acsis_discussed",
      provider_competitive_products: "fit_strength_still_needs_confirmation_in_a_live_case",
      provider_observation_coordinator_contact: "",
      provider_observation_access_path: "",
    });

    expect(signals.length).toBeGreaterThan(0);
    expect(signals.length).toBeLessThanOrEqual(5);
    for (const signal of signals) {
      expect(signal.text).not.toMatch(/interest_in_acsis/);
      expect(signal.text).not.toMatch(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/);
    }
    expect(signals.some((s) => /acsis interest/i.test(s.text))).toBe(true);
  });

  it("includes discovery blockers such as scheduling owner and access pathway", () => {
    const signals = buildNewCaseUnresolvedProviderSignals({});

    expect(signals.length).toBeGreaterThan(0);
    const joined = signals.map((s) => s.text).join(" | ");
    expect(joined).toMatch(/scheduling owner|scheduler/i);
    expect(joined).toMatch(/pathway|access|approval/i);
  });

  it("returns empty when contact is missing", () => {
    expect(buildNewCaseUnresolvedProviderSignals(null)).toEqual([]);
  });
});
