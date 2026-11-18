import { describe, expect, it } from "vitest";

import { mergeIntelligenceFieldValue } from "@/lib/surgical-sales/debriefIntelligenceMergeCategories";
import { DR_ONION_INTRO_CALL_DICTATION, DR_SALT_INTRO_CALL_DICTATION } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";
import { buildReviewProjectionFromUniversalFacts } from "@/lib/surgical-sales/universalExtractor/buildReviewProjectionFromUniversalFacts";
import { mapUniversalFactsToActionableReviewCards } from "@/lib/surgical-sales/universalExtractor/mapUniversalFactsToActionableReviewCards";
import type { GptUniversalFactRow } from "@/lib/surgical-sales/universalExtractor/gptUniversalFactExtractionSchema";
import { validateAndNormalizeGptUniversalFacts } from "@/lib/surgical-sales/universalExtractor/validateGptUniversalFacts";
import { runRulesUniversalSurgicalExtraction } from "@/lib/surgical-sales/universalExtractor/runUniversalSurgicalExtraction";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import { buildLogUpdateIntelligenceReview } from "@/lib/surgical-sales/logUpdateRelatedIntelligence";

const DR_SALT_GPT_FIXTURE: GptUniversalFactRow[] = [
  {
    category: "access_pathway",
    normalized_label: "Observation access interest",
    evidence_text:
      "he was receptive to the idea and said we should continue the conversation after coordinating with his office staff",
    confidence: "medium",
    should_persist: true,
  },
  {
    category: "scheduler_contact",
    normalized_label: "Jennifer · Scheduling Coordinator",
    evidence_text: "Jennifer handles most of the scheduling and coordination for cases",
    confidence: "high",
    person_name: "Jennifer",
    role: "Scheduling Coordinator",
    should_persist: true,
  },
  {
    category: "procedure_trend",
    normalized_label: "Distal radius fractures · Increasing procedure volume",
    evidence_text:
      "seeing an increase in distal radius fractures and upper extremity trauma cases compared to previous years",
    confidence: "medium",
    procedure_name: "Distal radius fractures",
    should_persist: true,
  },
  {
    category: "clinical_growth_signal",
    normalized_label: "Upper extremity trauma · Increasing case volume",
    evidence_text:
      "increase in distal radius fractures and upper extremity trauma cases compared to previous years",
    confidence: "medium",
    procedure_name: "Upper extremity trauma",
    should_persist: true,
  },
  {
    category: "clinical_growth_signal",
    normalized_label: "Referral volume strong",
    evidence_text: "referral volume has been strong",
    confidence: "medium",
    should_persist: true,
  },
  {
    category: "clinical_growth_signal",
    normalized_label: "Complex fracture patterns becoming more common",
    evidence_text: "complex fracture patterns are becoming more common in his practice",
    confidence: "medium",
    should_persist: true,
  },
  {
    category: "product_usage",
    normalized_label: "Acumed",
    evidence_text: "they currently use Acumed for many of their distal radius fracture procedures",
    confidence: "medium",
    product_name: "Acumed",
    should_persist: true,
  },
  {
    category: "inventory_issue",
    normalized_label: "Instrumentation availability concern",
    evidence_text: "occasional frustrations related to instrumentation availability",
    confidence: "medium",
    should_persist: true,
  },
  {
    category: "workflow_friction",
    normalized_label: "OR efficiency concern",
    evidence_text:
      "operating room efficiency when multiple trauma cases are being managed on the same day",
    confidence: "medium",
    should_persist: true,
  },
  {
    category: "operational_priority",
    normalized_label: "Workflow efficiency priority",
    evidence_text:
      "consistency and workflow efficiency are important priorities for both himself and the surgical team",
    confidence: "medium",
    should_persist: true,
  },
  {
    category: "operational_priority",
    normalized_label: "Turnover time importance",
    evidence_text:
      "reducing unnecessary steps during case setup can have a meaningful impact on turnover time",
    confidence: "medium",
    should_persist: true,
  },
  {
    category: "operational_priority",
    normalized_label: "Staff satisfaction importance",
    evidence_text: "meaningful impact on turnover time and staff satisfaction",
    confidence: "medium",
    should_persist: true,
  },
  {
    category: "commercial_disposition",
    normalized_label: "Commercial disposition: observation before evaluation",
    evidence_text:
      "observing a case would be the best next step before having a more detailed conversation about alternative solutions",
    confidence: "medium",
    should_persist: true,
  },
  {
    category: "commercial_disposition",
    normalized_label: "Relationship: open to continued discussion",
    evidence_text:
      "He appeared interested in continuing discussions once we have a better understanding of his current workflow",
    confidence: "medium",
    should_persist: true,
  },
  {
    category: "next_action",
    normalized_label: "Next step recommended",
    evidence_text:
      "My next step is to connect with Jennifer regarding scheduling requirements and determine whether observation access can be arranged for an upcoming distal radius fracture case",
    confidence: "high",
    should_persist: true,
  },
];

