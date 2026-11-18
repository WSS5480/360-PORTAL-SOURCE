import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";



import {

  DR_ONION_INTRO_CALL_DICTATION,

  DR_SALT_INTRO_CALL_DICTATION,

} from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";

import { buildReviewProjectionFromUniversalFacts } from "@/lib/surgical-sales/universalExtractor/buildReviewProjectionFromUniversalFacts";

import { mapUniversalFactsToActionableReviewCards } from "@/lib/surgical-sales/universalExtractor/mapUniversalFactsToActionableReviewCards";

import type { GptUniversalFactRow } from "@/lib/surgical-sales/universalExtractor/gptUniversalFactExtractionSchema";

import {

  GPT_UNIVERSAL_EXTRACTION_CATEGORIES,

  mapGptCategoryToConcept,

} from "@/lib/surgical-sales/universalExtractor/gptUniversalFactExtractionSchema";

import { runOpenAiUniversalFactExtraction } from "@/lib/surgical-sales/universalExtractor/runOpenAiUniversalFactExtraction";

import {

  runRulesUniversalSurgicalExtraction,

  runUniversalSurgicalExtractionAsync,

} from "@/lib/surgical-sales/universalExtractor/runUniversalSurgicalExtraction";

import * as structuredIntelligenceAnalysis from "@/lib/surgical-sales/structuredIntelligenceAnalysis";

import { validateAndNormalizeGptUniversalFacts } from "@/lib/surgical-sales/universalExtractor/validateGptUniversalFacts";

import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

import { buildLogUpdateIntelligenceReview } from "@/lib/surgical-sales/logUpdateRelatedIntelligence";



