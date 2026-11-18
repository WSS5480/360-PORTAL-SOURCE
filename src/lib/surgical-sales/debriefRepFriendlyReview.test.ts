import { describe, expect, it } from "vitest";
import {
  buildDebriefKeyTakeaways,
  buildDebriefRecommendedNextSteps,
  repFriendlyFieldTargetLabel,
  sanitizeRepFriendlyCopy,
} from "@/lib/surgical-sales/debriefRepFriendlyReview";
import type { DebriefIntelligenceExtractionReview } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";

describe("debriefRepFriendlyReview", () => {
  it("strips technical mapping phrases from display copy", () => {
    expect(sanitizeRepFriendlyCopy("Provider-linked deployment readiness signal")).not.toMatch(
      /provider-linked|deployment readiness|readiness signal/i,
    );
  });

  it("uses business outcome labels instead of db keys", () => {
    expect(repFriendlyFieldTargetLabel("provider_scheduling_contact")).toBe(
      "Observation readiness",
    );
    expect(repFriendlyFieldTargetLabel("provider_workflow_pain_points")).toBe(
      "Provider profile intelligence",
    );
  });

  it("builds key takeaways from AI summary", () => {
    const review = {
      sourceText: "Karen handles scheduling. Not opposed to observation.",
      aiMapping: { summary: "Observation access looks possible if routed through Karen." },
    } as LogUpdateParseResult;
    const extraction = {
      summary: "Observation access looks possible if routed through Karen.",
      intelligenceUpdates: [],
      unresolvedItems: [],
    } as DebriefIntelligenceExtractionReview;

    const lines = buildDebriefKeyTakeaways({ review, extraction });
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]).toMatch(/observation access/i);
  });

  it("preserves full summary text in key takeaways instead of truncating at insight-card length", () => {
    const longSummary =
      "Observation access looks possible if routed through Karen, but the team still needs to confirm credentialing requirements and align with Mike on evaluation timing before scheduling the first case.";
    const review = {
      sourceText: "Karen handles scheduling. Not opposed to observation.",
      aiMapping: { summary: longSummary },
    } as LogUpdateParseResult;
    const extraction = {
      summary: longSummary,
      intelligenceUpdates: [],
      unresolvedItems: [],
    } as DebriefIntelligenceExtractionReview;

    const lines = buildDebriefKeyTakeaways({ review, extraction });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(longSummary);
    expect(lines[0]).not.toMatch(/…$/);
    expect(lines[0]).not.toBe("Observation access appears possible.");
  });

  it("dedupes recommended next steps that only differ by trailing punctuation", () => {
    const text = "Confirm who officially approves vendor observation access";
    const review = {
      sourceText: "x",
      aiMapping: {
        recommended_next_moves: [{ action: text }, { action: `${text}.` }],
      },
    } as LogUpdateParseResult;

    const steps = buildDebriefRecommendedNextSteps({
      review,
      followUp: { required: [], helpful: [] },
    });

    expect(steps).toHaveLength(1);
    expect(steps[0]).toBe(`${text}.`);
  });
});
