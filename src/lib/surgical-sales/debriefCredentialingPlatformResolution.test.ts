import { describe, expect, it } from "vitest";
import {
  repIndicatesCredentialingPlatformUnknown,
  resolveCredentialingPlatformLabel,
} from "@/lib/surgical-sales/debriefCredentialingPlatformResolution";
import { INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";

describe("debriefCredentialingPlatformResolution", () => {
  it("treats uncertain IntelliCentrics mention as unknown", () => {
    expect(repIndicatesCredentialingPlatformUnknown(INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION)).toBe(
      true,
    );
    expect(resolveCredentialingPlatformLabel(INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION)).toEqual({
      label: "Unknown",
      confidence: "Medium",
      invented: false,
    });
  });

  it("does not treat work through a couple things as a platform label", () => {
    const dictation =
      "We need to work through a couple things first before vendor credentialing is complete.";
    expect(resolveCredentialingPlatformLabel(dictation).label).toBe("Unknown");
  });
});
