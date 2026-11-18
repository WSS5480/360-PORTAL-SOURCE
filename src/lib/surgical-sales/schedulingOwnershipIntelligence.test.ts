import { describe, expect, it } from "vitest";
import {
  buildSchedulingOwnershipPlanningPatch,
  buildSchedulingOwnershipStatusValue,
  schedulingOwnershipReadyToSave,
  schedulingPathRequiresFacilityContact,
  schedulingPathRequiresProviderContact,
} from "./schedulingOwnershipIntelligence";

describe("schedulingOwnershipIntelligence", () => {
  it("requires both contacts for shared workflow", () => {
    expect(schedulingPathRequiresProviderContact("shared_workflow")).toBe(true);
    expect(schedulingPathRequiresFacilityContact("shared_workflow")).toBe(true);
    expect(
      schedulingOwnershipReadyToSave({
        schedulingControl: "shared_workflow",
        providerContactReady: true,
        facilityContactReady: false,
      }),
    ).toBe(false);
  });

  it("builds planning patch with dual contact summary", () => {
    const patch = buildSchedulingOwnershipPlanningPatch({
      schedulingControl: "shared_workflow",
      providerContactLine: "Amy · Surgery Coordinator",
      facilityContactLine: "Bob · OR Scheduler",
    });
    expect(patch.provider_observation_scheduling_control).toBe("shared_workflow");
    expect(patch.provider_scheduling_contact).toBe("Amy · Surgery Coordinator");
    expect(patch.provider_facility_scheduling_contact).toBe("Bob · OR Scheduler");
    expect(patch.provider_observation_coordinator_contact).toContain("Provider:");
    expect(patch.provider_observation_coordinator_contact).toContain("Facility:");
  });

  it("formats status value for provider office path", () => {
    const value = buildSchedulingOwnershipStatusValue({
      schedulingControl: "provider_office",
      providerContactLine: "Maria · Office Manager",
    });
    expect(value).toContain("Provider office");
    expect(value).toContain("Maria");
  });
});
