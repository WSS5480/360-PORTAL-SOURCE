import { describe, expect, it } from "vitest";
import {
  buildDebriefIntelligenceBrief,
  buildIntelligenceBriefOutcomes,
  type DebriefIntelligenceBrief,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import { enrichDebriefIntelligenceBriefWithUniversalFacts } from "@/lib/surgical-sales/universalExtractor/adaptUniversalFactsToDebriefClinicalBrief";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

function dipBriefWithClinicalCard(): DebriefIntelligenceBrief {
  return {
    contacts: [],
    observationAccess: null,
    clinicalInsights: [
      {
        kind: "clinical_insight",
        id: "dip-card-1",
        cardId: "dip-card-1",
        primaryLine: "Increasing laparoscopic volume",
        categoryLabel: "Clinical Trend",
        categoryId: "increasing_procedure_volume",
        displayValue: "Increasing laparoscopic volume",
        procedureFocus: "laparoscopic",
        sourceText: "doing more lap cases",
        evidenceQuotes: ["doing more lap cases"],
        linkedFieldUpdateIds: ["field-clinical-1"],
        confirmActionType: "add_clinical_insight",
        dismissActionType: "ignore",
      },
    ],
    productIntelligence: [],
    workflowInsights: [],
    followUpActions: [],
  };
}

describe("enrichDebriefIntelligenceBriefWithUniversalFacts", () => {
  it("preserves DIP card ids so outcome acceptance can link field updates", () => {
    const dipBrief = dipBriefWithClinicalCard();
    const debriefRuns: UniversalFactExtractionRun[] = [
      {
        capture_id: "capture-1",
        declared_source_type: "debrief_note",
        extraction_model: "universal-surgical-rules-v1",
        created_at: "2026-06-15T12:00:00.000Z",
        operational_note_id: null,
        facts: [
          {
            id: "fact-1",
            capture_id: "capture-1",
            provider_id: null,
            organization_id: null,
            case_id: null,
            encounter_id: null,
            suppressed: false,
            created_at: "2026-06-15T12:00:00.000Z",
            concept: "procedure_volume_trend",
            normalized_label: "Procedure volume is increasing",
            assertion_level: "provider_reported",
            source_type: "debrief_note",
            evidence_text: "volume keeps going up",
            confidence: "high",
            negated: false,
            uncertain: false,
          },
        ],
      },
    ];

    const enriched = enrichDebriefIntelligenceBriefWithUniversalFacts({
      brief: dipBrief,
      debriefRuns,
    });

    expect(enriched.clinicalInsights[0]?.cardId).toBe("dip-card-1");
    expect(enriched.clinicalInsights[0]?.linkedFieldUpdateIds).toEqual(["field-clinical-1"]);
    expect(enriched.clinicalInsights[0]?.evidenceQuotes).toEqual(["volume keeps going up"]);

    const outcomes = buildIntelligenceBriefOutcomes(enriched);
    const clinicalOutcome = outcomes.find((row) => row.kind === "clinical_insight");
    expect(clinicalOutcome?.cardIds).toEqual(["dip-card-1"]);
  });

  it("appends UF-only clinical rows when DIP brief has no clinical cards (UF authority)", () => {
    const dipBrief = buildDebriefIntelligenceBrief({ cards: [] });
    const enriched = enrichDebriefIntelligenceBriefWithUniversalFacts({
      brief: dipBrief,
      debriefRuns: [
        {
          capture_id: "capture-1",
          declared_source_type: "debrief_note",
          extraction_model: "universal-surgical-rules-v1",
          created_at: "2026-06-15T12:00:00.000Z",
          operational_note_id: null,
          facts: [
            {
              id: "fact-1",
              capture_id: "capture-1",
              provider_id: null,
              organization_id: null,
              case_id: null,
              encounter_id: null,
              suppressed: false,
              created_at: "2026-06-15T12:00:00.000Z",
              concept: "procedure_volume_trend",
              normalized_label: "Procedure volume is increasing",
              assertion_level: "provider_reported",
              source_type: "debrief_note",
              evidence_text: "volume keeps going up",
              confidence: "high",
              negated: false,
              uncertain: false,
            },
          ],
        },
      ],
    });

    expect(enriched.clinicalInsights).toHaveLength(1);
    expect(enriched.clinicalInsights[0]?.cardId).toMatch(/^uf:/);
  });

  it("preserves procedure-specific clinical primary lines for distinct volume trends", () => {
    const facts = [
      {
        id: "fact-distal",
        capture_id: "capture-1",
        provider_id: null,
        organization_id: null,
        case_id: null,
        encounter_id: null,
        suppressed: false,
        created_at: "2026-06-15T12:00:00.000Z",
        concept: "procedure_volume_trend" as const,
        normalized_label: "Distal radius · Increasing procedure volume",
        assertion_level: "provider_reported" as const,
        source_type: "intro_call" as const,
        evidence_text: "increase in distal radius fractures",
        confidence: "medium" as const,
        negated: false,
        uncertain: false,
      },
      {
        id: "fact-referral",
        capture_id: "capture-1",
        provider_id: null,
        organization_id: null,
        case_id: null,
        encounter_id: null,
        suppressed: false,
        created_at: "2026-06-15T12:00:00.000Z",
        concept: "procedure_volume_trend" as const,
        normalized_label: "Referral volume · Increasing procedure volume",
        assertion_level: "provider_reported" as const,
        source_type: "intro_call" as const,
        evidence_text: "referral volume has been strong",
        confidence: "medium" as const,
        negated: false,
        uncertain: false,
      },
    ];

    const enriched = enrichDebriefIntelligenceBriefWithUniversalFacts({
      brief: buildDebriefIntelligenceBrief({ cards: [] }),
      debriefRuns: [
        {
          capture_id: "capture-1",
          declared_source_type: "intro_call",
          extraction_model: "universal-surgical-rules-v1",
          created_at: "2026-06-15T12:00:00.000Z",
          operational_note_id: null,
          facts,
        },
      ],
    });

    expect(enriched.clinicalInsights).toHaveLength(2);
    const lines = enriched.clinicalInsights.map((row) => row.primaryLine);
    expect(new Set(lines).size).toBe(2);
    expect(lines.every((line) => line.includes(" · "))).toBe(true);
  });
});
