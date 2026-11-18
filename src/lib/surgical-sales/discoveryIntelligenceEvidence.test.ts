import { describe, expect, it } from "vitest";
import {
  isIntelligenceCaptureTokenValue,
  resolveDiscoveryFieldEvidence,
  sanitizeDiscoveryEvidenceQuote,
} from "./discoveryIntelligenceEvidence";

describe("discoveryIntelligenceEvidence", () => {
  it("rejects capture tokens as evidence", () => {
    expect(isIntelligenceCaptureTokenValue("credentialing_required")).toBe(true);
    expect(sanitizeDiscoveryEvidenceQuote("credentialing_required")).toBeNull();
  });

  it("keeps human-readable debrief quotes", () => {
    const quote =
      "Provider did not appear opposed to observation, but approval was not directly confirmed.";
    expect(sanitizeDiscoveryEvidenceQuote(quote)).toBe(quote);
  });

  it("reads persisted metadata evidence for observation feasibility", () => {
    const evidence = resolveDiscoveryFieldEvidence({
      dbKeys: ["provider_observation_feasibility"],
      contact: {
        provider_observation_feasibility: "credentialing_required",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            source_type: "engagement",
            source_label: "Intro Call",
            updated_at: "2026-05-20T12:00:00.000Z",
            evidence_text:
              "Provider did not appear opposed to observation, but approval was not directly confirmed.",
            access_blocker: "credentialing_required",
          },
        },
      },
    });
    expect(evidence?.quote).toMatch(/did not appear opposed/i);
    expect(evidence?.sourceLabel).toMatch(/Intro Call debrief/i);
    expect(evidence?.accessBlockerLabel).toBe("Credentialing required");
  });
});
