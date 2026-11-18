import { z } from "zod";
import { callOpenAiStructuredJson } from "@/lib/surgical-sales/structuredIntelligenceAnalysis";
import { KNOWN_PRODUCT_MAPPINGS, SPECIALTY_ONLY_SIGNALS } from "@/lib/admin/surgicalProductSpecialtyHints";

export const COMPANY_SPECIALTY_LABELS = [
  "General Surgery",
  "Hernia Repair",
  "Bariatric Surgery",
  "Colorectal Surgery",
  "Plastic & Reconstructive Surgery",
  "Wound Care",
  "Ophthalmology",
  "Orthopedics",
  "Hand & Upper Extremity",
  "Foot & Ankle / Podiatry",
  "Vascular Surgery",
  "Cardiothoracic Surgery",
  "Neurosurgery",
  "Spine Surgery",
  "Sports Medicine",
  "Trauma Surgery",
  "Gynecology",
  "Urology",
  "ENT / Otolaryngology",
  "Dermatology",
  "Pain Management",
  "Oral & Maxillofacial",
  "Breast Surgery",
] as const;

export type CompanySpecialtyLabel = (typeof COMPANY_SPECIALTY_LABELS)[number];

type KeywordRule = { term: string; weight: number };

/** Weighted keyword rules — clinical terms, product categories, and device vocabulary. */
const SPECIALTY_RULES: { label: CompanySpecialtyLabel; keywords: KeywordRule[] }[] = [
  {
    label: "General Surgery",
    keywords: [
      { term: "general surgery", weight: 4 },
      { term: "general surgeon", weight: 4 },
      { term: "surgery center", weight: 3 },
      { term: "surgical products", weight: 3 },
      { term: "surgical solutions", weight: 3 },
      { term: "hospital products", weight: 3 },
      { term: "minimally invasive surgery", weight: 2 },
      { term: "laparoscopic surgery", weight: 2 },
    ],
  },
  {
    label: "Hernia Repair",
    keywords: [
      { term: "hernia repair", weight: 4 },
      { term: "hernia mesh", weight: 4 },
      { term: "surgical mesh", weight: 3 },
      { term: "ventral hernia", weight: 4 },
      { term: "inguinal hernia", weight: 4 },
      { term: "abdominal wall", weight: 3 },
      { term: "hernia", weight: 2 },
      { term: "mesh repair", weight: 2 },
    ],
  },
  {
    label: "Bariatric Surgery",
    keywords: [
      { term: "bariatric surgery", weight: 4 },
      { term: "weight loss surgery", weight: 4 },
      { term: "sleeve gastrectomy", weight: 4 },
      { term: "gastric bypass", weight: 3 },
      { term: "intragastric balloon", weight: 4 },
      { term: "metabolic surgery", weight: 3 },
      { term: "bariatric", weight: 2 },
      { term: "gastric", weight: 1 },
    ],
  },
  {
    label: "Colorectal Surgery",
    keywords: [
      { term: "colorectal surgery", weight: 4 },
      { term: "colorectal surgeon", weight: 4 },
      { term: "proctology", weight: 3 },
      { term: "colon surgery", weight: 3 },
      { term: "rectal surgery", weight: 3 },
    ],
  },
  {
    label: "Plastic & Reconstructive Surgery",
    keywords: [
      { term: "plastic surgery", weight: 4 },
      { term: "reconstructive surgery", weight: 4 },
      { term: "cosmetic surgery", weight: 3 },
      { term: "aesthetic surgery", weight: 3 },
      { term: "reconstructive", weight: 2 },
    ],
  },
  {
    label: "Wound Care",
    keywords: [
      { term: "wound care", weight: 4 },
      { term: "chronic wound", weight: 4 },
      { term: "wound healing", weight: 3 },
      { term: "skin substitute", weight: 4 },
      { term: "tissue bank", weight: 4 },
      { term: "amniotic membrane", weight: 4 },
      { term: "amniotic graft", weight: 3 },
      { term: "allograft", weight: 3 },
      { term: "biologic matrix", weight: 3 },
      { term: "advanced wound", weight: 3 },
      { term: "ulcer care", weight: 2 },
      { term: "ulcer", weight: 1 },
    ],
  },
  {
    label: "Ophthalmology",
    keywords: [
      { term: "ophthalmology", weight: 4 },
      { term: "ophthalmic surgery", weight: 4 },
      { term: "cataract surgery", weight: 3 },
      { term: "cornea", weight: 2 },
      { term: "ocular surgery", weight: 3 },
      { term: "dry eye", weight: 2 },
    ],
  },
  {
    label: "Orthopedics",
    keywords: [
      { term: "orthopedic surgery", weight: 4 },
      { term: "orthopaedic surgery", weight: 4 },
      { term: "joint replacement", weight: 4 },
      { term: "arthroplasty", weight: 4 },
      { term: "fracture fixation", weight: 4 },
      { term: "orthopedic", weight: 3 },
      { term: "orthopaedic", weight: 3 },
      { term: "fracture", weight: 2 },
      { term: "bone fixation", weight: 3 },
      { term: "extremity fixation", weight: 4 },
    ],
  },
  {
    label: "Hand & Upper Extremity",
    keywords: [
      { term: "hand surgery", weight: 4 },
      { term: "upper extremity", weight: 4 },
      { term: "distal radius", weight: 3 },
      { term: "wrist fracture", weight: 3 },
      { term: "hand and wrist", weight: 3 },
    ],
  },
  {
    label: "Foot & Ankle / Podiatry",
    keywords: [
      { term: "foot and ankle", weight: 4 },
      { term: "foot & ankle", weight: 4 },
      { term: "podiatric surgery", weight: 4 },
      { term: "podiatry", weight: 3 },
      { term: "bunion", weight: 2 },
    ],
  },
  {
    label: "Vascular Surgery",
    keywords: [
      { term: "vascular surgery", weight: 4 },
      { term: "endovascular", weight: 4 },
      { term: "vascular surgeon", weight: 4 },
      { term: "peripheral artery", weight: 3 },
      { term: "aneurysm repair", weight: 3 },
    ],
  },
  {
    label: "Cardiothoracic Surgery",
    keywords: [
      { term: "cardiothoracic surgery", weight: 4 },
      { term: "cardiac surgery", weight: 4 },
      { term: "thoracic surgery", weight: 4 },
      { term: "open heart", weight: 3 },
    ],
  },
  {
    label: "Neurosurgery",
    keywords: [
      { term: "neurosurgery", weight: 4 },
      { term: "neurosurgeon", weight: 4 },
      { term: "brain surgery", weight: 3 },
      { term: "cranial surgery", weight: 3 },
    ],
  },
  {
    label: "Spine Surgery",
    keywords: [
      { term: "spine surgery", weight: 4 },
      { term: "spinal fusion", weight: 4 },
      { term: "spinal surgery", weight: 4 },
      { term: "lumbar fusion", weight: 3 },
      { term: "cervical fusion", weight: 3 },
      { term: "interbody fusion", weight: 3 },
    ],
  },
  {
    label: "Sports Medicine",
    keywords: [
      { term: "sports medicine", weight: 4 },
      { term: "rotator cuff", weight: 3 },
      { term: "acl reconstruction", weight: 4 },
      { term: "arthroscopy", weight: 3 },
      { term: "ligament repair", weight: 2 },
    ],
  },
  {
    label: "Trauma Surgery",
    keywords: [
      { term: "trauma surgery", weight: 4 },
      { term: "acute care surgery", weight: 4 },
      { term: "trauma center", weight: 3 },
      { term: "polytrauma", weight: 3 },
    ],
  },
  {
    label: "Gynecology",
    keywords: [
      { term: "gynecologic surgery", weight: 4 },
      { term: "gynecology", weight: 3 },
      { term: "hysterectomy", weight: 3 },
      { term: "urogynecology", weight: 3 },
      { term: "pelvic surgery", weight: 2 },
      { term: "obstetrics", weight: 1 },
    ],
  },
  {
    label: "Urology",
    keywords: [
      { term: "urologic surgery", weight: 4 },
      { term: "urology", weight: 3 },
      { term: "urologist", weight: 3 },
      { term: "prostate surgery", weight: 3 },
      { term: "kidney stone", weight: 2 },
    ],
  },
  {
    label: "ENT / Otolaryngology",
    keywords: [
      { term: "otolaryngology", weight: 4 },
      { term: "head and neck surgery", weight: 4 },
      { term: "sinus surgery", weight: 3 },
      { term: "rhinology", weight: 3 },
      { term: "ent surgery", weight: 3 },
    ],
  },
  {
    label: "Dermatology",
    keywords: [
      { term: "dermatologic surgery", weight: 4 },
      { term: "dermatology", weight: 3 },
      { term: "mohs surgery", weight: 4 },
      { term: "skin cancer", weight: 2 },
    ],
  },
  {
    label: "Pain Management",
    keywords: [
      { term: "pain management", weight: 4 },
      { term: "interventional pain", weight: 4 },
      { term: "neuromodulation", weight: 3 },
      { term: "spinal cord stimulator", weight: 3 },
    ],
  },
  {
    label: "Oral & Maxillofacial",
    keywords: [
      { term: "oral and maxillofacial", weight: 4 },
      { term: "maxillofacial surgery", weight: 4 },
      { term: "dental implant", weight: 2 },
      { term: "jaw surgery", weight: 3 },
    ],
  },
  {
    label: "Breast Surgery",
    keywords: [
      { term: "breast surgery", weight: 4 },
      { term: "breast reconstruction", weight: 4 },
      { term: "mastectomy", weight: 4 },
      { term: "oncoplastic", weight: 3 },
    ],
  },
];

