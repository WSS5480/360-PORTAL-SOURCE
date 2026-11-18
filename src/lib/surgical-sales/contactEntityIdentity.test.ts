import { describe, expect, it } from "vitest";

import {
  contactUpdateCorroboratesExisting,
  contactValuesReferToSamePerson,
  primaryPersonNameFromContactValue,
} from "@/lib/surgical-sales/contactEntityIdentity";
import { routeLogUpdateToProviderFields } from "@/lib/surgical-sales/logUpdateProviderRouting";

describe("primaryPersonNameFromContactValue", () => {
  it("resolves names from stored and proposed contact value shapes", () => {
    expect(primaryPersonNameFromContactValue("Karen = scheduling coordinator")).toBe("Karen");
    expect(primaryPersonNameFromContactValue("Karen — Scheduling Coordinator")).toBe("Karen");
    expect(primaryPersonNameFromContactValue("Karen still handles observation scheduling")).toBe(
      "Karen",
    );
    expect(
      primaryPersonNameFromContactValue(
        'Amy — Scheduling Coordinator. "Amy now coordinates observation scheduling and case dates."',
      ),
    ).toBe("Amy");
  });

  it("returns null for role-only values", () => {
    expect(primaryPersonNameFromContactValue("Scheduler involved in observation coordination.")).toBeNull();
    expect(primaryPersonNameFromContactValue("Observation Scheduling Coordinator")).toBeNull();
    expect(primaryPersonNameFromContactValue("")).toBeNull();
  });
});

describe("contactValuesReferToSamePerson", () => {
  it("Karen → Karen is the same person", () => {
    expect(
      contactValuesReferToSamePerson(
        "Karen = scheduling coordinator",
        "Karen still handles observation scheduling",
      ),
    ).toBe(true);
  });

  it("Karen → Amy is a different person", () => {
    expect(
      contactValuesReferToSamePerson(
        "Karen = scheduling coordinator",
        'Amy — Scheduling Coordinator. "Amy now coordinates observation scheduling."',
      ),
    ).toBe(false);
  });

  it("unresolvable names never claim identity", () => {
    expect(contactValuesReferToSamePerson("", "Karen handles scheduling")).toBe(false);
    expect(
      contactValuesReferToSamePerson(
        "Scheduler involved in observation coordination.",
        "Karen handles scheduling",
      ),
    ).toBe(false);
  });
});

describe("contactUpdateCorroboratesExisting", () => {
  it("applies only to contact-entity fields", () => {
    expect(
      contactUpdateCorroboratesExisting({
        dbKey: "provider_observation_coordinator_contact",
        existingValue: "Karen = scheduling coordinator",
        proposedValue: "Karen still handles observation scheduling",
      }),
    ).toBe(true);
    expect(
      contactUpdateCorroboratesExisting({
        dbKey: "provider_procedure_focus",
        existingValue: "Karen = scheduling coordinator",
        proposedValue: "Karen still handles observation scheduling",
      }),
    ).toBe(false);
  });
});

describe("routing: same person re-confirmed is corroboration, not a conflict", () => {
  it("Karen → Karen produces no contact merge card", () => {
    const updates = routeLogUpdateToProviderFields(
      "Karen still handles observation scheduling.",
      { provider_observation_coordinator_contact: "Karen = scheduling coordinator" },
    );

    const contactUpdates = updates.filter(
      (u) =>
        u.dbKey === "provider_observation_coordinator_contact" ||
        u.dbKey === "provider_scheduling_contact" ||
        u.dbKey === "provider_facility_scheduling_contact",
    );
    expect(contactUpdates).toHaveLength(0);
    expect(updates.every((u) => u.conflict === null)).toBe(true);
  });

  it("Karen → Amy still produces the replace/keep-both decision", () => {
    const updates = routeLogUpdateToProviderFields(
      "Amy now coordinates observation scheduling and case dates.",
      { provider_observation_coordinator_contact: "Karen = scheduling coordinator" },
    );

    const replacement = updates.find(
      (u) =>
        (u.dbKey === "provider_observation_coordinator_contact" ||
          u.dbKey === "provider_scheduling_contact") &&
        /Amy/.test(u.proposedValue),
    );
    expect(replacement).toBeTruthy();
    expect(replacement?.conflict).toBeTruthy();
    expect(replacement?.conflict?.existingValue).toMatch(/Karen/);
    expect(replacement?.conflict?.newValue).toMatch(/Amy/);
  });
});
