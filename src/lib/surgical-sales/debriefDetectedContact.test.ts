import { describe, expect, it } from "vitest";
import {
  buildProposedContactFromExtraction,
  contactRowNeedsDetails,
  contactsReadyToPersist,
  debriefContactCardPrompt,
  debriefContactFollowUpTask,
  isWorkflowParticipantContact,
  splitPersonName,
  workflowParticipantPossibleRole,
} from "@/lib/surgical-sales/debriefDetectedContact";

describe("debriefDetectedContact", () => {
  it("splits full names", () => {
    expect(splitPersonName("Karen Miller")).toEqual({ firstName: "Karen", lastName: "Miller" });
  });

  it("builds workflow participant from scheduling quote without contact info", () => {
    const item = buildProposedContactFromExtraction({
      name: "Karen Miller",
      quote: "Dr. Smith said Karen Miller schedules everything",
      sourceReference: "engagement:abc",
      debriefText: "Karen schedules cases",
      index: 0,
      mentionLevel: "workflow_participant",
    });
    expect(item.workflowResponsibilityId).toBe("observation_scheduling_owner");
    expect(item.contactDetailsMissing).toBe(true);
    expect(item.mentionLevel).toBe("workflow_participant");
    expect(isWorkflowParticipantContact(item)).toBe(true);
    expect(workflowParticipantPossibleRole(item)).toBe("Scheduling Coordinator");
    expect(debriefContactCardPrompt(item)).toContain("Karen");
    expect(debriefContactCardPrompt(item)).toMatch(/Contact not yet added/i);
  });

  it("detects missing contact details on row", () => {
    expect(contactRowNeedsDetails({ first_name: "Karen", last_name: "Miller" })).toBe(true);
    expect(contactRowNeedsDetails({ email: "k@hospital.org" })).toBe(false);
  });

  it("does not persist workflow participants without phone or email", () => {
    const pending = buildProposedContactFromExtraction({
      name: "Melissa",
      quote: "Melissa handles scheduling but I don't have her contact info",
      sourceReference: "e:1",
      debriefText: "Melissa handles scheduling but I don't have her contact info",
      index: 0,
      mentionLevel: "workflow_participant",
    });
    expect(contactsReadyToPersist([{ ...pending, disposition: "pending" }])).toHaveLength(0);
    expect(contactsReadyToPersist([{ ...pending, disposition: "add_details" }])).toHaveLength(0);
    expect(
      contactsReadyToPersist([
        { ...pending, disposition: "add_details", email: "melissa@hospital.org" },
      ]),
    ).toHaveLength(1);
    expect(
      contactsReadyToPersist([
        { ...pending, disposition: "link", linkedContactId: "c-1" },
      ]),
    ).toHaveLength(1);
  });

  it("formats follow-up task", () => {
    expect(debriefContactFollowUpTask("Karen Miller")).toBe("Get Karen's contact info.");
  });
});