const LINK_PATH_HINT_RE =
  /(?:product|portfolio|solution|surgical|surgery|wound|service|about|offer|hospital|outpatient|specialt|clinical|therap|device|market)/i;

const AiSpecialtySchema = z.object({
  specialties: z
    .array(
      z.object({
        label: z.enum(COMPANY_SPECIALTY_LABELS),
        confidence: z.enum(["high", "medium", "low"]),
        reason: z.string().max(240).optional(),
      }),
    )
    .max(12),
});

export type CompanyWebsiteProductSuggestion = {
  name: string;
  specialty: CompanySpecialtyLabel;
  description?: string;
  source: "keywords" | "ai";
};

export type CompanyWebsiteSpecialtySuggestionResult = {
  suggestions: string[];
  productSuggestions: CompanyWebsiteProductSuggestion[];
  matched: number;
  productMatched: number;
  siteUrl: string;
  method: "hybrid" | "keywords" | "ai";
  pagesScanned: number;
};

export function normalizeCompanyWebsiteUrl(raw: string): string | null {
  let value = raw.trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "0.0.0.0" ||
      host.endsWith(".local") ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countTerm(haystack: string, term: string): number {
  const re = new RegExp(`\\b${escapeRegExp(term)}\\b`, "gi");
  return [...haystack.matchAll(re)].length;
}

export function preprocessWebsiteHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<a[^>]*href=["'][^"']*linkedin\.com[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, " ")
    .replace(/https?:\/\/[^\s"'<>]*linkedin\.com[^\s"'<>]*/gi, " ")
    .replace(/follow us on linkedin/gi, " ")
    .replace(/view on linkedin/gi, " ")
    .replace(/read full post on linkedin/gi, " ");
}

export function htmlToWebsiteText(html: string): string {
  return preprocessWebsiteHtml(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[™®©]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function dedupeRepeatedPhrases(text: string): string {
  const chunks = text.split(/(?<=[.!?])\s+/);
  const seen = new Map<string, number>();
  const kept: string[] = [];
  for (const chunk of chunks) {
    const key = chunk.trim();
    if (key.length < 40) {
      kept.push(chunk);
      continue;
    }
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count <= 2) kept.push(chunk);
  }
  return kept.join(" ");
}

const FOOTER_MARKERS = [
  "outpatient products",
  "surgical / hospital products",
  "surgical/hospital products",
  "quick links",
  "contact us",
  "privacy policy",
] as const;

/** Remove embedded LinkedIn/social timelines while keeping footer product lists. */
export function removeEmbeddedSocialWall(text: string): string {
  const lower = text.toLowerCase();
  const socialStart = lower.search(/\b\d+\s+(weeks?|months?|days?)\s+ago\b/);
  if (socialStart < 0) return text;

  let footerStart = text.length;
  for (const marker of FOOTER_MARKERS) {
    const idx = lower.indexOf(marker, socialStart);
    if (idx >= 0 && idx < footerStart) footerStart = idx;
  }

  if (footerStart > socialStart) {
    return `${text.slice(0, socialStart).trim()} ${text.slice(footerStart).trim()}`.replace(/\s+/g, " ").trim();
  }

  return text.slice(0, socialStart).trim();
}

export function stripSocialFeedNoise(text: string): string {
  return removeEmbeddedSocialWall(
    text
      .replace(/\b\d+\s+(weeks?|months?|days?|hours?)\s+ago\b/gi, " ")
      .replace(/#[a-z0-9_]+/gi, " ")
      .replace(/\+\s*follow\b/gi, " ")
      .replace(/\bread full post on\b/gi, " ")
      .replace(/\bview on\b/gi, " ")
      .replace(/\bfollow us on linkedin\b/gi, " ")
      .replace(/\b(national\s+)?colorectal cancer awareness month\b/gi, " ")
      .replace(/\bover [\d,]+ americans are diagnosed with colorectal cancer\b/gi, " ")
      .replace(/\b\w+ cancer awareness month\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

export function extractProductPortfolioText(text: string): string {
  const snippets: string[] = [];
  const patterns = [
    /outpatient products[\s\S]{0,1400}/i,
    /surgical\s*\/?\s*hospital products[\s\S]{0,1400}/i,
    /(?:product portfolio|our products|products we (?:carry|distribute|offer))[\s\S]{0,1400}/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[0]) snippets.push(match[0].trim());
  }
  return [...new Set(snippets)].join("\n");
}

export function prepareWebsiteTextForSpecialtyAnalysis(rawText: string): string {
  const cleaned = stripSocialFeedNoise(dedupeRepeatedPhrases(rawText));
  const portfolio = extractProductPortfolioText(cleaned);
  if (!portfolio) return cleaned;
  return `${portfolio}\n\n${cleaned}`.trim();
}

const STRICT_AI_GROUNDING: Partial<Record<CompanySpecialtyLabel, string[]>> = {
  "Colorectal Surgery": ["colorectal surgery", "colorectal surgeon", "colon surgery", "rectal surgery", "proctology"],
  "Plastic & Reconstructive Surgery": [
    "plastic surgery",
    "reconstructive surgery",
    "cosmetic surgery",
    "aesthetic surgery",
    "breast reconstruction",
  ],
};

const AI_ONLY_BLOCKED_LABELS = new Set<CompanySpecialtyLabel>([
  "Colorectal Surgery",
  "Plastic & Reconstructive Surgery",
]);

function hasStrictAiGrounding(label: CompanySpecialtyLabel, haystack: string): boolean {
  const terms = STRICT_AI_GROUNDING[label];
  if (!terms?.length) return true;
  return terms.some((term) => countTerm(haystack, term) > 0);
}

function extractSameOriginLinks(html: string, baseUrl: URL): string[] {
  const links = new Set<string>();
  for (const match of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
    const raw = match[1]?.trim();
    if (!raw || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("javascript:")) continue;
    try {
      const resolved = new URL(raw, baseUrl);
      if (resolved.origin !== baseUrl.origin) continue;
      if (!LINK_PATH_HINT_RE.test(`${resolved.pathname}${resolved.search}`)) continue;
      resolved.hash = "";
      links.add(resolved.toString());
    } catch {
      // ignore bad URLs
    }
  }
  return [...links];
}

async function fetchPageText(url: string, signal: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (360PortalSetupBot)", Accept: "text/html" },
    });
    if (!res.ok) return null;
    const raw = await res.text();
    return prepareWebsiteTextForSpecialtyAnalysis(htmlToWebsiteText(raw));
  } catch {
    return null;
  }
}

export async function fetchCompanyWebsiteTextBundle(startUrl: string): Promise<{ text: string; pagesScanned: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14_000);
  try {
    const res = await fetch(startUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (360PortalSetupBot)", Accept: "text/html" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const homepageHtml = await res.text();
    const baseUrl = new URL(res.url || startUrl);
    const homepageText = prepareWebsiteTextForSpecialtyAnalysis(htmlToWebsiteText(homepageHtml));
    const extraLinks = extractSameOriginLinks(homepageHtml, baseUrl)
      .filter((link) => link !== baseUrl.toString())
      .slice(0, 5);

    const extraTexts = await Promise.all(
      extraLinks.map(async (link) => {
        const pageController = new AbortController();
        const pageTimeout = setTimeout(() => pageController.abort(), 6_000);
        try {
          return await fetchPageText(link, pageController.signal);
        } finally {
          clearTimeout(pageTimeout);
        }
      }),
    );

    const combined = [homepageText, ...extraTexts.filter((t): t is string => Boolean(t?.trim()))].join("\n\n");
    return {
      text: combined.slice(0, 300_000),
      pagesScanned: 1 + extraTexts.filter(Boolean).length,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function scoreProductLineHints(
  haystack: string,
  portfolioHaystack: string,
): { label: CompanySpecialtyLabel; score: number }[] {
  const scores = new Map<CompanySpecialtyLabel, number>();

  const allHints = [
    ...KNOWN_PRODUCT_MAPPINGS.map((mapping) => ({
      terms: mapping.terms,
      labels: [mapping.specialty],
      weight: 5,
    })),
    ...SPECIALTY_ONLY_SIGNALS,
  ];

  for (const hint of allHints) {
    for (const term of hint.terms) {
      const portfolioHits = countTerm(portfolioHaystack, term);
      const generalHits = countTerm(haystack, term);
      const hits = portfolioHits > 0 ? portfolioHits : generalHits;
      if (!hits) continue;
      const multiplier = portfolioHits > 0 ? 1.5 : 1;
      for (const label of hint.labels) {
        const specialty = label as CompanySpecialtyLabel;
        scores.set(specialty, (scores.get(specialty) ?? 0) + hits * hint.weight * multiplier);
      }
    }
  }

  return [...scores.entries()]
    .map(([label, score]) => ({ label, score }))
    .filter((row) => row.score >= 3);
}

function hasPortfolioProductSignals(haystack: string): boolean {
  if (/outpatient products|surgical\s*\/?\s*hospital products/i.test(haystack)) return true;
  return KNOWN_PRODUCT_MAPPINGS.some((mapping) => mapping.terms.some((term) => countTerm(haystack, term) > 0));
}

export function scoreCompanyWebsiteSpecialties(
  text: string,
  companyName?: string | null,
): { label: CompanySpecialtyLabel; score: number }[] {
  const prepared = prepareWebsiteTextForSpecialtyAnalysis(text);
  const haystack = `${(companyName ?? "").trim().toLowerCase()} ${prepared}`;
  const portfolioHaystack = extractProductPortfolioText(prepared);

  const keywordScores = new Map<CompanySpecialtyLabel, number>();
  for (const rule of SPECIALTY_RULES) {
    let score = 0;
    for (const { term, weight } of rule.keywords) {
      score += countTerm(haystack, term) * weight;
    }
    if (score > 0) keywordScores.set(rule.label, score);
  }

  for (const row of scoreProductLineHints(haystack, portfolioHaystack)) {
    keywordScores.set(row.label, (keywordScores.get(row.label) ?? 0) + row.score);
  }

  return [...keywordScores.entries()]
    .map(([label, score]) => ({ label, score }))
    .filter((row) => row.score >= 3)
    .sort((a, b) => b.score - a.score);
}

const AI_CONFIDENCE_WEIGHT = { high: 12, medium: 7, low: 3 } as const;

async function inferSpecialtiesWithAi(params: {
  text: string;
  companyName?: string | null;
  signal?: AbortSignal;
}): Promise<{ label: CompanySpecialtyLabel; score: number }[]> {
  const excerpt = prepareWebsiteTextForSpecialtyAnalysis(params.text).slice(0, 14_000);
  const content = await callOpenAiStructuredJson({
    signal: params.signal,
    temperature: 0.1,
    maxTokens: 900,
    systemPrompt: [
      "You analyze medical device and surgical company websites for a sales CRM setup wizard.",
      "Infer the clinical specialties the company sells into based on product portfolio sections, product names, and clinical positioning.",
      "Use product lines and device categories to infer specialties even when the specialty name is not spelled out.",
      "Examples: mesh/hernia platforms → Hernia Repair; extremity fixation or orthopedic hardware → Orthopedics; intragastric/endoluminal devices → Bariatric Surgery; amniotic/membrane matrices → Wound Care.",
      "NEVER infer a specialty from cancer awareness months, screening campaigns, hashtags, or social media timelines.",
      "NEVER infer Plastic & Reconstructive Surgery from generic outcomes language alone.",
      "Ignore social posts, awareness campaigns, and generic mission statements unless they reflect core products.",
      "Return only labels from the allowed list. Prefer 3-8 specialties with real product evidence.",
      `Allowed labels: ${COMPANY_SPECIALTY_LABELS.join("; ")}`,
      'Return JSON: {"specialties":[{"label":"...","confidence":"high|medium|low","reason":"short evidence"}]}',
    ].join("\n"),
    userPrompt: [
      params.companyName?.trim() ? `Company: ${params.companyName.trim()}` : "Company: unknown",
      "Website text excerpt:",
      excerpt,
    ].join("\n\n"),
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }

  const result = AiSpecialtySchema.safeParse(parsed);
  if (!result.success) return [];

  return result.data.specialties.map((row) => ({
    label: row.label,
    score: AI_CONFIDENCE_WEIGHT[row.confidence],
  }));
}

function mergeSpecialtyScores(
  keywordScores: { label: CompanySpecialtyLabel; score: number }[],
  aiScores: { label: CompanySpecialtyLabel; score: number }[],
  haystack: string,
): { label: CompanySpecialtyLabel; score: number }[] {
  const keywordByLabel = new Map(keywordScores.map((row) => [row.label, row.score]));
  const merged = new Map<CompanySpecialtyLabel, number>();

  for (const row of keywordScores) merged.set(row.label, (merged.get(row.label) ?? 0) + row.score);

  for (const row of aiScores) {
    const keywordScore = keywordByLabel.get(row.label) ?? 0;
    const aiOnly = keywordScore === 0;
    const minAiScore =
      aiOnly && hasPortfolioProductSignals(haystack) && !AI_ONLY_BLOCKED_LABELS.has(row.label)
        ? AI_CONFIDENCE_WEIGHT.medium
        : AI_CONFIDENCE_WEIGHT.high;
    if (aiOnly && row.score < minAiScore) continue;
    if (aiOnly && AI_ONLY_BLOCKED_LABELS.has(row.label)) continue;
    if (!hasStrictAiGrounding(row.label, haystack) && keywordScore < 3) continue;
    merged.set(row.label, (merged.get(row.label) ?? 0) + row.score);
  }

  return [...merged.entries()]
    .map(([label, score]) => ({ label, score }))
    .filter((row) => row.score >= 3)
    .sort((a, b) => b.score - a.score);
}

function formatProductDisplayName(term: string): string {
  const normalized = term.trim().toLowerCase();
  const known = KNOWN_PRODUCT_MAPPINGS.find(
    (mapping) =>
      normalizeProductKey(mapping.name) === normalized ||
      mapping.terms.some((candidate) => candidate.toLowerCase() === normalized),
  );
  if (known) return known.name;

  return term
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeProductKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

const GENERIC_PRODUCT_BLOCKLIST = new Set([
  "amniotic membrane",
  "skin substitute",
  "surgical mesh",
  "hernia mesh",
  "biologic matrix",
  "tissue matrix",
  "surgical solutions",
  "wound care solutions",
  "medical devices",
  "healthcare solutions",
  "patient outcomes",
  "surgical products",
  "hospital products",
  "outpatient products",
  "product portfolio",
  "tissue bank",
  "licensed tissue bank",
]);

const VAGUE_AI_DESCRIPTION_RE =
  /\b(supports various|designed for effective|surgical solution|healthcare partner|trusted partner|comprehensive solution|innovative solution|high.?quality care|improve patient outcomes)\b/i;

function lookupKnownProductSpecialty(name: string): CompanySpecialtyLabel | null {
  const key = normalizeProductKey(name);
  for (const mapping of KNOWN_PRODUCT_MAPPINGS) {
    if (normalizeProductKey(mapping.name) === key) return mapping.specialty as CompanySpecialtyLabel;
    if (mapping.terms.some((term) => normalizeProductKey(term) === key)) {
      return mapping.specialty as CompanySpecialtyLabel;
    }
  }
  return null;
}

function isBlockedGenericProduct(name: string): boolean {
  const key = normalizeProductKey(name);
  if (GENERIC_PRODUCT_BLOCKLIST.has(key)) return true;
  if (key.split(/\s+/).length === 1 && ["matrix", "system", "products", "solutions", "medical"].includes(key)) return true;
  return false;
}

function isBrandLikeProductName(name: string): boolean {
  const key = normalizeProductKey(name);
  if (isBlockedGenericProduct(name)) return false;
  const words = key.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return true;
  return key.length >= 4;
}

export function extractProductsFromKnownMappings(preparedText: string): CompanyWebsiteProductSuggestion[] {
  const portfolioHaystack = extractProductPortfolioText(preparedText);
  const haystack = portfolioHaystack ? `${portfolioHaystack} ${preparedText}` : preparedText;
  const matched = new Map<string, CompanyWebsiteProductSuggestion>();

  const orderedMappings = [...KNOWN_PRODUCT_MAPPINGS].sort(
    (a, b) => Math.max(...b.terms.map((term) => term.length)) - Math.max(...a.terms.map((term) => term.length)),
  );

  for (const mapping of orderedMappings) {
    const hit = mapping.terms.some((term) => countTerm(haystack, term) > 0);
    if (!hit) continue;
    matched.set(normalizeProductKey(mapping.name), {
      name: mapping.name,
      specialty: mapping.specialty as CompanySpecialtyLabel,
      source: "keywords",
    });
  }

  return [...matched.values()];
}

/** @deprecated Use extractProductsFromKnownMappings */
export function extractProductsFromKeywordHints(preparedText: string): CompanyWebsiteProductSuggestion[] {
  return extractProductsFromKnownMappings(preparedText);
}

export function sanitizeProductSuggestions(products: CompanyWebsiteProductSuggestion[]): CompanyWebsiteProductSuggestion[] {
  const filtered = products.filter((product) => !isBlockedGenericProduct(product.name));

  const canonicalKeys = new Set<string>();
  for (const product of filtered) {
    const knownSpecialty = lookupKnownProductSpecialty(product.name);
    if (knownSpecialty) canonicalKeys.add(normalizeProductKey(product.name));
  }

  const suppressed = new Set<string>();
  for (const product of filtered) {
    const mapping = KNOWN_PRODUCT_MAPPINGS.find((row) => normalizeProductKey(row.name) === normalizeProductKey(product.name));
    if (!mapping?.suppresses?.length) continue;
    if (!canonicalKeys.has(normalizeProductKey(mapping.name))) continue;
    for (const name of mapping.suppresses) suppressed.add(normalizeProductKey(name));
  }

  const deduped = new Map<string, CompanyWebsiteProductSuggestion>();
  for (const product of filtered) {
    const key = normalizeProductKey(product.name);
    if (suppressed.has(key)) continue;

    const knownSpecialty = lookupKnownProductSpecialty(product.name);
    const specialty = knownSpecialty ?? product.specialty;
    const description =
      product.source === "ai" && product.description && VAGUE_AI_DESCRIPTION_RE.test(product.description)
        ? undefined
        : product.description;

    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, { ...product, specialty, description });
      continue;
    }

    deduped.set(key, {
      name: knownSpecialty ? formatProductDisplayName(product.name) : existing.name,
      specialty: knownSpecialty ?? existing.specialty,
      description: description ?? existing.description,
      source: existing.source === "keywords" || product.source === "keywords" ? "keywords" : "ai",
    });
  }

  return [...deduped.values()].sort((a, b) => a.name.localeCompare(b.name));
}

const AiProductSchema = z.object({
  products: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        specialty: z.enum(COMPANY_SPECIALTY_LABELS),
        description: z.string().trim().max(300).optional(),
      }),
    )
    .max(24),
});

async function inferProductsWithAi(params: {
  text: string;
  companyName?: string | null;
  signal?: AbortSignal;
}): Promise<CompanyWebsiteProductSuggestion[]> {
  const excerpt = prepareWebsiteTextForSpecialtyAnalysis(params.text).slice(0, 14_000);
  const content = await callOpenAiStructuredJson({
    signal: params.signal,
    temperature: 0.1,
    maxTokens: 1400,
    systemPrompt: [
      "You analyze medical device and surgical distributor websites for a sales CRM setup wizard.",
      "Extract distinct branded products or product lines the company sells or distributes.",
      "Use exact brand/product names from portfolio sections — not material categories.",
      "NEVER return generic categories as products (examples to skip: amniotic membrane, surgical mesh, skin substitute, surgical solutions, tissue matrix).",
      "Assign each product its primary clinical specialty from the allowed list using product evidence.",
      "Specialty rules:",
      "- Platform Innovations / ACSIS (suction irrigation sleeve) → General Surgery, NOT Hernia Repair.",
      "- TelaBio / OviTex / Phasix / Ventralight / mesh implants → Hernia Repair.",
      "- Endolumik / gastric calibration / intragastric devices → Bariatric Surgery.",
      "- Skeletal Dynamics / extremity fixation / orthopedic hardware → Orthopedics.",
      "- Membrane Wrap / Dermacyte / BioTissue / Merakris / amniotic graft brands → Wound Care.",
      "Descriptions must cite specific evidence from the page (device type or clinical use). No marketing fluff.",
      "Return 3-20 products when evidence exists.",
      `Allowed specialties: ${COMPANY_SPECIALTY_LABELS.join("; ")}`,
      'Return JSON: {"products":[{"name":"...","specialty":"...","description":"specific evidence"}]}',
    ].join("\n"),
    userPrompt: [
      params.companyName?.trim() ? `Company: ${params.companyName.trim()}` : "Company: unknown",
      "Website text excerpt:",
      excerpt,
    ].join("\n\n"),
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }

  const result = AiProductSchema.safeParse(parsed);
  if (!result.success) return [];

  return result.data.products.map((row) => ({
    name: row.name,
    specialty: row.specialty,
    description: row.description,
    source: "ai" as const,
  }));
}

export function mergeProductSuggestions(
  keywordProducts: CompanyWebsiteProductSuggestion[],
  aiProducts: CompanyWebsiteProductSuggestion[],
): CompanyWebsiteProductSuggestion[] {
  const merged = new Map<string, CompanyWebsiteProductSuggestion>();

  for (const row of keywordProducts) {
    merged.set(normalizeProductKey(row.name), row);
  }

  for (const row of aiProducts) {
    if (isBlockedGenericProduct(row.name)) continue;

    const knownSpecialty = lookupKnownProductSpecialty(row.name);
    const normalized = knownSpecialty
      ? {
          ...row,
          name: formatProductDisplayName(row.name),
          specialty: knownSpecialty,
        }
      : row;

    const key = normalizeProductKey(normalized.name);
    const existing = merged.get(key);
    if (existing) {
      merged.set(key, {
        ...existing,
        specialty: existing.source === "keywords" ? existing.specialty : normalized.specialty,
        description:
          normalized.description && !VAGUE_AI_DESCRIPTION_RE.test(normalized.description)
            ? normalized.description
            : existing.description,
        source: existing.source === "keywords" ? "keywords" : normalized.source,
      });
    } else if (
      knownSpecialty ||
      (normalized.description && !VAGUE_AI_DESCRIPTION_RE.test(normalized.description)) ||
      isBrandLikeProductName(normalized.name)
    ) {
      merged.set(key, normalized);
    }
  }

  return sanitizeProductSuggestions([...merged.values()]);
}

export async function suggestCompanyWebsiteSpecialties(params: {
  website: string;
  companyName?: string | null;
}): Promise<CompanyWebsiteSpecialtySuggestionResult> {
  const siteUrl = normalizeCompanyWebsiteUrl(params.website);
  if (!siteUrl) {
    throw new Error("Enter a valid public website URL");
  }

  const { text, pagesScanned } = await fetchCompanyWebsiteTextBundle(siteUrl);
  const preparedText = prepareWebsiteTextForSpecialtyAnalysis(text);
  const keywordScores = scoreCompanyWebsiteSpecialties(preparedText, params.companyName);

  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY?.trim());
  let aiScores: { label: CompanySpecialtyLabel; score: number }[] = [];
  if (hasOpenAi) {
    try {
      aiScores = await inferSpecialtiesWithAi({
        text: preparedText,
        companyName: params.companyName,
      });
    } catch {
      aiScores = [];
    }
  }

  const merged = mergeSpecialtyScores(keywordScores, aiScores, preparedText);

  const keywordProducts = extractProductsFromKnownMappings(preparedText);
  let aiProducts: CompanyWebsiteProductSuggestion[] = [];
  if (hasOpenAi) {
    try {
      aiProducts = await inferProductsWithAi({
        text: preparedText,
        companyName: params.companyName,
      });
    } catch {
      aiProducts = [];
    }
  }
  const productSuggestions = mergeProductSuggestions(keywordProducts, aiProducts);

  const specialtyLabels = new Set<CompanySpecialtyLabel>(merged.slice(0, 10).map((row) => row.label));
  for (const product of productSuggestions) {
    specialtyLabels.add(product.specialty);
  }

  const method: CompanyWebsiteSpecialtySuggestionResult["method"] =
    aiScores.length && keywordScores.length ? "hybrid" : aiScores.length ? "ai" : "keywords";

  return {
    suggestions: [...specialtyLabels].slice(0, 12),
    productSuggestions,
    matched: merged.length,
    productMatched: productSuggestions.length,
    siteUrl,
    method,
    pagesScanned,
  };
}
