import { describe, expect, it } from "vitest";
import { runDebriefExtractionPipeline } from "@/lib/surgical-sales/debriefExtractionRegressionRunner";
import {
  buildIntelligenceBriefOutcomes,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import { composeDebriefReviewDisplay } from "@/lib/surgical-sales/universalExtractor/composeDebriefReviewDisplay";
import { runUniversalSurgicalExtraction } from "@/lib/surgical-sales/universalExtractor/runUniversalSurgicalExtraction";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import { canonicalProcedureLabel } from "@/lib/surgical-sales/sharedIntelligence/procedurePatterns";
import { workflowOverlayFromFact } from "@/lib/surgical-sales/universalExtractor/adaptUniversalFactsToDebriefClinicalBrief";
import { extractUniversalCategorySignals } from "@/lib/surgical-sales/sharedIntelligence/extractUniversalCategorySignals";

/** Exact user QA dictation that still failed in live intro-call review UI. */
const LETTUCE_INTRO = [
  "Stopped by to introduce myself to Dr. Lettuce today between clinic and his afternoon cases.",
  "We had about ten minutes to talk.",
  "He primarily performs robotic and laparoscopic ventral hernia repairs and said he's always interested in learning about new technology if it offers a meaningful clinical benefit.",
  "Right now he's comfortable with the products he's using and isn't actively looking to make a change, but he enjoys reviewing published clinical evidence before forming an opinion.",
  "We talked briefly about our portfolio, and he said he'd be open to having me observe one of his cases in the future if scheduling allows.",
  "I also met Jessica, his scheduler, who handles observation requests and coordinates OR access.",
  "She asked me to email her a few possible dates, and she'll see what works with Dr. Lettuce's schedule.",
  "Overall it was a positive first meeting, and I think there's a good opportunity to build the relationship over the next few visits.",
].join(" ");

function ufRuns(dictation: string): UniversalFactExtractionRun[] {
  const extraction = runUniversalSurgicalExtraction({
    raw_note: dictation,
    declared_source_type: "intro_call",
    context: { provider_display_name: "Tom Lettuce" },
  });
  return [
    {
      capture_id: "lettuce-live-review",
      declared_source_type: "intro_call",
      extraction_model: extraction.model,
      created_at: extraction.extracted_at,
      operational_note_id: null,
      facts: extraction.facts.map((fact, index) => ({
        ...fact,
        id: `lettuce-live-${index}`,
        capture_id: "lettuce-live-review",
        provider_id: null,
        organization_id: null,
        case_id: null,
        encounter_id: null,
        suppressed: false,
        created_at: extraction.extracted_at,
      })),
    },
  ];
}

function composeLiveReview(dictation: string) {
  const pipeline = runDebriefExtractionPipeline({ dictation });
  const debriefRuns = ufRuns(dictation);
  return composeDebriefReviewDisplay({
    dictation,
    logUpdate: {
      ...pipeline.parse,
      debriefUniversalFactsRuns: debriefRuns,
    },
    debriefRuns,
    proposedContacts: pipeline.proposedContacts,
    providerLabel: "Tom Lettuce",
  });
}

describe("Live intro-call review composition — Lettuce dictation", () => {
  it("does not invent Preference repair procedure labels", () => {
    expect(canonicalProcedureLabel("robotic and laparoscopic preference")).not.toMatch(/Preference/i);
    expect(canonicalProcedureLabel("robotic and laparoscopic preference")).not.toMatch(/repair/i);
  });

  it("preserves not-actively-looking commercial disposition in workflow overlay", () => {
    const overlay = workflowOverlayFromFact({
      id: "1",
      capture_id: "c",
      provider_id: null,
      organization_id: null,
      case_id: null,
      encounter_id: null,
      suppressed: false,
      created_at: new Date().toISOString(),
      concept: "provider_sentiment",
      normalized_label: "Commercial disposition: Not actively looking to change products",
      evidence_text:
        "Right now he's comfortable with the products he's using and isn't actively looking to make a change.",
      assertion_level: "provider_reported",
      source_type: "intro_call",
      confidence: "high",
      negated: false,
      uncertain: false,
    });
    expect(overlay?.primaryLine).toMatch(/not actively looking/i);
    expect(overlay?.primaryLine).not.toMatch(/Observation before product evaluation/i);
  });

  it("does not overstate observe-before-eval sequencing from soft observation interest", () => {
    const signals = extractUniversalCategorySignals(LETTUCE_INTRO, {
      providerName: "Tom Lettuce",
    });
    expect(
      signals.some(
        (s) =>
          s.concept === "provider_sentiment" &&
          /Observation before product evaluation/i.test(s.normalized_label),
      ),
    ).toBe(false);
    expect(
      signals.some(
        (s) =>
          s.concept === "provider_sentiment" &&
          /Not actively looking to change products/i.test(s.normalized_label),
      ),
    ).toBe(true);
  });

  it("composeDebriefReviewDisplay surfaces Jessica, procedure focus, commercial posture, and email action without junk", () => {
    const composed = composeLiveReview(LETTUCE_INTRO);
    const outcomes = buildIntelligenceBriefOutcomes(composed.brief);
    const lines = [
      ...outcomes.map((o) => `${o.kind}: ${o.primaryLine ?? ""} ${o.summaryLine ?? ""}`),
      ...composed.actionableCards.map(
        (c) =>
          `${c.category}: ${c.headline} ${c.clinicalProcedureFocus ?? ""} ${c.clinicalDisplayValue ?? ""}`,
      ),
      ...(composed.intelligenceUpdates ?? []).map((u) =>
        JSON.stringify(u),
      ),
      JSON.stringify(composed.brief ?? {}),
    ].join("\n");

    expect(lines).toMatch(/Jessica/i);
    expect(lines).toMatch(/ventral hernia/i);
    expect(lines).toMatch(/Robotic/i);
    expect(lines).toMatch(/Laparoscopic/i);
    expect(lines).toMatch(/not actively looking|comfortable with the products/i);
    expect(lines).toMatch(/Email proposed dates|published clinical evidence|open to new technology/i);
    expect(lines).not.toMatch(/Preference\s+repair/i);
    expect(lines).not.toMatch(/\/\s*:/);
    expect(lines).not.toMatch(/Lettuce\s+Today/i);
    expect(lines).not.toMatch(/New Procedure Adoption/i);

    const followUps = outcomes.filter((o) => o.kind === "follow_up");
    for (const row of followUps) {
      const text = `${row.primaryLine ?? ""} ${row.summaryLine ?? ""}`.trim();
      expect(text.length).toBeGreaterThan(3);
    }
  });
});
