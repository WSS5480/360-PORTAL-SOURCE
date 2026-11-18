/**
 * Cross-engine dedupe primitives — shared keys for DIP, UF, and parity compare.
 */

import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import { normalizeClinicalIntelligenceFromFact } from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import { normalizeProductLookupKey } from "@/lib/surgical-sales/sharedIntelligence/productCatalog";
import { normalizeProcedureKey } from "@/lib/surgical-sales/sharedIntelligence/procedurePatterns";
import type { ProductMentionExtraction } from "@/lib/surgical-sales/sharedIntelligence/extractProductMention";
import type { ProcedureSignal } from "@/lib/surgical-sales/sharedIntelligence/extractProcedureSignals";
import { normalizeSchedulerPersonName } from "@/lib/surgical-sales/sharedIntelligence/schedulerContactExtractionPolicy";
import type { UniversalSurgicalFact } from "@/lib/surgical-sales/universalExtractor/types";

export function productMentionDedupeKey(mention: Pick<ProductMentionExtraction, "productName" | "isCompetitor">): string {
  const competitorFlag = mention.isCompetitor ? "competitor" : "current";
  return `product:${normalizeProductLookupKey(mention.productName)}:${competitorFlag}`;
}

export function procedureSignalDedupeKey(signal: Pick<ProcedureSignal, "concept" | "normalizedLabel">): string {
  return `procedure:${signal.concept}:${normalizeProcedureKey(signal.normalizedLabel)}`;
}

export function contactPersonDedupeKey(displayName: string): string {
  return `contact:${normalizeSchedulerPersonName(displayName).toLowerCase().replace(/\s+/g, " ")}`;
}

export function accessQuoteDedupeKey(evidenceSnippet: string): string {
  const normalized = evidenceSnippet.trim().toLowerCase().slice(0, 80);
  return `access:${normalized}`;
}

export { normalizeProcedureKey } from "@/lib/surgical-sales/sharedIntelligence/procedurePatterns";

export function dedupeProductMentions(mentions: ProductMentionExtraction[]): ProductMentionExtraction[] {
  const byKey = new Map<string, ProductMentionExtraction>();
  for (const mention of mentions) {
    const key = productMentionDedupeKey(mention);
    const existing = byKey.get(key);
    if (!existing || mention.evidence.length > existing.evidence.length) {
      byKey.set(key, mention);
    }
  }
  return [...byKey.values()];
}

export function dedupeProcedureSignals(signals: ProcedureSignal[]): ProcedureSignal[] {
  const byKey = new Map<string, ProcedureSignal>();
  for (const signal of signals) {
    const key = procedureSignalDedupeKey(signal);
    if (!byKey.has(key)) byKey.set(key, signal);
  }
  return [...byKey.values()];
}

function modalityTokenFromTechniqueLabel(label: string): string {
  const trimmed = label.trim();
  const valueFirst = trimmed.match(/^(robotic|laparoscopic|open)\s*·/i)?.[1];
  if (valueFirst) return valueFirst.toLowerCase();
  const categoryFirst = trimmed.replace(/^technique\s*\/\s*modality:\s*/i, "").trim();
  const token = categoryFirst.match(/\b(robotic|laparoscopic|open)\b/i)?.[1];
  return (token ?? categoryFirst).toLowerCase();
}

function suppressRedundantTechniquePreferenceFacts(
  facts: UniversalSurgicalFact[],
): UniversalSurgicalFact[] {
  const procedureFocusLabels = facts
    .filter((fact) => fact.concept === "procedure_focus")
    .map((fact) => fact.normalized_label.toLowerCase());

  if (procedureFocusLabels.length === 0) return facts;

  const techniqueFacts = facts.filter((fact) => fact.concept === "technology_preference");

  return facts.filter((fact) => {
    if (fact.concept !== "technology_preference") return true;
    const technique = modalityTokenFromTechniqueLabel(fact.normalized_label);
    if (!technique || !/^(robotic|laparoscopic|open)$/.test(technique)) return true;
    const encodedInProcedure = procedureFocusLabels.some((label) => label.includes(technique));
    if (!encodedInProcedure) return true;
    // If multiple modalities were captured, only drop the one already in the
    // procedure name (keep Laparoscopic when focus is "Robotic ventral hernia…").
    if (techniqueFacts.length > 1) return !encodedInProcedure;
    return false;
  });
}

export function dedupeUniversalFacts(facts: UniversalSurgicalFact[]): UniversalSurgicalFact[] {
  const byKey = new Map<string, UniversalSurgicalFact>();
  for (const fact of facts) {
    let key: string;
    if (fact.concept === "current_product" || fact.concept === "competitor_product") {
      const product = fact.product_mentioned ?? fact.normalized_label;
      key = productMentionDedupeKey({
        productName: product,
        isCompetitor: fact.concept === "competitor_product",
      });
    } else if (
      fact.concept === "procedure_volume_trend" ||
      fact.concept === "procedure_focus" ||
      fact.concept === "technology_preference"
    ) {
      key = procedureSignalDedupeKey({
        concept: fact.concept,
        normalizedLabel: fact.normalized_label,
      });
    } else if (fact.concept === "provider_sentiment") {
      const text = `${fact.normalized_label} ${fact.evidence_text}`.toLowerCase();
      key = /commercial disposition|evaluation|product trial|formal product|observe before|observation before/.test(text)
        ? "provider_sentiment:commercial_disposition"
        : "provider_sentiment:relationship_momentum";
    } else {
      key = `${fact.concept}:${fact.normalized_label.toLowerCase()}:${fact.evidence_text.toLowerCase().slice(0, 80)}`;
    }
    const existing = byKey.get(key);
    const preferShorterEvidence =
      fact.concept === "procedure_volume_trend" ||
      fact.concept === "procedure_focus" ||
      fact.concept === "technology_preference";
    if (
      !existing ||
      (preferShorterEvidence
        ? fact.evidence_text.length < existing.evidence_text.length
        : fact.evidence_text.length > existing.evidence_text.length)
    ) {
      byKey.set(key, fact);
    }
  }
  return suppressRedundantTechniquePreferenceFacts([...byKey.values()]);
}

export function mergeDuplicateDebriefAtomicFacts(facts: DebriefAtomicFact[]): DebriefAtomicFact[] {
  const rank = { high: 3, medium: 2, low: 1 } as const;
  const byKey = new Map<string, DebriefAtomicFact>();

  for (const fact of facts) {
    let key: string;
    if (fact.fact_type === "current_product" && fact.entity.trim()) {
      key = productMentionDedupeKey({
        productName: fact.entity,
        isCompetitor: false,
      });
    } else if (fact.fact_type === "clinical_focus") {
      const normalized = normalizeClinicalIntelligenceFromFact({
        value: fact.value,
        evidence: fact.evidence,
        attribute: fact.attribute,
      });
      key = normalized?.dedupeKey ?? `clinical:${fact.attribute}|${fact.value}`.toLowerCase();
    } else {
      key = [
        fact.fact_type,
        fact.entity.trim().toLowerCase(),
        fact.attribute.toLowerCase(),
        fact.value.toLowerCase().slice(0, 80),
      ].join("|");
    }

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, fact);
      continue;
    }
    const keep =
      rank[fact.confidence] > rank[existing.confidence]
        ? fact
        : rank[fact.confidence] === rank[existing.confidence] &&
            fact.evidence.length > existing.evidence.length
          ? fact
          : existing;
    byKey.set(key, keep);
  }

  return [...byKey.values()];
}
