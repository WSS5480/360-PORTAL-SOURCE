import { describe, expect, it } from "vitest";
import {
  formatInheritedOrganizationPrompt,
  providerMatchesOrganizationBaseline,
  resolveInheritedOrganizationDiscovery,
} from "./organizationIntelligenceDiscovery";
import type { OrganizationIntelligenceBaseline } from "./loadOrganizationIntelligenceBaseline";

const baseline: OrganizationIntelligenceBaseline = {
  organizationId: "org-1",
  organizationName: "Sinai Hospital",
  supportContacts: [],
  fields: {
    provider_observation_credentialing_needed: {
      dbKey: "provider_observation_credentialing_needed",
      label: "Observation credentialing required?",
      value: "yes|Vendor credentialing required",
      displayLine: "Vendor credentialing required",
      contributorCount: 2,
    },
  },
};

describe("organizationIntelligenceDiscovery", () => {
  it("shows inherited mode when facility baseline exists and provider field is empty", () => {
    const res = resolveInheritedOrganizationDiscovery(
      "provider_observation_credentialing_needed",
      {},
      baseline,
    );
    expect(res.mode).toBe("inherited");
    expect(res.baselineField?.displayLine).toBe("Vendor credentialing required");
  });

  it("skips when provider already matches facility baseline", () => {
    const res = resolveInheritedOrganizationDiscovery(
      "provider_observation_credentialing_needed",
      { provider_observation_credentialing_needed: "yes|Vendor credentialing required" },
      baseline,
    );
    expect(res.mode).toBe("skip");
  });

  it("asks normally when provider value differs from baseline", () => {
    const res = resolveInheritedOrganizationDiscovery(
      "provider_observation_credentialing_needed",
      { provider_observation_credentialing_needed: "no|Not required for this surgeon" },
      baseline,
    );
    expect(res.mode).toBe("ask");
  });

  it("formats inherited prompt with hospital name", () => {
    expect(
      formatInheritedOrganizationPrompt("Sinai Hospital", "Vendor credentialing required"),
    ).toBe("Already known from Sinai Hospital: Vendor credentialing required");
  });

  it("matches baseline values with structured tokens", () => {
    expect(
      providerMatchesOrganizationBaseline(
        "provider_observation_credentialing_needed",
        "yes|Vendor credentialing required",
        "yes|Vendor credentialing required",
      ),
    ).toBe(true);
  });
});
