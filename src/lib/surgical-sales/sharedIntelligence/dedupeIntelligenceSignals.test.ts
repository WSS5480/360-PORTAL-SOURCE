import { describe, expect, it } from "vitest";

import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import {
  dedupeProductMentions,
  dedupeProcedureSignals,
  dedupeUniversalFacts,
  mergeDuplicateDebriefAtomicFacts,
} from "@/lib/surgical-sales/sharedIntelligence/dedupeIntelligenceSignals";
import { extractProductMentionsFromText } from "@/lib/surgical-sales/sharedIntelligence/extractProductMention";
import { extractProcedureSignalsFromText } from "@/lib/surgical-sales/sharedIntelligence/extractProcedureSignals";
import type { UniversalSurgicalFact } from "@/lib/surgical-sales/universalExtractor/types";

describe("dedupeIntelligenceSignals", () => {
  it("dedupes double Bard Mesh mentions", () => {
    const mentions = extractProductMentionsFromText({
      text: "Using Bard Mesh. Still using Bard Mesh for cases.",
      mode: "debrief",
    });
    expect(dedupeProductMentions(mentions)).toHaveLength(1);
  });

  it("merges OpenAI + supplement same product into one atomic fact", () => {
    const facts: DebriefAtomicFact[] = [
      {
        fact_type: "current_product",
        entity: "Bard Mesh",
        attribute: "needs_confirmation",
        value: "hernia cases",
        confidence: "medium",
        evidence: "using Bard Mesh in hernia cases",
      },
      {
        fact_type: "current_product",
        entity: "Bard Mesh",
        attribute: "validated",
        value: "current product usage",
        confidence: "high",
        evidence: "He uses Bard Mesh.",
      },
    ];
    const merged = mergeDuplicateDebriefAtomicFacts(facts);
    expect(merged.filter((fact) => fact.entity === "Bard Mesh")).toHaveLength(1);
    expect(merged[0]?.confidence).toBe("high");
  });

  it("dedupes UF two fragments same product into one fact row", () => {
    const facts: UniversalSurgicalFact[] = [
      {
        concept: "current_product",
        normalized_label: "Current product: Bard Mesh",
        assertion_level: "provider_reported",
        source_type: "intro_call",
        evidence_text: "Using Bard Mesh for ventral cases.",
        confidence: "high",
        negated: false,
        uncertain: false,
        product_mentioned: "Bard Mesh",
      },
      {
        concept: "current_product",
        normalized_label: "Current product: Bard Mesh",
        assertion_level: "provider_reported",
        source_type: "intro_call",
        evidence_text: "Still using Bard Mesh.",
        confidence: "medium",
        negated: false,
        uncertain: false,
        product_mentioned: "Bard Mesh",
      },
    ];
    expect(dedupeUniversalFacts(facts)).toHaveLength(1);
  });

  it("dedupes duplicate procedure signals", () => {
    const text =
      "They've been doing more robotic ventral hernia repairs lately and more robotic ventral hernia repairs this quarter.";
    const signals = extractProcedureSignalsFromText({ text, declaredSource: "intro_call" });
    const deduped = dedupeProcedureSignals(signals);
    const roboticTrends = deduped.filter((signal) =>
      /robotic ventral hernia repair/i.test(signal.normalizedLabel),
    );
    expect(roboticTrends.length).toBeLessThanOrEqual(1);
  });
});
