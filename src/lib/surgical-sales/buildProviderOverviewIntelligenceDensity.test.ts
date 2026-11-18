import { describe, expect, it } from "vitest";
import { resolveProviderOverviewIntelligenceDensity } from "./buildProviderOverviewIntelligenceDensity";

describe("resolveProviderOverviewIntelligenceDensity", () => {
  it("returns sparse for new providers with no touches", () => {
    expect(
      resolveProviderOverviewIntelligenceDensity({
        contact: { provider_procedure_focus: "" },
        engagements: [],
        cases: [],
      }),
    ).toBe("sparse");
  });

  it("returns developing after a completed engagement", () => {
    expect(
      resolveProviderOverviewIntelligenceDensity({
        contact: { provider_procedure_focus: "TKA" },
        engagements: [{ id: "1", status: "completed", engagement_type: "intro_call" }],
        cases: [],
      }),
    ).toBe("developing");
  });
});
