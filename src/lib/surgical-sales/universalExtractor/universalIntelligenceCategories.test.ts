import { describe, expect, it } from "vitest";



import {

  categoriesForConcept,

  conceptsForCategory,

  UNIVERSAL_INTELLIGENCE_CATEGORIES,

  UNIVERSAL_INTELLIGENCE_CATEGORY_DEFS,

} from "@/lib/surgical-sales/universalExtractor/universalIntelligenceCategories";

import { extractUniversalCategorySignals } from "@/lib/surgical-sales/sharedIntelligence/extractUniversalCategorySignals";

import { extractGenericVolumeTrendSignals } from "@/lib/surgical-sales/sharedIntelligence/extractGenericClinicalTrends";

import { extractUniversalSurgicalFacts } from "@/lib/surgical-sales/universalExtractor/extractUniversalSurgicalFacts";

import { mapUniversalFactsToActionableReviewCards } from "@/lib/surgical-sales/universalExtractor/mapUniversalFactsToActionableReviewCards";

import { buildReviewProjectionFromUniversalFacts } from "@/lib/surgical-sales/universalExtractor/buildReviewProjectionFromUniversalFacts";

import { adaptUniversalFactsToCategoryEmergingChips } from "@/lib/surgical-sales/universalExtractor/adaptUniversalFactsToProviderClinicalSignals";

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



const SPECIALTY_CLINICAL_SNIPPETS: Array<{ specialty: string; text: string }> = [

  {

    specialty: "Hernia",

    text: "He mentioned increasing ventral hernia volume with more robotic abdominal wall cases this year.",

  },

  {

    specialty: "Trauma",

    text: "Increased volume in complex trauma and polytrauma compared to previous years.",

  },

  {

    specialty: "Distal radius",

    text: "Increased distal radius fractures and upper extremity trauma compared to a year ago.",

  },

  {

    specialty: "Foot & ankle",

    text: "Growing foot and ankle reconstruction volume with more referral patterns lately.",

  },

  {

    specialty: "Spine",

    text: "Seeing an increase in minimally invasive spine cases and more lumbar procedure volume.",

  },

  {

    specialty: "Breast",

    text: "Breast reconstruction case volume is increasing in his practice overall.",

  },

  {

    specialty: "Thoracic",

    text: "Thoracic oncology referrals are becoming more common in the practice.",

  },

  {

    specialty: "General surgery",

    text: "More laparoscopic cholecystectomy cases than last year with higher surgical volume.",

  },

];



const CATEGORY_SNIPPETS: Array<{ category: string; text: string; expectConcept: string }> = [

  {

    category: "Workflow friction",

    text: "Instrumentation availability has been frustrating in the OR and slows cases down.",

    expectConcept: "inventory_availability_issue",

  },

  {

    category: "Workflow priority",

    text: "Workflow efficiency and consistency are important priorities for the team.",

    expectConcept: "workflow_or_timing_issue",

  },

  {

    category: "Access pathway",

    text: "Provider was receptive to observation access and said it is usually not a problem to coordinate.",

    expectConcept: "access_pathway",

  },

  {

    category: "Relationship signal",

    text: "Provider is open to continuing the relationship and interested in continuing discussions.",

    expectConcept: "provider_sentiment",

  },

  {

    category: "Product usage",

    text: "He uses Acumed for most upper extremity fracture fixation cases.",

    expectConcept: "current_product",

  },

  {

    category: "Product dissatisfaction",

    text: "He has been frustrated with product performance on difficult fixation cases.",

    expectConcept: "product_performance_issue",

  },

  {

    category: "Operational constraint",

    text: "The requested implant tray was unavailable and staff had to find an alternative item.",

    expectConcept: "unavailable_item",

  },

  {

    category: "Contact role",

    text: "Jennifer handles most of the scheduling and coordinates OR block time.",

    expectConcept: "contact_role",

  },

  {

    category: "Next-step recommendation",

    text: "My next step is to coordinate observation access with Jennifer next week.",

    expectConcept: "next_action",

  },

];



