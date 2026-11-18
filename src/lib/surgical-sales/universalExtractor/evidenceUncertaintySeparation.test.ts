import { describe, expect, it } from "vitest";

import { runUniversalSurgicalExtraction } from "./runUniversalSurgicalExtraction";
import {
  fragmentHasUncertaintyLanguage,
  splitFragmentEvidenceAndUncertainty,
} from "./evidenceUncertaintySeparation";
import type { UniversalDeclaredSourceType } from "./types";

const MIXED_FACT_UNCERTAINTY_NOTES = [
  {
    factual: "They spent extra time getting a better view before fixation",
    uncertainty: "I don't know if this is normal yet",
    full: "They spent extra time getting a better view before fixation, but I don't know if this is normal yet.",
    concept: "visualization_or_access_issue",
  },
  {
    factual: "Had a little trouble getting visualization",
    uncertainty: "not sure if that's normal",
    full: "Had a little trouble getting visualization but not sure if that's normal.",
    concept: "visualization_or_access_issue",
  },
  {
    factual: "Extra time spent confirming implant sizing",
    uncertainty: "I need more observations",
    full: "Extra time spent confirming implant sizing. I need more observations.",
    concept: "sizing_or_fit_issue",
  },
  {
    factual: "Still using Symbotex",
    uncertainty: "not sure if that's on every case type",
    full: "Still using Symbotex although I'm not sure if that's on every case type.",
    concept: "current_product",
  },
];

const UNCERTAINTY_ONLY_PHRASES = [
  "I need more observations before calling this recurring.",
  "Not sure if this is recurring yet.",
  "Unclear whether this is normal workflow.",
  "May just be case complexity.",
  "Not enough cases yet to tell.",
  "Hard to tell from one visit.",
  "This still needs validation in the field.",
  "Provider was not certain about the pattern.",
  "Staff mentioned it casually during turnover.",
];

const SOURCE_TYPES: UniversalDeclaredSourceType[] = [
  "observation_case",
  "discovery_note",
  "intro_call",
  "office_visit",
  "debrief_note",
  "product_support_case",
  "evaluation_note",
  "outcome_note",
];

describe("evidenceUncertaintySeparation", () => {
  it("detects common qualification language", () => {
    for (const phrase of UNCERTAINTY_ONLY_PHRASES) {
      expect(fragmentHasUncertaintyLanguage(phrase)).toBe(true);
    }
  });

  it("peels uncertainty tails from mixed factual clauses", () => {
    for (const sample of MIXED_FACT_UNCERTAINTY_NOTES) {
      const split = splitFragmentEvidenceAndUncertainty(sample.full);
      expect(split.uncertain).toBe(true);
      expect(split.factualEvidence.toLowerCase()).toContain(sample.factual.toLowerCase().slice(0, 20));
      expect(split.factualEvidence.toLowerCase()).not.toContain("not sure");
      expect(split.factualEvidence.toLowerCase()).not.toContain("don't know");
      expect(split.factualEvidence.toLowerCase()).not.toContain("need more observations");
      expect(split.uncertaintyPhrases.join(" ").toLowerCase()).toMatch(
        new RegExp(sample.uncertainty.split(/\s+/).slice(0, 2).join("\\s+"), "i"),
      );
    }
  });

  it("does not treat uncertainty-only fragments as factual evidence", () => {
    for (const phrase of UNCERTAINTY_ONLY_PHRASES) {
      const split = splitFragmentEvidenceAndUncertainty(phrase);
      expect(split.factualEvidence.trim()).toBe("");
      expect(split.uncertain).toBe(true);
    }
  });
});

describe("universal extractor evidence vs uncertainty", () => {
  for (const source of SOURCE_TYPES) {
    describe(source, () => {
      for (const sample of MIXED_FACT_UNCERTAINTY_NOTES) {
        it(`extracts ${sample.concept} with uncertain qualification separated`, () => {
          const result = runUniversalSurgicalExtraction({
            raw_note: sample.full,
            declared_source_type: source,
          });

          expect(result.facts.some((fact) => fact.concept === (sample.concept as never))).toBe(true);
          expect(result.facts.some((fact) => (fact.concept as string) === "opportunity_signal")).toBe(
            false,
          );
          expect(result.facts.every((fact) => fact.assertion_level !== "validated")).toBe(true);

          const fact = result.facts.find((entry) => entry.concept === (sample.concept as never));
          expect(fact?.uncertain).toBe(true);
          expect(fact?.confidence).toBe("low");
          expect(fact?.evidence_text.toLowerCase()).not.toContain("not sure");
          expect(fact?.evidence_text.toLowerCase()).not.toContain("don't know");
          expect(fact?.evidence_text.toLowerCase()).not.toContain("need more observations");
          expect(fact?.notes?.toLowerCase()).toContain("qualification");
        });
      }
    });
  }

  it("does not emit facts from uncertainty-only notes", () => {
    for (const phrase of UNCERTAINTY_ONLY_PHRASES) {
      const result = runUniversalSurgicalExtraction({
        raw_note: phrase,
        declared_source_type: "discovery_note",
      });
      expect(result.facts).toHaveLength(0);
    }
  });
});
