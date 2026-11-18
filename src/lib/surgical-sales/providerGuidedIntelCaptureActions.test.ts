import { describe, expect, it } from "vitest";
import { GUIDED_INTEL_ACTION_LABELS } from "./providerGuidedIntelCapture";
import { UNRESOLVED_ITEM_ACTION_LABELS } from "./providerIntelligenceOperationalMapping";
import { isIntelligenceFieldDeprioritizedForDiscovery } from "./operationalIntelligenceReadiness";

describe("guided intel capture actions", () => {
  it("exposes the four operational stance labels", () => {
    expect(GUIDED_INTEL_ACTION_LABELS.confirmed).toBe("Save & next");
    expect(GUIDED_INTEL_ACTION_LABELS.saveAndNext).toBe("Save & next");
    expect(GUIDED_INTEL_ACTION_LABELS.unknown).toBe("Still learning");
    expect(GUIDED_INTEL_ACTION_LABELS.notRelevant).toBe("Not relevant");
    expect(GUIDED_INTEL_ACTION_LABELS.skip).toBe("Skip");
    expect("askLater" in GUIDED_INTEL_ACTION_LABELS).toBe(false);
    expect("dontKnowYet" in GUIDED_INTEL_ACTION_LABELS).toBe(false);
    expect(GUIDED_INTEL_ACTION_LABELS.saveAndNext).toBe("Save & next");
  });

  it("aligns progressive capture stance labels", () => {
    expect(UNRESOLVED_ITEM_ACTION_LABELS.dontKnowYet).toBe("Unknown");
    expect("askLater" in UNRESOLVED_ITEM_ACTION_LABELS).toBe(false);
  });

  it("deprioritizes not_relevant fields from discovery", () => {
    expect(
      isIntelligenceFieldDeprioritizedForDiscovery("provider_procedure_focus", {
        provider_procedure_focus: { discovery_stance: "not_relevant" },
      }),
    ).toBe(true);
    expect(
      isIntelligenceFieldDeprioritizedForDiscovery("provider_procedure_focus", {
        provider_procedure_focus: { discovery_stance: "unknown" },
      }),
    ).toBe(false);
  });
});
