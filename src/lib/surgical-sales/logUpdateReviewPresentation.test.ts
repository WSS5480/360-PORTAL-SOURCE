import { describe, expect, it } from "vitest";
import {
  buildLogUpdateReviewSaveSummary,
  collectValidationItems,
  confidencePreselectsByDefault,
  hasStructuredIntelligenceReview,
  nextMoveCreatesFollowUpTask,
  reviewScopeDisplayLabel,
  shouldUseAiDebriefIntelligenceReview,
} from "./logUpdateReviewPresentation";
import { formatReviewSaveScopeDisplay } from "./logUpdateReviewScopeDisplay";
import type { LogUpdateParseResult } from "./logUpdateParseFreeform";

describe("logUpdateReviewPresentation", () => {
  it("maps engagement_note scope to Engagement label", () => {
    expect(reviewScopeDisplayLabel("engagement_note")).toBe("Engagement");
    expect(reviewScopeDisplayLabel("provider")).toBe("Provider");
  });

  it("formats facility-on-provider-workspace with shared hospital note", () => {
    const display = formatReviewSaveScopeDisplay(
      {
        id: "ai-confirmed-0",
        label: "Scheduling process",
        dbKey: "provider_ideal_observation_process",
        proposedValue: "Scheduler approves after credentialing",
        accepted: true,
        conflict: null,
        proposedScope: "organization",
        scopeReason: "",
        proposedDestination: "facility",
        destinationReason: "",
      },
      { organizationLabel: "Test Hospital", fromProviderWorkspace: true },
    );
    expect(display.secondaryNote).toContain("Test Hospital");
  });

  it("preselects high confidence only (deprecated helper)", () => {
    expect(confidencePreselectsByDefault("high")).toBe(true);
    expect(confidencePreselectsByDefault("medium")).toBe(false);
    expect(confidencePreselectsByDefault("low")).toBe(false);
  });

  it("detects task-like next moves", () => {
    expect(nextMoveCreatesFollowUpTask("Create follow-up task with scheduler")).toBe(true);
    expect(nextMoveCreatesFollowUpTask("Share workflow one-pager")).toBe(false);
  });

  it("detects structured review from atomic facts without aiMapping", () => {
    const review = {
      sourceText: "Jennifer handles scheduling.",
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
      aiMapping: null,
      atomicFacts: [
        {
          fact_type: "contact_mention",
          entity: "Jennifer",
          attribute: "role",
          value: "scheduling coordinator",
          confidence: "medium",
          evidence: "Jennifer handles scheduling",
        },
      ],
      mappingSource: "openai",
    } as LogUpdateParseResult;

    expect(hasStructuredIntelligenceReview(review)).toBe(true);
  });

  it("does not treat empty atomic facts as structured review", () => {
    const review = {
      sourceText: "Quick hello.",
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
      usesProviderIntelligence: false,
      aiMapping: null,
      atomicFacts: [],
      mappingSource: "openai",
    } as LogUpdateParseResult;

    expect(hasStructuredIntelligenceReview(review)).toBe(false);
  });

  it("routes legacy aiMapping snapshots with provider fields to intelligence review", () => {
    const review = {
      sourceText: "Intro call debrief",
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
        partial_updates: [],
        still_to_validate: [],
        recommended_next_moves: [],
        do_not_update: [],
      },
      atomicFacts: [],
      mappingSource: "openai",
    } as LogUpdateParseResult;

    expect(shouldUseAiDebriefIntelligenceReview(review)).toBe(true);
  });

  it("builds footer save summary", () => {
    const review = {
      sourceText: "Met with scheduler",
      suggestedUpdates: [],
      fieldUpdates: [
        {
          id: "f1",
          label: "Procedure mix",
          dbKey: "provider_procedure_mix",
          proposedValue: "Open and lap",
          accepted: true,
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
      saveAsNoteAccepted: true,
      usesProviderIntelligence: true,
      aiMapping: {
        summary: "Learned access path",
        confidence: "high",
        reasoning: "Clear note",
        source_scope: "visit",
        operational_signals: [],
        confirmed_updates: [],
        partial_updates: [],
        still_to_validate: [
          {
            domain: "scheduling",
            question: "Who coordinates access?",
            priority: "high",
          },
        ],
        recommended_next_moves: [],
        do_not_update: [],
      },
      mappingSource: "openai",
    } as LogUpdateParseResult;

    expect(collectValidationItems(review)).toHaveLength(1);
    expect(buildLogUpdateReviewSaveSummary(review, { rawDebriefLabel: "raw debrief" })).toBe(
      "Saving: 1 recommended update · 1 validation item · raw debrief",
    );
  });
});
