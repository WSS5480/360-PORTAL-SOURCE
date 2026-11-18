/**
 * Short, observational signal lines for provider overview surfaces.
 */

import { sanitizeLegacyIntelligenceUserCopy } from "@/lib/surgical-sales/legacyIntelligenceUserCopy";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import { sanitizeOperationalIntelCopy } from "@/lib/surgical-sales/providerIntelligenceOperationalCopy";
import {
  PROVIDER_OVERVIEW_NOT_YET_CONFIRMED,
  PROVIDER_OVERVIEW_STILL_LEARNING,
} from "@/lib/surgical-sales/providerOverviewFieldBriefingVocabulary";

const CORPORATE_PHRASE_REPLACEMENTS: [RegExp, string][] = [
  [/procedure priorities are taking shape[^.!?]*/gi, "Procedure mix not confirmed"],
  [/priorities are taking shape[^.!?]*/gi, "Procedure mix not confirmed"],
  [/commercial influence/gi, "Influence path still learning"],
  [/strategic warning/gi, "Still learning"],
  [/visibility limited/gi, "Developing visibility"],
  [/high[- ]?risk/gi, "Needs validation in field"],
  [/deployment risk/gi, "Needs validation in field"],
  [/appear(s)? (likely|possible|favorable)/gi, "Not yet confirmed"],
  [/starting to map/gi, "Not yet confirmed"],
  [/are taking shape/gi, "not confirmed"],
  [/clarified/gi, "observed during discovery"],
  [/identified/gi, "noted in field"],
  [/partially confirmed/gi, "needs validation in field"],
];

const NEGATIVE_PHRASE_RE =
  /\b(risk|blocker|blocked|opaque|strategic warning|commercialization|do not deploy|invest field time|execution risk)\b/i;

export function shortenOverviewSignalLine(line: string, maxLen = 56): string {
  let text = sanitizeOperationalIntelCopy(line.trim());
  for (const [pattern, replacement] of CORPORATE_PHRASE_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  text = text
    .replace(/\bnot captured\b/gi, "not yet confirmed")
    .replace(/\bno field confirmation yet\b/gi, "no field confirmation yet")
    .replace(/\bunknown\b/gi, "not confirmed")
    .replace(/\bgap\b/gi, "open item")
    .replace(/\bblockers?\b/gi, "open items")
    .replace(/\s+/g, " ")
    .trim();

  text = sanitizeLegacyIntelligenceUserCopy(text);

  if (!text) return PROVIDER_OVERVIEW_STILL_LEARNING;
  if (NEGATIVE_PHRASE_RE.test(text)) return PROVIDER_OVERVIEW_NOT_YET_CONFIRMED;

  let scanned = scanLine(text, maxLen);
  if (scanned.length > maxLen + 4) {
    const cut = scanned.lastIndexOf(" ", maxLen - 3);
    scanned = cut > 20 ? `${scanned.slice(0, cut)}…` : scanned;
  }
  return scanned.replace(/[.!?]+\s*$/u, "").trim();
}
