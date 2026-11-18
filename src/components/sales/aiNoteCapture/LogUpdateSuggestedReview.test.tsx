import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LogUpdateSuggestedReview } from "@/components/sales/aiNoteCapture/LogUpdateSuggestedReview";
import { runDebriefExtractionPipeline } from "@/lib/surgical-sales/debriefExtractionRegressionRunner";
import { MARK_ONION_JENNIFER_REYNOLDS_INTRO_DICTATION } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";

vi.mock("@/lib/surgical-sales/universalExtractor/composeDebriefReviewDisplay", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/surgical-sales/universalExtractor/composeDebriefReviewDisplay")>();
  return actual;
});

function legacyAiMappingReview(): LogUpdateParseResult {
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
        {
          label: "Procedures / case mix",
          domain: "case_mix",
          confidence: "medium",
          reasoning: "Hernia repair focus.",
          still_needs: [],
        },
      ],
      still_to_validate: [
        { question: "Credentialing turnaround time", priority: "medium" },
        { question: "Scheduling owner / coordinator named", priority: "medium" },
      ],
      recommended_next_moves: [],
      do_not_update: [],
    },
    atomicFacts: [],
    mappingSource: "openai",
  };
}

describe("LogUpdateSuggestedReview", () => {
  it("renders intelligence brief review for legacy snapshots missing usesProviderIntelligence", () => {
    const pipeline = runDebriefExtractionPipeline({
      dictation: MARK_ONION_JENNIFER_REYNOLDS_INTRO_DICTATION,
    });
    const review: LogUpdateParseResult = {
      ...pipeline.parse,
      usesProviderIntelligence: false,
    };

    render(
      <LogUpdateSuggestedReview
        review={review}
        sourceReference="engagement:test"
        onReviewChange={vi.fn()}
        onContactsChange={vi.fn()}
        onToggleUpdate={vi.fn()}
        onResolveConflict={vi.fn()}
      />,
    );

    expect(screen.getByTestId("ai-debrief-review-suggestions")).toBeTruthy();
    expect(screen.getByTestId("ai-intelligence-brief")).toBeTruthy();
    expect(screen.queryByText("Still to confirm")).toBeNull();
  });

  it("does not fall back to legacy DebriefApprovalReview when provider field updates exist", () => {
    const pipeline = runDebriefExtractionPipeline({
      dictation: MARK_ONION_JENNIFER_REYNOLDS_INTRO_DICTATION,
    });

    render(
      <LogUpdateSuggestedReview
        review={{
          ...legacyAiMappingReview(),
          atomicFacts: pipeline.parse.atomicFacts,
          fieldUpdates: pipeline.parse.fieldUpdates,
        }}
        sourceReference="engagement:test"
        onReviewChange={vi.fn()}
        onContactsChange={vi.fn()}
        onToggleUpdate={vi.fn()}
        onResolveConflict={vi.fn()}
      />,
    );

    expect(screen.getByTestId("ai-intelligence-brief")).toBeTruthy();
    expect(screen.queryByText("Save Selected Updates")).toBeNull();
  });
});