/** Representative GPT output for Dr. Salt — validation fixture only, not production logic. */

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

    category: "evaluation_sequencing",

    normalized_label: "Commercial disposition: observation before evaluation",

    evidence_text:

      "observing a case would be the best next step before having a more detailed conversation about alternative solutions",

    confidence: "medium",

    should_persist: true,

  },

  {

    category: "relationship_signal",

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



const DR_ONION_GPT_FIXTURE: GptUniversalFactRow[] = [

  {

    category: "access_pathway",

    normalized_label: "Observation access pathway",

    evidence_text:

      "it's usually not a problem once the credentialing process is complete and the timing works for the surgical schedule",

    confidence: "medium",

    should_persist: true,

  },

  {

    category: "credentialing",

    normalized_label: "Credentialing required before OR access",

    evidence_text: "we need to work through credentialing first and nothing was approved today",

    confidence: "medium",

    should_persist: true,

  },

  {

    category: "scheduler_contact",

    normalized_label: "Jennifer · Scheduling Coordinator",

    evidence_text: "Jennifer in his office usually handles scheduling coordination",

    confidence: "medium",

    person_name: "Jennifer",

    role: "Scheduling Coordinator",

    should_persist: true,

  },

  {

    category: "procedure_trend",

    normalized_label: "Complex ventral hernia repair · Increasing procedure volume",

    evidence_text:

      "an increase in complex ventral hernia repairs and more abdominal wall reconstruction procedures than they were a year ago",

    confidence: "medium",

    procedure_name: "Complex ventral hernia repair",

    should_persist: true,

  },

  {

    category: "procedure_trend",

    normalized_label: "Abdominal wall reconstruction · Increasing procedure volume",

    evidence_text: "more abdominal wall reconstruction procedures than they were a year ago",

    confidence: "medium",

    procedure_name: "Abdominal wall reconstruction",

    should_persist: true,

  },

  {

    category: "clinical_growth_signal",

    normalized_label: "Robotic cases increasing",

    evidence_text: "Robotic cases continue to increase",

    confidence: "medium",

    should_persist: true,

  },

  {

    category: "product_usage",

    normalized_label: "Acumed",

    evidence_text: "He uses Acumed for many of his ventral cases",

    confidence: "medium",

    product_name: "Acumed",

    should_persist: true,

  },

  {

    category: "next_action",

    normalized_label: "Next step recommended",

    evidence_text:

      "My next step is to identify Jennifer's contact information and confirm the credentialing pathway",

    confidence: "high",

    should_persist: true,

  },

];



function runsFromFacts(

  facts: ReturnType<typeof validateAndNormalizeGptUniversalFacts>["facts"],

): UniversalFactExtractionRun[] {

  const extractedAt = new Date().toISOString();

  return [

    {

      capture_id: "gpt-test-capture",

      declared_source_type: "intro_call",

      extraction_model: "universal-surgical-gpt-v1",

      created_at: extractedAt,

      operational_note_id: null,

      facts: facts.map((fact, index) => ({

        ...fact,

        id: `uf-gpt-${index}`,

        capture_id: "gpt-test-capture",

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



function factBlob(facts: { normalized_label: string; evidence_text: string; concept: string }[]): string {

  return facts.map((f) => `${f.concept} ${f.normalized_label} ${f.evidence_text}`).join(" ").toLowerCase();

}



describe("GPT universal fact extraction — schema", () => {

  it("maps all required GPT categories to UF concepts", () => {

    expect(GPT_UNIVERSAL_EXTRACTION_CATEGORIES).toHaveLength(22);

    for (const category of GPT_UNIVERSAL_EXTRACTION_CATEGORIES) {

      expect(mapGptCategoryToConcept(category)).toBeTruthy();

    }

  });

});



describe("GPT universal fact extraction — Dr. Salt validation fixture", () => {

  it("validates a product_interest comparison question into the product_interest concept", () => {
    const transcript =
      "Asked how our graft compares on incorporation time. Doesn't seem locked into the incumbent.";
    const validated = validateAndNormalizeGptUniversalFacts({
      rows: [
        {
          category: "product_interest",
          normalized_label: "Asked how our graft compares on incorporation time",
          evidence_text: "Asked how our graft compares on incorporation time.",
          product_name: "our graft",
          confidence: "medium",
          should_persist: true,
        },
      ],
      transcript,
      declared_source_type: "observation_case",
    });

    expect(validated.rejections).toHaveLength(0);
    expect(validated.facts).toHaveLength(1);
    expect(validated.facts[0]?.concept).toBe("product_interest");
    // no internal routing prefix leaks into the label
    expect(validated.facts[0]?.normalized_label).toBe(
      "Asked how our graft compares on incorporation time",
    );
  });

  it("rejects generic equipment descriptors as current products", () => {
    const transcript = "Currently using standard rigid suction irrigation.";
    const validated = validateAndNormalizeGptUniversalFacts({
      rows: [
        {
          category: "product_usage",
          normalized_label: "Current product identified: Standard Rigid Suction Irrigation",
          evidence_text: transcript,
          product_name: "Standard Rigid Suction Irrigation",
          confidence: "high",
          should_persist: true,
        },
      ],
      transcript,
      declared_source_type: "intro_call",
    });

    expect(validated.facts).toHaveLength(0);
    expect(validated.rejections[0]?.reason).toMatch(/Generic equipment descriptor/i);
  });

  it("validates anchored Dr. Salt GPT rows into UF facts", () => {

    const validated = validateAndNormalizeGptUniversalFacts({

      rows: DR_SALT_GPT_FIXTURE,

      transcript: DR_SALT_INTRO_CALL_DICTATION,

      declared_source_type: "intro_call",

    });



    expect(validated.facts.length).toBeGreaterThanOrEqual(12);

    expect(validated.rejections.length).toBe(0);



    const blob = factBlob(validated.facts);

    expect(blob).toMatch(/jennifer/);

    expect(blob).toMatch(/distal radius/);

    expect(blob).toMatch(/upper extremity trauma/);

    expect(blob).toMatch(/complex fracture/);

    expect(blob).toMatch(/acumed/);

    expect(blob).toMatch(/instrumentation availability/);

    expect(blob).toMatch(/operating room efficiency|or efficiency/);

    expect(blob).toMatch(/workflow efficiency/);

    expect(blob).toMatch(/turnover time/);

    expect(blob).toMatch(/staff satisfaction/);

    expect(blob).toMatch(/observ/);

    expect(blob).toMatch(/continuing discussions|continuing the relationship/);

  });



  it("extracts broader intro-call signal coverage via GPT fixture than rules on Dr. Salt", () => {
    const rules = runRulesUniversalSurgicalExtraction({
      raw_note: DR_SALT_INTRO_CALL_DICTATION,
      declared_source_type: "intro_call",
    });
    const gpt = validateAndNormalizeGptUniversalFacts({
      rows: DR_SALT_GPT_FIXTURE,
      transcript: DR_SALT_INTRO_CALL_DICTATION,
      declared_source_type: "intro_call",
    });

    const rulesBlob = rules.facts
      .map((f) => `${f.concept} ${f.normalized_label} ${f.evidence_text}`)
      .join(" ")
      .toLowerCase();
    const gptBlob = gpt.facts
      .map((f) => `${f.concept} ${f.normalized_label} ${f.evidence_text}`)
      .join(" ")
      .toLowerCase();

    expect(gpt.facts.some((f) => f.concept === "contact_role")).toBe(true);
    expect(rules.facts.some((f) => f.concept === "contact_role")).toBe(true);
    expect(gptBlob).toMatch(/turnover time|staff satisfaction|instrumentation availability/);
    expect(gptBlob).toMatch(/observation before evaluation|continuing discussions|open to continuing/i);
    expect(gpt.facts.length).toBeGreaterThanOrEqual(10);
    expect(gpt.facts.filter((f) => !f.uncertain).length).toBeGreaterThanOrEqual(8);
    expect(rulesBlob).toMatch(/acumed|distal radius|or efficiency/);
  });



  it("projects the same GPT-validated facts through review and cards", () => {

    const validated = validateAndNormalizeGptUniversalFacts({

      rows: DR_SALT_GPT_FIXTURE,

      transcript: DR_SALT_INTRO_CALL_DICTATION,

      declared_source_type: "intro_call",

    });

    const debriefRuns = runsFromFacts(validated.facts);



    const { cards } = mapUniversalFactsToActionableReviewCards({

      dictation: DR_SALT_INTRO_CALL_DICTATION,

      debriefRuns,

    });

    expect(cards.some((c) => c.category === "clinical_focus")).toBe(true);

    expect(cards.some((c) => c.category === "product_intelligence")).toBe(true);

    expect(cards.some((c) => c.category === "workflow_participant")).toBe(true);

    expect(cards.some((c) => c.category === "follow_up_task")).toBe(true);



    const projection = buildReviewProjectionFromUniversalFacts({

      dictation: DR_SALT_INTRO_CALL_DICTATION,

      debriefRuns,

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

    expect(projection.intelligenceFieldUpdates.length).toBeGreaterThan(3);

  });

});



describe("GPT universal fact extraction — Dr. Onion hernia non-regression", () => {

  it("preserves hernia/AWR/robotic/Acumed/credentialing signals from GPT fixture", () => {

    const validated = validateAndNormalizeGptUniversalFacts({

      rows: DR_ONION_GPT_FIXTURE,

      transcript: DR_ONION_INTRO_CALL_DICTATION,

      declared_source_type: "intro_call",

    });



    const blob = factBlob(validated.facts);

    expect(blob).toMatch(/ventral hernia/);

    expect(blob).toMatch(/abdominal wall reconstruction/);

    expect(blob).toMatch(/robotic/);

    expect(blob).toMatch(/acumed/);

    expect(blob).toMatch(/credentialing/);

    expect(blob).toMatch(/jennifer/);

  });

});



describe("GPT universal fact extraction — validation guards", () => {

  it("rejects unanchored evidence", () => {

    const validated = validateAndNormalizeGptUniversalFacts({

      rows: [

        {

          category: "product_usage",

          normalized_label: "Invented product",

          evidence_text: "This quote does not appear anywhere in the note at all.",

          confidence: "high",

          product_name: "FakeCo",

          should_persist: true,

        },

      ],

      transcript: DR_SALT_INTRO_CALL_DICTATION,

      declared_source_type: "intro_call",

    });

    expect(validated.facts.length).toBe(0);

    expect(validated.rejections.some((r) => /anchored/i.test(r.reason))).toBe(true);

  });



  it("respects should_persist=false from model", () => {

    const validated = validateAndNormalizeGptUniversalFacts({

      rows: [

        {

          category: "procedure_trend",

          normalized_label: "Speculative trend",

          evidence_text: "referral volume has been strong",

          confidence: "low",

          should_persist: false,

          rejection_reason: "Insufficient explicit volume language",

        },

      ],

      transcript: DR_SALT_INTRO_CALL_DICTATION,

      declared_source_type: "intro_call",

    });

    expect(validated.facts.length).toBe(0);

    expect(validated.suppressed_facts.length).toBe(1);

  });

});



describe("GPT universal fact extraction — async orchestrator", () => {

  beforeEach(() => {

    vi.stubEnv("USE_GPT_UNIVERSAL_FACT_EXTRACTOR", "1");

  });



  afterEach(() => {

    vi.unstubAllEnvs();

    vi.restoreAllMocks();

  });



  it("uses mocked OpenAI JSON when flag is on", async () => {

    vi.spyOn(structuredIntelligenceAnalysis, "callOpenAiStructuredJson").mockResolvedValue(

      JSON.stringify({ facts: DR_SALT_GPT_FIXTURE }),

    );



    const result = await runOpenAiUniversalFactExtraction({

      raw_note: DR_SALT_INTRO_CALL_DICTATION,

      declared_source_type: "intro_call",

    });

    expect(result.facts.length).toBeGreaterThanOrEqual(12);

  });



  it("runUniversalSurgicalExtractionAsync returns gpt model when flag on", async () => {

    vi.spyOn(structuredIntelligenceAnalysis, "callOpenAiStructuredJson").mockResolvedValue(

      JSON.stringify({ facts: DR_SALT_GPT_FIXTURE.slice(0, 10) }),

    );



    const result = await runUniversalSurgicalExtractionAsync({

      raw_note: DR_SALT_INTRO_CALL_DICTATION,

      declared_source_type: "intro_call",

    });

    expect(result.model).toBe("universal-surgical-gpt-v1");

    expect(result.extraction_engine).toBe("gpt");

    expect(result.facts.length).toBeGreaterThan(0);

  });

});


