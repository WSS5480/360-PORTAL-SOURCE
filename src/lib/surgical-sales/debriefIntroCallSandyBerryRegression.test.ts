import { describe, expect, it } from "vitest";

import { buildDebriefActionableReviewCards } from "@/lib/surgical-sales/buildDebriefActionableReviewCards";
import { runDebriefExtractionPipeline } from "@/lib/surgical-sales/debriefExtractionRegressionRunner";
import { INTRO_CALL_SANDY_BERRY_DICTATION } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";
import {
  buildDebriefIntelligenceBrief,
  buildIntelligenceBriefOutcomes,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";

function runSandyBerryFixture() {
  return runDebriefExtractionPipeline({ dictation: INTRO_CALL_SANDY_BERRY_DICTATION });
}

function buildCardsAndBrief() {
  const result = runSandyBerryFixture();
  const cards = buildDebriefActionableReviewCards({
    extraction: result.extraction,
    proposedContacts: result.proposedContacts,
    dictation: INTRO_CALL_SANDY_BERRY_DICTATION,
  });
  const brief = buildDebriefIntelligenceBrief({ cards });
  return { result, cards, brief };
}

describe("intro call debrief review — Sandy Berry regression", () => {
  it("classifies discussion-language observation access as interest, never approved or denied", () => {
    const { brief } = buildCardsAndBrief();

    expect(brief.observationAccess).not.toBeNull();
    const bullets = brief.observationAccess?.bullets ?? [];
    expect(bullets).toContain("Interested");
    expect(bullets.join("\n")).not.toMatch(/denied|not approved|not yet approved|approved$/im);
  });

  it("captures credentialing required", () => {
    const { brief } = buildCardsAndBrief();
    expect(brief.observationAccess?.bullets ?? []).toContain("Credentialing Required");
  });

  it("captures scheduler involvement even though the scheduler is unnamed", () => {
    const { result, cards, brief } = buildCardsAndBrief();
    const everything = [
      ...cards.map((card) => `${card.headline} ${card.insightTitle ?? ""}`),
      ...brief.followUpActions.map((action) => action.primaryLine),
      ...(result.extraction.unresolvedItems ?? []),
    ]
      .join("\n")
      .toLowerCase();
    expect(everything).toMatch(/schedul/);
  });

  it("captures both volume trends and robotic as a technique", () => {
    const { brief } = buildCardsAndBrief();
    const clinicalLines = brief.clinicalInsights
      .map((insight) => `${insight.categoryLabel} · ${insight.primaryLine}`)
      .join("\n");

    expect(clinicalLines).toMatch(/ventral hernia[^\n]*increasing/i);
    expect(clinicalLines).toMatch(/abdominal wall reconstruction[^\n]*increasing/i);
    expect(clinicalLines).toMatch(/technique \/ modality[^\n]*robotic/i);
  });

  it("never classifies robotic as a product or competitor", () => {
    const { result, cards } = buildCardsAndBrief();

    const productCards = cards.filter((card) => card.category === "product_intelligence");
    for (const card of productCards) {
      expect(`${card.headline} ${card.productName ?? ""}`).not.toMatch(/robotic/i);
    }

    const productFieldUpdates = (result.extraction.fieldUpdates ?? []).filter((update) =>
      /product|competitive/i.test(update.dbKey),
    );
    for (const update of productFieldUpdates) {
      expect(update.proposedValue).not.toMatch(/^robotic$/i);
    }
  });

  it("does not surface a redundant approval chip for interest-only debriefs", () => {
    const { brief } = buildCardsAndBrief();
    const outcomes = buildIntelligenceBriefOutcomes(brief);
    const observation = outcomes.find((outcome) => outcome.kind === "observation_access");
    expect(observation?.observationFields?.status).toBe("Interested");
    expect(observation?.observationFields?.approval ?? "").toBe("");
  });
});
