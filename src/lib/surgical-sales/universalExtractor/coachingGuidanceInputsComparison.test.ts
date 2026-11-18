import { describe, expect, it } from "vitest";

import { buildCoachingGuidanceInputsComparison } from "@/lib/surgical-sales/universalExtractor/buildCoachingGuidanceInputsComparison";
import { collectOieCoachingGuidanceInputs } from "@/lib/surgical-sales/universalExtractor/collectOieCoachingGuidanceInputs";
import {
  topicForOieNormalizedFindingId,
  topicForUfConcept,
} from "@/lib/surgical-sales/universalExtractor/coachingGuidanceConceptMapping";
import { isCoachingGuidanceInputsCompareEnabled } from "@/lib/surgical-sales/universalExtractor/coachingGuidanceInputsCompareFlag";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import { summarizeUfCoachingGuidanceInputs } from "@/lib/surgical-sales/universalExtractor/summarizeUfCoachingGuidanceInputs";

function ufFact(input: {
  concept: string;
  case_id: string;
  assertion_level?: string;
  evidence_text?: string;
  normalized_label?: string;
}) {
  return {
    id: `fact-${input.concept}-${input.case_id}`,
    capture_id: "capture-1",
    provider_id: "provider-1",
    organization_id: null,
    case_id: input.case_id,
    encounter_id: null,
    concept: input.concept,
    normalized_label: input.normalized_label ?? "",
    assertion_level: input.assertion_level ?? "observed",
    source_type: "observation_case" as const,
    evidence_text: input.evidence_text ?? input.normalized_label ?? "",
    confidence: "high" as const,
    negated: false,
    uncertain: false,
    suppressed: false,
    created_at: "2026-06-15T12:00:00Z",
  };
}

function programRun(facts: ReturnType<typeof ufFact>[]): UniversalFactExtractionRun[] {
  return [
    {
      capture_id: "capture-1",
      declared_source_type: "observation_case",
      extraction_model: "test",
      created_at: "2026-06-15T12:00:00Z",
      operational_note_id: null,
      facts,
    },
  ];
}

describe("coachingGuidanceInputs Phase A", () => {
  it("maps OIE and UF concepts to shared comparison topics", () => {
    expect(topicForOieNormalizedFindingId("workflow_visualization_before_fixation")).toBe(
      "visualization_before_fixation",
    );
    expect(topicForUfConcept("visualization_or_access_issue")).toBe("visualization_before_fixation");
    expect(topicForOieNormalizedFindingId("staff_supply_delay")).toBe("staff_friction_or_delay");
    expect(topicForUfConcept("alternative_used")).toBe("staff_friction_or_delay");
  });

  it("summarizes UF prior and current coaching signals with maturity", () => {
    const priorCaseId = "obs-1";
    const currentCaseId = "obs-2";
    const programRuns = programRun([
      ufFact({
        concept: "visualization_or_access_issue",
        case_id: priorCaseId,
        evidence_text: "Extra visualization time before fixation",
      }),
      ufFact({
        concept: "alternative_used",
        case_id: priorCaseId,
        evidence_text: "Preferred implant size not immediately available",
      }),
      ufFact({
        concept: "staff_workflow",
        case_id: priorCaseId,
        evidence_text: "Staff appeared organized and coordinated",
      }),
    ]);

    const summary = summarizeUfCoachingGuidanceInputs({
      programRuns,
      caseRuns: programRun([]),
      caseRow: { id: currentCaseId, case_type: "observation", status: "scheduled" },
      priorCases: [{ id: priorCaseId, status: "completed", case_type: "observation" }],
      briefingKind: "follow_up",
      programCompletedCount: 1,
    });

    expect(summary.source).toBe("uf");
    expect(summary.priorSignals.map((signal) => signal.concept).sort()).toEqual(
      ["alternative_used", "staff_workflow", "visualization_or_access_issue"].sort(),
    );
    expect(summary.priorSignals.every((signal) => signal.maturity === "observed_once")).toBe(true);
    expect(summary.gaps).toContain("product_usage_unknown");
    expect(summary.gaps).toContain("repeat_confirmation_needed");
  });

  it("collects baseline OIE guidance inputs when no prior intelligence exists", () => {
    const oie = collectOieCoachingGuidanceInputs({
      caseRow: { id: "case-1", case_type: "observation", status: "scheduled" },
      priorCases: [],
      activities: [],
    });

    expect(oie.source).toBe("oie");
    expect(oie.briefingKind).toBe("baseline");
    expect(oie.briefingPriorSignals).toEqual([]);
    expect(oie.evidenceGaps.length).toBeGreaterThan(0);
  });

  it("builds side-by-side comparison payload with UF guidance inputs", () => {
    const priorCaseId = "obs-1";
    const comparison = buildCoachingGuidanceInputsComparison({
      caseRow: {
        id: "obs-2",
        case_type: "observation",
        status: "scheduled",
      },
      priorCases: [
        {
          id: priorCaseId,
          status: "completed",
          case_type: "observation",
          notes: "Prior observation note with workflow and implant availability context.",
        },
      ],
      activities: [],
      universalFactsReadModel: {
        programRuns: programRun([
          ufFact({
            concept: "alternative_used",
            case_id: priorCaseId,
            evidence_text: "Team discussed alternative options before moving forward",
          }),
          ufFact({
            concept: "visualization_or_access_issue",
            case_id: priorCaseId,
            evidence_text: "Additional time obtaining adequate visualization before fixation",
          }),
        ]),
        caseRuns: [],
      },
    });

    expect(comparison.evaluationOnly).toBe(true);
    expect(comparison.oie.source).toBe("oie");
    expect(comparison.uf?.source).toBe("uf");
    expect(comparison.uf?.priorSignals).toHaveLength(2);
    expect(comparison.alignment).toMatchObject({
      overlap: expect.any(Array),
      oieOnly: expect.any(Array),
      ufOnly: expect.any(Array),
      conflicts: expect.any(Array),
    });
  });

  it("enables compare tooling in development", () => {
    expect(isCoachingGuidanceInputsCompareEnabled()).toBe(true);
  });
});
