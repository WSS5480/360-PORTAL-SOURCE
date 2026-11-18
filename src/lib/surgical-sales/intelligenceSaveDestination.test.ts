import { describe, expect, it } from "vitest";

import { resolveIntelligenceSaveDestination } from "@/lib/surgical-sales/intelligenceSaveDestination";
import { normalizeExtractedSignals } from "@/lib/surgical-sales/intelligenceSignalPipeline";

describe("intelligenceSaveDestination", () => {
  it("maps organization scope to Facility", () => {
    const result = resolveIntelligenceSaveDestination({
      scope: "organization",
      text: "Sinai uses Vendormate for vendor credentialing.",
      domain: "credentialing",
    });
    expect(result.destination).toBe("facility");
  });

  it("maps provider scope to Provider", () => {
    const result = resolveIntelligenceSaveDestination({
      scope: "provider",
      text: "Dr. Nace prefers robotic cases.",
      domain: "workflow",
    });
    expect(result.destination).toBe("provider");
  });

  it("maps visit-only next steps to Engagement note", () => {
    const result = resolveIntelligenceSaveDestination({
      scope: "case",
      text: "Intro call went well, follow up next week.",
      domain: "next_steps",
      logUpdateTarget: "engagement_note",
    });
    expect(result.destination).toBe("engagement_note");
  });

  it("does not persist credentialing to provider via pipeline", () => {
    const [signal] = normalizeExtractedSignals([
      {
        domain: "credentialing",
        signal: "Vendor credentialing",
        confidence: "high",
        evidence: "Sinai uses Vendormate.",
        operational_meaning: "Sinai uses Vendormate for vendor credentialing.",
        target: "provider",
        reason: "QA",
      },
    ]);
    expect(signal?.proposedScope).toBe("organization");
    expect(signal?.proposedDestination).toBe("facility");
    expect(signal?.dbKey).toBe("provider_credentialing_status");
  });
});
