import { describe, expect, it } from "vitest";

import { normalizeClinicalFocusCard, normalizeProductIntelligenceCard } from "@/lib/surgical-sales/debriefActionableReviewCardNormalize";
import { dedupeReviewDisplayCards } from "@/lib/surgical-sales/sharedIntelligence/dedupeReviewDisplayCards";

const DICTATION =
  "He uses Bard mesh for ventral cases and volume on robotic ventral hernia repairs has been increasing.";

describe("dedupeReviewDisplayCards", () => {
  it("prefers UF product card over DIP duplicate for the same product", () => {
    const dipCard = normalizeProductIntelligenceCard({
      id: "dip-product-bard",
      category: "product_intelligence",
      headline: "Current product identified: Bard",
      productName: "Bard",
      evidenceStatus: "Needs confirmation",
      impactLine: "Current product identified: Bard",
      fields: [],
      evidenceQuotes: ['"He uses Bard mesh"'],
      confidence: "Medium",
      actions: [],
      linkedFieldUpdateIds: [],
      linkedIntelligenceIds: [],
    });
    const ufCard = normalizeProductIntelligenceCard({
      id: "uf:fact-bard",
      category: "product_intelligence",
      headline: "Current product identified: Bard",
      productName: "Bard",
      evidenceStatus: "Validated",
      impactLine: "Current product identified: Bard",
      fields: [],
      evidenceQuotes: ['"He uses Bard mesh for ventral cases"'],
      confidence: "High",
      actions: [],
      linkedFieldUpdateIds: [],
      linkedIntelligenceIds: [],
    });

    const merged = dedupeReviewDisplayCards([ufCard, dipCard], DICTATION);
    const bardCards = merged.filter(
      (card) => card.category === "product_intelligence" && /bard/i.test(card.productName),
    );

    expect(bardCards).toHaveLength(1);
    expect(bardCards[0]!.id).toBe("uf:fact-bard");
  });

  it("prefers UF clinical card over DIP duplicate for the same procedure focus", () => {
    const dipCard = normalizeClinicalFocusCard({
      id: "dip-clinical-robotic",
      category: "clinical_focus",
      headline: "Robotic ventral hernia volume increasing",
      insightTitle: "Robotic ventral hernia volume increasing",
      clinicalCategoryLabel: "Clinical Trend",
      clinicalDisplayValue: "Robotic ventral hernia volume increasing",
      clinicalProcedureFocus: "robotic ventral hernia",
      fields: [],
      evidenceQuotes: ['"volume has been increasing"'],
      confidence: "Medium",
      actions: [],
      linkedFieldUpdateIds: [],
      linkedIntelligenceIds: [],
    });
    const ufCard = normalizeClinicalFocusCard({
      id: "uf:fact-volume",
      category: "clinical_focus",
      headline: "Robotic ventral hernia volume increasing",
      insightTitle: "Robotic ventral hernia volume increasing",
      clinicalCategoryLabel: "Clinical Trend",
      clinicalDisplayValue: "Robotic ventral hernia volume increasing",
      clinicalProcedureFocus: "robotic ventral hernia",
      fields: [],
      evidenceQuotes: ['"volume on robotic ventral hernia repairs has been increasing"'],
      confidence: "High",
      actions: [],
      linkedFieldUpdateIds: [],
      linkedIntelligenceIds: [],
    });

    const merged = dedupeReviewDisplayCards([ufCard, dipCard], DICTATION);
    const clinicalCards = merged.filter((card) => card.category === "clinical_focus");

    expect(clinicalCards).toHaveLength(1);
    expect(clinicalCards[0]!.id).toBe("uf:fact-volume");
  });

  it("keeps named product interest over generic UF product-interest duplicate", () => {
    const dipCard = normalizeProductIntelligenceCard({
      id: "dip-product-acsis",
      category: "product_intelligence",
      headline: "Product interest: ACSIS",
      productName: "ACSIS",
      evidenceStatus: "Interest noted",
      impactLine: "Product interest helps focus observation planning and follow-up questions.",
      fields: [],
      evidenceQuotes: ['"Asked whether ACSIS works with their existing suction setup"'],
      confidence: "High",
      actions: [],
      linkedFieldUpdateIds: [],
      linkedIntelligenceIds: [],
    });
    const ufCard = normalizeProductIntelligenceCard({
      id: "uf:fact-feature-interest",
      category: "product_intelligence",
      headline: "Product interest: Product feature interest",
      productName: "Product feature interest",
      evidenceStatus: "Interest noted",
      impactLine: "Product interest: Product feature interest",
      fields: [],
      evidenceQuotes: ['"Was interested in the curved design"'],
      confidence: "High",
      actions: [],
      linkedFieldUpdateIds: [],
      linkedIntelligenceIds: [],
    });

    const merged = dedupeReviewDisplayCards([ufCard, dipCard]);
    const productCards = merged.filter((card) => card.category === "product_intelligence");

    expect(productCards).toHaveLength(1);
    expect(productCards[0]!.headline).toBe("Product interest: ACSIS");
  });

  it("keeps validated current product separate from generic product interest", () => {
    const currentProduct = normalizeProductIntelligenceCard({
      id: "uf:fact-bard-soft-mesh",
      category: "product_intelligence",
      headline: "Product interest: Bard Soft Mesh",
      productName: "Bard Soft Mesh",
      evidenceStatus: "Validated",
      impactLine: "Current product identified: Bard Soft Mesh",
      fields: [],
      evidenceQuotes: ['"currently uses Bard Soft Mesh"'],
      confidence: "High",
      actions: [],
      linkedFieldUpdateIds: [],
      linkedIntelligenceIds: [],
    });
    const openTechnology = normalizeProductIntelligenceCard({
      id: "uf:fact-open-tech",
      category: "product_intelligence",
      headline: "Product interest: open to new technology if it solves a problem",
      productName: "open to new technology if it solves a problem",
      evidenceStatus: "Interest noted",
      impactLine: "Product interest: open to new technology if it solves a problem",
      fields: [],
      evidenceQuotes: ['"open to looking at new technology if it solves a problem"'],
      confidence: "High",
      actions: [],
      linkedFieldUpdateIds: [],
      linkedIntelligenceIds: [],
    });

    const merged = dedupeReviewDisplayCards([currentProduct, openTechnology]);
    const productCards = merged.filter((card) => card.category === "product_intelligence");

    expect(productCards).toHaveLength(2);
    expect(productCards.map((card) => card.headline).join("\n")).toMatch(/Bard Soft Mesh/);
    expect(productCards.map((card) => card.headline).join("\n")).toMatch(/open to new technology/i);
  });
});
