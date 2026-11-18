import { describe, expect, it } from "vitest";
import {
  isProviderFrictionAssessed,
  isStaffFrictionAssessed,
  summarizeUfCoachingGuidanceInputs,
} from "./summarizeUfCoachingGuidanceInputs";
import type { UniversalFactExtractionRun } from "./loadUniversalSurgicalFacts";

function ufFact(input: {
  concept: string;
  case_id: string;
  evidence_text?: string;
  normalized_label?: string;
}) {
  return {
    id: `fact-${input.concept}-${input.case_id}`,
    capture_id: "capture-1",
    provider_id: "provider-onion",
    organization_id: null,
    case_id: input.case_id,
    encounter_id: null,
    concept: input.concept,
    normalized_label: input.normalized_label ?? "",
    assertion_level: "observed" as const,
    source_type: "observation_case" as const,
    evidence_text: input.evidence_text ?? input.normalized_label ?? "",
    confidence: "high" as const,
    negated: false,
    uncertain: false,
    suppressed: false,
    created_at: "2026-06-16T12:00:00Z",
  };
}

function programRun(facts: ReturnType<typeof ufFact>[]): UniversalFactExtractionRun[] {
  return [
    {
      capture_id: "capture-1",
      declared_source_type: "observation_case",
      extraction_model: "test",
      created_at: "2026-06-16T12:00:00Z",
      operational_note_id: null,
      facts,
    },
  ];
}

describe("summarizeUfCoachingGuidanceInputs friction assessment", () => {
  it("clears provider and staff friction gaps after multiple smooth observations", () => {
    const programRuns = programRun([
      ufFact({
        concept: "current_product",
        case_id: "case-1",
        normalized_label: "Bard Mesh",
      }),
      ufFact({
        concept: "staff_workflow",
        case_id: "case-1",
        evidence_text: "The team seemed pretty efficient.",
      }),
      ufFact({
        concept: "staff_workflow",
        case_id: "case-2",
        evidence_text: "Staff workflow appeared coordinated.",
      }),
      ufFact({
        concept: "visualization_or_access_issue",
        case_id: "case-3",
        evidence_text: "Extra time getting visualization before fixation.",
      }),
      ufFact({
        concept: "staff_workflow",
        case_id: "case-3",
        evidence_text: "Case went smoothly overall and the team seemed pretty efficient.",
      }),
    ]);

    const summary = summarizeUfCoachingGuidanceInputs({
      programRuns,
      caseRow: { id: "case-3", case_type: "observation", status: "completed" },
      priorCases: [
        { id: "case-1", case_type: "observation", status: "completed" },
        { id: "case-2", case_type: "observation", status: "completed" },
      ],
      briefingKind: "follow_up",
      programCompletedCount: 3,
    });

    expect(summary.gaps).not.toContain("provider_friction_unknown");
    expect(summary.gaps).not.toContain("staff_friction_unknown");
  });

  it("treats captured provider sentiment as assessed even when not frustrated", () => {
    const conceptSet = new Set(["provider_sentiment"]);
    expect(
      isProviderFrictionAssessed({
        conceptSet,
        programFacts: [],
        programCompletedCount: 1,
      }),
    ).toBe(true);
  });

  it("treats positive staff workflow as assessed", () => {
    expect(
      isStaffFrictionAssessed({
        conceptSet: new Set(["staff_workflow"]),
        programFacts: [
          ufFact({
            concept: "staff_workflow",
            case_id: "case-1",
            evidence_text: "OR team appeared well coordinated.",
          }),
        ],
        programCompletedCount: 1,
      }),
    ).toBe(true);
  });
});
