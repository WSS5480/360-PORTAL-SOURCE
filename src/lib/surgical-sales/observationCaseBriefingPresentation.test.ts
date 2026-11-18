import { describe, expect, it, vi } from "vitest";

import {
  buildObservationCaseBriefingRepView,
  BRIEFING_ENGINE_TERM_PATTERN,
} from "./observationCaseBriefingPresentation";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

const PRIOR_CASE = {
  id: "case-prior",
  status: "completed",
  procedure_type: "Procedure Type A",
  live_observation_workflow: "Extra visualization time before fixation",
  live_observation_product_fit: "Workflow opportunity",
  notes:
    "Product Alpha in use. Team seemed organized. Extra time getting visualization before fixation.",
};

const ENGINE_TERMS = [
  "repeat evidence",
  "signal",
  "confidence",
  "maturity",
  "validated",
  "captured signal",
  "supported pattern",
  "pain points",
  "validate whether",
  "gather evidence",
  "hypothesis",
  "intelligence",
];

describe("observationCaseBriefingPresentation — Next Best Action First", () => {
  it("places focus today before known so far in the view model", () => {
    const view = buildObservationCaseBriefingRepView({
      caseRow: { id: "case-1", status: "scheduled" },
      activities: [],
      priorCases: [],
    });

    expect(view.sectionTitles.focus).toBe("Focus Today");
    expect(view.focusToday.length).toBeGreaterThan(0);
    expect(view.whyThisMatters.length).toBeGreaterThan(0);
    expect(view.sectionTitles.known).toBe("Known So Far");
    expect(view.sectionTitles.stillNeed).toBe("Still Need to Learn");
  });

  it("merges equivalent staff observations into one plain-English line", () => {
    const view = buildObservationCaseBriefingRepView({
      caseRow: { id: "case-current", status: "scheduled", procedure_type: "Procedure Type A" },
      activities: [],
      priorCases: [PRIOR_CASE],
    });

    const known = view.knownSoFar.join("\n");
    expect(known).toMatch(/Staff appeared organized/i);
    expect(known).not.toMatch(/Staff workflow: team organized/i);
    expect(known).not.toMatch(/Team appeared organized/i);
    expect(view.knownSoFar.filter((line) => /organized/i.test(line))).toHaveLength(1);
  });

  it("replaces repeat-evidence gaps with observational questions", () => {
    const view = buildObservationCaseBriefingRepView({
      caseRow: { id: "case-current", status: "scheduled", procedure_type: "Procedure Type A" },
      activities: [],
      priorCases: [PRIOR_CASE],
    });

    const stillNeed = view.stillNeedToLearn.join("\n");
    expect(stillNeed).not.toMatch(/repeat evidence/i);
    expect(stillNeed).toMatch(/determine whether|listen for|confirm whether|watch for/i);
  });

  it("uses staff frustration learning question with workarounds", () => {
    const view = buildObservationCaseBriefingRepView({
      caseRow: { id: "case-current", status: "scheduled", procedure_type: "Procedure Type A" },
      activities: [],
      priorCases: [PRIOR_CASE],
    });

    const staffLine = view.stillNeedToLearn.find((line) => /staff frustration/i.test(line));
    expect(staffLine).toMatch(/workarounds|complaints/i);
  });

  it("uses field-guide language without engine terminology", () => {
    const view = buildObservationCaseBriefingRepView({
      caseRow: { id: "case-current", status: "scheduled" },
      activities: [],
      priorCases: [PRIOR_CASE],
    });

    const allCopy = [
      ...view.focusToday,
      view.whyThisMatters,
      ...view.knownSoFar,
      ...view.stillNeedToLearn,
    ].join("\n");

    expect(allCopy).not.toMatch(BRIEFING_ENGINE_TERM_PATTERN);
    for (const term of ENGINE_TERMS) {
      expect(allCopy.toLowerCase()).not.toContain(term);
    }
  });

  it("baseline briefing prioritizes action-focused copy", () => {
    const view = buildObservationCaseBriefingRepView({
      caseRow: { id: "case-1", status: "scheduled" },
      activities: [],
      priorCases: [],
    });

    expect(view.knownSoFar[0]).toMatch(/No prior observations recorded/i);
    expect(view.stillNeedToLearn[0]).toMatch(/Identify which products|Confirm current product/i);
    expect(view.focusToday[0]).toMatch(/Observe workflow|Confirm current product|Listen for/i);
    expect(view.whyThisMatters).toMatch(/early observation/i);
  });

  it("provides multiple focus today action items for follow-up cases", () => {
    const view = buildObservationCaseBriefingRepView({
      caseRow: { id: "case-current", status: "scheduled", procedure_type: "Procedure Type A" },
      activities: [],
      priorCases: [PRIOR_CASE],
    });

    expect(view.focusToday.length).toBeGreaterThanOrEqual(2);
    expect(view.focusToday.some((line) => /watch|listen|confirm|note whether/i.test(line))).toBe(true);
  });

  it("uses UF Known So Far when read model is enabled and prior UF facts exist", () => {
    vi.stubEnv("UNIVERSAL_FACTS_READ_MODEL", "1");

    const programRuns: UniversalFactExtractionRun[] = [
      {
        capture_id: "capture-prior",
        declared_source_type: "observation_case",
        extraction_model: "test",
        created_at: "2026-06-01T12:00:00Z",
        operational_note_id: null,
        facts: [
          {
            id: "fact-product",
            capture_id: "capture-prior",
            provider_id: "provider-1",
            organization_id: null,
            case_id: "case-prior",
            encounter_id: null,
            concept: "current_product",
            normalized_label: "Product Alpha was used during the case",
            assertion_level: "validated",
            source_type: "observation_case",
            evidence_text: "Product Alpha in use",
            confidence: "high",
            negated: false,
            uncertain: false,
            suppressed: false,
            product_mentioned: "Product Alpha",
            created_at: "2026-06-01T12:00:00Z",
          },
        ],
      },
    ];

    const view = buildObservationCaseBriefingRepView({
      caseRow: { id: "case-current", status: "scheduled", procedure_type: "Procedure Type A" },
      activities: [],
      priorCases: [PRIOR_CASE],
      universalFactsReadModel: { programRuns },
    });

    expect(view.knownSoFar.join("\n")).toMatch(/Product Alpha has been seen in use/i);
    expect(view.knownSoFar.join("\n")).not.toMatch(/possible opening|product-fit/i);

    vi.unstubAllEnvs();
  });
});
