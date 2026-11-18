import { describe, expect, it } from "vitest";
import { buildGuidedIntelCaptureQueue } from "@/lib/surgical-sales/providerGuidedIntelCapture";
import { buildProgressiveCaptureSteps } from "@/lib/surgical-sales/providerIntelligenceProgressiveCapture";
import {
  OPERATIONAL_OBSERVATION_ACCESS_PROMPTS,
  isVendorFootprintDiscoveryField,
  isVendorFootprintDiscoveryVisibleForMaturityStage,
} from "@/lib/surgical-sales/providerIntelligenceDiscoveryRouting";

describe("providerIntelligenceDiscoveryRouting", () => {
  it("defines operational observation access prompts", () => {
    expect(OPERATIONAL_OBSERVATION_ACCESS_PROMPTS.provider_observation_access_path).toMatch(
      /observation access work/i,
    );
    expect(OPERATIONAL_OBSERVATION_ACCESS_PROMPTS.provider_observation_credentialing_needed).toMatch(
      /before a vendor can observe/i,
    );
  });

  it("treats vendor footprint fields as evaluation-stage only", () => {
    expect(isVendorFootprintDiscoveryField("provider_competitive_products")).toBe(true);
    expect(isVendorFootprintDiscoveryField("provider_procedure_focus")).toBe(false);
    expect(
      isVendorFootprintDiscoveryVisibleForMaturityStage(
        "provider_competitive_products",
        "observation_ready",
      ),
    ).toBe(false);
    expect(
      isVendorFootprintDiscoveryVisibleForMaturityStage(
        "provider_competitive_products",
        "evaluation_active",
      ),
    ).toBe(true);
  });

  it("excludes vendor footprint from early guided discovery", () => {
    const queue = buildGuidedIntelCaptureQueue(
      { provider_evaluation_openness: "open" },
      { discoveryStakeholder: "unspecified" },
    );
    const keys = new Set(queue.map((q) => q.dbKey));
    expect(keys.has("provider_competitive_products")).toBe(false);
    expect(keys.has("provider_current_vendors")).toBe(false);
  });

  it("uses operational prompts in observation progressive flow", () => {
    const steps = buildProgressiveCaptureSteps("observation_readiness", {
      provider_observation_feasibility: "easy",
    });
    const access = steps.find((s) => s.dbKey === "provider_observation_access_path");
    expect(access?.prompt).toBe(OPERATIONAL_OBSERVATION_ACCESS_PROMPTS.provider_observation_access_path);
    expect(access?.prompt).not.toMatch(/who already has|embedded|owns the room/i);
  });
});
