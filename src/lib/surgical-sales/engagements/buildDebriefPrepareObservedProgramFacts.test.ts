import { describe, expect, it } from "vitest";
import { buildDebriefCommercialSynthesis } from "./buildDebriefCommercialSynthesis";
import {
  buildDebriefPrepareObservedProgramFacts,
  DEBRIEF_PREPARE_MAX_OBSERVED_FACTS,
  selectStrongestConversationPattern,
} from "./buildDebriefPrepareObservedProgramFacts";
import { buildProviderDebriefPlan } from "./buildProviderDebriefPlan";
import { getDebriefProductKnowledge } from "./debriefProductKnowledge";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import {
  JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
  JOHN_APPLE_CURRENT_ACTIVITIES,
  JOHN_APPLE_CURRENT_CASE,
  JOHN_APPLE_OBSERVATION_NOTES,
  JOHN_APPLE_PRIOR_COMPLETED_CASES,
  JOHN_APPLE_PROVIDER_CONTACT,
} from "./johnAppleCommercialReadiness.fixture";

function buildJohnAppleObservedFacts() {
  const plan = buildProviderDebriefPlan({
    caseRow: JOHN_APPLE_CURRENT_CASE,
    activities: JOHN_APPLE_CURRENT_ACTIVITIES,
    providerName: "John Apple",
    priorObservationCases: JOHN_APPLE_PRIOR_COMPLETED_CASES,
    providerContact: JOHN_APPLE_PROVIDER_CONTACT,
  });

  const synthesis = buildDebriefCommercialSynthesis({
    plan,
    providerName: "John Apple",
    organizationName: "Test Hospital",
    completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
    pathwayStageLabel: "Debrief",
    observationNotes: JOHN_APPLE_OBSERVATION_NOTES,
    productKnowledge: [getDebriefProductKnowledge("ACSIS")],
  });

  return buildDebriefPrepareObservedProgramFacts({
    observationIntelligence: {
      caseRow: JOHN_APPLE_CURRENT_CASE,
      activities: JOHN_APPLE_CURRENT_ACTIVITIES,
      priorCases: JOHN_APPLE_PRIOR_COMPLETED_CASES,
      providerContact: JOHN_APPLE_PROVIDER_CONTACT,
    },
    plan,
    commercialSynthesis: synthesis,
    completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
    providerName: "John Apple",
  });
}

