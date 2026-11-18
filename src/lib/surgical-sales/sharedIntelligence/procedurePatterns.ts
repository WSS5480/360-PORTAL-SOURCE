/**
 * Shared procedure patterns and volume language — used by DIP and UF extractors.
 */

import type { UniversalCanonicalConcept } from "@/lib/surgical-sales/universalExtractor/types";

export const PROCEDURE_VOLUME_LANGUAGE_RE =
  /increas|growing\s+.{0,80}(?:cases|procedures|volume)|high(?:er)? volume|more .{0,60}(?:repairs|cases|procedures|referrals?)|uptick|keeps growing|doing\s+more|seeing\s+more|have been doing\s+more|a lot more|lot more|becoming\s+more\s+common|case volume is increasing|compared to (?:previous|a year|last year)/i;

export type SharedProcedurePattern = {
  concept: UniversalCanonicalConcept;
  procedure: string;
  pattern: RegExp;
  dipHint: string;
  /** Higher = more specific; matched first. */
  specificity: number;
};

export const SHARED_PROCEDURE_PATTERNS: SharedProcedurePattern[] = [
  {
    concept: "procedure_volume_trend",
    procedure: "Robotic ventral hernia repair",
    pattern: /robotic ventral hernia(?:\s+repair)?s?/i,
    dipHint: "robotic ventral hernia",
    specificity: 100,
  },
  {
    concept: "procedure_focus",
    procedure: "Robotic ventral and inguinal hernia repair",
    pattern: /robotic\s+ventral\s+and\s+inguinal\s+hernia(?:\s+repair)?s?/i,
    dipHint: "robotic ventral and inguinal hernia",
    specificity: 102,
  },
  {
    concept: "procedure_volume_trend",
    procedure: "Complex abdominal wall reconstruction",
    pattern: /complex abdominal wall reconstruction/i,
    dipHint: "complex abdominal wall",
    specificity: 95,
  },
  {
    concept: "procedure_volume_trend",
    procedure: "Abdominal wall reconstruction",
    pattern: /abdominal wall reconstruction/i,
    dipHint: "abdominal wall reconstruction",
    specificity: 90,
  },
  {
    concept: "procedure_focus",
    procedure: "Complex abdominal wall",
    pattern: /complex abdominal wall(?! reconstruction)/i,
    dipHint: "complex abdominal wall",
    specificity: 85,
  },
  {
    concept: "procedure_focus",
    procedure: "Robotic hernia repair",
    pattern: /robotic (?:ventral )?hernia repair/i,
    dipHint: "robotic hernia",
    specificity: 80,
  },
  {
    concept: "procedure_focus",
    procedure: "Robotic hernia",
    pattern: /robotic (?:abdominal wall and )?hernia(?! repair)/i,
    dipHint: "robotic hernia",
    specificity: 75,
  },
  {
    concept: "procedure_focus",
    procedure: "Ventral hernia repair",
    pattern: /ventral hernia repair/i,
    dipHint: "ventral hernia",
    specificity: 70,
  },
  {
    concept: "procedure_focus",
    procedure: "Laparoscopic hernia",
    pattern: /(?:laparoscopic|lap)\s+hernia/i,
    dipHint: "laparoscopic hernia",
    specificity: 65,
  },
];

/** Volume patterns for provider intelligence read adapters — re-exported for backward compat. */
export const PROCEDURE_VOLUME_PATTERNS: Array<{ procedure: string; pattern: RegExp }> =
  SHARED_PROCEDURE_PATTERNS.filter(({ concept }) => concept === "procedure_volume_trend").map(
    ({ procedure, pattern }) => ({ procedure, pattern }),
  );

export function normalizeProcedureKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

const COMPOUND_PROCEDURE_SPLIT_RE = /\s+(?:and|plus)\s+/i;

function stripProcedureNarrativeLead(text: string): string {
  return text
    .replace(
      /^(?:he|she|they|we|i)(?:'re|'s| are| is| was| were)?\s+(?:continuing\s+to\s+)?(?:see|seeing|perform(?:ing)?|do(?:ing)?)\s+(?:a\s+)?(?:strong|high|higher|growing|increased|increasing)?\s*(?:volume\s+of\s+)?/i,
      "",
    )
    .replace(
      /^(?:continuing\s+to\s+)?(?:see|seeing|perform(?:ing)?|do(?:ing)?)\s+(?:a\s+)?(?:strong|high|higher|growing|increased|increasing)?\s*(?:volume\s+of\s+)?/i,
      "",
    )
    .replace(/^(?:a\s+)?(?:high|strong|higher|growing|increased|increasing)\s+(?:volume\s+of\s+)?/i, "")
    .trim();
}

