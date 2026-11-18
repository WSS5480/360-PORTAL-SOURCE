import { describe, expect, it } from "vitest";
import {
  discoveryProviderDisplayName,
  personalizeDiscoveryPromptForProvider,
} from "@/lib/surgical-sales/discoveryPromptPersonalization";

describe("discoveryPromptPersonalization", () => {
  it("resolves provider display name from contact", () => {
    expect(
      discoveryProviderDisplayName({ provider_display_name: "Dr. Lee" }),
    ).toBe("Dr. Lee");
    expect(discoveryProviderDisplayName({})).toBe("this provider");
  });

  it("replaces you/your with provider name", () => {
    expect(
      personalizeDiscoveryPromptForProvider(
        "How involved do you want reps during procedures?",
        "Dr. Nace",
      ),
    ).toBe("How involved does Dr. Nace want reps during procedures?");

    expect(
      personalizeDiscoveryPromptForProvider(
        "What must you validate on the first observation?",
        "James Nace",
      ),
    ).toBe("What must James Nace validate on the first observation?");
  });

  it("leaves third-person prompts unchanged", () => {
    const prompt = "Which procedures drive most of this provider's volume?";
    expect(
      personalizeDiscoveryPromptForProvider(prompt, "Dr. Lee"),
    ).toBe(prompt);
  });
});
