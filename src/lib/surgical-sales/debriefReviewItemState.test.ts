import { describe, expect, it } from "vitest";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import { acceptAllDebriefReviewUpdates } from "@/lib/surgical-sales/debriefReviewItemState";

function review(overrides: Partial<LogUpdateParseResult> = {}): LogUpdateParseResult {
  return {
    sourceText: "note",
    usesProviderIntelligence: true,
    saveAsNoteAccepted: false,
    fieldUpdates: [
      {
        id: "f1",
        dbKey: "scheduling_contact",
        label: "Scheduling contact",
        proposedValue: "Karen",
        accepted: false,
        proposedDestination: "provider",
      },
      {
        id: "f2",
        dbKey: "access_notes",
        label: "Access notes",
        proposedValue: "Open to observation",
        accepted: true,
        proposedDestination: "provider",
      },
    ],
    suggestedUpdates: [],
    aiMapping: null,
    ...overrides,
  };
}

describe("acceptAllDebriefReviewUpdates", () => {
  it("accepts all field and suggested updates without unresolved conflicts", () => {
    const next = acceptAllDebriefReviewUpdates(review());
    expect(next.saveAsNoteAccepted).toBe(true);
    expect(next.fieldUpdates.every((f) => f.accepted)).toBe(true);
  });

  it("leaves conflicted fields pending when resolution is missing", () => {
    const next = acceptAllDebriefReviewUpdates(
      review({
        fieldUpdates: [
          {
            id: "f1",
            dbKey: "scheduling_contact",
            label: "Scheduling contact",
            proposedValue: "Karen",
            accepted: false,
            proposedDestination: "provider",
            conflict: {
              existingValue: "Mary",
              newValue: "Karen",
              resolution: null,
            },
          },
        ],
      }),
    );
    expect(next.fieldUpdates[0]?.accepted).toBe(false);
  });
});
