import { describe, expect, it } from "vitest";
import { buildDebriefOperationalReview } from "@/lib/surgical-sales/buildDebriefOperationalReview";
import {
  buildMergedOperationalReviewCards,
  mergeOperationalSignalsToReviewCard,
} from "@/lib/surgical-sales/mergeDebriefOperationalReview";
import {
  buildOperationalSignalsFromDebriefText,
  buildProviderOperationalState,
  mapDebriefNarrativeToOperationalSignals,
} from "@/lib/surgical-sales/operationalIntelligenceEngine";

const VAGUE_SCHEDULING =
  "Karen came up a few times and seems to help with timing. Surgeon did not seem opposed to observation.";

describe("mergeDebriefOperationalReview", () => {
  it("merges scheduling ownership, soft contact, and next step into one card", () => {
    const signals = mapDebriefNarrativeToOperationalSignals({
      providerId: "p1",
      narrative: VAGUE_SCHEDULING,
    });
    const schedulingSignals = signals.filter((s) => s.domain === "scheduling_ownership");
    expect(schedulingSignals.length).toBeGreaterThan(1);

    const state = buildProviderOperationalState({
      providerId: "p1",
      contact: {},
      gateInput: { contact: {} },
    });

    const card = mergeOperationalSignalsToReviewCard({
      topicId: "scheduling",
      signals: schedulingSignals,
      state,
    });

    expect(card.label).toBe("Scheduling pathway");
    expect(card.statusLabel).toBe("Partial");
    expect(card.summary).toMatch(/Karen mentioned as scheduling contact/i);
    expect(card.stillNeededItems).toEqual(
      expect.arrayContaining(["Contact information", "Authority confirmation"]),
    );
  });

  it("buildDebriefOperationalReview renders one card per topic, not per signal", () => {
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

    const schedulingSection = review.sections.find((s) => s.topicId === "scheduling");
    expect(schedulingSection?.cards).toHaveLength(1);
    expect(review.sections.every((s) => s.cards.length === 1)).toBe(true);
  });

  it("buildMergedOperationalReviewCards groups access signals into observation access topic", () => {
    const signals = mapDebriefNarrativeToOperationalSignals({
      providerId: "p1",
      narrative: VAGUE_SCHEDULING,
    });
    const state = buildProviderOperationalState({
      providerId: "p1",
      contact: {},
      gateInput: { contact: {} },
    });

    const cards = buildMergedOperationalReviewCards({ signals, state });
    expect(cards.some((c) => c.topicId === "observation_access")).toBe(true);
    expect(cards.some((c) => c.topicId === "scheduling")).toBe(true);
    expect(cards.filter((c) => c.topicId === "scheduling")).toHaveLength(1);
  });
});
