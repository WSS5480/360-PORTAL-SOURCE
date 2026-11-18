import { describe, expect, it } from "vitest";
import {
  acceptAllHighConfidenceUpdates,
  buildDebriefIntelligenceExtractionReview,
  buildInitialProposedContacts,
  resolveDebriefReviewConfidenceTier,
} from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";
import type { DebriefIntelligenceExtractionContext } from "@/lib/surgical-sales/debriefIntelligenceExtractionContext";

function fieldRow(overrides: Partial<LogUpdateRoutedFieldUpdate> = {}): LogUpdateRoutedFieldUpdate {
  return {
    id: "ai-confirmed-0",
    label: "Scheduling owner",
    dbKey: "provider_observation_coordinator_contact",
    proposedValue: "Karen Miller schedules cases",
    accepted: true,
    conflict: null,
    proposedScope: "provider",
    scopeReason: "",
    proposedDestination: "provider",
    destinationReason: "",
    ...overrides,
  };
}

function baseReview(overrides: Partial<LogUpdateParseResult> = {}): LogUpdateParseResult {
  return {
    sourceText:
      "Dr. Smith said Karen Miller schedules everything. They use IntelliCentrics for vendor access.",
    suggestedUpdates: [],
    fieldUpdates: [fieldRow()],
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
      summary: "Scheduling and credentialing path captured.",
      confidence: "high",
      reasoning: "Direct statements from provider.",
      source_scope: "provider:test",
      operational_signals: [
        {
          domain: "scheduling",
          signal: "Scheduler identified",
          confidence: "high",
          evidence: "Karen Miller schedules everything",
          operational_meaning: "Karen Miller owns observation scheduling",
          save_target: "provider",
          reasoning: "Explicit attribution",
        },
      ],
      confirmed_updates: [
        {
          domain: "scheduling",
          label: "Scheduling owner",
          value: "Karen Miller schedules cases",
          confidence: "high",
          save_target: "provider",
          reasoning: "Dr. Smith named Karen as scheduler",
        },
      ],
      partial_updates: [],
      still_to_validate: [{ domain: "credentialing", question: "Credentialing requirements unclear", priority: "medium" }],
      recommended_next_moves: [],
      do_not_update: [],
    },
    mappingSource: "openai",
    ...overrides,
  };
}

const discoveryContext: DebriefIntelligenceExtractionContext = {
  pathwayStageId: "discovery",
  pathwayStageLabel: "Discovery",
  discoveryReadinessPercent: 13,
  openQuestions: [],
  signalStatuses: [],
  supportContacts: [],
  credentialingPlatforms: [
    {
      id: "plat-1",
      name: "IntelliCentrics / SEC3URE",
      name_normalized: "intellicentrics / sec3ure",
      aliases: ["SEC3URE"],
      active: true,
    },
  ],
  providerPlatformName: null,
  upcomingEngagements: [],
  pastEngagements: [],
  productFocus: null,
  notesHistory: [],
};

describe("buildDebriefIntelligenceExtractionReview", () => {
  it("builds intelligence updates with source quotes", () => {
    const review = buildDebriefIntelligenceExtractionReview({
      review: baseReview(),
      discoveryContext,
      proposedContacts: buildInitialProposedContacts({
        review: baseReview(),
        sourceReference: "engagement:test",
      }),
    });

    expect(review.intelligenceUpdates[0]?.confidenceTier).toBe("high_confidence");
    expect(review.intelligenceUpdates[0]?.evidenceQuote.length).toBeGreaterThan(0);
    expect(review.intelligenceUpdates[0]?.suggestedUpdate.length).toBeGreaterThan(0);
    expect(review.extractedItems.length).toBeGreaterThan(0);
    expect(review.proposedContacts[0]?.displayName).toContain("Karen");
    expect(review.platformMatches.length).toBeGreaterThan(0);
  });

  it("acceptAllHighConfidenceUpdates checks only high-confidence rows", () => {
    const review = baseReview({
      fieldUpdates: [
        fieldRow({ id: "ai-confirmed-0", accepted: false }),
        fieldRow({ id: "ai-partial-0", accepted: false, proposedValue: "Maybe" }),
      ],
    });
    const next = acceptAllHighConfidenceUpdates(review);
    expect(next.fieldUpdates.find((f) => f.id === "ai-confirmed-0")?.accepted).toBe(true);
  });
});
