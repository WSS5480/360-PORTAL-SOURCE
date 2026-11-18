import { describe, expect, it } from "vitest";

import { resolveIntelligenceScope, resolveScopeForTacticalDebriefItem } from "@/lib/surgical-sales/intelligenceScopeInference";

describe("intelligenceScopeInference", () => {
  it("maps credentialing text to organization scope", () => {
    expect(
      resolveIntelligenceScope({
        text: "Vendor credentialing goes through materials management before OR access",
      }).scope,
    ).toBe("organization");
  });

  it("maps surgeon preferences to provider scope", () => {
    expect(
      resolveIntelligenceScope({
        text: "Surgeon prefers robotic approach for ventral hernia",
        dbKey: "provider_technique_preferences",
      }).scope,
    ).toBe("provider");
  });

  it("maps visit-only narrative to case scope", () => {
    expect(
      resolveIntelligenceScope({
        text: "On this visit they agreed to a follow-up call next week before we leave",
      }).scope,
    ).toBe("case");
  });

  it("maps next-step debrief category to case", () => {
    expect(resolveScopeForTacticalDebriefItem("next_step_opportunity", "Book intro follow-up").scope).toBe(
      "case",
    );
  });

  it("maps OR access debrief category to organization", () => {
    expect(resolveScopeForTacticalDebriefItem("or_access", "Scheduler approves observation").scope).toBe(
      "organization",
    );
  });

  it("rejects provider target for facility credentialing without surgeon-only wording", () => {
    const result = resolveIntelligenceScope({
      domain: "credentialing",
      text: "Vendor credentialing goes through materials management",
      logUpdateTarget: "provider",
    });
    expect(result.scope).toBe("organization");
  });

  it("rejects organization target for surgeon technique preferences", () => {
    const result = resolveIntelligenceScope({
      domain: "workflow",
      text: "Surgeon prefers laparoscopic ventral hernia",
      logUpdateTarget: "organization",
    });
    expect(result.scope).toBe("provider");
  });
});
