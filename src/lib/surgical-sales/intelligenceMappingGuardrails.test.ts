import { describe, expect, it } from "vitest";

import {
  applyIntelligenceMappingGuardrails,
  noteClearlyFacilityWide,
  noteClearlyProviderSpecific,
  noteIsEngagementOnly,
} from "@/lib/surgical-sales/intelligenceMappingGuardrails";
import { resolveIntelligenceScope } from "@/lib/surgical-sales/intelligenceScopeInference";

describe("intelligenceMappingGuardrails", () => {
  it("detects surgeon-only and facility-wide wording", () => {
    expect(noteClearlyProviderSpecific("Credentialing is unique to this surgeon only")).toBe(true);
    expect(noteClearlyFacilityWide("All surgeons at this hospital must use the scheduler")).toBe(true);
    expect(noteIsEngagementOnly("On this visit they agreed to a follow-up call next week")).toBe(true);
  });

  it("keeps credentialing on organization scope by default", () => {
    const result = resolveIntelligenceScope({
      domain: "credentialing",
      text: "Vendor credentialing goes through materials management before OR access",
      logUpdateTarget: "provider",
    });
    expect(result.scope).toBe("organization");
    expect(result.guardrailApplied).toBeTruthy();
  });

  it("allows provider scope for credentialing only with surgeon-only wording", () => {
    const result = resolveIntelligenceScope({
      domain: "credentialing",
      text: "Credentialing is unique to this surgeon only — unlike other surgeons at this hospital",
      logUpdateTarget: "provider",
    });
    expect(result.scope).toBe("provider");
  });

  it("blocks surgeon preferences from organization scope", () => {
    const result = resolveIntelligenceScope({
      domain: "workflow",
      text: "Surgeon prefers robotic approach for ventral hernia",
      logUpdateTarget: "organization",
    });
    expect(result.scope).toBe("provider");
    expect(result.guardrailApplied).toMatch(/do not propagate/i);
  });

  it("maps facility-wide workflow signals to organization scope", () => {
    const result = resolveIntelligenceScope({
      domain: "workflow",
      text: "All surgeons at this hospital use the same robotic docking workflow",
      dbKey: "provider_technique_preferences",
    });
    expect(result.scope).toBe("organization");
  });

  it("keeps visit-only narrative on engagement unless durable", () => {
    expect(
      resolveIntelligenceScope({
        text: "On this visit they agreed to a follow-up call next week before we leave",
      }).scope,
    ).toBe("case");
  });

  it("promotes durable facility policy stated during a visit to organization scope", () => {
    const result = resolveIntelligenceScope({
      domain: "credentialing",
      text: "On this visit learned hospital requires vendor credentialing before any observation",
    });
    expect(result.scope).toBe("organization");
  });

  it("applies guardrail correction on top of heuristic resolution", () => {
    const corrected = applyIntelligenceMappingGuardrails({
      domain: "credentialing",
      text: "Vendor credentialing required before OR access",
      logUpdateTarget: "provider",
      resolution: { scope: "provider", reason: "AI target — specific to this surgeon." },
    });
    expect(corrected.scope).toBe("organization");
    expect(corrected.guardrailApplied).toMatch(/facility scope/i);
  });
});
