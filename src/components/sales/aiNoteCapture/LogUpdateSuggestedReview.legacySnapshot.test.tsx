import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LogUpdateSuggestedReview } from "@/components/sales/aiNoteCapture/LogUpdateSuggestedReview";
import { MARK_ONION_JENNIFER_REYNOLDS_INTRO_DICTATION } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";

function legacySnapshotReview(): LogUpdateParseResult {
  return {
    sourceText: MARK_ONION_JENNIFER_REYNOLDS_INTRO_DICTATION,
    suggestedUpdates: [],
    fieldUpdates: [
      {
        id: "ai-partial-0",
        label: "Open to workflow discussion",
        dbKey: "provider_evaluation_openness",
        proposedValue: "Open to workflow discussion.",
        accepted: false,
        conflict: null,
        proposedScope: "provider",
        scopeReason: "",
        proposedDestination: "provider",
        destinationReason: "",
      },
      {
        id: "ai-partial-1",
        label: "Procedures / case mix",
        dbKey: "provider_procedure_focus",
        proposedValue: "Hernia repair focus.",
        accepted: false,
        conflict: null,
        proposedScope: "provider",
        scopeReason: "",
        proposedDestination: "provider",
        destinationReason: "",
      },
    ],
    intelligenceReview: {
      confirmedUpdates: [],
      partiallyConfirmed: [],
      stillWorthConfirming: [],
      relatedOperationalAreas: [],
    },
    stillMissing: [],
    saveAsNoteAccepted: false,
    usesProviderIntelligence: false,
    aiMapping: {
      summary: "",
      confidence: "medium",
      reasoning: "",
      source_scope: "debrief:test",
      operational_signals: [],
      confirmed_updates: [],
      partial_updates: [
        {
          label: "Open to workflow discussion",
          domain: "relationship",
          confidence: "medium",
          reasoning: "Open to workflow discussion.",
          still_needs: [],
        },
      ],
      still_to_validate: [{ question: "Scheduling owner / coordinator named", priority: "medium" }],
      recommended_next_moves: [],
      do_not_update: [],
    },
    atomicFacts: [],
    mappingSource: "openai",
  };
}

describe("LogUpdateSuggestedReview legacy snapshots", () => {
  it("builds intelligence brief from provider field updates without atomic facts", () => {
    render(
      <LogUpdateSuggestedReview
        review={legacySnapshotReview()}
        sourceReference="engagement:test"
        onReviewChange={vi.fn()}
        onContactsChange={vi.fn()}
        onToggleUpdate={vi.fn()}
        onResolveConflict={vi.fn()}
      />,
    );

    expect(screen.getByTestId("ai-intelligence-brief")).toBeTruthy();
    expect(screen.queryByTestId("ai-debrief-actionable-empty")).toBeNull();
    expect(screen.queryByText("No actionable intelligence from this debrief.")).toBeNull();
  });
});
