import { describe, expect, it } from "vitest";
import {
  FIELD_INTELLIGENCE_PROCESSING_ROTATING_MESSAGES,
  FIELD_INTELLIGENCE_PROCESSING_TITLE,
  formatFieldIntelligenceProcessingContext,
} from "./fieldIntelligenceProcessingUx";

const BANNED = /\b(reading your note|thinking|generating summary|processing text)\b/i;

describe("fieldIntelligenceProcessingUx", () => {
  it("uses operational processing title", () => {
    expect(FIELD_INTELLIGENCE_PROCESSING_TITLE).toMatch(/processing field intelligence/i);
    expect(FIELD_INTELLIGENCE_PROCESSING_TITLE).not.toMatch(BANNED);
  });

  it("formats compact update context", () => {
    expect(
      formatFieldIntelligenceProcessingContext({
        providerLabel: "Stan Lee",
        organizationLabel: "Test Hospital",
        engagementTypeLabel: "Intro Call",
      }),
    ).toBe("Updating: Stan Lee • Test Hospital • Intro Call");
  });

  it("keeps rotating messages operational", () => {
    for (const msg of FIELD_INTELLIGENCE_PROCESSING_ROTATING_MESSAGES) {
      expect(msg).not.toMatch(BANNED);
      expect(msg.length).toBeGreaterThan(8);
    }
  });
});
