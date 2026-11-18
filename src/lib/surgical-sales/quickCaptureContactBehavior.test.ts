import { describe, expect, it } from "vitest";
import {
  LOG_UPDATE_REVIEW_TITLE,
  REVIEW_EXTRACTED_INTELLIGENCE_TITLE,
  logUpdateQuickCaptureSuccessDetail,
} from "@/lib/surgical-sales/logUpdateUx";
import { buildQuickCaptureSaveToast } from "@/lib/surgical-sales/missionBoardCaptureSaveToast";
import {
  proposedContactsForPendingStorage,
  pendingSuggestionCount,
} from "@/lib/surgical-sales/pendingIntelligenceCapture";
import {
  contactsReadyToPersist,
  type DebriefProposedContactItem,
} from "@/lib/surgical-sales/debriefDetectedContact";

describe("Quick Capture contact behavior", () => {
  it("uses Review Extracted Intelligence as the review screen title", () => {
    expect(REVIEW_EXTRACTED_INTELLIGENCE_TITLE).toBe("Review Extracted Intelligence");
    expect(LOG_UPDATE_REVIEW_TITLE).toBe("Review Extracted Intelligence");
  });

  it("formats the quick capture toast as background intelligence work", () => {
    expect(logUpdateQuickCaptureSuccessDetail(2)).toBe(
      "Field note saved. 2 intelligence updates applied in the background.",
    );
    expect(buildQuickCaptureSaveToast(2).title).toBe(
      "Field note saved. 2 intelligence updates applied in the background.",
    );
  });

  it("keeps pending contacts out of CRM persistence until review actions are chosen", () => {
    const pendingOnly: DebriefProposedContactItem[] = proposedContactsForPendingStorage([
      {
        id: "c1",
        displayName: "Amy",
        roleLabel: "Scheduling Coordinator",
        disposition: "accepted",
        linkedContactId: "old-id",
        email: "amy@example.com",
        phone: "",
        workflowLabel: "",
        sourceQuote: "",
        sourceReference: "provider:prov-1",
        intelligenceDbKey: "provider_observation_coordinator_contact",
        mentionLevel: "potential_support_contact",
        contactDetailsMissing: false,
        discoverySignalId: null,
      },
    ]);

    expect(contactsReadyToPersist(pendingOnly)).toHaveLength(0);

    const createReady: DebriefProposedContactItem[] = [
      {
        ...pendingOnly[0]!,
        disposition: "accepted",
        linkedContactId: "",
        email: "amy@example.com",
      },
    ];
    expect(contactsReadyToPersist(createReady)).toHaveLength(1);

    const linkReady: DebriefProposedContactItem[] = [
      {
        ...pendingOnly[0]!,
        disposition: "link",
        linkedContactId: "existing-contact-id",
      },
    ];
    expect(contactsReadyToPersist(linkReady)).toHaveLength(1);

    const dismissed: DebriefProposedContactItem[] = [
      {
        ...pendingOnly[0]!,
        disposition: "ignored",
      },
    ];
    expect(contactsReadyToPersist(dismissed)).toHaveLength(0);
  });

  it("counts contact-only extractions as pending suggestions", () => {
    expect(
      pendingSuggestionCount({
        suggestionCount: 0,
        proposedContacts: [
          { displayName: "Amy", disposition: "pending" } as DebriefProposedContactItem,
          { displayName: "Karen", disposition: "pending" } as DebriefProposedContactItem,
        ],
      }),
    ).toBe(2);
  });
});
