/**
 * Deterministic current-product / competitive-product extraction for debrief dictation.
 * Hedging language reduces confidence and marks needs_confirmation — it does not suppress extraction.
 */

import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import { quoteIsAnchoredInDictation } from "@/lib/surgical-sales/debriefDictationEvidence";
import {
  extractProductMentionsFromText,
  type ProductMentionExtraction,
} from "@/lib/surgical-sales/sharedIntelligence/extractProductMention";
import {
  DEBRIEF_KNOWN_PRODUCTS,
  isProductStatusToken,
  isValidProductName,
  normalizeProductLookupKey,
  resolveKnownProduct,
  textNamesKnownDebriefProduct,
} from "@/lib/surgical-sales/sharedIntelligence/productCatalog";

export {
  DEBRIEF_KNOWN_PRODUCTS,
  isProductStatusToken,
  isValidProductName,
  textNamesKnownDebriefProduct,
} from "@/lib/surgical-sales/sharedIntelligence/productCatalog";

export type DebriefProductEvidenceStatus = "needs_confirmation" | "validated";

export type DebriefProductIntelligenceFinding = {
  findingType: "current_product";
  category: "product_intelligence" | "competitive_product_use";
  productName: string;
  procedureContext?: string;
  confidence: DebriefAtomicFact["confidence"];
  evidenceStatus: DebriefProductEvidenceStatus;
  modifiers: string[];
  evidence: string;
  nextValidationStep?: string;
};

function resolveCategory(productName: string, known: boolean, isCompetitor: boolean): DebriefProductIntelligenceFinding["category"] {
  if (isCompetitor) return "competitive_product_use";
  if (!known) return "product_intelligence";
  const lower = productName.toLowerCase();
  if (lower === "acsis") return "product_intelligence";
  return "competitive_product_use";
}

function nextValidationStepFromModifiers(modifiers: string[]): string | undefined {
  if (modifiers.includes("needs_observation_confirmation")) {
    return "Confirm product usage during first observation";
  }
  if (modifiers.includes("hedged_language")) {
    return "Confirm product usage during first observation";
  }
  return undefined;
}

function mentionToFinding(mention: ProductMentionExtraction): DebriefProductIntelligenceFinding {
  const { productName } = mention;
  const known = resolveKnownProduct(productName).known;
  return {
    findingType: "current_product",
    category: resolveCategory(productName, known, mention.isCompetitor),
    productName,
    procedureContext: mention.procedureContext,
    confidence: mention.confidence,
    evidenceStatus: mention.evidenceStatus,
    modifiers: mention.modifiers,
    evidence: mention.evidence,
    nextValidationStep: nextValidationStepFromModifiers(mention.modifiers),
  };
}