/** Split "ventral hernia and abdominal wall reconstruction" into separate procedure labels. */
export function splitCompoundProcedureLabels(text: string): string[] {
  const trimmed = stripProcedureNarrativeLead(text.trim());
  if (!trimmed || !COMPOUND_PROCEDURE_SPLIT_RE.test(trimmed)) {
    return [canonicalProcedureLabel(trimmed)];
  }

  const segments = trimmed
    .split(COMPOUND_PROCEDURE_SPLIT_RE)
    .map((segment) =>
      segment
        .replace(/^(?:high|strong)\s+(?:volume\s+of\s+)?/i, "")
        .replace(/^(?:more|increased|an?|the)\s+/i, "")
        .trim(),
    )
    .filter(Boolean)
    .map((segment) => canonicalProcedureLabel(segment));

  const unique = [...new Set(segments.filter(Boolean))];
  return unique.length >= 2 ? unique : [canonicalProcedureLabel(trimmed)];
}

function titleCasePhrase(raw: string): string {
  const lowercaseWords = new Set(["and", "or", "of", "the", "a", "an", "in", "on", "for", "to"]);
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && lowercaseWords.has(lower)) return lower;
      if (/[a-z][A-Z]/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/** Canonical procedure label — aligned with DIP clinical normalization (singularProcedureLabel). */
export function canonicalProcedureLabel(text: string): string {
  let phrase = stripProcedureNarrativeLead(text)
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:of|in)\s+/i, "")
    .replace(/\b(?:repairs?|cases?|procedures?|work|volume)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (/^robotic\s+ventral\s+hernia\b/i.test(phrase)) return "Robotic ventral hernia repair";
  if (/^robotic\s+ventral\s+and\s+inguinal\s+hernia\b/i.test(phrase)) {
    return "Robotic ventral and inguinal hernia repair";
  }
  if (/^abdominal\s+wall\s+reconstruction\b/i.test(phrase)) return "Abdominal wall reconstruction";
  if (/^complex\s+abdominal\s+wall\b/i.test(phrase)) return "Complex abdominal wall reconstruction";
  if (/^robotic\s+(?:abdominal\s+wall\s+and\s+)?hernia\b/i.test(phrase)) return "Robotic hernia repair";
  if (/^laparoscopic\s+hernia\b/i.test(phrase)) return "Laparoscopic hernia repair";
  if (/^ventral\s+hernia\b/i.test(phrase)) return "Ventral hernia repair";
  // Category-first labels ("Technique / Modality: Robotic") and preference leftovers
  // must resolve to a clean modality token — never "/ : Robotic" or "… Preference repair".
  if (
    /\b(?:preference|modality|technique)\b/i.test(phrase) &&
    !/\b(?:hernia|cholecystectomy|bariatric|colorectal|reconstruction|fracture|fusion)\b/i.test(phrase)
  ) {
    const technique =
      techniqueModalityLabelFromText(phrase) ||
      phrase.match(/\b(robotic|laparoscopic|open)\b/i)?.[1];
    if (technique) {
      const token = technique.charAt(0).toUpperCase() + technique.slice(1).toLowerCase();
      if (token === "Robotic" || token === "Laparoscopic" || token === "Open") return token;
    }
    return "Technique / Modality";
  }
  // Dual-modality procedure phrases belong as procedure focus + separate modality cards.
  if (/^robotic\s+and\s+laparoscopic\b/i.test(phrase)) {
    if (/\bventral\s+hernia\b/i.test(phrase)) return "Ventral hernia repair";
    if (/\bhernia\b/i.test(phrase)) return "Hernia repair";
    const tail = titleCasePhrase(phrase.replace(/^robotic\s+and\s+laparoscopic\s+/i, "").trim());
    return tail || "Procedure focus";
  }
  if (/^robotic\b/i.test(phrase)) {
    const tail = titleCasePhrase(phrase.replace(/^robotic\s+/i, "").trim());
    if (!tail) return "Robotic";
    // Reject non-procedure tails ("Preference", "And Laparoscopic Preference").
    if (!/\b(?:hernia|cholecystectomy|bariatric|colorectal|reconstruction|fracture|fusion|repair|surgery|procedure)\b/i.test(tail)) {
      return "Robotic";
    }
    if (/\b(?:repair|reconstruction|procedure|surgery)\b/i.test(tail)) {
      return `Robotic ${tail.replace(/^robotic\s+/i, "")}`;
    }
    return `Robotic ${tail}${/\brepair\b/i.test(tail) ? "" : " repair"}`;
  }

  phrase = phrase.replace(/\s+(?:discussed|mentioned|increasing)$/i, "").trim();
  if (!/\b(?:repair|reconstruction|procedure|surgery)\b/i.test(phrase)) {
    if (/\b(?:hernia|reconstruction|cholecystectomy|bariatric|colorectal)\b/i.test(phrase)) {
      phrase = /\breconstruction\b/i.test(phrase) ? phrase : `${phrase} repair`;
    }
  }
  return titleCasePhrase(phrase);
}

export function hasProcedureVolumeLanguage(text: string): boolean {
  return PROCEDURE_VOLUME_LANGUAGE_RE.test(text);
}

