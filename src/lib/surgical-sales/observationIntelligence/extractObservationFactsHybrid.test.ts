import { describe, expect, it } from "vitest";

import { extractObservationFactsHybrid } from "./extractObservationFactsHybrid";
import { validateLlmObservationFacts } from "./llmObservationFactExtraction";

describe("extractObservationFactsHybrid", () => {
  it("returns rules-only results when LLM fallback is disabled", async () => {
    const result = await extractObservationFactsHybrid(
      "They're still using Bard Mesh. Surgeon needed a different angle before fixation.",
      { enableLlmFallback: false },
    );

    expect(result.model).toBe("facts-v1");
    expect(result.facts.some((fact) => fact.type === "current_product")).toBe(true);
    expect(result.facts.some((fact) => fact.type === "visualization_challenge")).toBe(true);
  });

  it("merges mocked LLM facts for unmatched signal fragments", async () => {
    const result = await extractObservationFactsHybrid(
      "Bard Mesh is on the preference card for these hernia cases.",
      {
        enableLlmFallback: true,
        llmExtractor: async () => [
          {
            type: "current_product",
            value: "Bard Mesh",
            evidence: "Bard Mesh is on the preference card",
          },
          {
            type: "competitor_product",
            value: "Bard Mesh",
            evidence: "Bard Mesh is on the preference card",
          },
        ],
      },
    );

    expect(result.model).toBe("facts-v1-hybrid");
    expect(result.facts.some((fact) => fact.type === "current_product")).toBe(true);
    expect(result.facts.some((fact) => fact.type === "competitor_product")).toBe(true);
  });
});

describe("validateLlmObservationFacts", () => {
  it("rejects provider frustration without explicit frustration language", () => {
    const facts = validateLlmObservationFacts("Hard to see before fixation.", [
      {
        type: "provider_frustration",
        value: "provider clinical frustration observed",
        evidence: "Hard to see before fixation",
      },
    ]);

    expect(facts).toHaveLength(0);
  });

  it("rejects transcript chunks as fact values", () => {
    const fragment =
      "Surgeon seemed pretty frustrated with visualization throughout the whole case and kept repositioning.";
    const facts = validateLlmObservationFacts(fragment, [
      {
        type: "provider_frustration",
        value: fragment,
        evidence: "frustrated with visualization",
      },
    ]);

    expect(facts).toHaveLength(0);
  });
});
