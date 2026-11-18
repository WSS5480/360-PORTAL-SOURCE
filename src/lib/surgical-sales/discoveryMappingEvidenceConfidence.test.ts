import { describe, expect, it } from "vitest";
import {
  discoveryMappingScanFromEvidenceConfidence,
  inferDiscoveryMappingEvidenceConfidence,
  validationStatusFromEvidenceConfidence,
} from "./discoveryMappingEvidenceConfidence";

describe("discoveryMappingEvidenceConfidence", () => {
  it("derives scan status from rep confidence", () => {
    expect(discoveryMappingScanFromEvidenceConfidence("mentioned_once")).toEqual({
      label: "Open",
      slug: "open",
    });
    expect(discoveryMappingScanFromEvidenceConfidence("observed")).toEqual({
      label: "Partial",
      slug: "partial",
    });
    expect(discoveryMappingScanFromEvidenceConfidence("validated")).toEqual({
      label: "Confirmed",
      slug: "confirmed",
    });
  });

  it("maps confidence to legacy validation status for persistence", () => {
    expect(validationStatusFromEvidenceConfidence("validated")).toBe("confirmed");
    expect(validationStatusFromEvidenceConfidence("mentioned_once")).toBe("unknown");
  });

  it("infers confidence from legacy validation + evidence strength", () => {
    expect(
      inferDiscoveryMappingEvidenceConfidence({
        validationStatus: "confirmed",
        validatedOnFile: true,
        evidenceStrength: "partial",
      }),
    ).toBe("validated");
    expect(
      inferDiscoveryMappingEvidenceConfidence({
        validationStatus: "unknown",
        evidenceStrength: "none",
      }),
    ).toBe("mentioned_once");
  });
});