const UNKNOWN_PRODUCT_RE =
  /\b(?:not sure|unsure|don't know|do not know|unclear|unknown)\b[^.]{0,48}\b(?:what|which)\b[^.]{0,32}\b(?:mesh|product|tray|vendor)\b/i;

const USING_PRODUCT_RE =
  /\b(?:(?:currently|still)\s+)?(?:using|uses?)\s+([A-Za-z0-9][A-Za-z0-9-]*(?:\s+[A-Za-z0-9][A-Za-z0-9-]*){0,3})\b/i;

const PRODUCT_USAGE_EVIDENCE_RE =
  /\b(?:currently\s+using|still\s+using|using|uses?|used|implanted|placed|primary|standard|preference card|incumbent)\b/i;

export function evidenceStatesCurrentProductUsage(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return PRODUCT_USAGE_EVIDENCE_RE.test(trimmed);
}

export function extractDebriefProductIntelligenceFromText(text: string): {
  findings: DebriefProductIntelligenceFinding[];
  evidenceGaps: string[];
} {
  const trimmed = text.trim();
  if (!trimmed) return { findings: [], evidenceGaps: [] };

  const evidenceGaps: string[] = [];
  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter((part) => part.trim().length >= 8);
  const fragments = sentences.length > 0 ? sentences : [trimmed];

  for (const fragment of fragments) {
    if (UNKNOWN_PRODUCT_RE.test(fragment) && !USING_PRODUCT_RE.test(fragment)) {
      evidenceGaps.push("Confirm current product / mesh usage");
    }
  }

  const mentions = extractProductMentionsFromText({ text: trimmed, mode: "debrief" });
  return {
    findings: mentions.map(mentionToFinding),
    evidenceGaps: [...new Set(evidenceGaps)],
  };
}

export function debriefProductFindingToAtomicFact(finding: DebriefProductIntelligenceFinding): DebriefAtomicFact {
  const modifierSuffix =
    finding.modifiers.length > 0 ? ` · ${finding.modifiers.join(",")}` : "";
  const value = finding.procedureContext
    ? `${finding.procedureContext}${modifierSuffix}`
    : `current product usage${modifierSuffix}`;

  return {
    fact_type: "current_product",
    entity: finding.productName,
    attribute: finding.evidenceStatus,
    value,
    confidence: finding.confidence,
    evidence: finding.evidence,
  };
}

export function productInterestFactFromCurrentProductFact(fact: DebriefAtomicFact): DebriefAtomicFact {
  return {
    ...fact,
    fact_type: "product_fit",
    attribute: "interest",
    value: fact.value && !/^current product usage$/i.test(fact.value)
      ? fact.value
      : "product interest discussed",
    confidence: fact.confidence === "high" ? "medium" : fact.confidence,
  };
}

export function debriefProductEvidenceGapToAtomicFact(gap: string, evidence: string): DebriefAtomicFact {
  return {
    fact_type: "current_product",
    entity: "",
    attribute: "evidence_gap",
    value: gap,
    confidence: "low",
    evidence,
  };
}

export function supplementAtomicFactsWithProductIntelligence(
  facts: DebriefAtomicFact[],
  dictation: string,
): DebriefAtomicFact[] {
  const text = dictation.trim();
  if (!text) return facts;

  const { findings, evidenceGaps } = extractDebriefProductIntelligenceFromText(text);
  if (findings.length === 0 && evidenceGaps.length === 0) return facts;

  const merged = [...facts];
  const seen = new Set(
    facts
      .filter((fact) => fact.fact_type === "current_product" && fact.entity.trim())
      .map((fact) => normalizeProductLookupKey(fact.entity)),
  );

  for (const finding of findings) {
    const key = normalizeProductLookupKey(finding.productName);
    if (seen.has(key)) continue;
    const atomic = debriefProductFindingToAtomicFact(finding);
    if (!quoteIsAnchoredInDictation(atomic.evidence.replace(/^["']|["']$/g, ""), text)) continue;
    seen.add(key);
    merged.push(atomic);
  }

  const gapSentences = text.split(/(?<=[.!?])\s+/).filter((part) => UNKNOWN_PRODUCT_RE.test(part));
  for (const gap of evidenceGaps) {
    const evidence = gapSentences[0]?.trim() || text.slice(0, Math.min(240, text.length)).trim();
    if (!quoteIsAnchoredInDictation(evidence.replace(/^["']|["']$/g, ""), text)) continue;
    if (merged.some((fact) => fact.fact_type === "current_product" && fact.attribute === "evidence_gap")) {
      continue;
    }
    merged.push(debriefProductEvidenceGapToAtomicFact(gap, evidence));
  }

  return merged;
}

export function parseDebriefProductIntelligenceFromFact(fact: DebriefAtomicFact): {
  productName: string;
  procedureContext?: string;
  evidenceStatus: DebriefProductEvidenceStatus;
  modifiers: string[];
  nextValidationStep?: string;
  impactLine: string;
  summaryLine: string;
} | null {
  if (fact.fact_type !== "current_product" || fact.attribute === "evidence_gap" || !fact.entity.trim()) {
    return null;
  }
  if (!evidenceStatesCurrentProductUsage(`${fact.value} ${fact.evidence}`)) {
    return null;
  }

  const productName = fact.entity.trim();
  const modifierMatch = fact.value.match(/ · ([^·]+)$/);
  const modifiers = modifierMatch?.[1]?.split(",").map((part) => part.trim()).filter(Boolean) ?? [];
  const procedureContext = fact.value.includes(" · ")
    ? fact.value.replace(/ · [^·]+$/, "").trim()
    : fact.value.replace(/^current product usage$/i, "").trim() || undefined;

  const evidenceStatus: DebriefProductEvidenceStatus =
    fact.attribute === "validated" || fact.confidence === "high" ? "validated" : "needs_confirmation";

  const nextValidationStep =
    modifiers.includes("needs_observation_confirmation") || modifiers.includes("hedged_language")
      ? "Confirm product usage during first observation"
      : evidenceStatus === "needs_confirmation"
        ? "Confirm product usage during first observation"
        : undefined;

  return {
    productName,
    procedureContext: procedureContext && !/^current product usage$/i.test(procedureContext) ? procedureContext : undefined,
    evidenceStatus,
    modifiers,
    nextValidationStep,
    impactLine:
      "Current product usage helps prepare observation strategy and future provider debrief.",
    summaryLine: `Current product identified: ${productName}`,
  };
}

export function resolveProductNameFromIntelligenceText(text: string): string | null {
  const { findings } = extractDebriefProductIntelligenceFromText(text);
  return findings.find((finding) => isValidProductName(finding.productName))?.productName ?? null;
}

export function resolveCurrentProductFromContact(
  contact: Record<string, unknown>,
): {
  productName: string;
  sourceText: string | null;
  evidenceStatus: DebriefProductEvidenceStatus;
} | null {
  const textSources: string[] = [];
  const commercial = contact.provider_commercial_intelligence as
    | { clinical?: { entries?: Array<{ category?: string; display_label?: string; source_text?: string }> } }
    | undefined;

  for (const entry of commercial?.clinical?.entries ?? []) {
    if (entry.category !== "product_opportunity") continue;
    const labelName = String(entry.display_label ?? "")
      .replace(/^current product identified:\s*/i, "")
      .trim();
    if (isValidProductName(labelName)) {
      return {
        productName: resolveKnownProduct(labelName).productName || labelName,
        sourceText: entry.source_text ?? null,
        evidenceStatus: /needs?\s+confirmation|confirm.*observation/i.test(
          `${entry.source_text ?? ""} ${entry.display_label ?? ""}`,
        )
          ? "needs_confirmation"
          : "validated",
      };
    }
    if (entry.source_text?.trim()) textSources.push(entry.source_text.trim());
  }

  const meta = contact.provider_intelligence_field_metadata as
    | Record<string, { evidence_text?: string }>
    | undefined;

  for (const dbKey of ["provider_competitive_products", "provider_current_vendors"] as const) {
    const raw = String(contact[dbKey] ?? "").trim();
    if (raw) textSources.push(raw);
    const evidence = meta?.[dbKey]?.evidence_text?.trim();
    if (evidence) textSources.push(evidence);
  }

  for (const text of textSources) {
    const { findings } = extractDebriefProductIntelligenceFromText(text);
    const finding = findings.find((item) => isValidProductName(item.productName));
    if (finding) {
      return {
        productName: finding.productName,
        sourceText: finding.evidence,
        evidenceStatus: finding.evidenceStatus,
      };
    }
  }

  return null;
}

export function executiveProductIntelligenceLine(productName: string): string {
  return `Current product identified: ${productName}`;
}
