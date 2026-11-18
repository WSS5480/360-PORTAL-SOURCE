import { describe, expect, it } from "vitest";
import {
  buildOrganizationInheritancePatchValue,
  formatProviderInheritanceDisplayLine,
  hasOrganizationSchedulerConfirmedForProvider,
  readOrganizationInheritanceFromContact,
} from "./organizationIntelligenceInheritance";
import { mergeOrganizationInheritanceResolutions } from "./providerIntelligenceFieldMetadata";
import { resolveInheritedOrganizationDiscovery } from "./organizationIntelligenceDiscovery";

describe("organizationIntelligenceInheritance", () => {
  it("clears provider field for does_not_apply without using exception text", () => {
    expect(
      buildOrganizationInheritancePatchValue({
        stance: "does_not_apply",
        baseline: {
          dbKey: "provider_observation_credentialing_needed",
          label: "x",
          value: "yes|required",
          displayLine: "Vendor credentialing required",
          contributorCount: 2,
        },
      }),
    ).toBeNull();
  });

  it("stores exception value only on provider patch", () => {
    expect(
      buildOrganizationInheritancePatchValue({
        stance: "exception",
        providerValue: "Coordinated through his scheduler",
        baseline: {
          dbKey: "provider_observation_coordinator_contact",
          label: "x",
          value: "hospital|Front desk",
          displayLine: "Front desk",
          contributorCount: 1,
        },
      }),
    ).toBe("Coordinated through his scheduler");
  });

  it("formats exception display separately from facility rule", () => {
    expect(
      formatProviderInheritanceDisplayLine({
        stance: "exception",
        facilityDisplayLine: "Vendor credentialing required",
        providerValue: "Dr. Nace observations are coordinated directly through his scheduler",
      }),
    ).toBe(
      "Provider exception: Dr. Nace observations are coordinated directly through his scheduler",
    );
  });

  it("skips inherited discovery after inheritance metadata is set", () => {
    const contact = {
      provider_intelligence_field_metadata: {
        provider_observation_credentialing_needed: {
          source_type: "profile",
          source_label: "Provider profile",
          updated_at: "2026-05-01T00:00:00.000Z",
          organization_inheritance: {
            stance: "does_not_apply",
            facility_display_line: "Vendor credentialing required",
            facility_value: "yes|required",
            resolved_at: "2026-05-01T00:00:00.000Z",
          },
        },
      },
    };
    expect(
      resolveInheritedOrganizationDiscovery(
        "provider_observation_credentialing_needed",
        contact,
        {
          organizationId: "o1",
          organizationName: "Sinai Hospital",
          fields: {
            provider_observation_credentialing_needed: {
              dbKey: "provider_observation_credentialing_needed",
              label: "x",
              value: "yes|required",
              displayLine: "Vendor credentialing required",
              contributorCount: 2,
            },
          },
        },
      ).mode,
    ).toBe("skip");
    expect(
      readOrganizationInheritanceFromContact(contact, "provider_observation_credentialing_needed")
        ?.stance,
    ).toBe("does_not_apply");
  });

  it("mergeOrganizationInheritanceResolutions preserves facility snapshot in metadata", () => {
    const { metadata, fieldValues } = mergeOrganizationInheritanceResolutions({
      existing: {},
      resolutions: {
        provider_observation_coordinator_contact: {
          stance: "exception",
          provider_value: "Scheduler coordinates directly",
        },
      },
      captureContext: { source_type: "profile", source_label: "Rapid Discovery" },
      actor: { userId: "u1", userName: "Rep" },
      baseline: {
        organizationId: "o1",
        organizationName: "Sinai",
        fields: {
          provider_observation_coordinator_contact: {
            dbKey: "provider_observation_coordinator_contact",
            label: "Coordinator",
            value: "front_desk|Front desk",
            displayLine: "Front desk scheduling",
            contributorCount: 3,
          },
        },
      },
    });
    expect(fieldValues.provider_observation_coordinator_contact).toBe("Scheduler coordinates directly");
    expect(metadata.provider_observation_coordinator_contact?.organization_inheritance?.stance).toBe(
      "exception",
    );
    expect(
      metadata.provider_observation_coordinator_contact?.organization_inheritance?.facility_display_line,
    ).toBe("Front desk scheduling");
    expect(
      metadata.provider_observation_coordinator_contact?.organization_inheritance?.facility_value,
    ).toBe("front_desk|Front desk");
  });

  it("treats organization scheduler inheritance as confirmed for provider", () => {
    const contact = {
      provider_facility_scheduling_contact: "karen|Karen Smith",
      provider_intelligence_field_metadata: {
        provider_facility_scheduling_contact: {
          source_type: "profile",
          source_label: "Organization context confirm",
          updated_at: "2026-06-08T00:00:00.000Z",
          organization_inheritance: {
            stance: "applies",
            facility_display_line: "Karen Smith (Scheduler)",
            facility_value: "karen|Karen Smith",
            resolved_at: "2026-06-08T00:00:00.000Z",
          },
        },
      },
    };
    expect(hasOrganizationSchedulerConfirmedForProvider(contact)).toBe(true);
  });
});