const DR_SALT_EXPECTED_SIGNALS: Array<{ id: string; patterns: RegExp[] }> = [
  { id: "observation_interest", patterns: [/access_pathway|observation access/i, /receptive|interest/i] },
  { id: "jennifer", patterns: [/contact_role|jennifer/i, /schedul/i] },
  { id: "distal_radius", patterns: [/distal radius/i, /volume|increas/i] },
  { id: "upper_extremity_trauma", patterns: [/upper extremity trauma/i, /volume|increas|case/i] },
  { id: "complex_fracture", patterns: [/complex fracture|fracture pattern/i, /common|increas/i] },
  { id: "acumed", patterns: [/acumed|current_product/i] },
  { id: "instrumentation", patterns: [/instrumentation availability|inventory_availability/i] },
  { id: "or_efficiency", patterns: [/or efficiency|operating room efficiency|workflow_or_timing/i] },
  { id: "workflow_priority", patterns: [/workflow efficiency priority|workflow_or_timing/i] },
  { id: "turnover", patterns: [/turnover time/i] },
  { id: "staff_satisfaction", patterns: [/staff satisfaction/i] },
  { id: "observe_before_eval", patterns: [/observation before evaluation|observe.*before|commercial disposition/i] },
  { id: "continued_discussion", patterns: [/continuing discussions|open to continuing|communication_style/i] },
];

