import { describe, expect, it } from "vitest";

import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import {
  buildLogUpdateProviderCommitPayload,
  buildProviderFieldNoteFollowUpSyncPayload,
  hasAcceptedProposedContacts,
  reviewCanSaveStructuredIntelligence,
  reviewHasSavableSelection,
} from "@/lib/surgical-sales/logUpdateReviewCommit";
import { LOG_UPDATE_ERR_SELECT_ONE, formatLogUpdateApiError } from "@/lib/surgical-sales/logUpdateUx";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";

function emptyReview(overrides: Partial<LogUpdateParseResult> = {}): LogUpdateParseResult {
  return {
    sourceText: "Karen still handles observation scheduling. Amy handles credentialing.",
    suggestedUpdates: [],
    fieldUpdates: [],
    intelligenceReview: {
      confirmedUpdates: [],
      partiallyConfirmed: [],
      stillWorthConfirming: [],
      relatedOperationalAreas: [],
    },
    stillMissing: [],
    saveAsNoteAccepted: false,
    usesProviderIntelligence: true,
    ...overrides,
  } as LogUpdateParseResult;
}

describe("reviewHasSavableSelection", () => {
  it("enables save when an approved contact is selected without field updates", () => {
    expect(
      reviewHasSavableSelection({
        review: emptyReview(),
        proposedContacts: [
          {
            id: "amy",
            displayName: "Amy",
            disposition: "accepted",
          } as never,
        ],
      }),
    ).toBe(true);
  });

  it("disables save when nothing is selected", () => {
    expect(
      reviewHasSavableSelection({
        review: emptyReview(),
        proposedContacts: [{ id: "karen", displayName: "Karen", disposition: "pending" } as never],
      }),
    ).toBe(false);
  });
});

describe("reviewCanSaveStructuredIntelligence", () => {
  it("allows save for follow-up-only structured review with narrative", () => {
    expect(
      reviewCanSaveStructuredIntelligence({
        review: emptyReview({
          sourceText: "Following up with Jessica next week about observation scheduling.",
          fieldUpdates: [],
        }),
      }),
    ).toBe(true);
  });

  it("blocks save when narrative is too short", () => {
    expect(
      reviewCanSaveStructuredIntelligence({
        review: emptyReview({ sourceText: "Hi" }),
      }),
    ).toBe(false);
  });

  it("blocks save when field conflicts are unresolved", () => {
    expect(
      reviewCanSaveStructuredIntelligence({
        review: emptyReview({
          fieldUpdates: [
            {
              id: "field-1",
              label: "Coordinator",
              dbKey: "provider_scheduling_contact",
              proposedValue: "Amy",
              accepted: true,
              conflict: { existingValue: "Karen", resolution: null },
            } as never,
          ],
        }),
      }),
    ).toBe(false);
  });
});

describe("formatLogUpdateApiError", () => {
  it("formats zod flatten payloads", () => {
    expect(
      formatLogUpdateApiError({
        formErrors: [],
        fieldErrors: { follow_up_tasks: ["String must contain at least 4 character(s)"] },
      }),
    ).toBe("follow_up_tasks: String must contain at least 4 character(s)");
  });
});

describe("buildProviderFieldNoteFollowUpSyncPayload", () => {
  it("strips universal fact runs before API payload (encounter_id guard)", () => {
    const review = emptyReview({
      sourceText: "Following up with Jessica next week about observation scheduling.",
      fieldUpdates: [],
      debriefUniversalFactsRuns: [
        {
          capture_id: "capture-1",
          facts: [
            {
              id: "fact-1",
              capture_id: "capture-1",
              encounter_id: "engagement-1",
              concept: "next_action",
              normalized_label: "Follow up with Jessica",
              evidence_text: "following up with Jessica",
            },
          ],
        },
      ] as never,
    });

    const sync = buildProviderFieldNoteFollowUpSyncPayload({ review });
    expect(sync).not.toBeNull();
    if (!sync) return;

    expect(sync.log_update.debriefUniversalFactsRuns).toBeUndefined();
    expect(
      assertNoForbiddenPatientPayloadKeys({
        sourceText: review.sourceText,
        saveAsNote: true,
        fieldPatches: [],
        engagementDebriefSync: sync,
      }),
    ).toBeNull();
  });
});

describe("buildLogUpdateProviderCommitPayload", () => {
  it("allows contact-only save without field patches", () => {
    const built = buildLogUpdateProviderCommitPayload(emptyReview(), {
      hasAcceptedContacts: true,
    });
    expect("error" in built).toBe(false);
    if ("error" in built) return;
    expect(built.fieldPatches).toHaveLength(0);
    expect(built.saveAsNote).toBe(false);
  });

  it("still requires a selection when no contacts and no fields", () => {
    const built = buildLogUpdateProviderCommitPayload(emptyReview());
    expect("error" in built).toBe(true);
    if (!("error" in built)) return;
    expect(built.error).toBe(LOG_UPDATE_ERR_SELECT_ONE);
  });

  it("includes accepted field evidence for capture intelligence saves", () => {
    const built = buildLogUpdateProviderCommitPayload(
      emptyReview({
        sourceText:
          "Asked whether ACSIS works with their existing suction setup and was interested in the curved design.",
        fieldUpdates: [
          {
            id: "field-product-interest",
            label: "Product interests",
            dbKey: "provider_product_interests",
            proposedValue: "ACSIS",
            accepted: true,
            conflict: null,
          } as never,
        ],
      }),
    );

    expect("error" in built).toBe(false);
    if ("error" in built) return;
    expect(built.fieldPatches).toEqual([
      { dbKey: "provider_product_interests", value: "ACSIS", mergeStrategy: "append" },
    ]);
    expect(built.fieldEvidence.provider_product_interests).toMatch(/ACSIS|curved design/i);
  });
});

describe("hasAcceptedProposedContacts", () => {
  it("detects accepted disposition", () => {
    expect(
      hasAcceptedProposedContacts([{ disposition: "accepted" }, { disposition: "skipped" }]),
    ).toBe(true);
    expect(hasAcceptedProposedContacts([{ disposition: "pending" }])).toBe(false);
  });
});
