import { describe, expect, it } from "vitest";
import {
  assessProductWorkflowAlignment,
  workflowAlignmentSupportsProductConversation,
} from "./matchProductWorkflowTriggers";
import { procedureAlignsWithDebriefProduct } from "./procedureProductAlignment";

describe("procedureProductAlignment", () => {
  it("aligns ventral hernia with ACSIS", () => {
    expect(procedureAlignsWithDebriefProduct("Robotic ventral hernia", "ACSIS")).toBe(true);
    expect(procedureAlignsWithDebriefProduct("Sleeve gastrectomy", "ACSIS")).toBe(false);
  });

  it("aligns foregut procedures with Endolumik", () => {
    expect(procedureAlignsWithDebriefProduct("Sleeve gastrectomy", "Endolumik")).toBe(true);
    expect(procedureAlignsWithDebriefProduct("Robotic ventral hernia", "Endolumik")).toBe(false);
  });
});

describe("assessProductWorkflowAlignment", () => {
  it("matches ACSIS clinical triggers from visualization/fixation notes when procedure aligns", () => {
    const result = assessProductWorkflowAlignment({
      productId: "ACSIS",
      procedureLabel: "Robotic ventral hernia",
      observationTexts: [
        "Extra visualization time before fixation.",
        "Provider frustration during visualization before fixation.",
      ],
    });

    expect(result.procedureAligned).toBe(true);
    expect(result.matchedClinicalTriggers.length).toBeGreaterThan(0);
    expect(result.alignmentScore).toBeGreaterThanOrEqual(35);
    expect(workflowAlignmentSupportsProductConversation(result)).toBe(true);
  });

  it("caps alignment score when procedure does not align", () => {
    const result = assessProductWorkflowAlignment({
      productId: "ACSIS",
      procedureLabel: "Sleeve gastrectomy",
      observationTexts: ["Extra visualization time before fixation."],
    });

    expect(result.procedureAligned).toBe(false);
    expect(result.alignmentScore).toBeLessThanOrEqual(22);
    expect(workflowAlignmentSupportsProductConversation(result)).toBe(false);
  });
});
