import { describe, expect, it } from "vitest";

import { buildDebriefActionableReviewCards } from "@/lib/surgical-sales/buildDebriefActionableReviewCards";
import {
  buildDebriefIntelligenceExtractionReview,
  buildInitialProposedContacts,
} from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import { buildDebriefReviewDecisionContext } from "@/lib/surgical-sales/debriefIntelligencePipeline/buildDebriefReviewDecisionContext";
import {
  buildIntelligenceBriefOutcomes,
  buildDebriefIntelligenceBrief,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import {
  buildParseResultFromDebriefFacts,
  buildStillToValidateFromFacts,
  normalizeAndDedupeAtomicFacts,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import {
  extractDebriefProductIntelligenceFromText,
  resolveCurrentProductFromContact,
  supplementAtomicFactsWithProductIntelligence,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefProductIntelligenceExtraction";
import { buildRegressionAtomicFactsFromDictation } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefRegressionAtomicFactStandIn";
import {
  buildDebriefReviewSummary,
  buildExecutiveDebriefTakeaways,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewSummary";
import { PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS } from "@/lib/surgical-sales/intelligenceScopeInference";

const DR_APPLE_INTRO_DICTATION =
  "I had an intro call with Dr. Apple. He gave me approval to come observe cases. He is currently using Bard Mesh in a lot of his hernia cases from what I understood, but I need to confirm that during observation.";

const DR_APPLE_FULL_INTRO_DICTATION =
  "I had an intro call with Dr. Apple. He gave me approval to come observe cases. Karen from his office handles most of the scheduling coordination and works closely with the hospital OR scheduling team, but I do not have her contact information yet. Tom said vendor credentialing is normally required before anybody can get into the OR. Clinically, he said they have been doing more robotic ventral hernia repairs lately and are seeing more abdominal wall reconstruction cases than they used to. He is currently using Bard Mesh in a lot of his hernia cases from what I understood, but I need to confirm that during observation.";

const DR_LETTUCE_ACSIS_INTRO_DICTATION = [
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

function runIntroCallPipeline(dictation: string) {
  const facts = buildRegressionAtomicFactsFromDictation(dictation);
  const parse = buildParseResultFromDebriefFacts({
    sourceText: dictation,
    facts,
    context: {
      providerId: "provider-apple",
      writableFieldKeys: [...PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS],
    },
    existingFields: {},
  });
  const extraction = buildDebriefIntelligenceExtractionReview({
    review: parse,
    proposedContacts: buildInitialProposedContacts({
      review: parse,
      sourceReference: "test",
    }),
    sourceReference: "test",
  });
  const proposedContacts = extraction.proposedContacts ?? [];
  const cards = buildDebriefActionableReviewCards({
    extraction,
    proposedContacts,
    dictation,
    guardContext: buildDebriefReviewDecisionContext({ providerId: "provider-apple" }),
  });
  const brief = buildDebriefIntelligenceBrief({ cards });
  const outcomes = buildIntelligenceBriefOutcomes(brief);
  const summary = buildDebriefReviewSummary({ outcomes, providerLabel: "Dr. Apple" });
  return { facts: parse.atomicFacts ?? [], cards, brief, outcomes, summary, parse };
}

describe("debriefProductIntelligenceExtraction", () => {
  it("extracts Bard Mesh from hedged intro-call dictation without suppressing the finding", () => {
    const { findings } = extractDebriefProductIntelligenceFromText(DR_APPLE_INTRO_DICTATION);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      findingType: "current_product",
      productName: "Bard Mesh",
      confidence: "medium",
      evidenceStatus: "needs_confirmation",
    });
    expect(findings[0]?.procedureContext).toMatch(/hernia cases/i);
    expect(findings[0]?.modifiers).toEqual(
      expect.arrayContaining(["hedged_language", "needs_observation_confirmation"]),
    );
    expect(findings[0]?.nextValidationStep).toBe("Confirm product usage during first observation");
  });

  it("extracts still-using Bard Mesh with reduced confidence but does not skip", () => {
    const dictation = "They're still using Bard Mesh from what I could tell.";
    const { findings } = extractDebriefProductIntelligenceFromText(dictation);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.productName).toBe("Bard Mesh");
    expect(findings[0]?.confidence).toBe("medium");
    expect(findings[0]?.modifiers).toContain("hedged_language");
  });

  it("still-using Bard Mesh does not create a clinical procedure focus finding", () => {
    const dictation = "They're still using Bard Mesh from what I could tell.";
    const facts = buildRegressionAtomicFactsFromDictation(dictation);
    expect(facts.some((fact) => fact.fact_type === "current_product" && fact.entity === "Bard Mesh")).toBe(true);
    expect(facts.some((fact) => fact.fact_type === "clinical_focus")).toBe(false);
  });

  it("does not extract pronoun He as product name from hedged usage sentence", () => {
    const dictation =
      "He is currently using Bard Mesh in a lot of his hernia cases from what I understood, but I need to confirm that during observation.";
    const { findings } = extractDebriefProductIntelligenceFromText(dictation);
    expect(findings.some((finding) => finding.productName === "He")).toBe(false);
    expect(findings[0]?.productName).toBe("Bard Mesh");
  });

  it("extracts Phasix without capturing He as the product name", () => {
    const dictation = "He uses Phasix sometimes.";
    const { findings } = extractDebriefProductIntelligenceFromText(dictation);
    expect(findings.some((finding) => finding.productName === "He")).toBe(false);
    expect(findings[0]?.productName).toBe("Phasix");
  });

  it('extracts Acumed only from "uses acumed for many of his cases"', () => {
    const { findings } = extractDebriefProductIntelligenceFromText("uses acumed for many of his cases");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.productName).toBe("Acumed");
    expect(findings[0]?.productName).not.toMatch(/\b(for|many|of)\b/i);
  });

  it("resolves Bard Mesh from stored competitive products sentence without He artifact", () => {
    const product = resolveCurrentProductFromContact({
      provider_competitive_products:
        "He is currently using Bard Mesh in a lot of his hernia cases from what I understood, but I need to confirm that during observation.",
    });
    expect(product?.productName).toBe("Bard Mesh");
    expect(product?.productName).not.toBe("He");
  });

  it("does not create current_product finding when product is unknown", () => {
    const dictation = "Not sure yet what mesh they are using.";
    const { findings, evidenceGaps } = extractDebriefProductIntelligenceFromText(dictation);
    expect(findings).toHaveLength(0);
    expect(evidenceGaps).toContain("Confirm current product / mesh usage");
  });

  it("does not treat ACSIS discussion or questions as current product usage", () => {
    const { findings } = extractDebriefProductIntelligenceFromText(DR_LETTUCE_ACSIS_INTRO_DICTATION);
    expect(findings.some((finding) => finding.productName === "ACSIS")).toBe(false);
    expect(findings.some((finding) => /standard rigid/i.test(finding.productName))).toBe(false);
  });
});

describe("debrief intro call product intelligence review flow", () => {
  it("surfaces product intelligence in review modal and debrief summary for Dr. Apple intro call", () => {
    const { facts, brief, outcomes, summary } = runIntroCallPipeline(DR_APPLE_INTRO_DICTATION);

    const productFacts = facts.filter((fact) => fact.fact_type === "current_product" && fact.entity.trim());
    expect(productFacts.length).toBeGreaterThanOrEqual(1);
    expect(productFacts[0]).toMatchObject({
      entity: "Bard Mesh",
      attribute: "needs_confirmation",
      confidence: "medium",
    });

    expect(brief.observationAccess).not.toBeNull();
    expect(brief.productIntelligence).toHaveLength(1);
    expect(brief.productIntelligence[0]?.productName).toBe("Bard Mesh");
    expect(brief.productIntelligence[0]?.evidenceStatus).toBe("Needs confirmation");

    const productOutcomes = outcomes.filter((outcome) => outcome.kind === "product_intelligence");
    expect(productOutcomes).toHaveLength(1);
    expect(productOutcomes[0]?.summaryLine).toBe("Current product identified: Bard Mesh");
    expect(productOutcomes[0]?.productEvidenceStatus).toBe("Needs confirmation");

    expect(summary.takeaways).toContain("Current product identified: Bard Mesh");
    expect(buildExecutiveDebriefTakeaways(outcomes)).toContain("Current product identified: Bard Mesh");
  });

  it("Dr. Apple full intro call keeps dual clinical trends, Karen, credentialing, and Bard Mesh summary", () => {
    const { brief, outcomes, summary } = runIntroCallPipeline(DR_APPLE_FULL_INTRO_DICTATION);

    expect(brief.observationAccess?.bullets.some((bullet) => /approved|interested/i.test(bullet))).toBe(true);
    expect(brief.observationAccess?.bullets.some((bullet) => /credential/i.test(bullet))).toBe(true);
    expect(brief.contacts.some((contact) => /karen/i.test(contact.primaryLine))).toBe(true);

    const clinicalOutcomes = outcomes.filter((outcome) => outcome.kind === "clinical_insight");
    expect(clinicalOutcomes.length).toBeGreaterThanOrEqual(2);
    const clinicalBlob = clinicalOutcomes.map((outcome) => outcome.primaryLine ?? outcome.summaryLine).join("\n");
    expect(clinicalBlob).toMatch(/robotic ventral hernia repair/i);
    expect(clinicalBlob).toMatch(/abdominal wall reconstruction/i);

    expect(brief.productIntelligence).toHaveLength(1);
    expect(brief.productIntelligence[0]?.productName).toBe("Bard Mesh");
    expect(summary.takeaways).toContain("Current product identified: Bard Mesh");
  });

  it("does not surface Bard Mesh product usage as procedure focus in review or profile field updates", () => {
    const { cards, brief, outcomes, parse } = runIntroCallPipeline(DR_APPLE_FULL_INTRO_DICTATION);

    const clinicalCards = cards.filter((card) => card.category === "clinical_focus");
    const clinicalCopy = clinicalCards
      .flatMap((card) => [card.insightTitle, card.clinicalProcedureFocus ?? "", card.clinicalDisplayValue ?? ""])
      .join("\n");
    expect(clinicalCopy).not.toMatch(/currently using bard mesh|from what I understood|need to confirm that during observation/i);
    expect(clinicalCopy).toMatch(/robotic ventral hernia repair/i);
    expect(clinicalCopy).toMatch(/abdominal wall reconstruction/i);

    const procedureFocusOutcomes = outcomes.filter(
      (outcome) => outcome.kind === "clinical_insight" && /procedure focus/i.test(outcome.subtitle ?? ""),
    );
    expect(procedureFocusOutcomes).toHaveLength(0);

    const procedureField = parse.fieldUpdates?.find((field) => field.dbKey === "provider_case_volume_estimate");
    expect(procedureField?.proposedValue ?? "").toMatch(/robotic ventral hernia repair/i);
    expect(procedureField?.proposedValue ?? "").toMatch(/abdominal wall reconstruction/i);
    expect(procedureField?.proposedValue ?? "").not.toMatch(/bard mesh|currently using|from what I understood/i);

    expect(brief.productIntelligence).toHaveLength(1);
    expect(brief.productIntelligence[0]?.productName).toBe("Bard Mesh");
    expect(brief.productIntelligence[0]?.evidenceStatus).toMatch(/needs confirmation/i);
  });

  it("records evidence gap without a current_product finding when mesh is unknown", () => {
    const dictation = "Not sure yet what mesh they are using.";
    const supplemented = supplementAtomicFactsWithProductIntelligence([], dictation);
    const productFacts = supplemented.filter(
      (fact) => fact.fact_type === "current_product" && fact.entity.trim(),
    );
    expect(productFacts).toHaveLength(0);
    expect(buildStillToValidateFromFacts(supplemented)).toContain("Confirm current product / mesh usage");
  });

  it("keeps Lettuce ACSIS intro call out of current product and generic clinical trend rows", () => {
    const rawFacts = [
      {
        fact_type: "current_product" as const,
        entity: "ACSIS",
        attribute: "validated",
        value: "current product usage",
        confidence: "high" as const,
        evidence: "Discussed ACSIS.",
      },
      {
        fact_type: "clinical_focus" as const,
        entity: "",
        attribute: "increasing_procedure_volume",
        value: "Robotic Colorectal And Hernia repair",
        confidence: "medium" as const,
        evidence: "He does a fair amount of robotic colorectal and hernia work.",
      },
    ];
    const facts = normalizeAndDedupeAtomicFacts(rawFacts, DR_LETTUCE_ACSIS_INTRO_DICTATION);

    expect(facts.some((fact) => fact.fact_type === "current_product" && fact.entity === "ACSIS")).toBe(false);
    expect(
      facts.some(
        (fact) =>
          fact.fact_type === "clinical_focus" &&
          /robotic colorectal|hernia/i.test(`${fact.value} ${fact.evidence}`),
      ),
    ).toBe(false);
    expect(facts.some((fact) => fact.fact_type === "product_fit" && /ACSIS/i.test(`${fact.entity} ${fact.evidence}`))).toBe(true);

    const parse = buildParseResultFromDebriefFacts({
      sourceText: DR_LETTUCE_ACSIS_INTRO_DICTATION,
      facts,
      context: {
        providerId: "provider-lettuce",
        writableFieldKeys: [...PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS],
      },
      existingFields: {},
    });
    const extraction = buildDebriefIntelligenceExtractionReview({
      review: parse,
      proposedContacts: buildInitialProposedContacts({ review: parse, sourceReference: "test" }),
      sourceReference: "test",
    });
    const cards = buildDebriefActionableReviewCards({
      extraction,
      proposedContacts: extraction.proposedContacts ?? [],
      dictation: DR_LETTUCE_ACSIS_INTRO_DICTATION,
      guardContext: buildDebriefReviewDecisionContext({ providerId: "provider-lettuce" }),
    });
    const brief = buildDebriefIntelligenceBrief({ cards });
    const outcomes = buildIntelligenceBriefOutcomes(brief);
    const summary = buildDebriefReviewSummary({ outcomes, providerLabel: "Dr. Lettuce" });
    const copy = outcomes.map((outcome) => `${outcome.kind}: ${outcome.summaryLine}`).join("\n");
    const summaryCopy = summary.takeaways.join("\n");

    expect(copy).toMatch(/product_intelligence: Product interest: ACSIS/i);
    expect(copy).not.toMatch(/Current product identified: ACSIS/i);
    expect(copy).not.toMatch(/Robotic Colorectal And Hernia/i);
    expect(copy).not.toMatch(/clinical_insight: Procedure Focus/i);
    expect(summaryCopy).toMatch(/Product interest: ACSIS/i);
    expect(summaryCopy).not.toMatch(/Current product identified: ACSIS/i);
    expect(summaryCopy).not.toMatch(/Procedure focus identified/i);
  });
});
