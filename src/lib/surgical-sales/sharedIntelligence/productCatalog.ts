/**
 * Shared product catalog and validation — used by DIP and UF extractors.
 */

export const DEBRIEF_KNOWN_PRODUCTS = [
  "Acumed",
  "AmchoPlast",
  "Bard Soft Mesh",
  "Bard Mesh",
  "Ventralight",
  "Phasix",
  "Strattice",
  "OviTex",
  "GalaFLEX",
  "Bio-A",
  "Symbotex",
  "Parietex",
  "ProGrip",
  "ACSIS",
  "TelaBio",
  "Endolumik",
  "BioTissue",
  "Merakris",
  "Dermacyte AC",
  "Skeletal Dynamics",
] as const;

const KNOWN_PRODUCT_LOOKUP = new Map(
  DEBRIEF_KNOWN_PRODUCTS.map((name) => [name.toLowerCase().replace(/\s+/g, " "), name]),
);

const PRODUCT_NAME_PRONOUN_BLOCKLIST = new Set([
  "he",
  "she",
  "they",
  "we",
  "it",
  "his",
  "her",
  "their",
  "the",
  "a",
  "an",
  "i",
  "you",
  "to",
]);

const GENERIC_EQUIPMENT_DESCRIPTOR_WORDS = new Set([
  "standard",
  "rigid",
  "flexible",
  "curved",
  "suction",
  "irrigation",
  "setup",
  "instrument",
  "instruments",
  "instrumentation",
  "device",
  "tool",
  "tools",
  "system",
  "current",
  "existing",
]);

/**
 * Techniques / modalities are clinical intelligence, never products.
 */
export const TECHNIQUE_MODALITY_NAME_RE =
  /\b(?:robot(?:ic(?:ally)?|s)?|da\s*vinci|laparoscop(?:ic(?:ally)?|y)|lap|open|mis|minimally\s+invasive)\b/i;

const PRODUCT_STATUS_TOKEN_RE =
  /^(?:unknown|unclear|none|n\/?a|tbd|not\s+sure|unsure|unspecified|unconfirmed|unidentified|\?+)$/i;

/** Speech / discourse fragments that must never become product names. */
const DISCOURSE_PRODUCT_TOKEN_RE =
  /\b(?:commented|mentioned|said|noted|added|explained|because|exactly|behaves|comfortable|wishes|sometimes|asked|willing|showed|presented|coordinated|reach|email)\b/i;

const PRODUCT_CLASS_NOUN_RE = /\b(?:mesh|graft|implant|system|plate|screw|anchor|device|product|tray)\b/i;

export function titleCaseProduct(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (/^[A-Z0-9-]+$/.test(word)) return word;
      if (word.toLowerCase() === "mesh") return "Mesh";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function normalizeProductLookupKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isValidProductName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2) return false;
  if (PRODUCT_NAME_PRONOUN_BLOCKLIST.has(trimmed.toLowerCase())) return false;
  if (/^(?:mesh|product|tray|cases|his|her|their|today|to)$/i.test(trimmed)) return false;
  if (DISCOURSE_PRODUCT_TOKEN_RE.test(trimmed)) return false;
  const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length > 0 && tokens.every((token) => GENERIC_EQUIPMENT_DESCRIPTOR_WORDS.has(token))) {
    return false;
  }
  if (TECHNIQUE_MODALITY_NAME_RE.test(trimmed)) return false;
  return true;
}

/** True when a free-text product fragment looks clinically plausible (catalog or product-class noun). */
export function looksLikeProductNameCandidate(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || !isValidProductName(trimmed)) return false;
  const key = normalizeProductLookupKey(trimmed);
  if (KNOWN_PRODUCT_LOOKUP.has(key)) return true;
  if (DEBRIEF_KNOWN_PRODUCTS.some((product) => key.includes(normalizeProductLookupKey(product)))) {
    return true;
  }
  return PRODUCT_CLASS_NOUN_RE.test(trimmed);
}

export function isProductStatusToken(name: string): boolean {
  return PRODUCT_STATUS_TOKEN_RE.test(name.trim());
}

export function textNamesKnownDebriefProduct(text: string): boolean {
  const blob = normalizeProductLookupKey(text);
  if (!blob) return false;
  return DEBRIEF_KNOWN_PRODUCTS.some((product) =>
    blob.includes(normalizeProductLookupKey(product)),
  );
}

function productMentionPattern(product: string): RegExp {
  const escaped = product
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
  return new RegExp(`\\b${escaped}\\b`, "i");
}

export function knownProductsMentionedInText(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  return DEBRIEF_KNOWN_PRODUCTS.filter((product) => productMentionPattern(product).test(trimmed));
}

export function knownProductMentionedInText(text: string): string | null {
  const products = knownProductsMentionedInText(text);
  return products.length === 1 ? products[0]! : null;
}

export function resolveKnownProduct(name: string): { productName: string; known: boolean } {
  const trimmed = titleCaseProduct(name);
  if (!isValidProductName(trimmed)) return { productName: "", known: false };
  const key = normalizeProductLookupKey(trimmed);
  const known = KNOWN_PRODUCT_LOOKUP.get(key);
  if (known) return { productName: known, known: true };

  for (const candidate of DEBRIEF_KNOWN_PRODUCTS) {
    if (key.includes(normalizeProductLookupKey(candidate))) {
      return { productName: candidate, known: true };
    }
  }

  if (trimmed.length < 2 || /^(?:mesh|product|tray|cases|his|her|their|the|a|an|today|to)$/i.test(trimmed)) {
    return { productName: "", known: false };
  }
  return { productName: trimmed, known: false };
}

export function isCatalogKnownProductFragment(token: string): boolean {
  const key = normalizeProductLookupKey(token);
  if (KNOWN_PRODUCT_LOOKUP.has(key)) return true;
  return DEBRIEF_KNOWN_PRODUCTS.some(
    (product) =>
      normalizeProductLookupKey(product).includes(key) ||
      key.includes(normalizeProductLookupKey(product.split(/\s+/)[0] ?? "")),
  );
}
