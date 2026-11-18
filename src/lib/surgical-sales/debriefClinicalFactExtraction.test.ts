import { describe, expect, it } from "vitest";
import {
  CLINICAL_SIGNAL_LABEL,
  CLINICAL_STORAGE_SEPARATOR,
  clinicalBriefPrimaryLine,
  evidenceSupportsClinicalTrendSignal,
  extractClinicalFactsFromSentence,
  extractNormalizedClinicalIntelligenceFromSentence,
  formatClinicalFocusLearned,
  isCleanProcedureFocusPhrase,
  isGenericClinicalFactText,
  isProductUsageClinicalClause,
  mergeProcedureFocusFieldValue,
  normalizeClinicalIntelligenceFromFact,
  parseClinicalStorageValue,
} from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import { buildDebriefActionableReviewCards } from "@/lib/surgical-sales/buildDebriefActionableReviewCards";
import { runDebriefExtractionPipeline } from "@/lib/surgical-sales/debriefExtractionRegressionRunner";
import {
  buildDebriefIntelligenceExtractionReview,
  buildInitialProposedContacts,
} from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import { buildDebriefReviewDecisionContext } from "@/lib/surgical-sales/debriefIntelligencePipeline/buildDebriefReviewDecisionContext";
import {
  buildDebriefIntelligenceBrief,
  buildIntelligenceBriefOutcomes,
  groupClinicalInsightOutcomes,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import {
  buildParseResultFromDebriefFacts,
  normalizeAndDedupeAtomicFacts,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import { PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS } from "@/lib/surgical-sales/intelligenceScopeInference";

const DUAL_TREND_SENTENCE =
  "Clinically, he said they have been doing more robotic ventral hernia repairs lately and are seeing more abdominal wall reconstruction cases than they used to.";

describe("debriefClinicalFactExtraction", () => {
  it("does not classify primarily-performs + new-technology as New Procedure Adoption", () => {
    const normalized = normalizeClinicalIntelligenceFromFact({
      value: "Ventral hernia repair",
      evidence:
        "He primarily performs robotic and laparoscopic ventral hernia repairs and said he's always interested in learning about new technology if it offers a meaningful clinical benefit.",
    });
    expect(normalized?.signal).toBe("procedure_focus");
    expect(normalized?.signalLabel).not.toMatch(/New Procedure Adoption/i);
  });

  it("keeps both modalities when note says robotic and laparoscopic", () => {
    const rows = extractNormalizedClinicalIntelligenceFromSentence(
      "He primarily performs robotic and laparoscopic ventral hernia repairs.",
    );
    const modalities = rows
      .filter((row) => /technique\s*\/\s*modality/i.test(row.signalLabel) || /technique\s*\/\s*modality/i.test(row.displayValue))
      .map((row) => row.displayValue);
    const blob = rows.map((row) => `${row.signal}:${row.displayValue}`).join("\n");
    expect(blob).toMatch(/ventral hernia/i);
    expect(blob).toMatch(/Robotic/i);
    expect(blob).toMatch(/Laparoscopic/i);
    expect(modalities.join(" ")).toMatch(/Robotic/i);
    expect(modalities.join(" ")).toMatch(/Laparoscopic/i);
  });

  it.each([
    "Technique / Modality: Robotic",
    "Technique / Modality: Laparoscopic",
    "Technique / Modality: Open",
    "Robotic · Technique / Modality",
    "Laparoscopic · Technique / Modality",
  ])("never garbles modality review labels from %s", (value) => {
    const normalized = normalizeClinicalIntelligenceFromFact({
      value,
      evidence: "He primarily performs robotic and laparoscopic ventral hernia repairs.",
      attribute: "Technique / Modality",
    });
    expect(normalized).toBeTruthy();
    expect(normalized!.displayValue).not.toMatch(/\/\s*:/);
    expect(normalized!.displayValue).not.toMatch(/Preference/i);
    expect(normalized!.displayValue).toMatch(/^(Robotic|Laparoscopic|Open)$/i);
    expect(clinicalBriefPrimaryLine(normalized!)).toMatch(/^(Robotic|Laparoscopic|Open)$/i);
  });

  it("rejects generic clinical placeholder copy", () => {
    expect(isGenericClinicalFactText("Clinical or OR workflow detail was mentioned.")).toBe(true);
    expect(isGenericClinicalFactText("Procedure detail captured")).toBe(true);
    expect(isGenericClinicalFactText("Clinical focus mentioned")).toBe(true);
    expect(isGenericClinicalFactText("Procedure Focus")).toBe(true);
    expect(isGenericClinicalFactText("Procedure focus area")).toBe(true);
    expect(isGenericClinicalFactText("Clinical procedure focus")).toBe(true);
  });

  it("does not treat short modality tokens as generic clinical text", () => {
    expect(isGenericClinicalFactText("Robotic")).toBe(false);
    expect(isGenericClinicalFactText("Open")).toBe(false);
    expect(isGenericClinicalFactText("Laparoscopic")).toBe(false);
  });

  it("normalizes Tom Sandy dual-procedure dictation into durable commercial intelligence", () => {
    const dictation =
      "Clinically, he mentioned they've been doing more robotic ventral hernia repairs lately and are seeing a higher volume of abdominal wall reconstruction cases than they were a year ago.";

    const rows = extractNormalizedClinicalIntelligenceFromSentence(dictation);
    // Two volume trends; redundant robotic Technique / Modality is suppressed
    // because robotic is already part of the retained procedure trend.
    expect(rows).toHaveLength(2);

    expect(rows[0]).toMatchObject({
      procedureFocus: "Robotic ventral hernia repair",
      signal: "increasing_procedure_volume",
      signalLabel: CLINICAL_SIGNAL_LABEL.increasing_procedure_volume,
      storageValue: `Robotic ventral hernia repair${CLINICAL_STORAGE_SEPARATOR}Increasing procedure volume`,
    });
    expect(rows[1]).toMatchObject({
      procedureFocus: "Abdominal wall reconstruction",
      signal: "increasing_procedure_volume",
      signalLabel: CLINICAL_SIGNAL_LABEL.increasing_procedure_volume,
      storageValue: `Abdominal wall reconstruction${CLINICAL_STORAGE_SEPARATOR}Increasing procedure volume`,
    });
    expect(rows[0]?.dedupeKey).not.toBe(rows[1]?.dedupeKey);
  });

  it("extracts two clinical trends from compound doing-more / seeing-more dictation", () => {
    const dictation =
      "Clinically, he said they have been doing more robotic ventral hernia repairs lately and are seeing more abdominal wall reconstruction cases than they used to.";

    const rows = extractNormalizedClinicalIntelligenceFromSentence(dictation);
    expect(rows.length).toBeGreaterThanOrEqual(2);

    const robotic = rows.find((row) => /robotic ventral hernia repair/i.test(row.procedureFocus));
    const abdominal = rows.find((row) => /abdominal wall reconstruction/i.test(row.procedureFocus));
    expect(robotic?.signal).toBe("increasing_procedure_volume");
    expect(abdominal?.signal).toBe("increasing_procedure_volume");
    expect(robotic?.dedupeKey).toMatch(/robotic_ventral_hernia_repair.*increasing_procedure_volume/);
    expect(abdominal?.dedupeKey).toMatch(/abdominal_wall_reconstruction.*increasing_procedure_volume/);
  });

  it("rejects structured procedure-focus facts when evidence is only low-value case-mix capability", () => {
    const evidence = "He does a fair amount of robotic colorectal and hernia work.";

    expect(
      normalizeClinicalIntelligenceFromFact({
        value: `Robotic Colorectal repair${CLINICAL_STORAGE_SEPARATOR}Procedure focus`,
        evidence,
        attribute: "procedure_focus",
      }),
    ).toBeNull();
    expect(
      normalizeClinicalIntelligenceFromFact({
        value: `Hernia Repair${CLINICAL_STORAGE_SEPARATOR}Procedure focus`,
        evidence,
        attribute: "procedure_focus",
      }),
    ).toBeNull();
  });

  it("extracts specific procedure facts from dictation sentences", () => {
    expect(
      extractClinicalFactsFromSentence(
        "Robotic ventral hernia repairs are increasing at the main campus.",
      ),
    ).toContain(`Robotic ventral hernia repair${CLINICAL_STORAGE_SEPARATOR}Increasing procedure volume`);

    expect(
      extractClinicalFactsFromSentence("Abdominal wall reconstruction volume is increasing."),
    ).toContain(`Abdominal wall reconstruction${CLINICAL_STORAGE_SEPARATOR}Increasing case volume`);

    expect(
      extractClinicalFactsFromSentence(
        "They are doing a lot more complex abdominal wall and robotic hernia work lately.",
      ).some((f) => /abdominal wall|robotic hernia/i.test(f)),
    ).toBe(true);
  });

  it("formats learned section as normalized commercial category blocks", () => {
    expect(
      formatClinicalFocusLearned([
        `Robotic ventral hernia repair${CLINICAL_STORAGE_SEPARATOR}Increasing procedure volume`,
        `Abdominal wall reconstruction${CLINICAL_STORAGE_SEPARATOR}Increasing procedure volume`,
      ]),
    ).toBe(
      [
        "- Clinical Trend",
        "- Increasing Procedure Volume",
        "- Clinical Trend",
        "- Increasing Procedure Volume",
      ].join("\n"),
    );
  });

  it("round-trips normalized storage values", () => {
    const storage = `Robotic ventral hernia repair${CLINICAL_STORAGE_SEPARATOR}Increasing procedure volume`;
    expect(parseClinicalStorageValue(storage)).toEqual({
      procedureFocus: "Robotic ventral hernia repair",
      signalLabel: "Increasing procedure volume",
    });
    expect(
      normalizeClinicalIntelligenceFromFact({
        value: storage,
        evidence: "doing more robotic ventral hernia repairs lately",
      })?.displayValue,
    ).toBe("Increasing Procedure Volume");
  });

  it("normalizes clinical frustration into category and short topic label", () => {
    const normalized = normalizeClinicalIntelligenceFromFact({
      value: "Visualization during larger robotic cases",
      evidence: "Mentioned visualization challenges during larger robotic cases.",
      attribute: "clinical_frustration",
    });
    expect(normalized?.categoryLabel).toBe("Clinical Frustration");
    expect(normalized?.displayValue).toBe("Visualization");
    expect(normalized?.sourceText).toMatch(/visualization/i);
  });

  it("normalizes fixation frustration into Clinical Frustration category", () => {
    const normalized = normalizeClinicalIntelligenceFromFact({
      value: "Fixation consistency in certain patients",
      evidence: "Fixation consistency remains a concern in certain patients.",
      attribute: "clinical_frustration",
    });
    expect(normalized?.categoryLabel).toBe("Clinical Frustration");
    expect(normalized?.displayValue).toBe("Fixation");
  });

  it("surfaces clinical intelligence cards with procedure focus and commercial signal", () => {
    const dictation =
      "Robotic ventral hernia repairs are increasing. Abdominal wall reconstruction volume is increasing. Karen handles scheduling.";
    const result = runDebriefExtractionPipeline({ dictation });
    const cards = buildDebriefActionableReviewCards({
      extraction: result.extraction,
      proposedContacts: result.proposedContacts,
      dictation,
    });
    const clinicalCards = cards.filter((c) => c.category === "clinical_focus");

    expect(clinicalCards.length).toBeGreaterThan(0);
    expect(clinicalCards.some((c) => /Robotic ventral hernia repair|Increasing Procedure Volume/i.test(c.insightTitle))).toBe(true);
    expect(clinicalCards.some((c) => /Abdominal wall reconstruction|Increasing Procedure Volume/i.test(c.insightTitle))).toBe(true);
    expect(
      clinicalCards.some((c) => /Clinical Trend/i.test(c.clinicalCategoryLabel ?? "")),
    ).toBe(true);
    expect(clinicalCards[0]!.evidenceQuotes.length).toBeGreaterThan(0);
    expect(clinicalCards.map((c) => c.insightTitle).join("\n")).not.toMatch(
      /Clinical or OR workflow|Procedure detail captured|Clinical focus mentioned/i,
    );
  });

  it("preserves both clinical trends through dedupe and review modal grouping", () => {
    const dictation = DUAL_TREND_SENTENCE;
    const facts = normalizeAndDedupeAtomicFacts(
      [
        {
          fact_type: "clinical_focus",
          entity: "",
          attribute: "increasing_procedure_volume",
          value: `Robotic ventral hernia repair${CLINICAL_STORAGE_SEPARATOR}Increasing procedure volume`,
          confidence: "medium",
          evidence: dictation,
        },
      ],
      dictation,
    );
    // Two volume trends; redundant robotic Technique / Modality is suppressed.
    expect(facts.filter((fact) => fact.fact_type === "clinical_focus")).toHaveLength(2);

    const parse = buildParseResultFromDebriefFacts({
      sourceText: dictation,
      facts,
      context: {
        providerId: "provider-test",
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
      dictation,
      guardContext: buildDebriefReviewDecisionContext({ providerId: "provider-test" }),
    });
    const brief = buildDebriefIntelligenceBrief({ cards });
    const outcomes = buildIntelligenceBriefOutcomes(brief);
    const clinicalCards = cards.filter((card) => card.category === "clinical_focus");
    const grouped = groupClinicalInsightOutcomes(outcomes);

    expect(clinicalCards.length).toBeGreaterThanOrEqual(2);
    expect(grouped.find((group) => group.groupLabel === "Clinical Trends")?.outcomes.length).toBeGreaterThanOrEqual(2);
    const primaryLines = brief.clinicalInsights.map((item) => item.primaryLine).join("\n");
    expect(primaryLines).toMatch(/robotic ventral hernia repair/i);
    expect(primaryLines).toMatch(/abdominal wall reconstruction/i);
  });

  it("does not extract procedure focus from product usage clauses", () => {
    const productUsage =
      "He is currently using Bard Mesh in a lot of his hernia cases from what I understood, but I need to confirm that during observation.";
    expect(isProductUsageClinicalClause(productUsage)).toBe(true);
    expect(extractNormalizedClinicalIntelligenceFromSentence(productUsage)).toEqual([]);
    expect(isCleanProcedureFocusPhrase(productUsage)).toBe(false);
  });

  it("does not extract procedure focus from still-using Bard Mesh hedged dictation", () => {
    const dictation = "They're still using Bard Mesh from what I could tell.";
    expect(extractNormalizedClinicalIntelligenceFromSentence(dictation)).toEqual([]);
  });

  it("extracts volume trends and excludes product usage from combined intro-call dictation", () => {
    const dictation =
      "Clinically, he said they have been doing more robotic ventral hernia repairs lately and are seeing more abdominal wall reconstruction cases than they used to. He is currently using Bard Mesh in a lot of his hernia cases from what I understood, but I need to confirm that during observation.";

    const trends = extractNormalizedClinicalIntelligenceFromSentence(
      "Clinically, he said they have been doing more robotic ventral hernia repairs lately and are seeing more abdominal wall reconstruction cases than they used to.",
    );
    expect(trends.filter((row) => row.categoryId === "clinical_trend").length).toBeGreaterThanOrEqual(2);
    // Robotic surfaces as Technique / Modality — never as a product signal.
    expect(trends.every((row) => row.categoryId === "clinical_trend" || row.categoryLabel === "Technique / Modality")).toBe(true);
    expect(extractNormalizedClinicalIntelligenceFromSentence(dictation.split(/(?<=[.!?])\s+/)[1]!)).toEqual([]);
  });

  it("extracts clean procedure phrases from multi-procedure volume dictation", () => {
    const dictation = "They are doing more robotic hernia repair and abdominal wall reconstruction cases.";
    const rows = extractNormalizedClinicalIntelligenceFromSentence(dictation);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows.every((row) => isCleanProcedureFocusPhrase(row.procedureFocus))).toBe(true);
    expect(rows.some((row) => /robotic hernia repair/i.test(row.procedureFocus))).toBe(true);
    expect(rows.some((row) => /abdominal wall reconstruction/i.test(row.procedureFocus))).toBe(true);
  });

  it("filters product-usage sentences out of procedure profile merge values", () => {
    const merged = mergeProcedureFocusFieldValue(
      "",
      [
        "Robotic ventral hernia repair · Increasing procedure volume",
        "Abdominal wall reconstruction · Increasing procedure volume",
        "He is currently using Bard Mesh in a lot of his hernia cases from what I understood, but I need to confirm that during observation.",
      ].join(" | "),
    );
    expect(merged).toMatch(/robotic ventral hernia repair/i);
    expect(merged).toMatch(/abdominal wall reconstruction/i);
    expect(merged).not.toMatch(/bard mesh|currently using|from what I understood/i);
  });

  it("does not emit volume trends when only visualization/orientation challenges are stated", () => {
    const dictation =
      "During today's observation Dr. Onion again mentioned visualization challenges during robotic ventral hernia repairs. He specifically said maintaining orientation in larger abdominal wall reconstruction cases remains difficult.";
    expect(
      evidenceSupportsClinicalTrendSignal(
        "visualization challenges during robotic ventral hernia repairs",
      ),
    ).toBe(false);

    const leakedFacts = normalizeAndDedupeAtomicFacts(
      [
        {
          fact_type: "clinical_focus",
          entity: "",
          attribute: "increasing_procedure_volume",
          value: `Robotic ventral hernia repair${CLINICAL_STORAGE_SEPARATOR}Increasing procedure volume`,
          confidence: "medium",
          evidence:
            "visualization challenges during robotic ventral hernia repairs",
        },
        {
          fact_type: "clinical_focus",
          entity: "",
          attribute: "increasing_case_volume",
          value: `Abdominal wall reconstruction${CLINICAL_STORAGE_SEPARATOR}Increasing case volume`,
          confidence: "medium",
          evidence:
            "maintaining orientation in larger abdominal wall reconstruction cases remains difficult",
        },
      ],
      dictation,
    );

    for (const fact of leakedFacts.filter((f) => f.fact_type === "clinical_focus")) {
      const normalized = normalizeClinicalIntelligenceFromFact({
        value: fact.value,
        evidence: fact.evidence,
        attribute: fact.attribute,
      });
      expect(normalized?.signal).not.toBe("increasing_procedure_volume");
      expect(normalized?.signal).not.toBe("increasing_case_volume");
      expect(normalized?.displayValue).not.toMatch(/Increasing (Procedure|Case) Volume/i);
    }

    const parse = buildParseResultFromDebriefFacts({
      sourceText: dictation,
      facts: leakedFacts,
      context: {
        providerId: "provider-onion",
        writableFieldKeys: [...PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS],
      },
      existingFields: {
        provider_procedure_focus: `Robotic ventral hernia repair${CLINICAL_STORAGE_SEPARATOR}Increasing procedure volume`,
      },
    });
    const extraction = buildDebriefIntelligenceExtractionReview({
      review: parse,
      proposedContacts: buildInitialProposedContacts({ review: parse, sourceReference: "test" }),
      sourceReference: "test",
    });
    const cards = buildDebriefActionableReviewCards({
      extraction,
      proposedContacts: [],
      dictation,
    });
    const clinicalCards = cards.filter((c) => c.category === "clinical_focus");
    const titles = clinicalCards.map((c) => c.insightTitle ?? "").join("\n");

    expect(titles).toMatch(/Visualization|Clinical Frustration|Procedure Focus/i);
    expect(titles).not.toMatch(/Increasing Procedure Volume/i);
    expect(titles).not.toMatch(/Increasing Case Volume/i);
  });

  it("with on-file volume trend, a visualization-only note does not resurface volume findings", () => {
    const dictation = "Visualization remains challenging during robotic ventral hernia repair.";
    const result = runDebriefExtractionPipeline({ dictation });
    const cards = buildDebriefActionableReviewCards({
      extraction: result.extraction,
      proposedContacts: result.proposedContacts,
      dictation,
    });
    const clinicalCards = cards.filter((c) => c.category === "clinical_focus");
    const blob = clinicalCards.map((c) => c.insightTitle ?? "").join("\n");

    expect(blob).toMatch(/Visualization|Procedure Focus|Robotic ventral hernia/i);
    expect(blob).not.toMatch(/Increasing Procedure Volume/i);
    expect(blob).not.toMatch(/Increasing Case Volume/i);
  });
});

