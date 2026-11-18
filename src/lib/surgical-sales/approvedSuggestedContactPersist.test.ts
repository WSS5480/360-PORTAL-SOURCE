import { describe, expect, it } from "vitest";

import {
  contactsApprovedForCandidateStorage,
  contactsReadyForSuggestedPersist,
  contactsReadyToPersist,
  type DebriefProposedContactItem,
} from "@/lib/surgical-sales/debriefDetectedContact";
import { candidateContactFromProposed } from "@/lib/surgical-sales/candidateContactIntelligence";
import { DEBRIEF_SUGGESTED_CONTACT_NEEDS_VERIFICATION } from "@/lib/surgical-sales/debriefApprovalUx";

function karenContact(overrides: Partial<DebriefProposedContactItem> = {}): DebriefProposedContactItem {
  return {
    id: "contact-karen",
    firstName: "Karen",
    lastName: "",
    displayName: "Karen",
    email: "",
    phone: "",
    notes: "",
    contactTypeId: "scheduler",
    contactTypeLabel: "Scheduler",
    ownershipType: "provider_office",
    ownershipLabel: "Provider office",
    workflowResponsibilityId: "scheduling",
    workflowLabel: "Scheduling",
    roleLabel: "Scheduling Coordinator",
    sourceQuote: "Karen handles scheduling and can send credentialing paperwork.",
    sourceReference: "Intelligence review",
    linkedContactId: null,
    linkedContactName: null,
    intelligenceDbKey: "provider_observation_coordinator_contact",
    discoverySignalId: null,
    disposition: "accepted",
    contactDetailsMissing: true,
    mentionLevel: "workflow_participant",
    ...overrides,
  };
}

describe("approved suggested contact persistence", () => {
  it("creates suggested CRM rows for rep-approved contacts without phone or email", () => {
    const karen = karenContact();
    expect(contactsReadyToPersist([karen])).toHaveLength(0);
    expect(contactsReadyForSuggestedPersist([karen])).toHaveLength(1);
    expect(contactsApprovedForCandidateStorage([karen])).toHaveLength(1);
  });

  it("does not create suggested contacts for unchecked or dismissed suggestions", () => {
    expect(contactsReadyForSuggestedPersist([karenContact({ disposition: "pending" })])).toHaveLength(0);
    expect(contactsReadyForSuggestedPersist([karenContact({ disposition: "skipped" })])).toHaveLength(0);
    expect(contactsApprovedForCandidateStorage([karenContact({ disposition: "skipped" })])).toHaveLength(0);
    expect(contactsApprovedForCandidateStorage([karenContact({ disposition: "pending" })])).toHaveLength(1);
  });

  it("routes verified details through the full contact persist path", () => {
    const verified = karenContact({
      email: "karen@hospital.org",
      contactDetailsMissing: false,
    });
    expect(contactsReadyToPersist([verified])).toHaveLength(1);
    expect(contactsReadyForSuggestedPersist([verified])).toHaveLength(0);
  });

  it("marks approved AI contacts as suggested candidates until linked", () => {
    const row = candidateContactFromProposed(karenContact());
    expect(row?.lifecycle).toBe("suggested");
    expect(row?.status).toBe("active");
    expect(row?.contact_role).toBe("Scheduling Coordinator");
  });

  it("uses needs-verification copy for suggested contact display", () => {
    expect(DEBRIEF_SUGGESTED_CONTACT_NEEDS_VERIFICATION).toBe("Needs Verification");
  });
});