describe("buildDebriefPrepareObservedProgramFacts", () => {
  it("returns at most five frequency-backed observation patterns", () => {
    const result = buildJohnAppleObservedFacts();

    expect(result.facts.length).toBeLessThanOrEqual(DEBRIEF_PREPARE_MAX_OBSERVED_FACTS);
    expect(result.facts.some((fact) => /\(\d+ of 5 observations\)/.test(fact))).toBe(true);
    expect(result.facts.some((fact) => /Extra visualization time before fixation/i.test(fact))).toBe(true);
    expect(result.facts.some((fact) => /Bard Mesh used consistently/i.test(fact))).toBe(true);
    expect(result.facts.some((fact) => /Staff appeared organized/i.test(fact))).toBe(true);
    expect(result.facts.join(" ")).not.toMatch(/scheduler|credentialing|observation access/i);

    const topNonProduct = selectStrongestConversationPattern(result.patterns);
    expect(topNonProduct?.label).toMatch(/Extra visualization time before fixation/i);
  });

  it("uses simplified rep-facing labels with program frequency", () => {
    const result = buildJohnAppleObservedFacts();
    const blob = result.facts.join("\n");

    expect(blob).toMatch(/Staff appeared organized \(5 of 5 observations\)/);
    expect(blob).toMatch(/Extra visualization time before fixation \(3 of 5 observations\)/);
    expect(blob).toMatch(/Provider frustration during fixation decisions \(2 of 5 observations\)/);
    expect(blob).toMatch(/Bard Mesh used consistently \(5 of 5 observations\)/);
    expect(blob).not.toMatch(/visualization-before-fixation|John Apple expressed frustration/i);
  });

  it("hides single-case provider frustration when the program has multiple observations", () => {
    const plan = buildProviderDebriefPlan({
      caseRow: JOHN_APPLE_CURRENT_CASE,
      activities: JOHN_APPLE_CURRENT_ACTIVITIES,
      providerName: "Mark Onion",
      priorObservationCases: JOHN_APPLE_PRIOR_COMPLETED_CASES,
      providerContact: JOHN_APPLE_PROVIDER_CONTACT,
    });

    const synthesis = buildDebriefCommercialSynthesis({
      plan,
      providerName: "Mark Onion",
      organizationName: "Test Hospital",
      completedObservationCount: 5,
      pathwayStageLabel: "Debrief",
      observationNotes: JOHN_APPLE_OBSERVATION_NOTES,
      productKnowledge: [getDebriefProductKnowledge("ACSIS")],
    });

    const result = buildDebriefPrepareObservedProgramFacts({
      observationIntelligence: {
        caseRow: JOHN_APPLE_CURRENT_CASE,
        activities: JOHN_APPLE_CURRENT_ACTIVITIES,
        priorCases: JOHN_APPLE_PRIOR_COMPLETED_CASES,
        providerContact: JOHN_APPLE_PROVIDER_CONTACT,
      },
      plan,
      commercialSynthesis: synthesis,
      completedObservationCount: 5,
      providerName: "Mark Onion",
    });

    expect(result.facts.join("\n")).not.toMatch(/Provider frustration.*\(1 of 5 observations\)/i);
    expect(result.facts.join("\n")).toMatch(/Provider frustration.*\(2 of 5 observations\)/i);
  });

  it("uses providerRuns when programRuns is absent from the UF read model", () => {
    const plan = buildProviderDebriefPlan({
      caseRow: JOHN_APPLE_CURRENT_CASE,
      activities: JOHN_APPLE_CURRENT_ACTIVITIES,
      providerName: "Mark Onion",
      priorObservationCases: JOHN_APPLE_PRIOR_COMPLETED_CASES,
      providerContact: JOHN_APPLE_PROVIDER_CONTACT,
    });

    const synthesis = buildDebriefCommercialSynthesis({
      plan,
      providerName: "Mark Onion",
      organizationName: "Test Hospital",
      completedObservationCount: 5,
      pathwayStageLabel: "Debrief",
      observationNotes: JOHN_APPLE_OBSERVATION_NOTES,
      productKnowledge: [getDebriefProductKnowledge("ACSIS")],
    });

    const providerRuns: UniversalFactExtractionRun[] = [
      {
        capture_id: "capture-uf",
        declared_source_type: "observation_case",
        extraction_model: "test",
        created_at: "2026-06-01T12:00:00Z",
        operational_note_id: null,
        facts: ["prior-1", "prior-2", "prior-3", "prior-4"].map((caseId, index) => ({
          id: `fact-viz-${index}`,
          capture_id: "capture-uf",
          provider_id: "provider-1",
          organization_id: null,
          case_id: caseId,
          encounter_id: null,
          concept: "visualization_or_access_issue" as const,
          normalized_label: "Extra visualization time before fixation",
          assertion_level: "validated" as const,
          source_type: "observation_case" as const,
          evidence_text: "Extra time getting visualization",
          confidence: "high" as const,
          negated: false,
          uncertain: false,
          suppressed: false,
          created_at: "2026-06-01T12:00:00Z",
        })),
      },
    ];

    const result = buildDebriefPrepareObservedProgramFacts({
      observationIntelligence: {
        caseRow: JOHN_APPLE_CURRENT_CASE,
        activities: JOHN_APPLE_CURRENT_ACTIVITIES,
        priorCases: JOHN_APPLE_PRIOR_COMPLETED_CASES,
        providerContact: JOHN_APPLE_PROVIDER_CONTACT,
      },
      plan,
      commercialSynthesis: synthesis,
      completedObservationCount: 5,
      providerName: "Mark Onion",
      universalFactsReadModel: { providerRuns },
    });

    expect(result.facts.join("\n")).toMatch(/Extra visualization time before fixation \(4 of 5 observations\)/i);
  });
});
