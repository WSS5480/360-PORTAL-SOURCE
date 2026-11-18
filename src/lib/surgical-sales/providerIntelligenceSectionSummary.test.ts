import { describe, expect, it } from "vitest";
import {
  buildIntelligenceSectionCardSummary,
  formatIntelligenceSectionSummaryLine,
} from "@/lib/surgical-sales/providerIntelligenceSectionSummary";

describe("providerIntelligenceSectionSummary", () => {
  it("summarizes captured observation signals as concise chips", () => {
    const line = formatIntelligenceSectionSummaryLine("observation_readiness", {
      provider_observation_feasibility: "easy",
      provider_observation_credentialing_needed: "required",
      provider_ideal_observation_cases: "robotic",
    });
    expect(line).toContain("Allowed");
    expect(line).not.toMatch(/No signals captured|synthesized/i);
    expect(line).not.toMatch(/\bUnknown\b/i);
  });

  it("builds collapsed card summary with findings and gaps", () => {
    const summary = buildIntelligenceSectionCardSummary("observation_readiness", {
      provider_observation_feasibility: "easy",
    });
    expect(summary.signalLine).toContain("Allowed");
    expect(summary.findings.length).toBeGreaterThan(0);
    expect(summary.missing.length).toBeGreaterThan(0);
  });

  it("returns empty state when no signals", () => {
    expect(formatIntelligenceSectionSummaryLine("commercial_signals", {})).toBe(
      "No evaluation or vendor details confirmed yet.",
    );
  });
});
