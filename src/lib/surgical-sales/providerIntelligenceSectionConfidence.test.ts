import { describe, expect, it } from "vitest";
import { buildProviderPlanningCompletion } from "./providerPlanningCompletion";
import {
  assessIntelligenceFieldQuality,
  deriveIntelligenceSectionConfidence,
  formatIntelligenceConfidenceDisplayLabel,
  INTELLIGENCE_CONFIDENCE_DISPLAY_LABELS,
} from "./providerIntelligenceSectionConfidence";

describe("providerIntelligenceSectionConfidence", () => {
  it("uses operational fallback labels without abstract scoring", () => {
    const labels = Object.values(INTELLIGENCE_CONFIDENCE_DISPLAY_LABELS);
    expect(labels).toContain("Operational visibility limited");
    expect(labels).toContain("Partially mapped");
    expect(labels).toContain("Operationally understood");
    expect(labels).toContain("Field-ready");
    expect(labels.join(" ")).not.toMatch(/\bconfidence\b/i);
  });

  it("rates empty section as unknown tier with thin-signals fallback label", () => {
    const result = deriveIntelligenceSectionConfidence("clinical_workflow", {});
    expect(result.confidence).toBe("unknown");
    expect(formatIntelligenceConfidenceDisplayLabel(result.confidence)).toBe(
      "Operational visibility limited",
    );
    expect(result.confidence_progress).toBe(0);
  });

  it("rates structured anchors as strong or validated with metadata", () => {
    const contact = {
      provider_procedure_focus: "hernia,bariatric",
      provider_technique_preferences: "laparoscopic,robotic",
      provider_technique_detail: "standard_lap|Xi dock preference and tray setup notes",
      provider_case_volume_estimate: "high",
      provider_workflow_pain_points: "Turnover delays on robotic dock changes",
    };
    const result = deriveIntelligenceSectionConfidence("clinical_workflow", contact);
    expect(["partial", "confirmed", "validated"]).toContain(result.confidence);
    expect(result.confidence_progress).toBeGreaterThan(0);
  });

  it("assesses field quality from capture shape", () => {
    const quality = assessIntelligenceFieldQuality("provider_procedure_focus", {
      provider_procedure_focus: "hernia,bariatric",
    });
    expect(quality.hasSignal).toBe(true);
  });

  it("derives planning completion without treating empty as complete", () => {
    const planning = buildProviderPlanningCompletion({});
    expect(planning.sections_complete).toBe(0);
    expect(planning.sections_total).toBeGreaterThan(0);
  });
});
