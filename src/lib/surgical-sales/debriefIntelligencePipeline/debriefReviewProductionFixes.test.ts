import { describe, expect, it } from "vitest";

import {
  buildContactInfoFollowUpTitle,
  extractContactPersonFromFollowUpTitle,
  isBlockedContactFollowUpTitle,
  normalizeReviewTextApostrophes,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewTextNormalize";
import {
  canonicalContactInfoFollowUpTitle,
  followUpSemanticDedupeKey,
  shouldExcludeFollowUpTask,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewUpdateGuards";
import { observationStatusFromValue } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewUpdateItems";
import { reconcileObservationReviewItem } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewObservationReconcile";

const TOM_SANDY_CTX = {
  providerDisplayName: "Tom Sandy",
  providerRecordName: "Tom Sandy",
  engagementParticipantNames: ["Tom Sandy"],
};

describe("debriefReviewTextNormalize", () => {
  it("normalizes curly apostrophes for Jennifer contact follow-ups", () => {
    const curly = `Get Jennifer\u2019s phone or email.`;
    expect(normalizeReviewTextApostrophes(curly)).toBe("Get Jennifer's phone or email.");
    expect(extractContactPersonFromFollowUpTitle(curly)).toBe("Jennifer");
    expect(followUpSemanticDedupeKey(curly)).toBe("task:contact_info:jennifer");
    expect(buildContactInfoFollowUpTitle("Jennifer")).toBe("Get Jennifer's phone or email.");
    expect(isBlockedContactFollowUpTitle("Get S's phone or email.")).toBe(true);
  });

  it("uses generic scheduler title when person is unknown", () => {
    expect(buildContactInfoFollowUpTitle(null)).toBe("Get scheduler phone or email.");
    expect(
      canonicalContactInfoFollowUpTitle(
        "get her phone or email",
        "task:contact_info:generic",
        [],
      ),
    ).toBe("Get scheduler phone or email.");
  });
});

describe("observationStatusFromValue", () => {
  it("does not approve negated observation language", () => {
    expect(observationStatusFromValue("not approved today", "No observation was approved today")).toBe(
      "Needs Follow-Up",
    );
    expect(
      observationStatusFromValue(
        "not approved today",
        "He wasn't opposed to observation. No observation was approved today.",
      ),
    ).toBe("Interested");
    expect(observationStatusFromValue("approved", "Observation was approved for next Tuesday.")).toBe(
      "Approved",
    );
  });
});

describe("reconcileObservationReviewItem", () => {
  it("downgrades Approved when approval is Not Confirmed", () => {
    const reconciled = reconcileObservationReviewItem(
      {
        id: "obs",
        type: "observation_access",
        confidence: "High",
        evidenceQuotes: [
          "He wasn't opposed to having me observe a case.",
          "No observation was approved today.",
        ],
        linkedFactKeys: [],
        linkedFieldUpdateIds: [],
        observationStatus: "Approved",
        approval: "Not Confirmed",
        credentialingSummary: "Discussed",
      },
      "He wasn't opposed. No observation was approved today. Vendor credentialing is required.",
    );
    expect(reconciled.observationStatus).toBe("Interested");
    expect(reconciled.approval).toBe("Not Confirmed");
    expect(reconciled.credentialingSummary).toBe("Required");
  });

  it("flips credentialing to Not required when the dictation reverses the requirement", () => {
    const dictation =
      "Previously I was told vendor credentialing was required before observation. Today Dr. Onion clarified credentialing is no longer required and we can attend cases immediately.";
    const reconciled = reconcileObservationReviewItem(
      {
        id: "obs",
        type: "observation_access",
        confidence: "High",
        evidenceQuotes: [
          "Dr. Onion clarified credentialing is no longer required and we can attend cases immediately.",
        ],
        linkedFactKeys: [],
        linkedFieldUpdateIds: [],
        observationStatus: "Needs validation",
        approval: "Not Confirmed",
        // Simulate the upstream bug input: AI/keyword pass said "Required".
        credentialingSummary: "Required",
      },
      dictation,
    );
    expect(reconciled.credentialingSummary).toBe("Not required");
  });

  it("suspension language overrides a historical Approved status", () => {
    const dictation =
      "Observation was previously approved for Dr. Patel. Today the OR manager told me observation access is temporarily suspended pending a vendor policy review.";
    const reconciled = reconcileObservationReviewItem(
      {
        id: "obs",
        type: "observation_access",
        confidence: "High",
        evidenceQuotes: ["observation access is temporarily suspended"],
        linkedFactKeys: [],
        linkedFieldUpdateIds: [],
        // Simulate the bug input: extractor latched onto "previously approved".
        observationStatus: "Approved",
        approval: "Confirmed",
        credentialingSummary: "Not discussed",
      },
      dictation,
    );
    expect(reconciled.observationStatus).not.toBe("Approved");
    expect(reconciled.approval).toBe("Not Confirmed");
  });

  it("does not flip credentialing when the negation targets something else", () => {
    const reconciled = reconcileObservationReviewItem(
      {
        id: "obs",
        type: "observation_access",
        confidence: "High",
        evidenceQuotes: ["Vendor credentialing is required before observation."],
        linkedFactKeys: [],
        linkedFieldUpdateIds: [],
        observationStatus: "Needs validation",
        approval: "Not Confirmed",
        credentialingSummary: "Required",
      },
      "Vendor credentialing is required before observation. A signed contract is not necessary.",
    );
    expect(reconciled.credentialingSummary).toBe("Required");
  });
});

describe("shouldExcludeFollowUpTask", () => {
  it("excludes Tom Sandy provider follow-ups but keeps Jennifer", () => {
    expect(
      shouldExcludeFollowUpTask("Get Tom's phone or email.", TOM_SANDY_CTX).exclude,
    ).toBe(true);
    expect(
      shouldExcludeFollowUpTask("Get Sandy's phone or email.", TOM_SANDY_CTX).exclude,
    ).toBe(true);
    expect(
      shouldExcludeFollowUpTask("Get S's phone or email.", TOM_SANDY_CTX).exclude,
    ).toBe(true);
    expect(
      shouldExcludeFollowUpTask("Get Jennifer's phone or email.", TOM_SANDY_CTX).exclude,
    ).toBe(false);
  });
});
