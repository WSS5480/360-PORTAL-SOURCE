import { describe, expect, it } from "vitest";
import { buildReviewUpdateItems } from "./debriefReviewUpdateItems";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";

function proposedContact(overrides: Partial<DebriefProposedContactItem> = {}): DebriefProposedContactItem {
  return {
    id: "contact-jennifer",
    firstName: "Jennifer",
    lastName: "Reynolds",
    displayName: "Jennifer Reynolds",
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
    sourceQuote:
      "Jennifer Reynolds as someone who helps coordinate scheduling and office logistics.",
    sourceReference: "engagement:test",
    linkedContactId: null,
    linkedContactName: null,
    intelligenceDbKey: "provider_observation_coordinator_contact",
    discoverySignalId: null,
    disposition: "pending",
    contactDetailsMissing: true,
    mentionLevel: "workflow_participant",
    ...overrides,
  };
}

describe("buildReviewUpdateItems proposed contacts", () => {
  it("emits contact_candidate review items from proposed contacts without workflow_contact facts", () => {
    const items = buildReviewUpdateItems({
      dictation:
        "He specifically mentioned Jennifer Reynolds as someone who helps coordinate scheduling and office logistics.",
      atomicFacts: [
        {
          fact_type: "follow_up",
          entity: "unknown",
          attribute: "action",
          value: "connect with Jennifer",
          evidence: "Next steps are to connect with Jennifer.",
          confidence: "medium",
        },
      ],
      proposedContacts: [proposedContact()],
    });

    const contactItems = items.filter((item) => item.type === "contact_candidate");
    expect(contactItems).toHaveLength(1);
    expect(contactItems[0]?.displayName).toBe("Jennifer Reynolds");
    expect(contactItems[0]?.contactId).toBe("contact-jennifer");
  });
});
