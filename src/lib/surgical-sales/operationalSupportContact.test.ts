import { describe, expect, it } from "vitest";
import {
  compatibleContactTypesForSignal,
  dedupeWorkflowResponsibilities,
  filterOperationalContactPool,
  formatOperationalContactIntelligenceLine,
  isProviderContact,
} from "./operationalSupportContact";

describe("operationalSupportContact", () => {
  const scheduler = {
    id: "c1",
    first_name: "Jane",
    last_name: "Smith",
    role_type: "scheduler",
    title: "OR Coordinator",
    email: "jane@hospital.org",
  };
  const surgeon = {
    id: "c2",
    first_name: "Dr",
    last_name: "Lee",
    role_type: "surgeon",
    title: "Orthopedic Surgeon",
  };

  it("filters out providers when linking scheduling owner", () => {
    const filtered = filterOperationalContactPool({
      contacts: [scheduler, surgeon],
      signalId: "scheduling_owner",
      showProviders: false,
    });
    expect(filtered.map((c) => c.id)).toEqual(["c1"]);
  });

  it("includes providers when showProviders is enabled", () => {
    const filtered = filterOperationalContactPool({
      contacts: [scheduler, surgeon],
      signalId: "scheduling_owner",
      showProviders: true,
    });
    expect(filtered).toHaveLength(2);
  });

  it("formats intelligence line with title and workflow role", () => {
    const line = formatOperationalContactIntelligenceLine({
      contact: scheduler,
      jobTitle: "OR Coordinator",
      workflowResponsibilityIds: ["observation_scheduling_owner"],
    });
    expect(line).toContain("Jane Smith");
    expect(line).toContain("OR Coordinator");
    expect(line).toContain("Observation scheduling");
  });

  it("prioritizes facility contacts for facility scheduling path", () => {
    const office = {
      id: "c3",
      first_name: "Amy",
      last_name: "Office",
      role_type: "office_manager",
      organization_id: null,
    };
    const orScheduler = {
      id: "c4",
      first_name: "Bob",
      last_name: "OR",
      role_type: "scheduler",
      organization_id: "org-1",
    };
    const filtered = filterOperationalContactPool({
      contacts: [office, orScheduler],
      signalId: "scheduling_owner",
      showProviders: false,
      schedulingPath: "facility",
      schedulingSlot: "facility",
      organizationId: "org-1",
    });
    expect(filtered.map((c) => c.id)).toEqual(["c4"]);
  });

  it("deduplicates workflow responsibility ids", () => {
    expect(
      dedupeWorkflowResponsibilities([
        "observation_scheduling_owner",
        "observation_scheduling_owner",
        "case_coordination",
      ]),
    ).toEqual(["observation_scheduling_owner", "case_coordination"]);
  });

  it("excludes champion signal providers from default compatible types", () => {
    const types = compatibleContactTypesForSignal("scheduling_owner", false);
    expect(types).not.toContain("provider");
    expect(isProviderContact(surgeon)).toBe(true);
  });
});
