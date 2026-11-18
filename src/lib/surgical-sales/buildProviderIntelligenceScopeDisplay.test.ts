import { describe, expect, it } from "vitest";

import { buildProviderIntelligenceScopeDisplay } from "@/lib/surgical-sales/buildProviderIntelligenceScopeDisplay";

describe("buildProviderIntelligenceScopeDisplay", () => {
  it("separates facility and provider bullets with inheritance label", () => {
    const display = buildProviderIntelligenceScopeDisplay({
      organizationName: "Sinai Hospital",
      providerName: "James Nace",
      contact: {
        provider_credentialing_status: "Vendor clearance required",
        provider_observation_coordinator_contact: "Scheduler approves all observation requests",
        provider_technique_preferences: "robotic",
        provider_evaluation_openness: "open",
        first_name: "James",
        last_name: "Nace",
      },
    });

    expect(display.facility.title).toBe("Facility Intelligence");
    expect(display.facility.subtitle).toBe("Sinai Hospital");
    expect(display.facility.inheritanceLine).toBe("Inherited across providers");
    expect(display.provider.title).toBe("Provider Intelligence");
    expect(display.provider.subtitle).toBe("James Nace");
    expect(display.facility.bullets.some((b) => b.dbKey === "provider_credentialing_status")).toBe(
      true,
    );
    expect(display.provider.bullets.some((b) => b.dbKey === "provider_technique_preferences")).toBe(
      true,
    );
    expect(
      display.provider.bullets.some((b) => b.dbKey === "provider_credentialing_status"),
    ).toBe(false);
    expect(display.facility.bullets[0]?.scope).toBe("organization");
    expect(display.provider.bullets[0]?.scope).toBe("provider");
  });

  it("prefers peer facility baseline over this provider contact value", () => {
    const display = buildProviderIntelligenceScopeDisplay({
      organizationName: "Sinai Hospital",
      providerName: "James Nace",
      organizationBaseline: {
        organizationId: "org-1",
        organizationName: "Sinai Hospital",
        fields: {
          provider_credentialing_status: {
            dbKey: "provider_credentialing_status",
            label: "Vendor credentialing",
            value: "Vendor credentialing required",
            displayLine: "Vendor credentialing required",
            contributorCount: 2,
          },
        },
      },
      contact: {
        provider_credentialing_status: "Different local note",
        first_name: "James",
        last_name: "Nace",
      },
    });

    const cred = display.facility.bullets.find((b) => b.dbKey === "provider_credentialing_status");
    expect(cred?.line).toBe("Vendor credentialing required");
    expect(display.provider.bullets.some((b) => b.dbKey === "provider_credentialing_status")).toBe(
      false,
    );
  });
});
