import { describe, expect, it } from "vitest";
import {
  buildIntelligenceSectionSignalDetails,
  formatIntelligenceFieldValidationLabel,
  truncateScanFinding,
} from "./providerIntelligenceSectionDisclosure";
import { assessIntelligenceFieldQuality } from "./providerIntelligenceSectionConfidence";

describe("providerIntelligenceSectionDisclosure", () => {
  it("truncates scan findings for collapsed cards", () => {
    const long = "a".repeat(80);
    expect(truncateScanFinding(long, 56).endsWith("…")).toBe(true);
    expect(truncateScanFinding("short", 56)).toBe("short");
  });

  it("builds expanded signal detail with notes and validation", () => {
    const details = buildIntelligenceSectionSignalDetails(
      "observation_readiness",
      {
        provider_observation_feasibility: "easy|Coordinator said yes for Q2",
        provider_observation_access_path: "committee",
      },
      {},
    );
    const access = details.find((d) => d.dbKey === "provider_observation_access_path");
    expect(access?.chipLabel).toMatch(/access gates/i);
    expect(access?.display).toBeTruthy();
    const feasibility = details.find((d) => d.dbKey === "provider_observation_feasibility");
    expect(feasibility?.notes).toMatch(/Coordinator/i);
  });

  it("maps field quality to validation labels", () => {
    const validated = assessIntelligenceFieldQuality(
      "provider_procedure_focus",
      "hernia,bariatric|High volume mix across the week with robotic preference",
    );
    expect(formatIntelligenceFieldValidationLabel(validated)).toMatch(/Validated/i);
  });
});
