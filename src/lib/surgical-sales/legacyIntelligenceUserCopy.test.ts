import { describe, expect, it } from "vitest";
import { sanitizeLegacyIntelligenceUserCopy } from "./legacyIntelligenceUserCopy";

describe("sanitizeLegacyIntelligenceUserCopy", () => {
  it("applies the retired phrase replacement table", () => {
    expect(sanitizeLegacyIntelligenceUserCopy("Not viable yet")).toBe(
      "Operational picture still developing",
    );
    expect(sanitizeLegacyIntelligenceUserCopy("Primary blocker")).toBe("Needs validation");
    expect(sanitizeLegacyIntelligenceUserCopy("Unresolved")).toBe("Needs validation");
    expect(sanitizeLegacyIntelligenceUserCopy("Missing")).toBe("Still learning");
    expect(sanitizeLegacyIntelligenceUserCopy("Visibility still forming visibility")).toBe(
      "Visibility developing",
    );
    expect(sanitizeLegacyIntelligenceUserCopy("No confirmed signals on file yet.")).toMatch(
      /No confirmed detail captured yet\.?$/i,
    );
    expect(sanitizeLegacyIntelligenceUserCopy("Commercialization operational picture")).toBe(
      "Operational context",
    );
  });
});
