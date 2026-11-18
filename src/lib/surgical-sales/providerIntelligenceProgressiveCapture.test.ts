import { describe, expect, it } from "vitest";
import {
  buildGuidedDiscoverySessionSummary,
  buildProgressiveCaptureSteps,
  formatGuidedDiscoveryProgress,
  initialProgressiveStepIndex,
  observationIsAllowed,
  refreshProgressiveCaptureSteps,
} from "./providerIntelligenceProgressiveCapture";

describe("providerIntelligenceProgressiveCapture", () => {
  it("starts observation flow with feasibility only", () => {
    const steps = buildProgressiveCaptureSteps("observation_readiness", {});
    expect(steps).toHaveLength(1);
    expect(steps[0]?.dbKey).toBe("provider_observation_feasibility");
    expect(steps[0]?.prompt).toMatch(/open to a vendor observing|observation allowed/i);
  });

  it("unlocks coordinator and procedures when observation is allowed", () => {
    const steps = buildProgressiveCaptureSteps("observation_readiness", {
      provider_observation_feasibility: "easy",
    });
    const keys = steps.map((s) => s.dbKey);
    expect(keys).toContain("provider_observation_coordinator_contact");
    expect(keys).toContain("provider_ideal_observation_cases");
    expect(keys).toContain("provider_observation_credentialing_needed");
    expect(keys).toContain("provider_observation_access_path");
    expect(observationIsAllowed({ provider_observation_feasibility: "easy" })).toBe(true);
  });

  it("skips allowed-only steps when observation is restricted", () => {
    const steps = buildProgressiveCaptureSteps("observation_readiness", {
      provider_observation_feasibility: "restricted",
    });
    const keys = steps.map((s) => s.dbKey);
    expect(keys).not.toContain("provider_observation_coordinator_contact");
    expect(keys).toContain("provider_observation_credentialing_needed");
    expect(keys).toContain("provider_observation_access_path");
  });

  it("advances initial index to emphasized field", () => {
    const steps = buildProgressiveCaptureSteps("observation_readiness", {
      provider_observation_feasibility: "easy",
    }, { includeAnswered: true });
    const idx = initialProgressiveStepIndex(steps, "provider_observation_coordinator_contact");
    expect(steps[idx]?.dbKey).toBe("provider_observation_coordinator_contact");
  });

  it("uses interview copy for coordinator access", () => {
    const steps = buildProgressiveCaptureSteps(
      "observation_readiness",
      { provider_observation_feasibility: "easy" },
      { includeAnswered: true },
    );
    const coord = steps.find((s) => s.dbKey === "provider_observation_coordinator_contact");
    expect(coord?.prompt).toMatch(/coordinates observation scheduling/i);
    expect(coord?.whyItMatters).toMatch(/coordinates vendor observation scheduling/i);
  });

  it("formats operational progress language", () => {
    expect(formatGuidedDiscoveryProgress("observation_readiness", 0, 3)).toMatch(
      /Qualifying observation path.*question 1.*3 open/i,
    );
  });

  it("summarizes newly captured signals after a pass", () => {
    const baseline = { provider_observation_feasibility: "easy" };
    const current = {
      ...baseline,
      provider_observation_coordinator_contact: "Jane OR scheduler",
    };
    const summary = buildGuidedDiscoverySessionSummary(
      "observation_readiness",
      baseline,
      current,
      ["provider_ideal_observation_cases"],
    );
    expect(summary.captured.some((c) => c.dbKey === "provider_observation_coordinator_contact")).toBe(
      true,
    );
    expect(summary.skipped.some((s) => s.dbKey === "provider_ideal_observation_cases")).toBe(true);
  });

  it("refreshes flow after feasibility answer", () => {
    const before = buildProgressiveCaptureSteps("observation_readiness", {});
    expect(before).toHaveLength(1);
    const after = refreshProgressiveCaptureSteps(
      "observation_readiness",
      { provider_observation_feasibility: "easy" },
      "provider_observation_feasibility",
    );
    expect(after.length).toBeGreaterThan(before.length);
  });
});
