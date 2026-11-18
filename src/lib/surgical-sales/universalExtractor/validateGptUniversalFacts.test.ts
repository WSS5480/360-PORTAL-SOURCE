import { describe, expect, it } from "vitest";

import { validateAndNormalizeGptUniversalFacts } from "@/lib/surgical-sales/universalExtractor/validateGptUniversalFacts";
import type { GptUniversalFactRow } from "@/lib/surgical-sales/universalExtractor/gptUniversalFactExtractionSchema";

function row(overrides: Partial<GptUniversalFactRow>): GptUniversalFactRow {
  return {
    category: "product_usage",
    normalized_label: "ACSIS was used during the case",
    evidence_text: "Dr. Lettuce asked whether ACSIS works with their existing equipment.",
    confidence: "high",
    product_name: "ACSIS",
    should_persist: true,
    ...overrides,
  };
}

describe("validateAndNormalizeGptUniversalFacts", () => {
  it("rejects product usage when evidence is only interest or a question", () => {
    const result = validateAndNormalizeGptUniversalFacts({
      transcript:
        "Dr. Lettuce asked whether ACSIS works with their existing equipment. No commitments made.",
      declared_source_type: "observation_case",
      rows: [row({})],
    });

    expect(result.facts).toEqual([]);
    expect(result.rejections[0]?.reason).toMatch(/direct observed use/i);
  });

  it("keeps explicit role labels without inventing scheduling coordinator", () => {
    const result = validateAndNormalizeGptUniversalFacts({
      transcript: "OR manager stopped by briefly and asked me to send product information.",
      declared_source_type: "observation_case",
      rows: [
        row({
          category: "scheduler_contact",
          normalized_label: "OR Manager",
          evidence_text: "OR manager stopped by briefly",
          product_name: null,
          person_name: "OR Manager",
          role: null,
        }),
      ],
    });

    expect(result.facts[0]).toMatchObject({
      concept: "contact_role",
      normalized_label: "OR Manager",
    });
    expect(result.facts[0]).not.toHaveProperty("person_mentioned");
  });

  it("rejects product_interest when evidence only states current usage", () => {
    const result = validateAndNormalizeGptUniversalFacts({
      transcript:
        "He mentioned they're currently using Bard Soft Mesh for most routine cases and said he's generally happy with it.",
      declared_source_type: "intro_call",
      rows: [
        row({
          category: "product_interest",
          normalized_label: "Product interest: Bard Soft Mesh",
          evidence_text: "they're currently using Bard Soft Mesh for most routine cases",
          product_name: "Bard Soft Mesh",
        }),
      ],
    });

    expect(result.facts).toEqual([]);
    expect(result.rejections[0]?.reason).toMatch(/current\/incumbent product usage/i);
  });

  it("rejects scheduler contacts with implausible person names", () => {
    const result = validateAndNormalizeGptUniversalFacts({
      transcript: "Dr. Ham seemed open to continuing the conversation.",
      declared_source_type: "intro_call",
      providerName: "John Ham",
      rows: [
        row({
          category: "scheduler_contact",
          normalized_label: "Ham Seemed · Scheduling Coordinator",
          evidence_text: "Dr. Ham seemed open to continuing the conversation.",
          product_name: null,
          person_name: "Ham Seemed",
          role: "Scheduling Coordinator",
        }),
      ],
    });

    expect(result.facts).toEqual([]);
    expect(result.rejections[0]?.reason).toMatch(/plausible person name/i);
  });
});