function runsFromDictation(
  dictation: string,
  source = "intro_call",
  context?: Parameters<typeof extractUniversalSurgicalFacts>[0]["context"],
): UniversalFactExtractionRun[] {

  const { facts } = extractUniversalSurgicalFacts({

    raw_note: dictation,

    declared_source_type: source,

    context,

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



describe("universal intelligence categories — taxonomy", () => {

  it("defines all categories with UF concepts", () => {

    expect(UNIVERSAL_INTELLIGENCE_CATEGORIES).toHaveLength(13);

    for (const def of UNIVERSAL_INTELLIGENCE_CATEGORY_DEFS) {

      expect(def.primaryConcepts.length).toBeGreaterThan(0);

      expect(def.extractToday).toBe(true);

      expect(def.persistToday).toBe(true);

      expect(def.reviewProjectionToday).toBe(true);

      expect(def.providerIntelligenceToday).toBe(true);

    }

  });



  it("maps concepts back to categories", () => {

    for (const def of UNIVERSAL_INTELLIGENCE_CATEGORY_DEFS) {

      for (const concept of def.primaryConcepts) {

        expect(categoriesForConcept(concept)).toContain(def.id);

        expect(conceptsForCategory(def.id)).toContain(concept);

      }

    }

  });

});



describe("universal intelligence categories — multi-specialty clinical trends", () => {

  for (const { specialty, text } of SPECIALTY_CLINICAL_SNIPPETS) {

    it(`extracts procedure volume trend for ${specialty} without specialty-specific rules`, () => {

      const generic = extractGenericVolumeTrendSignals(text);

      expect(generic.some((signal) => signal.concept === "procedure_volume_trend")).toBe(true);



      const { facts } = extractUniversalSurgicalFacts({

        raw_note: text,

        declared_source_type: "intro_call",

      });

      expect(

        facts.some(

          (fact) =>

            fact.concept === "procedure_volume_trend" || fact.concept === "procedure_focus",

        ),

      ).toBe(true);

    });

  }

  it("does not turn conversation topics into procedure or volume intelligence", () => {
    const text =
      "We discussed his current abdominal wall reconstruction practice and some of the types of cases he is seeing.";

    expect(extractGenericVolumeTrendSignals(text)).toEqual([]);

    const { facts } = extractUniversalSurgicalFacts({
      raw_note: text,
      declared_source_type: "intro_call",
    });

    expect(
      facts.some(
        (fact) =>
          fact.concept === "procedure_volume_trend" ||
          fact.concept === "procedure_focus" ||
          fact.concept === "technology_preference",
      ),
    ).toBe(false);
  });

  it("drops conversation-topic clinical labels while retaining explicit volume trends", () => {
    const text =
      "We discussed his current hernia practice. Clinically, he mentioned they've been doing more robotic ventral hernia repairs lately and are seeing a higher volume of abdominal wall reconstruction cases than they were a year ago.";
    const { facts } = extractUniversalSurgicalFacts({
      raw_note: text,
      declared_source_type: "intro_call",
    });
    const clinicalText = facts
      .filter((fact) => fact.concept === "procedure_volume_trend" || fact.concept === "procedure_focus")
      .map((fact) => `${fact.concept}: ${fact.normalized_label} ${fact.evidence_text}`)
      .join("\n");

    expect(clinicalText).toMatch(/Robotic ventral hernia repair · Increasing procedure volume/i);
    expect(clinicalText).toMatch(/Abdominal wall reconstruction · Increasing procedure volume/i);
    expect(clinicalText).not.toMatch(/we discussed his current hernia practice/i);
    expect(clinicalText).not.toMatch(/We Discussed His Current Hernia Practice/i);
  });

  it("keeps explicit procedure focus without inventing an increasing-volume trend", () => {
    const text = "Abdominal wall reconstruction is a major focus area in his practice.";
    const { facts } = extractUniversalSurgicalFacts({
      raw_note: text,
      declared_source_type: "intro_call",
    });

    expect(facts.some((fact) => fact.concept === "procedure_focus")).toBe(true);
    expect(facts.some((fact) => fact.concept === "procedure_volume_trend")).toBe(false);
  });

  it("treats strong volume as durable procedure focus, not increasing volume", () => {
    const text =
      "He mentioned they're continuing to see a strong volume of ventral hernia and abdominal wall reconstruction cases.";
    const { facts } = extractUniversalSurgicalFacts({
      raw_note: text,
      declared_source_type: "intro_call",
    });
    const factText = facts
      .map((fact) => `${fact.concept}: ${fact.normalized_label} ${fact.evidence_text}`)
      .join("\n");

    expect(facts.some((fact) => fact.concept === "procedure_volume_trend")).toBe(false);
    expect(factText).toMatch(/procedure_focus:.*ventral hernia/i);
    expect(factText).toMatch(/procedure_focus:.*abdominal wall reconstruction/i);
    expect(factText).not.toMatch(/increasing (?:procedure|case) volume/i);
  });

});



describe("universal intelligence categories — category signal extraction", () => {

  for (const { category, text, expectConcept } of CATEGORY_SNIPPETS) {

    it(`extracts ${category} via UF rules`, () => {

      const categorySignals = extractUniversalCategorySignals(text);

      const { facts } = extractUniversalSurgicalFacts({

        raw_note: text,

        declared_source_type: "intro_call",

      });



      const categoryHit = categorySignals.some((signal) => signal.concept === expectConcept);

      const factHit = facts.some((fact) => fact.concept === expectConcept);



      expect(categoryHit || factHit).toBe(true);

    });

  }



  it("does not treat commercial alternative solutions as product substitution", () => {

    const text =

      "Best next step before any detailed conversation about alternative solutions is to observe a case.";

    const { facts } = extractUniversalSurgicalFacts({

      raw_note: text,

      declared_source_type: "intro_call",

    });

    expect(facts.some((fact) => fact.concept === "alternative_used")).toBe(false);

  });

  it("extracts Lettuce-style observation dictation into distinct universal signals", () => {
    const text = [
      "Observation with Dr. Lettuce at Memorial.",
      "He used Arthrex SpeedBridge and ArthroFlex graft today.",
      "Mentioned they've had a few inventory issues getting ArthroFlex lately.",
      "Asked how our graft compares on incorporation time.",
      "Tissue quality wasn't great. He spent extra time reinforcing the repair.",
      "Sarah, the scrub tech, said they've had a couple cases delayed waiting on grafts.",
      "Doesn't seem locked into Arthrex.",
      "Efficiency is a big deal for him. Said turnover times are getting tighter.",
      "Send him the clinical data we talked about.",
      "Follow up in a couple weeks.",
    ].join(" ");

    const { facts } = extractUniversalSurgicalFacts({
      raw_note: text,
      declared_source_type: "observation_case",
      context: { provider_display_name: "Dr. Lettuce" },
    });

    const blob = facts.map((fact) => `${fact.concept}: ${fact.normalized_label} ${fact.evidence_text}`).join("\n");
    const productNames = facts
      .filter((fact) => fact.concept === "current_product")
      .map((fact) => fact.product_mentioned?.toLowerCase());

    expect(productNames).toEqual(expect.arrayContaining(["arthrex speedbridge", "arthroflex graft"]));
    expect(blob).toMatch(/inventory_availability_issue.*ArthroFlex/i);
    expect(blob).toMatch(/product_interest.*incorporation time/i);
    expect(blob).toMatch(/contact_role.*Sarah.*Scrub Tech/i);
    expect(blob).toMatch(/staff_workflow.*delayed waiting on grafts/i);
    expect(blob).toMatch(/provider_sentiment.*locked into Arthrex/i);
    expect(blob).toMatch(/workflow_or_timing_issue.*turnover times/i);
    expect(facts.filter((fact) => fact.concept === "next_action").length).toBeGreaterThanOrEqual(2);
    expect(blob).not.toMatch(/visualization_or_access_issue/i);
  });

  it("does not surface commercial disposition as a rep-facing category signal", () => {
    const categorySignals = extractUniversalCategorySignals(
      "Best next step before any formal evaluation is to observe a case first.",
    );
    expect(
      categorySignals.some(
        (signal) =>
          signal.concept === "provider_sentiment" &&
          /commercial disposition/i.test(String(signal.normalized_label ?? "")),
      ),
    ).toBe(false);
  });

  it("captures generic current equipment setup without duplicating named product usage", () => {
    const setupSignals = extractUniversalCategorySignals("Currently using standard rigid suction irrigation.");
    expect(
      setupSignals.some(
        (signal) =>
          signal.concept === "workflow_or_timing_issue" &&
          /Current setup: standard rigid suction irrigation/i.test(signal.normalized_label),
      ),
    ).toBe(true);

    const productSignals = extractUniversalCategorySignals(
      "He is currently using Bard Mesh in many hernia cases.",
    );
    expect(
      productSignals.some(
        (signal) =>
          signal.concept === "workflow_or_timing_issue" &&
          /Current setup/i.test(signal.normalized_label),
      ),
    ).toBe(false);
  });

});



describe("universal intelligence categories — review and PI projection", () => {

  it("projects category facts into review cards and field updates", () => {

    const dictation = [

      "Jennifer handles most of the scheduling.",

      "Provider was receptive to observation access.",

      "Workflow efficiency is an important priority.",

      "Increased distal radius fracture volume compared to last year.",

      "He uses Acumed for upper extremity cases.",

      "My next step is to coordinate observation access next week.",

    ].join(" ");



    const debriefRuns = runsFromDictation(dictation);

    const { cards } = mapUniversalFactsToActionableReviewCards({ dictation, debriefRuns });



    expect(cards.some((card) => card.category === "clinical_focus")).toBe(true);

    expect(cards.some((card) => card.category === "product_intelligence")).toBe(true);

    expect(cards.some((card) => card.category === "observation_access")).toBe(true);

    expect(cards.some((card) => card.category === "workflow_participant")).toBe(true);

    // Rep-stated next steps surface as actionable follow-up task cards (not provider intelligence).
    expect(cards.some((card) => card.category === "follow_up_task")).toBe(true);



    const projection = buildReviewProjectionFromUniversalFacts({

      dictation,

      debriefRuns,

      workflowLogUpdate: emptyWorkflowLogUpdate(dictation),

      existingFields: {},

    });

    expect(projection.intelligenceFieldUpdates.length).toBeGreaterThan(0);



    const chips = adaptUniversalFactsToCategoryEmergingChips({ providerRuns: debriefRuns });

    expect(chips.length).toBeGreaterThan(0);

  });

  it("extracts all needed review signals from Mission Board field note wording", () => {
    const dictation = [
      "Spoke with Dr. Lettuce today for an introductory conversation. Overall he was friendly and open to learning more about what we're doing.",
      "He mentioned they're continuing to do a high volume of ventral hernia and abdominal wall reconstruction procedures.",
      "Observation access wasn't approved today, but he didn't express any concerns about it either.",
      "He suggested I coordinate through his office to better understand the process.",
      "Jennifer appears to be involved in scheduling and may be a good contact for future coordination.",
      "My next step is to connect with the office staff, learn more about the observation process, and continue building the relationship with Dr. Onion.",
    ].join(" ");

    const debriefRuns = runsFromDictation(dictation, "discovery_note", {
      provider_display_name: "Dr. Lettuce",
    });
    const facts = debriefRuns.flatMap((run) => run.facts);
    const factText = facts.map((fact) => `${fact.concept}: ${fact.normalized_label} ${fact.evidence_text}`).join("\n");

    expect(factText).toMatch(/ventral hernia/i);
    expect(factText).toMatch(/abdominal wall reconstruction/i);
    expect(factText).toMatch(/access_pathway/i);
    expect(factText).toMatch(/provider_sentiment/i);
    expect(factText).toMatch(/contact_role.*Jennifer/i);
    expect(factText).toMatch(/next_action/i);
    expect(factText).not.toMatch(/Dr\. Onion/i);
    expect(facts.some((fact) => fact.concept === "credentialing_requirement")).toBe(false);

    const { cards } = mapUniversalFactsToActionableReviewCards({ dictation, debriefRuns });
    const cardText = cards.map((card) => `${card.category}: ${card.headline}`).join("\n");

    expect(cardText).toMatch(/ventral hernia/i);
    expect(cardText).toMatch(/abdominal wall reconstruction/i);
    expect(cardText).toMatch(/Observation/i);
    expect(cardText).toMatch(/Jennifer/i);
    // The rep next step becomes an actionable follow-up task card rather than leaking into intelligence cards.
    expect(cards.some((card) => card.category === "follow_up_task")).toBe(true);
    expect(
      cards
        .filter((card) => card.category !== "follow_up_task")
        .some((card) => /next step|connect with the office staff/i.test(card.headline)),
    ).toBe(false);
    expect(cardText).not.toMatch(/Dr\. Onion/i);

    const projection = buildReviewProjectionFromUniversalFacts({
      dictation,
      debriefRuns,
      workflowLogUpdate: emptyWorkflowLogUpdate(dictation),
      existingFields: {},
    });
    const projectedFields = projection.logUpdate.fieldUpdates ?? [];
    expect(
      projectedFields.some(
        (field) =>
          field.dbKey === "provider_workflow_pain_points" &&
          /next step|office staff|team influence on case flow/i.test(field.proposedValue),
      ),
    ).toBe(false);
  });

  it("keeps intro-call ACSIS curiosity separate from current equipment and generic modality rows", () => {
    const dictation = [
      "Intro call with Dr. Tom Lettuce.",
      "Discussed ACSIS.",
      "He does a fair amount of robotic colorectal and hernia work.",
      "Currently using standard rigid suction irrigation.",
      "Said one of the challenges in deeper pelvic cases is reaching pooled fluid without fighting other instruments.",
      "Mentioned there are definitely times when suction becomes more of a struggle in tighter anatomy.",
      "Asked whether ACSIS works with their existing suction setup.",
      "Was interested in the curved design and how it gets around anatomy.",
      "Also asked whether there was much of a learning curve for assistants.",
      "He wasn't ready to evaluate anything off a phone call.",
      "Suggested the best next step would be observing a few of his robotic cases.",
      "Said if the device solves real problems in the OR he'd be willing to look at it.",
      "Need to coordinate an observation and identify upcoming robotic cases.",
    ].join(" ");

    const debriefRuns = runsFromDictation(dictation, "intro_call", {
      provider_display_name: "Dr. Tom Lettuce",
    });
    const facts = debriefRuns.flatMap((run) => run.facts);
    const factText = facts.map((fact) => `${fact.concept}: ${fact.normalized_label} ${fact.evidence_text}`).join("\n");

    expect(factText).toMatch(/product_interest: Product interest: ACSIS/i);
    expect(factText).toMatch(/asked whether ACSIS works|learning curve|curved design/i);
    expect(factText).toMatch(/workflow_or_timing_issue: Current setup: standard rigid suction irrigation/i);
    expect(factText).not.toMatch(/current_product:.*ACSIS/i);
    expect(factText).not.toMatch(/current_product:.*standard rigid/i);
    expect(factText).not.toMatch(/technology_preference:.*\bRobotic\b/i);

    const { cards } = mapUniversalFactsToActionableReviewCards({ dictation, debriefRuns });
    const cardText = cards.map((card) => `${card.category}: ${card.headline}`).join("\n");

    expect(cardText).toMatch(/product_intelligence: Product interest:/i);
    expect(cardText).toMatch(/Current setup: standard rigid suction irrigation/i);
    expect(cardText).not.toMatch(/Current product identified: Standard Rigid/i);
    expect(cardText).not.toMatch(/clinical_focus: Robotic · Technique/i);
    expect(cardText).not.toMatch(/clinical_focus: Procedure Focus/i);
    const productInterestCards = cards.filter(
      (card) => card.category === "product_intelligence" && /Product interest:/i.test(card.headline),
    );
    expect(productInterestCards.every((card) => card.evidenceStatus === "Interest noted")).toBe(true);

    const projection = buildReviewProjectionFromUniversalFacts({
      dictation,
      debriefRuns,
      workflowLogUpdate: emptyWorkflowLogUpdate(dictation),
      existingFields: {},
    });
    expect(
      projection.intelligenceFieldUpdates.some(
        (field) => field.dbKey === "provider_product_interests" && /ACSIS|curved design|learning curve/i.test(field.proposedValue),
      ),
    ).toBe(true);
    expect(
      projection.intelligenceFieldUpdates.some((field) =>
        /standard rigid suction irrigation|ACSIS|curved design|learning curve/i.test(field.proposedValue),
      ),
    ).toBe(true);
  });

  it("resolves generic product-interest card labels from any known product mentioned in the note", () => {
    const dictation =
      "Intro call with Dr. Example. Discussed Bard Mesh. He asked whether the product has better data for ventral cases.";
    const debriefRuns: UniversalFactExtractionRun[] = [
      {
        capture_id: "test-product-interest",
        declared_source_type: "intro_call",
        extraction_model: "test",
        created_at: new Date().toISOString(),
        operational_note_id: null,
        facts: [
          {
            id: "uf-product-interest-generic",
            capture_id: "test-product-interest",
            provider_id: null,
            organization_id: null,
            case_id: null,
            encounter_id: null,
            suppressed: false,
            created_at: new Date().toISOString(),
            concept: "product_interest",
            normalized_label: "Product feature interest",
            assertion_level: "explicit",
            source_type: "intro_call",
            evidence_text: "He asked whether the product has better data for ventral cases.",
            confidence: "high",
            negated: false,
            uncertain: false,
          },
        ],
      },
    ];

    const { cards } = mapUniversalFactsToActionableReviewCards({ dictation, debriefRuns });
    const productCard = cards.find((card) => card.category === "product_intelligence");

    expect(productCard?.headline).toBe("Product interest: Bard Mesh");
    expect(productCard?.productName).toBe("Bard Mesh");
  });

  it.each([
    [
      "office-process wording",
      "Met with Dr. Lettuce. He was receptive to continuing discussions. They are seeing more ventral hernia repairs and abdominal wall reconstruction cases. No observation was approved today. Jennifer helps with scheduling. My next step is to confirm the office observation process.",
    ],
    [
      "scheduler-soft wording",
      "Dr. Lettuce seemed open to learning more. Ventral hernia and abdominal wall reconstruction are high-volume areas. Observation access still needs approval. Jennifer may coordinate scheduling. Next steps are to reach out to office staff and learn the process.",
    ],
    [
      "relationship wording",
      "Intro call with Dr. Lettuce went well and he was friendly. He mentioned a high volume of ventral hernia and abdominal wall reconstruction procedures. Observation access was not approved. Jennifer appears involved in scheduling. My next step is to connect with Jennifer and continue the conversation.",
    ],
    [
      "no product discussion wording",
      "Spoke with Dr. Lettuce. No product discussion yet, but he was open to continuing. He does a high volume of ventral hernia plus abdominal wall reconstruction work. Observation was not approved today. Jennifer is involved in scheduling. My next step is to learn the office observation process.",
    ],
    [
      "process-first wording",
      "Dr. Lettuce said observation access was not approved today and suggested coordinating through the office. Jennifer appears to be the scheduling contact. He continues to see high volume ventral hernia and abdominal wall reconstruction procedures and was open to more discussion. My next step is to connect with office staff.",
    ],
  ])("extracts complete field-note signals across %s", (_name, dictation) => {
    const debriefRuns = runsFromDictation(dictation, "discovery_note", {
      provider_display_name: "Dr. Lettuce",
    });
    const facts = debriefRuns.flatMap((run) => run.facts);
    const factText = facts.map((fact) => `${fact.concept}: ${fact.normalized_label} ${fact.evidence_text}`).join("\n");

    expect(factText).toMatch(/ventral hernia/i);
    expect(factText).toMatch(/abdominal wall reconstruction/i);
    expect(factText).toMatch(/access_pathway/i);
    expect(factText).toMatch(/provider_sentiment/i);
    expect(factText).toMatch(/contact_role.*Jennifer/i);
    expect(factText).toMatch(/next_action/i);
  });

});


