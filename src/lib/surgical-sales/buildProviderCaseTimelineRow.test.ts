import { describe, expect, it } from "vitest";
import { buildProviderCaseTimelineRow } from "./buildProviderCaseTimelineRow";

describe("buildProviderCaseTimelineRow", () => {
  it("builds observation learning rows with outcomes and learning needs", () => {
    const row = buildProviderCaseTimelineRow({
      id: "case-1",
      case_type: "observation",
      procedure_type: "Robotic Hernia Repair",
      case_date: "2026-05-29",
      status: "completed",
      observation_key_questions: "What products are currently used?",
      live_observation_clinical_pain_points: "Visualization issues observed",
      live_observation_product_fit: "ACSIS fit identified",
      product_name: "ACSIS Kit",
    });

    expect(row.caseTypeLabel).toBe("Observation");
    expect(row.procedureLabel).toBe("Robotic Hernia Repair");
    expect(row.dateLine).toMatch(/May 29/);
    expect(row.statusLabel).toBe("Completed");
    expect(row.productsLabel).toBe("ACSIS Kit");
    expect(row.outcomeLines).toEqual(
      expect.arrayContaining(["Visualization issues observed", "ACSIS fit identified"]),
    );
    expect(row.openQuestionsCount).toBe(1);
  });

  it("builds product support rows with recorded outcomes", () => {
    const row = buildProviderCaseTimelineRow({
      id: "case-2",
      case_type: "product_support",
      procedure_type: "TKA",
      case_date: "2026-06-04",
      status: "completed",
      product_name: "ACSIS Kit",
      case_support_outcome: "product_used",
    });

    expect(row.caseTypeLabel).toBe("Product support");
    expect(row.productsLabel).toBe("ACSIS Kit");
    expect(row.outcomeLines).toEqual(["Product opened/used"]);
    expect(row.openQuestionsCount).toBeNull();
  });
});
