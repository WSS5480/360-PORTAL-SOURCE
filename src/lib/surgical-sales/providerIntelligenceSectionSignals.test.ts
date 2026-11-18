import { describe, expect, it } from "vitest";
import { buildIntelligenceSectionSignalRows } from "./providerIntelligenceSectionSignals";

describe("buildIntelligenceSectionSignalRows", () => {
  it("returns labeled display rows for fields with capture signals", () => {
    const rows = buildIntelligenceSectionSignalRows("clinical_workflow", {
      provider_procedure_focus: "laparoscopic",
      provider_technique_preferences: "",
      provider_workflow_pain_points: "long turnover",
    });

    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.some((r) => r.dbKey === "provider_procedure_focus")).toBe(true);
    expect(rows.every((r) => r.label && r.display)).toBe(true);
  });

  it("returns empty when section has no signals", () => {
    expect(buildIntelligenceSectionSignalRows("or_environment", {})).toEqual([]);
  });
});
