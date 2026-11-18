import { describe, expect, it } from "vitest";

import {
  followUpTaskPresentation,
  normalizeObservationAccessCard,
} from "@/lib/surgical-sales/debriefActionableReviewCardNormalize";

describe("debriefActionableReviewCardNormalize", () => {
  it("maps observation access to typed field labels", () => {
    const card = normalizeObservationAccessCard({
      id: "obs",
      category: "observation_access",
      headline: "Observation Access",
      observationStatus: "Interested",
      approval: "Not Confirmed",
      credentialing: "Required",
      fields: [],
      evidenceQuotes: [],
      actions: [],
      linkedFieldUpdateIds: [],
      linkedIntelligenceIds: [],
      confidence: "Medium",
    });

    expect(card.fields.find((f) => f.label === "Observation Status")?.value).toBe("Interested");
    expect(card.fields.find((f) => f.label === "Approval")?.value).toBe("Not Confirmed");
  });

  it("adds credentialing follow-up reason and due date", () => {
    const meta = followUpTaskPresentation("Confirm Credentialing Platform");
    expect(meta.followUpReason).toMatch(/credentialing/i);
    expect(meta.suggestedDue).toBe("Next Touch");
  });
});