function runsFromFacts(facts: ReturnType<typeof validateAndNormalizeGptUniversalFacts>["facts"]): UniversalFactExtractionRun[] {
  const extractedAt = new Date().toISOString();
  return [
    {
      capture_id: "coverage-test",
      declared_source_type: "intro_call",
      extraction_model: "universal-surgical-gpt-v1",
      created_at: extractedAt,
      operational_note_id: null,
      facts: facts.map((fact, index) => ({
        ...fact,
        id: `uf-cov-${index}`,
        capture_id: "coverage-test",
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

function factBlob(facts: { concept: string; normalized_label: string; evidence_text: string }[]): string {
  return facts.map((f) => `${f.concept} ${f.normalized_label} ${f.evidence_text}`).join(" ").toLowerCase();
}

describe("Dr. Salt GPT UF coverage — validation case", () => {
  it("produces at least 10 expected UF facts from GPT fixture after validation", () => {
    const validated = validateAndNormalizeGptUniversalFacts({
      rows: DR_SALT_GPT_FIXTURE,
      transcript: DR_SALT_INTRO_CALL_DICTATION,
      declared_source_type: "intro_call",
    });

    expect(validated.facts.length).toBeGreaterThanOrEqual(10);
    expect(validated.rejections.length).toBe(0);

    const blob = factBlob(validated.facts);
    let matched = 0;
    for (const signal of DR_SALT_EXPECTED_SIGNALS) {
      if (signal.patterns.every((pattern) => pattern.test(blob))) matched += 1;
    }
    expect(matched).toBeGreaterThanOrEqual(10);
  });

  it("does not emit false alternative product usage from alternative solutions language", () => {
    const validated = validateAndNormalizeGptUniversalFacts({
      rows: [
        {
          category: "competitor_usage",
          normalized_label: "Alternative product",
          evidence_text:
            "before having a more detailed conversation about alternative solutions",
          confidence: "low",
          product_name: "Alternative solutions",
          should_persist: true,
        },
      ],
      transcript: DR_SALT_INTRO_CALL_DICTATION,
      declared_source_type: "intro_call",
    });
    expect(validated.facts.some((f) => f.concept === "competitor_product" || f.concept === "alternative_used")).toBe(
      false,
    );
  });

  it("has only one Acumed product fact after dedupe", () => {
    const validated = validateAndNormalizeGptUniversalFacts({
      rows: [
        ...DR_SALT_GPT_FIXTURE,
        {
          category: "product_usage",
          normalized_label: "Acumed",
          evidence_text: "they currently use Acumed for many of their distal radius fracture procedures",
          confidence: "medium",
          product_name: "Acumed",
          should_persist: true,
        },
      ],
      transcript: DR_SALT_INTRO_CALL_DICTATION,
      declared_source_type: "intro_call",
    });
    expect(validated.facts.filter((f) => f.concept === "current_product").length).toBe(1);
  });

  it("projects clinical, product, workflow, access, and contact into review field updates", () => {
    const validated = validateAndNormalizeGptUniversalFacts({
      rows: DR_SALT_GPT_FIXTURE,
      transcript: DR_SALT_INTRO_CALL_DICTATION,
      declared_source_type: "intro_call",
    });
    const projection = buildReviewProjectionFromUniversalFacts({
      dictation: DR_SALT_INTRO_CALL_DICTATION,
      debriefRuns: runsFromFacts(validated.facts),
      workflowLogUpdate: {
        sourceText: DR_SALT_INTRO_CALL_DICTATION,
        suggestedUpdates: [],
        fieldUpdates: [],
        intelligenceReview: buildLogUpdateIntelligenceReview(DR_SALT_INTRO_CALL_DICTATION, [], {}),
        stillMissing: [],
        saveAsNoteAccepted: true,
        usesProviderIntelligence: true,
      },
      existingFields: {},
    });

    const dbKeys = new Set(projection.intelligenceFieldUpdates.map((row) => row.dbKey));
    expect(dbKeys.has("provider_case_volume_estimate") || dbKeys.has("provider_procedure_focus")).toBe(true);
    expect(dbKeys.has("provider_competitive_products")).toBe(true);
    expect(dbKeys.has("provider_workflow_pain_points")).toBe(true);
    expect(dbKeys.has("provider_observation_access_path")).toBe(true);
    expect(dbKeys.has("provider_scheduling_contact")).toBe(true);

    const workflowValue = projection.intelligenceFieldUpdates.find(
      (row) => row.dbKey === "provider_workflow_pain_points",
    )?.proposedValue;
    expect(workflowValue).toMatch(/turnover time/i);
    expect(workflowValue).toMatch(/staff satisfaction/i);
    expect(workflowValue).toMatch(/workflow efficiency priority|or efficiency concern|instrumentation availability/i);
  });

  it("maps distinct clinical and workflow categories into review cards", () => {
    const validated = validateAndNormalizeGptUniversalFacts({
      rows: DR_SALT_GPT_FIXTURE,
      transcript: DR_SALT_INTRO_CALL_DICTATION,
      declared_source_type: "intro_call",
    });
    const { cards } = mapUniversalFactsToActionableReviewCards({
      dictation: DR_SALT_INTRO_CALL_DICTATION,
      debriefRuns: runsFromFacts(validated.facts),
    });

    expect(cards.some((c) => c.category === "clinical_focus")).toBe(true);
    expect(cards.some((c) => c.category === "product_intelligence")).toBe(true);
    expect(cards.some((c) => c.category === "organization_intelligence")).toBe(true);
    expect(cards.some((c) => c.category === "observation_access")).toBe(true);
    expect(cards.some((c) => c.category === "workflow_participant")).toBe(true);
  });
});

describe("Dr. Salt GPT UF coverage — merge regression", () => {
  it("merges workflow pain labels without procedure-focus filtering", () => {
    const merged = mergeIntelligenceFieldValue(
      "clinical_pain_points",
      "OR efficiency concern",
      "Turnover time importance",
      "provider_workflow_pain_points",
    );
    expect(merged).toContain("OR efficiency concern");
    expect(merged).toContain("Turnover time importance");
  });
});

describe("Dr. Salt GPT UF coverage — rules baseline", () => {
  it("rules engine extracts scheduler contact on Dr. Salt dictation", () => {
    const rules = runRulesUniversalSurgicalExtraction({
      raw_note: DR_SALT_INTRO_CALL_DICTATION,
      declared_source_type: "intro_call",
    });
    expect(rules.facts.some((f) => f.concept === "contact_role")).toBe(true);
  });
});

describe("Dr. Onion hernia non-regression", () => {
  it("rules engine still extracts hernia/AWR/robotic/Acumed signals", () => {
    const rules = runRulesUniversalSurgicalExtraction({
      raw_note: DR_ONION_INTRO_CALL_DICTATION,
      declared_source_type: "intro_call",
    });
    const blob = factBlob(rules.facts);
    expect(blob).toMatch(/ventral|hernia/);
    expect(blob).toMatch(/abdominal wall reconstruction/);
    expect(blob).toMatch(/robotic/);
    expect(blob).toMatch(/acumed/);
  });
});
