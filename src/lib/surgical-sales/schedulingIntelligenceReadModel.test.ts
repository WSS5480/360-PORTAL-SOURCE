import { describe, expect, it } from "vitest";
import {
  hasSchedulingIntelligenceOnFile,
  schedulingOwnerDisplayLine,
} from "./schedulingIntelligenceReadModel";
import { resolveSchedulingOwnerFieldText } from "./schedulingIntelligenceDbKeys";

describe("schedulingIntelligenceReadModel", () => {
  it("detects Karen on provider_scheduling_contact", () => {
    const contact = {
      provider_scheduling_contact: "Karen — office scheduler (partial lead)",
    };
    expect(hasSchedulingIntelligenceOnFile(contact)).toBe(true);
    expect(schedulingOwnerDisplayLine(contact)).toContain("Karen");
  });

  it("prefers validated linked scheduler line over stale debrief narrative", () => {
    const contact = {
      provider_scheduling_contact:
        "He mentioned that Karen in his office usually helps coordinate his OR schedule and would probably be the best person to start with for finding a good case date.",
      provider_observation_coordinator_contact: "Karen · Scheduler · Observation scheduling",
      provider_intelligence_field_metadata: {
        provider_observation_coordinator_contact: {
          lifecycle_state: "validated",
          validated_at: "2026-06-02T00:00:00Z",
        },
      },
    };

    expect(resolveSchedulingOwnerFieldText(contact)).toBe(
      "Karen · Scheduler · Observation scheduling",
    );
    expect(schedulingOwnerDisplayLine(contact)).toBe("Karen · Scheduler · Observation scheduling");
  });

  it("detects OR coordinator contact field", () => {
    const contact = {
      provider_observation_coordinator_contact: "Jane — OR desk",
    };
    expect(hasSchedulingIntelligenceOnFile(contact)).toBe(true);
  });
});
