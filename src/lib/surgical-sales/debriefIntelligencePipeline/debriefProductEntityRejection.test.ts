import { describe, expect, it } from "vitest";

import {
  normalizeAtomicFactsWithRejections,
  type DebriefAtomicFact,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import {
  isProductStatusToken,
  textNamesKnownDebriefProduct,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefProductIntelligenceExtraction";

function fact(overrides: Partial<DebriefAtomicFact>): DebriefAtomicFact {
  return {
    fact_type: "current_product",
    entity: "",
    attribute: "current_product",
    value: "value",
    confidence: "medium",
    evidence: "evidence text long enough",
    ...overrides,
  };
}

describe("Phase A — product entity rejection (RCA: 'Current product identified: unknown')", () => {
  it("recognizes status tokens", () => {
    for (const token of ["unknown", "Unclear", "none", "N/A", "tbd", "not sure", "unsure"]) {
      expect(isProductStatusToken(token), token).toBe(true);
    }
    expect(isProductStatusToken("OviTex")).toBe(false);
    expect(isProductStatusToken("Bard Mesh")).toBe(false);
  });

  it("detects known products inside free text", () => {
    expect(textNamesKnownDebriefProduct("they are still using OviTex for most repairs")).toBe(true);
    expect(textNamesKnownDebriefProduct("no product was named in this note")).toBe(false);
  });

  it("re-types current_product with a status-token entity to evidence_gap and records the rejection", () => {
    const dictation = "Not sure what mesh they are using right now.";
    const { facts, rejected } = normalizeAtomicFactsWithRejections(
      [
        fact({
          entity: "unknown",
          value: "unknown product in use",
          evidence: "Not sure what mesh they are using right now.",
        }),
      ],
      dictation,
    );

    expect(facts).toHaveLength(1);
    expect(facts[0].attribute).toBe("evidence_gap");
    expect(facts[0].entity).toBe("");
    expect(rejected).toContainEqual(
      expect.objectContaining({ reason: "invalid_product_entity", entity: "unknown" }),
    );
  });

  it("keeps product facts whose entity is invalid but whose evidence names a known product", () => {
    const dictation = "They are still using OviTex in most of their cases.";
    const { facts, rejected } = normalizeAtomicFactsWithRejections(
      [
        fact({
          entity: "unclear",
          value: "still using OviTex",
          evidence: "They are still using OviTex in most of their cases.",
        }),
      ],
      dictation,
    );

    expect(facts[0].fact_type).toBe("current_product");
    expect(facts[0].attribute).not.toBe("evidence_gap");
    expect(rejected).toHaveLength(0);
  });

  it("leaves valid product entities untouched", () => {
    const dictation = "They are using OviTex for ventral hernia repairs.";
    const { facts, rejected } = normalizeAtomicFactsWithRejections(
      [
        fact({
          entity: "OviTex",
          value: "OviTex in use for ventral hernia repairs",
          evidence: "They are using OviTex for ventral hernia repairs.",
        }),
      ],
      dictation,
    );

    expect(facts[0].entity).toBe("OviTex");
    expect(facts[0].attribute).toBe("current_product");
    expect(rejected).toHaveLength(0);
  });

  it("still re-types technique entities to clinical_focus, not evidence_gap", () => {
    const dictation = "He does most of his cases robotic.";
    const { facts } = normalizeAtomicFactsWithRejections(
      [
        fact({
          entity: "robotic",
          value: "robotic approach",
          evidence: "He does most of his cases robotic.",
        }),
      ],
      dictation,
    );

    expect(facts[0].fact_type).toBe("clinical_focus");
    expect(facts[0].attribute).toBe("technology_preference");
  });

  it("records evidence grounding rejections (anchoring + length)", () => {
    const dictation = "Met with Tom today about scheduling.";
    const { facts, rejected } = normalizeAtomicFactsWithRejections(
      [
        fact({
          fact_type: "relationship",
          attribute: "rapport",
          value: "good rapport",
          evidence: "This sentence does not appear in the dictation at all.",
        }),
        // 8 raw chars passes the Zod minimum; quote-stripped evidence is 6.
        fact({
          fact_type: "relationship",
          attribute: "rapport",
          value: "good rapport",
          evidence: "'tiny12'",
        }),
      ],
      dictation,
    );

    expect(facts).toHaveLength(0);
    expect(rejected.map((r) => r.reason).sort()).toEqual([
      "evidence_not_anchored",
      "evidence_too_short",
    ]);
  });
});
