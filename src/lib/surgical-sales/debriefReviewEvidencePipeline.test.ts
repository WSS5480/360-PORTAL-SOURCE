import { describe, expect, it } from "vitest";

import { INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";
import { runDebriefExtractionPipeline } from "@/lib/surgical-sales/debriefExtractionRegressionRunner";
import { buildDebriefActionableReviewCards } from "@/lib/surgical-sales/buildDebriefActionableReviewCards";
import {
  dedupeSimilarEvidence,
  isRepPlanningEvidence,
  isTruncatedEvidence,
  normalizeCardEvidenceQuotes,
} from "@/lib/surgical-sales/debriefReviewEvidencePipeline";

describe("debriefReviewEvidencePipeline", () => {
  it("rejects rep planning language as evidence", () => {
    expect(isRepPlanningEvidence("My next step is to identify Jennifer's contact information.")).toBe(
      true,
    );
    expect(isRepPlanningEvidence("He wasn't opposed to having me observe a case.")).toBe(false);
  });

  it("rejects truncated evidence fragments", () => {
    expect(isTruncatedEvidence("co surgical schedule")).toBe(true);
    expect(isTruncatedEvidence("coordin")).toBe(true);
    expect(isTruncatedEvidence("irst. He mentioned Jennifer")).toBe(false);
    expect(
      isTruncatedEvidence(
        "He mentioned that Jennifer in his office usually handles scheduling coordination.",
      ),
    ).toBe(false);
  });

  it("dedupes highly similar snippets keeping the longest", () => {
    const out = dedupeSimilarEvidence([
      "When I asked about observation access he said it's usually not a problem once credentialing is complete.",
      "When I asked about observation access he said it's usually not a problem once the credentialing process is complete and the timing works for the surgical schedule.",
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatch(/timing works/i);
  });

  it("clinical cards exclude planning quotes", () => {
    const clinical = normalizeCardEvidenceQuotes(
      [
        "Clinically, he mentioned they've been doing more robotic ventral hernia repairs lately.",
        "My next step is to identify Jennifer's contact information and confirm the pathway.",
      ],
      { cardCategory: "clinical_focus" },
    );
    expect(clinical).toHaveLength(1);
    expect(clinical[0]).toMatch(/robotic ventral/i);
    expect(clinical.join(" ")).not.toMatch(/my next step/i);
  });

  it("Tom Sandy review cards have clean non-truncated evidence", () => {
    const result = runDebriefExtractionPipeline({ dictation: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION });
    const cards = buildDebriefActionableReviewCards({
      extraction: result.extraction,
      proposedContacts: result.proposedContacts,
      dictation: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
    });

    const allEvidence = cards.flatMap((c) => c.evidenceQuotes.map((q) => q.replace(/^["']|["']$/g, "")));

    for (const quote of allEvidence) {
      expect(isRepPlanningEvidence(quote), quote).toBe(false);
      expect(isTruncatedEvidence(quote), quote).toBe(false);
    }

    const observation = cards.find((c) => c.category === "observation_access");
    const obsText = observation?.evidenceQuotes.join(" ") ?? "";
    expect(obsText).not.toMatch(/my next step/i);
    expect(obsText).not.toMatch(/doing more robotic ventral/i);

    const clinical = cards.filter((c) => c.category === "clinical_focus");
    for (const card of clinical) {
      for (const quote of card.evidenceQuotes) {
        expect(quote.toLowerCase()).toMatch(/clinically|robotic|abdominal|hernia|reconstruction/);
      }
    }
  });
});
