import { describe, expect, it } from "vitest";

import {
  detectSchedulingContactReplacement,
  normalizeExtractedPersonName,
  schedulingContactReplacementNamed,
} from "@/lib/surgical-sales/schedulingContactOwnership";
import { routeLogUpdateToProviderFields } from "@/lib/surgical-sales/logUpdateProviderRouting";
import { extractPrimarySchedulingNamedPerson } from "@/lib/surgical-sales/namedEntityPreservation";

const ON_FILE_KAREN = {
  provider_observation_coordinator_contact: "Karen handles observation scheduling",
};

function expectAmyReplacement(note: string) {
  const replacement = detectSchedulingContactReplacement(note);
  expect(replacement?.successorName).toBe("Amy");
  expect(replacement?.departedName).toBe("Karen");
  expect(extractPrimarySchedulingNamedPerson(note)?.name).toBe("Amy");
  expect(schedulingContactReplacementNamed(note)).toBe(true);

  const updates = routeLogUpdateToProviderFields(note, ON_FILE_KAREN);
  const contact = updates.find(
    (u) =>
      (u.dbKey === "provider_observation_coordinator_contact" ||
        u.dbKey === "provider_scheduling_contact") &&
      /Amy/.test(u.proposedValue),
  );
  expect(contact).toBeTruthy();
  expect(contact?.proposedValue).toMatch(/Amy/);
  expect(contact?.proposedValue).not.toMatch(/Previously Karen handled/i);
  expect(contact?.conflict?.existingValue).toMatch(/Karen/);
  expect(contact?.conflict?.newValue).toMatch(/Amy/);
  return contact;
}

describe("detectSchedulingContactReplacement", () => {
  it("strips temporal suffixes from captured names", () => {
    expect(normalizeExtractedPersonName("Amy Now")).toBe("Amy");
    expect(normalizeExtractedPersonName("Karen Previously")).toBe("Karen");
    expect(normalizeExtractedPersonName("Lettuce Today")).toBe("Lettuce");
    expect(normalizeExtractedPersonName("Pepper Afternoon")).toBe("Pepper");
  });

  it("Karen no longer involved. Amy now coordinates scheduling.", () => {
    const contact = expectAmyReplacement(
      "Karen is no longer involved. Amy now coordinates scheduling.",
    );
    expect(contact?.proposedValue).toMatch(/Amy now coordinates scheduling/i);
  });

  it("Scheduling moved from Karen to Amy.", () => {
    const contact = expectAmyReplacement("Scheduling moved from Karen to Amy.");
    expect(contact?.proposedValue).toMatch(/Amy/);
    expect(contact?.proposedValue).toMatch(/moved from Karen to Amy/i);
  });

  it("Amy took over scheduling responsibilities.", () => {
    const note = "Amy took over scheduling responsibilities.";
    expect(detectSchedulingContactReplacement(note)?.successorName).toBe("Amy");
    const updates = routeLogUpdateToProviderFields(note, ON_FILE_KAREN);
    const contact = updates.find((u) => /Amy/.test(u.proposedValue));
    expect(contact).toBeTruthy();
    expect(contact?.conflict?.existingValue).toMatch(/Karen/);
  });

  it("Dr. Onion note prefers Amy over historical Karen", () => {
    const note =
      "Previously Karen handled observation scheduling. Today Dr. Onion told me Karen is no longer involved. Amy now coordinates all observation scheduling and case dates.";
    const contact = expectAmyReplacement(note);
    expect(contact?.proposedValue).toMatch(/Amy now coordinates all observation scheduling/i);
    expect(contact?.proposedValue).not.toMatch(/\bAmy Now\s+—/);
  });
});
