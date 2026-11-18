import { describe, expect, it } from "vitest";
import {
  classifyProductSupportObservation,
  extractProductSupportObservation,
  PRODUCT_SUPPORT_OBSERVATION_CATEGORY_LABELS,
} from "./extractProductSupportObservation";

const DR_ONION_NOTE = `Stopped by Dr. Onion's case today to provide product support. Overall things went smoothly, but there was a brief delay at the beginning of the case while the team confirmed they had the correct mesh size available.

Dr. Onion didn't have any major complaints, but he did mention that visualization can still be challenging in some of the larger abdominal wall cases. During the procedure he spent a little extra time getting the exposure where he wanted it before moving forward.

The scrub tech asked a couple questions about product sizing and available options, so there may be an opportunity for some additional staff education. Other than that, the team seemed comfortable with the workflow and there were no major issues during the case.

Worth following up on inventory planning and continuing to watch whether visualization comes up in future cases.`;

describe("extractProductSupportObservation", () => {
  it("classifies provider feedback", () => {
    const result = extractProductSupportObservation("Surgeon said the tray setup was intuitive.");
    expect(result.primaryClassification).toBe("provider_feedback");
    expect(result.classificationLabel).toBe(PRODUCT_SUPPORT_OBSERVATION_CATEGORY_LABELS.provider_feedback);
  });

  it("classifies staff feedback", () => {
    expect(classifyProductSupportObservation("Circulator mentioned SPD turnaround was tight.")).toBe("staff_feedback");
  });

  it("classifies product fit signal before generic product signal", () => {
    expect(classifyProductSupportObservation("Strong product fit — surgeon wants a trial next month.")).toBe(
      "product_fit_signal",
    );
  });

  it("classifies issues and follow ups", () => {
    expect(classifyProductSupportObservation("Tray was missing a component.")).toBe("issue");
    expect(classifyProductSupportObservation("Need to follow up with scheduling next week.")).toBe("follow_up");
  });

  it("treats mostly smooth support cases as success rather than issue", () => {
    const result = extractProductSupportObservation(DR_ONION_NOTE);
    expect(result.primaryClassification).toBe("success");
    expect(result.classificationLabel).toBe("Success");
  });
});
