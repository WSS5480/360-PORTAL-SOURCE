import { describe, expect, it } from "vitest";
import { AI_DEBRIEF_REVIEW_SAVE_UPDATES, AI_DEBRIEF_REVIEW_UPDATES_TITLE } from "@/lib/surgical-sales/debriefApprovalUx";
import {
  INTELLIGENCE_BRIEF_DECISIONS_TITLE,
  INTELLIGENCE_BRIEF_TITLE,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBriefCopy";
import {
  LOG_UPDATE_REVIEW_SELECTION_HINT,
  LOG_UPDATE_REVIEW_SUBTITLE,
  REVIEW_EXTRACTED_INTELLIGENCE_TITLE,
} from "@/lib/surgical-sales/logUpdateUx";
import { contactsReadyToPersist } from "@/lib/surgical-sales/debriefDetectedContact";

describe("Review Extracted Intelligence UX copy", () => {
  it("keeps the modal title and updates subtitle, section, and save labels", () => {
    expect(REVIEW_EXTRACTED_INTELLIGENCE_TITLE).toBe("Review Extracted Intelligence");
    expect(LOG_UPDATE_REVIEW_SUBTITLE).toBe(
      "AI found possible updates from your note. Review what should update the provider record.",
    );
    expect(AI_DEBRIEF_REVIEW_UPDATES_TITLE).toBe("Suggested Updates");
    expect(INTELLIGENCE_BRIEF_TITLE).toBe("Suggested Updates");
    expect(INTELLIGENCE_BRIEF_DECISIONS_TITLE).toBe("Contact suggestions");
    expect(AI_DEBRIEF_REVIEW_SAVE_UPDATES).toBe("Save Selected Updates");
    expect(LOG_UPDATE_REVIEW_SELECTION_HINT).toBe(
      "Checked items will update the provider record. Unchecked items will be ignored.",
    );
  });

  it("does not change contact approval persistence rules", () => {
    expect(
      contactsReadyToPersist([
        {
          id: "c1",
          displayName: "Amy",
          disposition: "pending",
          email: "",
          phone: "",
        } as never,
      ]),
    ).toHaveLength(0);
    expect(
      contactsReadyToPersist([
        {
          id: "c1",
          displayName: "Amy",
          disposition: "accepted",
          email: "amy@example.com",
          phone: "",
        } as never,
      ]),
    ).toHaveLength(1);
    expect(
      contactsReadyToPersist([
        {
          id: "c2",
          displayName: "Karen",
          disposition: "link",
          linkedContactId: "contact-9",
          email: "",
          phone: "",
        } as never,
      ]),
    ).toHaveLength(1);
    expect(
      contactsReadyToPersist([
        {
          id: "c3",
          displayName: "Mike",
          disposition: "ignored",
          email: "",
          phone: "",
        } as never,
      ]),
    ).toHaveLength(0);
  });
});
