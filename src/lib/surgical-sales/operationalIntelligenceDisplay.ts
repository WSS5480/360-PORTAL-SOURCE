/**
 * Quality gates for provider intelligence cards — suppress CRM fragments,
 * metadata, and conversational filler from operational display surfaces.
 */

import { sanitizeFieldIntelligenceText } from "@/lib/surgical-sales/fieldIntelligenceLanguage";

const CRM_ACTIVITY =
  /\b(met with|visited with|saw dr\.?|saw doctor|called on|called the|emailed|left a message|intro completed|introduction complete|log update|tactical debrief|activity logged)\b/i;

const CONVERSATIONAL_FILLER =
  /\b(i met|we met|we talked|we spoke|pretty much|kind of|sort of|just checking in|wanted to note|fyi)\b/i;

const METADATA_FRAGMENT =
  /\b(domain|confidence|target|db_key|field_key|provider_[a-z_]+)\s*[:=]/i;

const VARIABLE_LIKE =
  /^(?:[a-z][a-z0-9]*)(?:_[a-z0-9]+)+$/i;

const OPERATIONAL_KEYWORD =
  /\b(access|credential|observ|schedul|workflow|OR\b|vendor|approval|barrier|friction|deploy|commercial|stakeholder|evaluat|procurement|coordinator|blocker|pathway|feasib|cadence|volume|technique|preference|champion|decision|influence|fit|pain point|readiness)\b/i;

const INCOMPLETE_ENDING =
  /\b(and|or|but|because|since|when|if|that|which|who|with|for|to|through|via|after|before|unless|although|while)\s*$/i;

/** Leading conjunctions only — exclude "OR" (operating room) at sentence start. */
const INCOMPLETE_START =
  /^(?:and|or(?!\s+(?:access|observation|environment|team|scheduling|throughput|cadence|day|block|staff|nursing|surgeon|case|logistics|workflow))|but|because|since|when|if|that|which|who|with|for|to|through|via)\b/i;

/** Text that should never appear on intelligence cards or synthesized summaries. */
export function isLowQualityIntelligenceText(text: string | null | undefined): boolean {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return true;

  if (CRM_ACTIVITY.test(trimmed)) return true;
  if (CONVERSATIONAL_FILLER.test(trimmed)) return true;
  if (METADATA_FRAGMENT.test(trimmed)) return true;
  if (VARIABLE_LIKE.test(trimmed)) return true;
  if (/^\{\{|\$\{|```|^\[object\s/i.test(trimmed)) return true;

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount <= 3 && !OPERATIONAL_KEYWORD.test(trimmed)) return true;
  if (trimmed.length < 22 && !OPERATIONAL_KEYWORD.test(trimmed)) return true;

  if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\.?$/.test(trimmed) && wordCount <= 4) {
    return true;
  }

  return false;
}

/** Incomplete sentence fragments should not appear on intelligence cards. */
export function isIncompleteSentenceFragment(text: string | null | undefined): boolean {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return true;
  if (trimmed.endsWith("…") || trimmed.endsWith("...")) return true;
  if (INCOMPLETE_START.test(trimmed)) return true;
  if (INCOMPLETE_ENDING.test(trimmed)) return true;

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const hasTerminalPunctuation = /[.!?]["']?$/.test(trimmed);
  const hasOperationalSignal = OPERATIONAL_KEYWORD.test(trimmed);

  if (wordCount >= 10 && hasOperationalSignal) {
    return false;
  }

  if (wordCount >= 6 && !hasTerminalPunctuation && !hasOperationalSignal) {
    return true;
  }

  if (
    /\bduring an actual\b/i.test(trimmed) &&
    /\bbefore making any decisions\b/i.test(trimmed)
  ) {
    return true;
  }

  if (wordCount >= 4 && wordCount <= 8 && !hasTerminalPunctuation && !hasOperationalSignal) {
    return true;
  }

  return false;
}

/**
 * Raw note text must not be promoted to cards when it matches evidence without synthesis.
 */
export function isRawFragmentUnsuitableForCard(
  operationalMeaning: string,
  rawEvidence?: string | null,
): boolean {
  const meaning = String(operationalMeaning ?? "").trim();
  const evidence = String(rawEvidence ?? "").trim();
  if (!meaning) return true;

  if (evidence && normalizeFragment(meaning) === normalizeFragment(evidence)) {
    return true;
  }

  if (isIncompleteSentenceFragment(meaning)) return true;
  return isLowQualityIntelligenceText(meaning);
}

function normalizeFragment(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

/** Whether a stored field value is suitable for operational intelligence display. */
export function isOperationalIntelligenceDisplayable(
  dbKey: string,
  raw: string | null | undefined,
): boolean {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return false;
  if (isLowQualityIntelligenceText(trimmed)) return false;

  if (dbKey === "influence_level" || dbKey === "preferred_contact_method") {
    return trimmed !== "unknown";
  }

  return true;
}

export function sanitizeOperationalDisplayText(text: string | null | undefined): string | null {
  const trimmed = String(text ?? "").trim();
  if (!trimmed || isLowQualityIntelligenceText(trimmed)) return null;
  const fieldVoice = sanitizeFieldIntelligenceText(trimmed, { maxLen: 4000 });
  if (!fieldVoice || isIncompleteSentenceFragment(fieldVoice)) return null;
  return fieldVoice;
}
