/**
 * Shared product mention extraction — used by DIP supplements and UF rules.
 */

import { COMPETITOR_BRAND_PATTERN } from "@/lib/surgical-sales/observationIntelligence/extractionPatterns";
import {
  DEBRIEF_KNOWN_PRODUCTS,
  isCatalogKnownProductFragment,
  isValidProductName,
  looksLikeProductNameCandidate,
  normalizeProductLookupKey,
  resolveKnownProduct,
  titleCaseProduct,
} from "@/lib/surgical-sales/sharedIntelligence/productCatalog";

export type ProductMentionEvidenceStatus = "needs_confirmation" | "validated";

export type ProductMentionExtraction = {
  productName: string;
  procedureContext?: string;
  evidence: string;
  confidence: "high" | "medium" | "low";
  evidenceStatus: ProductMentionEvidenceStatus;
  modifiers: string[];
  isCompetitor: boolean;
  sourceSpan: { start: number; end: number };
};

const PRODUCT_TOKEN_STOP_WORDS = new Set([
  "for",
  "many",
  "of",
  "his",
  "her",
  "their",
  "cases",
  "case",
  "and",
  "to",
  "the",
  "a",
  "an",
  "during",
  "this",
  "now",
  "standard",
  "so",
  "rigid",
  "suction",
  "irrigation",
  "again",
  "today",
  "afterward",
  "afterwards",
]);

const HEDGED_LANGUAGE_RE =
  /\b(?:from what i understood|from what i could tell|from what i could see|i think|i believe|might be|maybe|probably|not sure if|need to confirm|needs confirmation|need to verify|need to validate)\b/i;

const NEEDS_OBSERVATION_CONFIRMATION_RE =
  /\b(?:need to confirm(?:\s+that|\s+during)?\s+observation|confirm(?:\s+that|\s+during)?\s+observation|during observation)\b/i;

