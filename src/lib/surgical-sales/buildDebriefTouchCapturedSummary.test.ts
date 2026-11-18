import { describe, expect, it } from "vitest";
import { buildDebriefOperationalReview } from "@/lib/surgical-sales/buildDebriefOperationalReview";
import {
  buildTouchCapturedSummaryFromInsightGroups,
  buildTouchCapturedSummaryFromOperationalCards,
  deriveTouchCapturedRecommendedNextMove,
} from "@/lib/surgical-sales/buildDebriefTouchCapturedSummary";
import {
  buildMergedOperationalReviewCards,
  type MergedOperationalReviewCard,
} from "@/lib/surgical-sales/mergeDebriefOperationalReview";
import {
  buildOperationalSignalsFromDebriefText,
  buildProviderOperationalState,
  mapDebriefNarrativeToOperationalSignals,
} from "@/lib/surgical-sales/operationalIntelligenceEngine";
import { buildDebriefInsightGroups } from "@/lib/surgical-sales/debriefReviewStreamlined";
import { buildDebriefIntelligenceExtractionReview } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";

const VAGUE_SCHEDULING =
  "Karen came up a few times and seems to help with timing. Surgeon did not seem opposed to observation.";

describe("buildDebriefTouchCapturedSummary", () => {
  it("builds category breakdown and recommended next move from operational cards", () => {
    const signals = mapDebriefNarrativeToOperationalSignals({
      providerId: "p1",
      narrative: VAGUE_SCHEDULING,
    });
    const state = buildProviderOperationalState({
      providerId: "p1",
      contact: {},
      gateInput: { contact: {} },
      pendingDebrief: { narrative: VAGUE_SCHEDULING },
    });
    const cards = buildMergedOperationalReviewCards({ signals, state });

    const summary = buildTouchCapturedSummaryFromOperationalCards({
      cards,
      signals,
      state,
    });

    expect(summary.title).toBe("Touch Captured");
    expect(summary.totalUpdates).toBe(cards.length);
    expect(summary.totalUpdatesLabel).toMatch(/updates detected$/);
    expect(summary.categories.some((c) => c.label === "Provider" && c.count >= 1)).toBe(true);
    expect(summary.categories.some((c) => c.label === "Access" && c.count >= 1)).toBe(true);
    expect(summary.recommendedNextMove).toBe("Get Karen's phone or email.");
  });

  it("includes touch captured summary on operational review build", () => {
    const { parse } = buildOperationalSignalsFromDebriefText({
      providerId: "p1",
      narrative: VAGUE_SCHEDULING,
    });

    const review = buildDebriefOperationalReview({
      providerId: "p1",
      narrative: VAGUE_SCHEDULING,
      parse,
      contact: {},
      gateInput: { contact: {} },
    });

    expect(review.touchCapturedSummary.title).toBe("Touch Captured");
    expect(review.touchCapturedSummary.recommendedNextMove).toMatch(/Karen/i);
  });

  it("derives recommended next move from scheduling soft contact only", () => {
    const signals = mapDebriefNarrativeToOperationalSignals({
      providerId: "p1",
      narrative: VAGUE_SCHEDULING,
    });

    expect(
      deriveTouchCapturedRecommendedNextMove({
        signals,
        state: buildProviderOperationalState({
          providerId: "p1",
          contact: {},
          gateInput: { contact: {} },
        }),
      }),
    ).toBe("Get Karen's phone or email.");
  });

  it("maps insight groups into touch captured categories", () => {
    const { parse } = buildOperationalSignalsFromDebriefText({
      providerId: "p1",
      narrative: VAGUE_SCHEDULING,
    });
    const extraction = buildDebriefIntelligenceExtractionReview({
      review: parse,
      proposedContacts: [],
    });
    const insightGroups = buildDebriefInsightGroups({
      extraction,
      review: parse,
      proposedContacts: [],
    });

    const summary = buildTouchCapturedSummaryFromInsightGroups({
      insightGroups,
      parse,
    });

    expect(summary.title).toBe("Touch Captured");
    expect(summary.totalUpdates).toBeGreaterThan(0);
    expect(summary.categories.length).toBeGreaterThan(0);
  });

  it("groups multiple workflow-topic cards into Workflow bucket", () => {
    const cards: MergedOperationalReviewCard[] = [
      {
        signalId: "topic-workflow",
        topicId: "workflow",
        label: "Workflow",
        statusLabel: "Partial",
        summary: "Case volume discussed.",
        stillNeededItems: [],
        primaryAction: null,
        fieldUpdateIds: [],
        fieldUpdateId: null,
        evidence: { sourceQuote: null, confidenceLabel: null, reasoning: null },
      },
      {
        signalId: "topic-clinical_focus",
        topicId: "clinical_focus",
        label: "Clinical focus",
        statusLabel: "Likely",
        summary: "Procedure focus noted.",
        stillNeededItems: [],
        primaryAction: null,
        fieldUpdateIds: [],
        fieldUpdateId: null,
        evidence: { sourceQuote: null, confidenceLabel: null, reasoning: null },
      },
      {
        signalId: "topic-observation_access",
        topicId: "observation_access",
        label: "Observation access",
        statusLabel: "Partial",
        summary: "Observation path possible.",
        stillNeededItems: [],
        primaryAction: null,
        fieldUpdateIds: [],
        fieldUpdateId: null,
        evidence: { sourceQuote: null, confidenceLabel: null, reasoning: null },
      },
    ];

    const summary = buildTouchCapturedSummaryFromOperationalCards({
      cards,
      signals: [],
      state: buildProviderOperationalState({
        providerId: "p1",
        contact: {},
        gateInput: { contact: {} },
      }),
    });

    expect(summary.totalUpdates).toBe(3);
    expect(summary.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Provider", count: 1 }),
        expect.objectContaining({ label: "Workflow", count: 1 }),
        expect.objectContaining({ label: "Access", count: 1 }),
      ]),
    );
  });
});