function procedureMatchContext(text: string, pattern: RegExp): string {
  const flags = pattern.flags.replace(/g/g, "");
  const match = new RegExp(pattern.source, flags).exec(text);
  if (!match || match.index == null) return text;
  const start = Math.max(0, match.index - 72);
  const end = Math.min(text.length, match.index + match[0].length + 72);
  return text.slice(start, end);
}

function procedureHasExplicitVolumeLanguage(text: string, pattern: RegExp): boolean {
  return hasProcedureVolumeLanguage(procedureMatchContext(text, pattern));
}

export function compoundParallelVolumeIncrease(evidence: string): boolean {
  return (
    /\b(?:doing|seen|seeing|have been doing)\s+more\b[^.!?;]{0,160}\b(?:and\s+(?:are|they|he|she|we)\s+)?(?:seeing|doing)\s+more\b/i.test(
      evidence,
    ) ||
    /\b(?:doing|have been doing)\s+more\b[^.!?;]{0,160}\b(?:and\s+(?:are|they|he|she|we)\s+)?(?:seeing|noting)\s+(?:a\s+)?(?:higher|greater|increased)\s+volume\b/i.test(
      evidence,
    )
  );
}

export const TECHNIQUE_USAGE_CONTEXT_RE =
  /\b(?:do(?:es|ing|ne)?|did|perform(?:s|ed|ing)?|repairs?|cases?|procedures?|surger(?:y|ies)|approach|technique|platform|prefers?|utiliz|uses?|using|first|work)\b/i;

/** All technique/modality tokens mentioned in text (order: Robotic, Laparoscopic, Open). */
export function techniqueModalityLabelsFromText(text: string): string[] {
  if (!TECHNIQUE_USAGE_CONTEXT_RE.test(text)) return [];
  const labels: string[] = [];
  if (/\brobot(?:ic(?:ally)?|s)?\b|\bda\s*vinci\b/i.test(text)) labels.push("Robotic");
  if (/\blaparoscop(?:ic(?:ally)?|y)\b|\blap[- ]first\b/i.test(text)) labels.push("Laparoscopic");
  if (/\bopen\s+(?:cases?|approach|technique|repairs?)\b/i.test(text)) labels.push("Open");
  return labels;
}

/** First modality only — prefer techniqueModalityLabelsFromText when both may appear. */
export function techniqueModalityLabelFromText(text: string): string | null {
  return techniqueModalityLabelsFromText(text)[0] ?? null;
}

export function procedureNamesOverlap(a: string, b: string): boolean {
  const aNorm = normalizeProcedureKey(a);
  const bNorm = normalizeProcedureKey(b);
  if (aNorm === bNorm) return true;
  if (aNorm.includes(bNorm) || bNorm.includes(aNorm)) return true;
  const aTokens = new Set(aNorm.split(" "));
  const shared = bNorm.split(" ").filter((token) => aTokens.has(token));
  return shared.includes("hernia") && (shared.includes("repair") || shared.includes("robotic"));
}

function patternsOverlap(a: SharedProcedurePattern, b: SharedProcedurePattern): boolean {
  if (a.dipHint === b.dipHint) return true;
  if (procedureNamesOverlap(a.procedure, b.procedure)) {
    return a.specificity !== b.specificity;
  }
  return false;
}

export function selectProcedurePatternsForText(text: string): SharedProcedurePattern[] {
  const matched = SHARED_PROCEDURE_PATTERNS.filter(({ pattern }) => pattern.test(text)).sort(
    (a, b) => b.specificity - a.specificity,
  );

  const selected: SharedProcedurePattern[] = [];

  for (const pattern of matched) {
    let effectiveConcept: UniversalCanonicalConcept = pattern.concept;
    const hasScopedVolume = procedureHasExplicitVolumeLanguage(text, pattern.pattern);
    if (pattern.concept === "procedure_volume_trend" && !hasScopedVolume) {
      effectiveConcept = "procedure_focus";
    } else if (pattern.concept === "procedure_focus" && hasScopedVolume) {
      effectiveConcept = "procedure_volume_trend";
    }

    const dominated = selected.some((existing) => {
      if (
        effectiveConcept === "procedure_focus" &&
        existing.concept === "procedure_volume_trend" &&
        patternsOverlap(existing, pattern)
      ) {
        return true;
      }
      if (
        effectiveConcept === "procedure_volume_trend" &&
        existing.concept === "procedure_volume_trend" &&
        patternsOverlap(existing, pattern)
      ) {
        return true;
      }
      return existing.specificity > pattern.specificity && patternsOverlap(existing, pattern);
    });
    if (dominated) continue;

    if (
      selected.some(
        (existing) =>
          existing.procedure === pattern.procedure &&
          (existing.concept === effectiveConcept ||
            existing.concept === "procedure_volume_trend"),
      )
    ) {
      continue;
    }

    selected.push({ ...pattern, concept: effectiveConcept });
  }

  return selected;
}
