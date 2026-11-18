import { describe, expect, it } from "vitest";
import {
  ensureWorkflowFactsFromProductFitSignals,
  supplementFactsFromEvidenceText,
} from "./observationFactSupplement";

describe("observationFactSupplement", () => {
  it("re-extracts workflow facts from stored evidence sentences", () => {
    const supplemented = supplementFactsFromEvidenceText([
      {
        type: "current_product",
        value: "Bard Mesh",
        evidence:
          "There were a couple points where they spent extra time getting a better view before placing fixation.",
      },
    ]);

    expect(supplemented.some((fact) => fact.type === "workflow_issue")).toBe(true);
    expect(supplemented.some((fact) => fact.type === "visualization_challenge")).toBe(true);
  });

  it("adds workflow companion facts when only visualization product-fit is stored", () => {
    const supplemented = ensureWorkflowFactsFromProductFitSignals([
      {
        type: "product_fit_signal",
        value: "visualization and fixation workflow opportunity",
        evidence: "The early opportunity may be around visualization and fixation workflow.",
      },
    ]);

    expect(supplemented.some((fact) => fact.type === "workflow_issue")).toBe(true);
    expect(supplemented.some((fact) => fact.type === "visualization_challenge")).toBe(true);
  });
});
