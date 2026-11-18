import { describe, expect, it } from "vitest";

import { factConcepts, factsContainOpportunitySignal } from "./extractUniversalSurgicalFacts";
import { defaultAssertionForDeclaredSource } from "./assertionModel";
import { runUniversalSurgicalExtraction } from "./runUniversalSurgicalExtraction";
import { UNIVERSAL_EXTRACTOR_FIXTURES } from "./testFixtures";
import { UNIVERSAL_CANONICAL_CONCEPTS } from "./types";

describe("Universal Surgical Intelligence Extractor", () => {
  it("only emits allowed canonical concepts", () => {
    const result = runUniversalSurgicalExtraction({
      raw_note: "Requested implant size was unavailable and alternative implant was used.",
      declared_source_type: "product_support_case",
    });

    for (const fact of [...result.facts, ...result.suppressed_facts]) {
      expect(UNIVERSAL_CANONICAL_CONCEPTS).toContain(fact.concept);
    }
    expect(result.shadow_mode).toBe(true);
    expect(factsContainOpportunitySignal(result.facts)).toBe(false);
  });

  it("maps declared sources to expected default assertions", () => {
    expect(defaultAssertionForDeclaredSource("discovery_note")).toBe("provider_reported");
    expect(defaultAssertionForDeclaredSource("observation_case")).toBe("observed");
    expect(defaultAssertionForDeclaredSource("product_support_case")).toBe("case_supported");
    expect(defaultAssertionForDeclaredSource("debrief_validation")).toBe("validated");
    expect(defaultAssertionForDeclaredSource("evaluation_note")).toBe("evaluated");
    expect(defaultAssertionForDeclaredSource("outcome_note")).toBe("outcome_reported");
  });

  it("never creates opportunity_signal facts", () => {
    for (const fixture of UNIVERSAL_EXTRACTOR_FIXTURES) {
      const result = runUniversalSurgicalExtraction(fixture.input);
      expect(factsContainOpportunitySignal(result.facts)).toBe(false);
      const concepts = factConcepts(result.facts).map(String);
      expect(concepts).not.toContain("opportunity_signal");
    }
  });

  describe("fixture scenarios", () => {
    for (const fixture of UNIVERSAL_EXTRACTOR_FIXTURES) {
      it(fixture.label, () => {
        const result = runUniversalSurgicalExtraction(fixture.input);
        const concepts = factConcepts(result.facts).map(String);

        for (const expected of fixture.expected_concepts) {
          expect(concepts).toContain(expected);
        }

        for (const forbidden of fixture.forbidden_concepts ?? []) {
          expect(concepts).not.toContain(forbidden);
        }

        if (fixture.expected_assertion) {
          const matching = result.facts.filter((f) =>
            fixture.expected_concepts.includes(f.concept),
          );
          expect(matching.length).toBeGreaterThan(0);
          for (const fact of matching) {
            expect(fact.assertion_level).toBe(fixture.expected_assertion);
          }
        }

        if (fixture.expect_uncertain) {
          const viz = result.facts.find((f) => f.concept === "visualization_or_access_issue");
          expect(viz?.uncertain).toBe(true);
          expect(viz?.evidence_text.toLowerCase()).not.toContain("don't know");
          expect(viz?.notes?.toLowerCase()).toContain("qualification");
        }
      });
    }
  });

  it("maps sizing issues consistently across sources", () => {
    const provider = runUniversalSurgicalExtraction({
      raw_note: "I've had issues getting the right implant size before.",
      declared_source_type: "discovery_note",
    });
    const observation = runUniversalSurgicalExtraction({
      raw_note: "Extra time spent confirming implant sizing.",
      declared_source_type: "observation_case",
    });

    expect(provider.facts.some((f) => f.concept === "sizing_or_fit_issue")).toBe(true);
    expect(observation.facts.some((f) => f.concept === "sizing_or_fit_issue")).toBe(true);
    expect(provider.facts.find((f) => f.concept === "sizing_or_fit_issue")?.assertion_level).toBe(
      "provider_reported",
    );
    expect(
      observation.facts.find((f) => f.concept === "sizing_or_fit_issue")?.assertion_level,
    ).toBe("observed");
  });

  it("does not map positive visualization to pain", () => {
    const result = runUniversalSurgicalExtraction({
      raw_note: "Visualization was good and the case moved smoothly.",
      declared_source_type: "observation_case",
    });
    const concepts = factConcepts(result.facts);
    expect(concepts).not.toContain("visualization_or_access_issue");
  });

  it("grounds evidence in the raw note", () => {
    const result = runUniversalSurgicalExtraction({
      raw_note: "Extra time spent confirming implant sizing.",
      declared_source_type: "observation_case",
    });
    for (const fact of result.facts) {
      expect(result.raw_note.toLowerCase()).toContain(fact.evidence_text.toLowerCase().slice(0, 12));
    }
  });

  it("uses shared product extractor for Acumed without garbling stop words", () => {
    const result = runUniversalSurgicalExtraction({
      raw_note: "He uses Acumed for many of his ventral cases.",
      declared_source_type: "intro_call",
    });
    const productFacts = result.facts.filter(
      (fact) => fact.concept === "current_product" || fact.concept === "competitor_product",
    );
    expect(productFacts.length).toBeGreaterThanOrEqual(1);
    expect(productFacts[0]?.product_mentioned).toBe("Acumed");
    expect(productFacts[0]?.product_mentioned).not.toMatch(/\b(for|many|of)\b/i);
  });

  it("captures current product usage from intro-call scheduling conversation", () => {
    const result = runUniversalSurgicalExtraction({
      raw_note:
        "Sarah mentioned that Dr. Lettuce currently uses Bard Soft Mesh for most ventral hernia repairs.",
      declared_source_type: "intro_call",
      context: { provider_display_name: "Tom Lettuce" },
    });

    const currentProduct = result.facts.find(
      (fact) => fact.concept === "current_product" && fact.product_mentioned === "Bard Soft Mesh",
    );
    expect(currentProduct).toBeTruthy();
    expect(currentProduct?.normalized_label).toMatch(/Current product: Bard Soft Mesh/i);
    expect(currentProduct?.evidence_text).toMatch(/currently uses Bard Soft Mesh/i);
  });

  it("captures openness to new technology as product interest", () => {
    const result = runUniversalSurgicalExtraction({
      raw_note:
        "Sarah said Dr. Lettuce is usually open to looking at new technology if it solves a problem for him.",
      declared_source_type: "intro_call",
      context: { provider_display_name: "Tom Lettuce" },
    });

    const interest = result.facts.find(
      (fact) =>
        fact.concept === "product_interest" &&
        /open to new technology/i.test(fact.normalized_label),
    );
    expect(interest).toBeTruthy();
    expect(interest?.evidence_text).toMatch(/open to looking at new technology/i);
  });

  it("captures second-observation product, evaluation, fit, contact, and resolved-workflow facts", () => {
    const note =
      "Observed Dr. Lettuce again today during another ventral hernia repair. They were still using Bard Soft Mesh, so that's definitely looking like their standard product. The fixation issue I noticed last time really wasn't present today. Everything went pretty smoothly, so I'm less convinced that's an ongoing problem. I spoke with Sarah afterward, and she said they're interested in scheduling an evaluation with us sometime next month if the surgeon is open to it. Dr. Lettuce mentioned he likes how familiar the team is with their current mesh but wishes it conformed a little better on larger defects. No other workflow delays today, and the room ran pretty efficiently.";

    const result = runUniversalSurgicalExtraction({
      raw_note: note,
      declared_source_type: "observation_case",
      context: { provider_display_name: "Tom Lettuce" },
    });
    const factText = result.facts
      .map((fact) => `${fact.concept}: ${fact.normalized_label} ${fact.evidence_text} ${fact.product_mentioned ?? ""} ${fact.person_mentioned ?? ""}`)
      .join("\n");

    expect(factText).toMatch(/Bard Soft Mesh/);
    expect(factText).toMatch(/Evaluation scheduling interest/);
    expect(factText).toMatch(/Sarah · Evaluation Contact/);
    expect(factText).toMatch(/Conformability on larger defects/);
    expect(factText).toMatch(/Prior workflow issue was not observed today/);
    expect(factText).toMatch(/No workflow delays observed today/);
    expect(factText).not.toMatch(/Bard Soft(?! Mesh)/);
  });

  it("extracts procedure focus from observation case dictation", () => {
    const result = runUniversalSurgicalExtraction({
      raw_note: "Observed Dr. Lettuce again today during another ventral hernia repair.",
      declared_source_type: "observation_case",
      context: { provider_display_name: "Tom Lettuce" },
    });

    expect(result.facts.some((fact) => fact.concept === "procedure_focus" && /ventral hernia repair/i.test(fact.normalized_label))).toBe(
      true,
    );
  });
});
