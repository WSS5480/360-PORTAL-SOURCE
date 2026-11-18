import { describe, expect, it } from "vitest";

import {
  DR_ONION_INTRO_CALL_DICTATION,
  DR_SALT_INTRO_CALL_DICTATION,
} from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";
import { DEBRIEF_EXTRACTION_REGRESSION_SCENARIOS } from "@/lib/surgical-sales/debriefExtractionRegressionFixtures";
import { MISSION_BOARD_DEBRIEF_DICTATION_FIXTURES } from "@/lib/surgical-sales/missionBoardDebriefDictationFixtures";
import { UNIVERSAL_EXTRACTOR_FIXTURES } from "@/lib/surgical-sales/universalExtractor/testFixtures";
import { buildReviewProjectionFromUniversalFacts } from "@/lib/surgical-sales/universalExtractor/buildReviewProjectionFromUniversalFacts";
import { extractUniversalSurgicalFacts } from "@/lib/surgical-sales/universalExtractor/extractUniversalSurgicalFacts";
import { validateAndNormalizeGptUniversalFacts } from "@/lib/surgical-sales/universalExtractor/validateGptUniversalFacts";
import type { GptUniversalFactRow } from "@/lib/surgical-sales/universalExtractor/gptUniversalFactExtractionSchema";
import { dedupeUniversalFacts } from "@/lib/surgical-sales/sharedIntelligence/dedupeIntelligenceSignals";
import { resolveIntelligenceCategoryForFact } from "@/lib/surgical-sales/universalExtractor/resolveIntelligenceCategoryForFact";
import { buildLogUpdateIntelligenceReview } from "@/lib/surgical-sales/logUpdateRelatedIntelligence";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

function emptyWorkflowLogUpdate(dictation: string): LogUpdateParseResult {
  return {
    sourceText: dictation,
    suggestedUpdates: [],
    fieldUpdates: [],
    intelligenceReview: buildLogUpdateIntelligenceReview(dictation, [], {}),
    stillMissing: [],
    saveAsNoteAccepted: true,
    usesProviderIntelligence: true,
  };
}

function runsFromDictation(dictation: string, source = "intro_call"): UniversalFactExtractionRun[] {
  const { facts } = extractUniversalSurgicalFacts({
    raw_note: dictation,
    declared_source_type: source,
  });
  const extractedAt = new Date().toISOString();
  return [
    {
      capture_id: "test-capture",
      declared_source_type: source,
      extraction_model: "universal-surgical-rules-v1",
      created_at: extractedAt,
      operational_note_id: null,
      facts: facts.map((fact, index) => ({
        ...fact,
        id: `uf-test-${index}`,
        capture_id: "test-capture",
        provider_id: null,
        organization_id: null,
        case_id: null,
        encounter_id: null,
        suppressed: false,
        created_at: extractedAt,
      })),
    },
  ];
}

function assertNoDuplicateConceptLabels(facts: ReturnType<typeof extractUniversalSurgicalFacts>["facts"]) {
  const deduped = dedupeUniversalFacts(facts);
  expect(deduped.length).toBeLessThanOrEqual(facts.length);
}

describe("Universal Facts platform validation", () => {
  it("covers intro-call intelligence categories on Dr. Salt rules path", () => {
    const { facts } = extractUniversalSurgicalFacts({
      raw_note: DR_SALT_INTRO_CALL_DICTATION,
      declared_source_type: "intro_call",
    });
    assertNoDuplicateConceptLabels(facts);

    const categories = new Set(
      facts.map((fact) =>
        resolveIntelligenceCategoryForFact({
          concept: fact.concept,
          normalized_label: fact.normalized_label,
          evidence_text: fact.evidence_text,
        }),
      ),
    );

    expect(categories.has("procedure_trend") || categories.has("clinical_trend")).toBe(true);
    expect(categories.has("product_usage")).toBe(true);
    expect(categories.has("workflow_friction") || categories.has("workflow_priority")).toBe(true);
  });

  it("projects Dr. Onion intro call through review without losing clinical trends", () => {
    const debriefRuns = runsFromDictation(DR_ONION_INTRO_CALL_DICTATION);
    const projection = buildReviewProjectionFromUniversalFacts({
      dictation: DR_ONION_INTRO_CALL_DICTATION,
      debriefRuns,
      workflowLogUpdate: emptyWorkflowLogUpdate(DR_ONION_INTRO_CALL_DICTATION),
      existingFields: {},
    });

    const dbKeys = projection.intelligenceFieldUpdates.map((row) => row.dbKey);
    expect(dbKeys).toContain("provider_case_volume_estimate");
    expect(dbKeys.some((key) => key.includes("competitive") || key.includes("procedure"))).toBe(true);
  });

  for (const fixture of UNIVERSAL_EXTRACTOR_FIXTURES) {
    it(`extracts observation/debrief fixture ${fixture.id} without duplicate facts`, () => {
      const { facts, suppressed_facts } = extractUniversalSurgicalFacts(fixture.input);
      assertNoDuplicateConceptLabels(facts);
      expect(facts.length + suppressed_facts.length).toBeGreaterThan(0);
    });
  }

  for (const fixture of DEBRIEF_EXTRACTION_REGRESSION_SCENARIOS.slice(0, 6)) {
    it(`extracts debrief regression ${fixture.id}`, () => {
      const { facts } = extractUniversalSurgicalFacts({
        raw_note: fixture.dictation,
        declared_source_type: "debrief_note",
      });
      expect(facts.length).toBeGreaterThan(0);
      assertNoDuplicateConceptLabels(facts);
    });
  }

  for (const fixture of MISSION_BOARD_DEBRIEF_DICTATION_FIXTURES.slice(0, 3)) {
    it(`extracts mission board debrief ${fixture.title}`, () => {
      const { facts } = extractUniversalSurgicalFacts({
        raw_note: fixture.dictation,
        declared_source_type: "debrief_note",
      });
      expect(facts.length).toBeGreaterThan(0);
    });
  }

  it("routes evaluation sequencing and relationship signals to distinct review fields", () => {
    const rows: GptUniversalFactRow[] = [
      {
        category: "evaluation_sequencing",
        normalized_label: "Observation before evaluation",
        evidence_text: "best next step before any formal evaluation is to observe a case first",
        confidence: "medium",
        should_persist: true,
      },
      {
        category: "relationship_signal",
        normalized_label: "Open to continued discussion",
        evidence_text: "open to continuing the relationship and interested in continuing discussions",
        confidence: "medium",
        should_persist: true,
      },
    ];
    const validated = validateAndNormalizeGptUniversalFacts({
      rows,
      transcript: `${rows[0]!.evidence_text}. ${rows[1]!.evidence_text}.`,
      declared_source_type: "intro_call",
    });
    const debriefRuns = runsFromDictation(
      `${rows[0]!.evidence_text}. ${rows[1]!.evidence_text}.`,
    );
    debriefRuns[0]!.facts = validated.facts.map((fact, index) => ({
      ...debriefRuns[0]!.facts[0]!,
      ...fact,
      id: `uf-gpt-${index}`,
    }));

    const projection = buildReviewProjectionFromUniversalFacts({
      dictation: rows.map((row) => row.evidence_text).join(" "),
      debriefRuns,
      workflowLogUpdate: emptyWorkflowLogUpdate(""),
      existingFields: {},
    });

    const dbKeys = projection.intelligenceFieldUpdates.map((row) => row.dbKey);
    expect(dbKeys).toContain("provider_evaluation_openness");
    expect(dbKeys).toContain("provider_communication_style");
  });
});