const UNKNOWN_PRODUCT_RE =
  /\b(?:not sure|unsure|don't know|do not know|unclear|unknown)\b[^.]{0,48}\b(?:what|which)\b[^.]{0,32}\b(?:mesh|product|tray|vendor)\b/i;

const USING_PRODUCT_RE =
  /\b(?:(?:currently|still)\s+)?(?:using|uses?|used)\s+([A-Za-z0-9][A-Za-z0-9-]*(?:\s+[A-Za-z0-9][A-Za-z0-9-]*){0,3})\b/i;

const THEY_USE_PRODUCT_RE =
  /\b(?:they|we|he|she)(?:'re|\s+is|\s+are)?\s+(?:still\s+)?(?:using|uses?)\s+([A-Za-z0-9][A-Za-z0-9-]*(?:\s+[A-Za-z0-9][A-Za-z0-9-]*){0,3})\b/i;

const CASES_USE_PRODUCT_RE =
  /\b(?:a\s+lot\s+of|many|most\s+of)\s+(?:his|her|their)\s+([^.]{0,40}?)\s+(?:cases\s+)?(?:use|using|with)\s+([A-Za-z0-9][A-Za-z0-9-]*(?:\s+[A-Za-z0-9][A-Za-z0-9-]*){0,3})\b/i;

const USED_PRODUCT_LIST_RE =
  /\b(?:used|implanted|placed)\s+([A-Z][A-Za-z0-9-]*(?:\s+[A-Z][A-Za-z0-9-]*)?(?:\s+(?:graft|mesh|implant|system|plate|screw|anchor))?(?:\s*(?:,|and)\s*[A-Z][A-Za-z0-9-]*(?:\s+[A-Z][A-Za-z0-9-]*)?(?:\s+(?:graft|mesh|implant|system|plate|screw|anchor))?)*)\b/i;

const CURRENT_PRODUCT_WAS_RE =
  /\bcurrent\s+product\s+(?:was|is)\s+([A-Z][A-Za-z0-9-]*(?:\s+[A-Z][A-Za-z0-9-]*){0,3})\b/i;

function truncateProductRaw(raw: string): string {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  const kept: string[] = [];
  for (const token of tokens) {
    if (PRODUCT_TOKEN_STOP_WORDS.has(token.toLowerCase())) break;
    kept.push(token);
  }
  if (kept.length === 0) return "";

  const maxTokens =
    kept.length <= 3 &&
    (kept.every((token) => isCatalogKnownProductFragment(token)) ||
      /\b(?:mesh|graft|implant|system|plate|screw|anchor)\b/i.test(kept[kept.length - 1] ?? ""))
      ? 3
      : 2;
  return kept.slice(0, maxTokens).join(" ");
}

function extractProcedureContext(fragment: string): string | undefined {
  const inCases = fragment.match(
    /\b(?:in|on|for)\s+(?:a\s+lot\s+of\s+)?(?:his|her|their)\s+([a-z][^.]{0,48}?cases)\b/i,
  );
  if (inCases?.[1]) return inCases[1].trim().replace(/\s+/g, " ");

  const casesUse = fragment.match(CASES_USE_PRODUCT_RE);
  if (casesUse?.[1]) return casesUse[1].trim().replace(/\s+/g, " ");

  return undefined;
}

function buildModifiers(fragment: string): string[] {
  const modifiers: string[] = [];
  if (HEDGED_LANGUAGE_RE.test(fragment)) modifiers.push("hedged_language");
  if (NEEDS_OBSERVATION_CONFIRMATION_RE.test(fragment)) modifiers.push("needs_observation_confirmation");
  return modifiers;
}

function resolveConfidence(input: {
  known: boolean;
  modifiers: string[];
}): ProductMentionExtraction["confidence"] {
  if (input.modifiers.length > 0 || !input.known) return "medium";
  return "high";
}

function resolveEvidenceStatus(confidence: ProductMentionExtraction["confidence"]): ProductMentionEvidenceStatus {
  return confidence === "high" ? "validated" : "needs_confirmation";
}

function resolveIsCompetitor(productName: string, known: boolean, fragment: string): boolean {
  if (!known) return COMPETITOR_BRAND_PATTERN.test(`${productName} ${fragment}`);
  const lower = productName.toLowerCase();
  if (lower === "acsis") return false;
  return COMPETITOR_BRAND_PATTERN.test(`${productName} ${fragment}`) || /\bcompetitor\b/i.test(fragment);
}

function spanForMatch(fragment: string, match: RegExpMatchArray | null): { start: number; end: number } {
  if (!match || match.index == null) return { start: 0, end: fragment.length };
  return { start: match.index, end: match.index + match[0].length };
}

function pushMention(
  target: ProductMentionExtraction[],
  seen: Set<string>,
  fragment: string,
  productRaw: string,
  match: RegExpMatchArray | null,
): void {
  const truncated = truncateProductRaw(productRaw);
  if (!truncated) return;

  const { productName, known } = resolveKnownProduct(truncated);
  if (!productName || !isValidProductName(productName)) return;

  const key = normalizeProductLookupKey(productName);
  if (seen.has(key)) return;
  seen.add(key);

  const modifiers = buildModifiers(fragment);
  const confidence = resolveConfidence({ known, modifiers });

  target.push({
    productName,
    procedureContext: extractProcedureContext(fragment),
    evidence: fragment.trim(),
    confidence,
    evidenceStatus: resolveEvidenceStatus(confidence),
    modifiers,
    isCompetitor: resolveIsCompetitor(productName, known, fragment),
    sourceSpan: spanForMatch(fragment, match),
  });
}

function knownProductHasUsageContext(fragment: string, product: string): boolean {
  const escaped = product.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  return (
    new RegExp(
      String.raw`\b(?:using|uses?|used|implanted|placed)\b[^.!?]{0,64}\b${escaped}\b`,
      "i",
    ).test(fragment) ||
    new RegExp(
      String.raw`\b${escaped}\b[^.!?]{0,48}\b(?:was|were)?\s*(?:used|implanted|placed)\b`,
      "i",
    ).test(fragment)
  );
}

function pushMentionList(
  target: ProductMentionExtraction[],
  seen: Set<string>,
  fragment: string,
  rawList: string,
  match: RegExpMatchArray | null,
): void {
  // Cut discourse tails ("…and commented that…") so list splitting cannot invent products.
  const cleaned = rawList
    .replace(
      /\s+(?:and|but|,)\s+(?:commented|mentioned|said|noted|added|explained|asked|wished|wishes)\b[\s\S]*$/i,
      "",
    )
    .replace(/\b(?:today|during|in|on|for|the|this)\b.*$/i, "")
    .trim();
  const parts = cleaned
    .split(/\s*(?:,|and)\s*/i)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2 && looksLikeProductNameCandidate(part));

  for (const part of parts) {
    pushMention(target, seen, fragment, part, match);
  }
}

export function extractProductMentionsFromText(input: {
  text: string;
  mode: "debrief" | "observation_fragment";
}): ProductMentionExtraction[] {
  const trimmed = input.text.trim();
  if (!trimmed) return [];

  const mentions: ProductMentionExtraction[] = [];
  const seen = new Set<string>();

  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter((part) => part.trim().length >= 8);
  const fragments = sentences.length > 0 ? sentences : [trimmed];

  for (const fragment of fragments) {
    if (UNKNOWN_PRODUCT_RE.test(fragment) && !USING_PRODUCT_RE.test(fragment)) {
      continue;
    }

    const usedListMatch = fragment.match(USED_PRODUCT_LIST_RE);
    if (usedListMatch?.[1]) {
      pushMentionList(mentions, seen, fragment, usedListMatch[1], usedListMatch);
    }

    const currentProductMatch = fragment.match(CURRENT_PRODUCT_WAS_RE);
    if (currentProductMatch?.[1]) {
      pushMention(mentions, seen, fragment, currentProductMatch[1], currentProductMatch);
    }

    for (const known of DEBRIEF_KNOWN_PRODUCTS) {
      const pattern = new RegExp(`\\b${known.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
      const match = fragment.match(pattern);
      if (match && knownProductHasUsageContext(fragment, known)) {
        pushMention(mentions, seen, fragment, known, match);
      }
    }

    const casesUseMatch = fragment.match(CASES_USE_PRODUCT_RE);
    if (casesUseMatch?.[2]) {
      pushMention(mentions, seen, fragment, casesUseMatch[2], casesUseMatch);
    }

    const theyUseMatch = fragment.match(THEY_USE_PRODUCT_RE);
    if (theyUseMatch?.[1]) {
      pushMention(mentions, seen, fragment, theyUseMatch[1], theyUseMatch);
    }

    const usingMatch = fragment.match(USING_PRODUCT_RE);
    if (usingMatch?.[1]) {
      pushMention(mentions, seen, fragment, usingMatch[1], usingMatch);
    }
  }

  return mentions;
}

/** First valid product name from shared extraction — convenience for UF/DIP bridges. */
export function extractPrimaryProductMention(text: string): ProductMentionExtraction | undefined {
  return extractProductMentionsFromText({ text, mode: "debrief" })[0];
}

/** Guard for parity harness — detects garbled product names with stop-word tails. */
export function isGarbledProductName(name: string): boolean {
  const tokens = name.trim().split(/\s+/);
  if (tokens.length <= 1) return false;
  return tokens.some((token) => PRODUCT_TOKEN_STOP_WORDS.has(token.toLowerCase()));
}

export { titleCaseProduct };
