import { describe, expect, it } from "vitest";
import { captureIntelligenceLaunchConfig } from "./captureIntelligenceLaunch";
import { INTELLIGENCE_CAPTURE_DASHBOARD_UI } from "./intelligenceCaptureCategories";
import { PROVIDER_PROFILE_CAPTURE_INTELLIGENCE_UI } from "./providerProfileIntelligenceCaptureCopy";

describe("provider profile intelligence capture copy", () => {
  it("uses Field note on the intelligence tab hero", () => {
    expect(INTELLIGENCE_CAPTURE_DASHBOARD_UI.title).toBe("Field note");
    expect(INTELLIGENCE_CAPTURE_DASHBOARD_UI.subtitle).toBe(
      PROVIDER_PROFILE_CAPTURE_INTELLIGENCE_UI.subtitle,
    );
  });

  it("configures provider launch surface for freeform AI-reviewed capture", () => {
    const config = captureIntelligenceLaunchConfig("provider");
    expect(config.composeTitle).toBe("Field note");
    expect(config.composePlaceholder).toContain("Karen");
    expect(config.composeReviewCta).toBe("Review updates");
    expect(config.hidePhotoCapture).toBe(true);
  });
});
