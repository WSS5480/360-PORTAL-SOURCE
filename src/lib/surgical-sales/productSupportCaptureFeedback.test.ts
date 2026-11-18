import { describe, expect, it } from "vitest";
import { buildProductSupportCaptureFeedback } from "./productSupportCaptureFeedback";
import { extractProductSupportObservation } from "./extractProductSupportObservation";
import { extractProductSupportOutcomesFromNote } from "./extractProductSupportOutcomesFromNote";

describe("productSupportCaptureFeedback", () => {
  it("splits outcomes and findings for rep feedback", () => {
    const noteBody = "Case went well. Surgeon was pleased and wants a trial next month.";
    const feedback = buildProductSupportCaptureFeedback({
      caseId: "case-1",
      noteBody,
      aiExtraction: {
        productSupport: extractProductSupportObservation(noteBody),
        observation: { entities: [], summary: noteBody, extractedAt: "", model: "rules" },
        outcomes: extractProductSupportOutcomesFromNote(noteBody),
      },
    });

    expect(feedback.outcomes.some((item) => item.text.startsWith("Provider reaction:"))).toBe(true);
    expect(feedback.outcomes.some((item) => item.text.startsWith("Case result:"))).toBe(true);
    expect(feedback.outcomes.some((item) => item.text.startsWith("Classified as"))).toBe(false);
    expect(feedback.findings.some((item) => item.text.startsWith("Provider reaction:"))).toBe(false);
  });
});
