import { describe, expect, it } from "vitest";

import { runUniversalSurgicalExtraction } from "./runUniversalSurgicalExtraction";
import type { UniversalDeclaredSourceType } from "./types";

const ASSERTION_PROBE_NOTE = "I've had issues getting the right implant size before.";

const ASSERTION_EXPECTATIONS: Array<{
  declared_source_type: UniversalDeclaredSourceType;
  expected_assertion: string;
}> = [
  { declared_source_type: "intro_call", expected_assertion: "provider_reported" },
  { declared_source_type: "observation_case", expected_assertion: "observed" },
  { declared_source_type: "product_support_case", expected_assertion: "case_supported" },
  { declared_source_type: "debrief_validation", expected_assertion: "validated" },
];

describe("assertion probe note across declared source types", () => {
  for (const { declared_source_type, expected_assertion } of ASSERTION_EXPECTATIONS) {
    it(`maps sizing_or_fit_issue to ${expected_assertion} for ${declared_source_type}`, () => {
      const result = runUniversalSurgicalExtraction({
        raw_note: ASSERTION_PROBE_NOTE,
        declared_source_type,
      });

      const sizing = result.facts.find((fact) => fact.concept === "sizing_or_fit_issue");
      expect(sizing).toBeDefined();
      expect(sizing?.assertion_level).toBe(expected_assertion);
      expect(sizing?.source_type).toBe(declared_source_type);
    });
  }
});
