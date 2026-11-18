import { describe, expect, it } from "vitest";
import {
  applyReviewSelectionDefaults,
  defaultAcceptedForReviewField,
  partitionReviewFieldUpdates,
  reviewFieldBucket,
  wordingPreservesUncertainty,
} from "./logUpdateReviewSelection";
import type { LogUpdateParseResult } from "./logUpdateParseFreeform";
import type { LogUpdateRoutedFieldUpdate } from "./logUpdateProviderRouting";

function field(partial: Partial<LogUpdateRoutedFieldUpdate> & { id: string }): LogUpdateRoutedFieldUpdate {
  return {
    label: "Test",
    dbKey: "provider_procedure_mix",
    proposedValue: "value",
    accepted: false,
    conflict: null,
    proposedScope: "provider",
    scopeReason: "",
    proposedDestination: "provider",
    destinationReason: "",
    ...partial,
  };
}

describe("logUpdateReviewSelection", () => {
  it("leaves extraction fields unchecked until the rep accepts them", () => {
    const ai = {
      summary: "Note",
      confidence: "high" as const,
      reasoning: "r",
      source_scope: "visit",
      operational_signals: [],
      confirmed_updates: [
        {
          domain: "or_access" as const,
          label: "Access path",
          value: "Vendor credentialing required",
          confidence: "high" as const,
          save_target: "organization" as const,
          reasoning: "Stated clearly",
        },
      ],
      partial_updates: [
        {
          domain: "case_mix" as const,
          label: "Procedure mix partially mapped",
          value: "Open, lap, and robotic mentioned; breakdown still needs confirmation",
          still_needs: ["Detailed breakdown still needs validation"],
          confidence: "medium" as const,
          save_target: "provider" as const,
          reasoning: "Partial",
        },
        {
          domain: "workflow" as const,
          label: "Workflow interest",
          value: "Surgeon interested in workflow",
          still_needs: [],
          confidence: "medium" as const,
          save_target: "provider" as const,
          reasoning: "Loose",
        },
      ],
      still_to_validate: [],
      recommended_next_moves: [],
      do_not_update: [],
    };

    const review: LogUpdateParseResult = {
      sourceText: "note",
      suggestedUpdates: [],
      fieldUpdates: [
        field({ id: "ai-confirmed-0", accepted: false }),
        field({ id: "ai-partial-0", label: "Procedure mix partially mapped", accepted: false }),
        field({ id: "ai-partial-1", label: "Workflow interest", accepted: false }),
        field({ id: "ai-partial-2", label: "Low signal", accepted: false, proposedValue: "maybe" }),
      ],
      intelligenceReview: {
        confirmedUpdates: [],
        partiallyConfirmed: [],
        stillWorthConfirming: [],
        relatedOperationalAreas: [],
      },
      stillMissing: [],
      saveAsNoteAccepted: false,
      usesProviderIntelligence: true,
      aiMapping: ai,
      mappingSource: "openai",
    };

    review.fieldUpdates[3]!.id = "ai-partial-2";
    const withLow = {
      ...ai,
      partial_updates: [
        ...ai.partial_updates,
        {
          domain: "relationship" as const,
          label: "Low signal",
          value: "maybe interested",
          still_needs: [],
          confidence: "low" as const,
          save_target: "provider" as const,
          reasoning: "weak",
        },
      ],
    };
    review.aiMapping = withLow;

    const applied = applyReviewSelectionDefaults(review);
    expect(applied.saveAsNoteAccepted).toBe(false);
    expect(applied.fieldUpdates.find((f) => f.id === "ai-confirmed-0")?.accepted).toBe(false);
    expect(applied.fieldUpdates.find((f) => f.id === "ai-partial-0")?.accepted).toBe(false);
    expect(applied.fieldUpdates.find((f) => f.id === "ai-partial-1")?.accepted).toBe(false);
    expect(applied.fieldUpdates.find((f) => f.id === "ai-partial-2")?.accepted).toBe(false);

    const parts = partitionReviewFieldUpdates(applied);
    expect(parts.recommended.map((f) => f.id)).toContain("ai-partial-0");
    expect(parts.recommended.map((f) => f.id)).toContain("ai-partial-1");
    expect(parts.recommended.map((f) => f.id)).toContain("ai-partial-2");
  });

  it("detects uncertainty-preserving wording", () => {
    expect(
      wordingPreservesUncertainty([
        "Procedure mix partially mapped",
        "Open, lap, and robotic cases were mentioned",
        "breakdown still needs confirmation",
      ]),
    ).toBe(true);
    expect(wordingPreservesUncertainty(["Surgeon interested in workflow"])).toBe(false);
  });

  it("keeps low-confidence partial rows in the recommended bucket for save", () => {
    const ai = {
      summary: "s",
      confidence: "low" as const,
      reasoning: "r",
      source_scope: "v",
      operational_signals: [],
      confirmed_updates: [],
      partial_updates: [
        {
          domain: "credentialing" as const,
          label: "Facility vendor access partially mapped",
          value: "Possible IntelliCentrics — needs confirmation",
          still_needs: ["Confirm platform"],
          confidence: "low" as const,
          save_target: "organization" as const,
          reasoning: "r",
        },
      ],
      still_to_validate: [],
      recommended_next_moves: [],
      do_not_update: [],
    };
    const f = field({ id: "ai-partial-0" });
    expect(reviewFieldBucket(f, ai)).toBe("recommended");
    expect(defaultAcceptedForReviewField(f, ai)).toBe(false);
  });
});
