import { describe, expect, it } from "vitest";

import { stripClinicalTrendSuffixesForPrompt } from "@/lib/surgical-sales/logUpdateOpenAiMapping";

describe("Phase A — trend suffix stripping for the extraction prompt (RCA Failure 1)", () => {
  it("strips trend labels from stored clinical values", () => {
    const stored =
      "Ventral hernia repair · Increasing procedure volume | Abdominal wall reconstruction · Procedure focus area";
    expect(stripClinicalTrendSuffixesForPrompt("provider_procedure_focus", stored)).toBe(
      "Ventral hernia repair | Abdominal wall reconstruction",
    );
  });

  it("drops segments that are nothing but a trend label", () => {
    expect(
      stripClinicalTrendSuffixesForPrompt("provider_case_volume_estimate", "Increasing case volume"),
    ).toBe("");
  });

  it("keeps procedure text and drops only the label inside mixed segments", () => {
    expect(
      stripClinicalTrendSuffixesForPrompt(
        "provider_clinical_frustrations",
        "Visualization challenges in deep pelvis · Clinical frustration",
      ),
    ).toBe("Visualization challenges in deep pelvis");
  });

  it("leaves non-clinical keys untouched", () => {
    const value = "OviTex · Increasing procedure volume";
    expect(stripClinicalTrendSuffixesForPrompt("provider_current_vendors", value)).toBe(value);
  });
});
