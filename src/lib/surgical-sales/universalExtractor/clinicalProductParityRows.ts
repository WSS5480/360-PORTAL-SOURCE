/**
 * Shared clinical/product parity row mapping for DIP atomic facts and UF facts.
 */

import {
  normalizeClinicalIntelligenceFromFact,
  type NormalizedClinicalIntelligence,
} from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import {
  procedureSignalDedupeKey,
} from "@/lib/surgical-sales/sharedIntelligence/dedupeIntelligenceSignals";
import { isGarbledProductName } from "@/lib/surgical-sales/sharedIntelligence/extractProductMention";
import { normalizeProductLookupKey } from "@/lib/surgical-sales/sharedIntelligence/productCatalog";
import type { ProcedureSignal } from "@/lib/surgical-sales/sharedIntelligence/extractProcedureSignals";
import type {
  ParityReviewRow,
  ParityReviewSection,
} from "@/lib/surgical-sales/universalExtractor/buildUfReviewRowsFromRuns";
import type { UniversalSurgicalFact } from "@/lib/surgical-sales/universalExtractor/types";

function sectionFromClinicalCategory(categoryId: NormalizedClinicalIntelligence["categoryId"]): ParityReviewSection {
  if (categoryId === "clinical_trend") return "clinical_trend";
  if (categoryId === "clinical_preference") return "clinical_preference";
  return "procedure_focus";
}

export function parityHeadlineFromClinicalNormalized(normalized: NormalizedClinicalIntelligence): string {
  if (normalized.categoryId === "clinical_preference") {
    return `${normalized.procedureFocus} · Technique / Modality`;
  }
  if (normalized.categoryId === "clinical_trend") {
    return `${normalized.procedureFocus} · Increasing procedure volume`;
  }
  return normalized.procedureFocus;
}

export function parityConceptFromClinicalCategory(
  categoryId: NormalizedClinicalIntelligence["categoryId"],
): UniversalSurgicalFact["concept"] {
  if (categoryId === "clinical_trend") return "procedure_volume_trend";
  if (categoryId === "clinical_preference") return "technology_preference";
  return "procedure_focus";
}

export function parityRowFromProcedureSignal(signal: ProcedureSignal): ParityReviewRow {
  const section: ParityReviewSection =
    signal.concept === "procedure_volume_trend"
      ? "clinical_trend"
      : signal.concept === "technology_preference"
        ? "clinical_preference"
        : "procedure_focus";

  return {
    section,
    headline: signal.normalizedLabel,
    evidence: signal.evidence,
    concept: signal.concept,
    dedupeKey: signal.dedupeKey,
  };
}

export function parityRowFromClinicalAtomicFact(fact: DebriefAtomicFact): ParityReviewRow | null {
  if (fact.fact_type !== "clinical_focus") return null;
  const normalized = normalizeClinicalIntelligenceFromFact({
    value: fact.value,
    evidence: fact.evidence,
    attribute: fact.attribute,
  });
  if (!normalized) return null;

  const section = sectionFromClinicalCategory(normalized.categoryId);
  const headline = parityHeadlineFromClinicalNormalized(normalized);
  const concept = parityConceptFromClinicalCategory(normalized.categoryId);

  return {
    section,
    headline,
    evidence: fact.evidence,
    concept,
    dedupeKey: procedureSignalDedupeKey({ concept, normalizedLabel: headline }),
  };
}

function parityProductDedupeKey(productName: string): string {
  return `product:${normalizeProductLookupKey(productName)}`;
}

export function parityRowFromProductAtomicFact(fact: DebriefAtomicFact): ParityReviewRow | null {
  if (fact.fact_type !== "current_product" || !fact.entity.trim()) return null;
  if (isGarbledProductName(fact.entity)) return null;
  return {
    section: "product_intelligence",
    headline: `Current product identified: ${fact.entity}`,
    evidence: fact.evidence,
    concept: "current_product",
    dedupeKey: parityProductDedupeKey(fact.entity),
  };
}

export function parityRowFromUniversalFact(fact: UniversalSurgicalFact): ParityReviewRow | null {
  const concept = fact.concept;
  if (concept === "current_product" || concept === "competitor_product") {
    const product = fact.product_mentioned ?? fact.normalized_label.replace(/^[^:]+:\s*/, "").trim();
    if (!product || isGarbledProductName(product)) return null;
    return {
      section: "product_intelligence",
      headline: `Current product identified: ${product}`,
      evidence: fact.evidence_text,
      concept,
      dedupeKey: parityProductDedupeKey(product),
    };
  }

  if (
    concept === "procedure_volume_trend" ||
    concept === "procedure_focus" ||
    concept === "technology_preference"
  ) {
    const section: ParityReviewSection =
      concept === "procedure_volume_trend"
        ? "clinical_trend"
        : concept === "technology_preference"
          ? "clinical_preference"
          : "procedure_focus";

    const headline =
      concept === "technology_preference" && !fact.normalized_label.includes("Technique")
        ? `${fact.normalized_label.split(" · ")[0] ?? fact.normalized_label} · Technique / Modality`
        : fact.normalized_label;

    return {
      section,
      headline,
      evidence: fact.evidence_text,
      concept,
      dedupeKey: procedureSignalDedupeKey({ concept, normalizedLabel: headline }),
    };
  }

  return null;
}
