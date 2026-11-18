import { describe, expect, it } from "vitest";
import { INTELLIGENCE_CAPTURE_UNSET_OPTION } from "./providerIntelligenceStructuredCapture";
import { INTELLIGENCE_CONFIDENCE_DISPLAY_LABELS } from "./providerIntelligenceSectionConfidence";
import { INTELLIGENCE_DISCOVERY_LABELS } from "./providerIntelligenceDiscoveryLabels";

describe("providerIntelligenceDiscoveryLabels", () => {
  it("defines neutral discovery vocabulary for field controls", () => {
    expect(INTELLIGENCE_DISCOVERY_LABELS.notCapturedYet).toBe(
      "Still learning — confirm on next touch",
    );
    expect(INTELLIGENCE_DISCOVERY_LABELS.emergingSignal).toBe("Operational read forming");
    expect(INTELLIGENCE_DISCOVERY_LABELS.pendingValidation).toBe("Needs field validation");
    expect(INTELLIGENCE_DISCOVERY_LABELS.openSignal).toBe("Working assumption — validate live");
  });

  it("uses area depth labels separate from discovery field unset copy", () => {
    expect(INTELLIGENCE_CONFIDENCE_DISPLAY_LABELS.unknown).toBe("Operational visibility limited");
    expect(INTELLIGENCE_CAPTURE_UNSET_OPTION.label).toBe("Still learning — confirm on next touch");
    expect(INTELLIGENCE_CAPTURE_UNSET_OPTION.value).toBe("unknown");
  });
});
