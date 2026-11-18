import { describe, expect, it } from "vitest";
import { resolveContinueDiscoveryMappingSignal } from "./providerDiscoveryMappingNavigation";
import {
  resolveProviderOverviewWorkflowCta,
  workflowCtaUsesButton,
} from "./providerOverviewWorkflowCta";
import { PROVIDER_PROGRESSION_CTA_START_CREDENTIALING } from "./observationAccessWorkflowState";

describe("providerOverviewWorkflowCta", () => {
  it("maps continue discovery to open Discovery Mapping", () => {
    const action = resolveProviderOverviewWorkflowCta({
      label: "Continue discovery",
      href: "/portal/sales/providers/p1?tab=overview&workflow=capture_field&field=provider_observation_feasibility",
    });
    expect(action.type).toBe("open_discovery_mapping");
    expect(workflowCtaUsesButton(action)).toBe(true);
  });

  it("maps start credentialing to facility pathway in Discovery Mapping", () => {
    const action = resolveProviderOverviewWorkflowCta({
      label: PROVIDER_PROGRESSION_CTA_START_CREDENTIALING,
      href: "/portal/sales/providers/p1?tab=overview&workflow=capture_field&field=provider_observation_credentialing_needed",
      contact: {
        provider_observation_feasibility: "credentialing_required",
      },
    });
    expect(action.type).toBe("open_discovery_mapping");
    expect(action.type === "open_discovery_mapping" && action.signalId).toBe(
      "facility_vendor_pathway",
    );
  });

  it("resolves continue discovery to credentialing signal when that is the top blocker", () => {
    const signalId = resolveContinueDiscoveryMappingSignal({
      provider_observation_feasibility: "credentialing_required",
      provider_observation_credentialing_needed: "required",
    });
    expect(signalId).toBe("facility_vendor_pathway");
  });
});
