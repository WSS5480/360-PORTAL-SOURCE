import { describe, expect, it } from "vitest";
import {
  defaultSupportContactRoleId,
  formatIntelligenceValueFromSupportContact,
  rapidDiscoveryInvolvesSupportContact,
  rapidDiscoveryRequirementLink,
  RAPID_DISCOVERY_SUPPORT_CONTACT_ROLES,
  SCHEDULING_OWNER_ROLE_ID,
  schedulingOwnerDisplayRoleLabel,
} from "./rapidDiscoverySupportContact";

describe("rapidDiscoverySupportContact", () => {
  it("includes discovery-specific role options", () => {
    const ids = RAPID_DISCOVERY_SUPPORT_CONTACT_ROLES.map((r) => r.id);
    expect(ids).toContain("clinical_champion");
    expect(ids).toContain("vendor_access_contact");
    expect(ids).toContain("or_coordinator");
    expect(ids).toContain("materials_contact");
  });

  it("detects people-related coordinator questions", () => {
    expect(rapidDiscoveryInvolvesSupportContact("provider_observation_coordinator_contact")).toBe(
      true,
    );
    expect(rapidDiscoveryInvolvesSupportContact("provider_procedure_focus")).toBe(false);
    expect(defaultSupportContactRoleId("provider_observation_coordinator_contact")).toBe(
      SCHEDULING_OWNER_ROLE_ID,
    );
    expect(schedulingOwnerDisplayRoleLabel()).toBe("Scheduling Owner / Coordinator");
  });

  it("formats intelligence line from linked contact", () => {
    const line = formatIntelligenceValueFromSupportContact(
      { first_name: "Jane", last_name: "Smith", email: "jane@hospital.org" },
      "Scheduler",
      "Primary scheduler for observation requests",
    );
    expect(line).toContain("Jane Smith");
    expect(line).toContain("Scheduler");
  });

  it("links requirement updates for scheduling owner", () => {
    const link = rapidDiscoveryRequirementLink({
      dbKey: "provider_observation_coordinator_contact",
      operationalStatus: "cleared",
      contactName: "Jane Smith",
    });
    expect(link?.requirementLabel).toBe("Identify scheduling ownership");
    expect(link?.statusLabel).toBe("Validated");
    expect(link?.contextLine).toContain("Jane Smith");
  });
});
