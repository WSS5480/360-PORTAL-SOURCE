/**
 * Reuses OIE evidence/negation patterns for universal shadow extraction.
 * Pure functions — no IO.
 */

import {
  isNegativeEvidenceStatement,
} from "@/lib/surgical-sales/observationEvidenceClassification";
import { fragmentHasUncertaintyLanguage } from "@/lib/surgical-sales/universalExtractor/evidenceUncertaintySeparation";

const PROBLEM_NOUN_ALTERNATION =
  "(?:issues?|problems?|delays?|barriers?|friction|interruptions?|complaints?|concerns?|frustrations?|workarounds?|hiccups?|pain)";

const NEGATED_NOUN_PHRASE = String.raw`\s+(?:any\s+)?(?:[a-z][\w-]*\s+){0,2}${PROBLEM_NOUN_ALTERNATION}\b`;

const ABSENCE_STATEMENT_PATTERN = new RegExp(
  String.raw`\b(?:no|without(?:\s+any)?|zero|free\s+of|very\s+few|hardly\s+any|barely\s+any)${NEGATED_NOUN_PHRASE}`,
  "i",
);

const POSITIVE_VISUALIZATION_PATTERN =
  /\bvisuali[sz](?:ation)?\s+was\s+(?:good|fine|clear|adequate|excellent)\b/i;

const POSITIVE_WORKFLOW_PATTERN =
  /\b(?:moved|went|proceeded)\s+(?:smoothly|well|fine)\b/i;

/** Case-went-smoothly language — not "comfortable … for routine cases" (incumbent preference). */
const ROUTINE_CASE_PATTERN =
  /\b(?:uneventful|no\s+(?:real\s+)?issues?|nothing\s+major|overall\s+(?:went\s+)?(?:well|fine|good)|(?:case|procedure)\s+(?:was\s+|went\s+)?(?:pretty\s+|fairly\s+)?routine|routine\s+(?:and\s+)?uneventful)\b/i;

const INCUMBENT_ROUTINE_PREFERENCE_PATTERN =
  /\b(?:comfortable|familiar|happy|knows?\s+exactly)\b[^.!?]{0,100}\b(?:for\s+)?routine\s+cases?\b/i;

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

export function evidenceAppearsInNote(evidence: string, note: string): boolean {
  const normalizedEvidence = normalizeWhitespace(evidence);
  const normalizedNote = normalizeWhitespace(note);
  if (!normalizedEvidence || !normalizedEvidence) return false;
  return normalizedNote.includes(normalizedEvidence);
}

export function fragmentIsNegatedAbsence(evidence: string): boolean {
  if (isNegativeEvidenceStatement(evidence)) return true;
  return ABSENCE_STATEMENT_PATTERN.test(evidence);
}

export function fragmentIsUncertain(evidence: string): boolean {
  return fragmentHasUncertaintyLanguage(evidence);
}

export function fragmentIsPositiveRoutine(evidence: string): boolean {
  const lower = evidence.trim().toLowerCase();
  // Product comfort on routine cases is incumbent preference, not "smooth case" intelligence.
  if (INCUMBENT_ROUTINE_PREFERENCE_PATTERN.test(lower)) return false;
  if (POSITIVE_VISUALIZATION_PATTERN.test(lower) && POSITIVE_WORKFLOW_PATTERN.test(lower)) {
    return true;
  }
  if (ROUTINE_CASE_PATTERN.test(lower)) return true;
  if (POSITIVE_VISUALIZATION_PATTERN.test(lower) && /\bsmoothly\b/i.test(lower)) return true;
  if (POSITIVE_WORKFLOW_PATTERN.test(lower)) return true;
  if (POSITIVE_VISUALIZATION_PATTERN.test(lower)) return true;
  return false;
}

export function fragmentExpressesVisualizationPain(evidence: string): boolean {
  if (POSITIVE_VISUALIZATION_PATTERN.test(evidence)) return false;
  if (fragmentIsNegatedAbsence(evidence)) return false;
  return (
    /\b(?:extra\s+time|spent|took|taking)\b[^.]{0,80}\b(?:visuali[sz](?:ation)?|view|exposure|angle)\b/i.test(
      evidence,
    ) ||
    /\bvisuali[sz](?:ation)?\s+was\s+(?:difficult|challenging|poor|hard)\b/i.test(evidence) ||
    /\bvisuali[sz](?:ation)?\s+can\s+be\s+(?:difficult|challenging|poor|hard)\b/i.test(evidence) ||
    /\b(?:hard|difficult)\s+to\s+(?:see|visuali[sz](?:e|ing)?)\b/i.test(evidence) ||
    /\b(?:getting|obtaining)\s+(?:a\s+)?(?:better\s+)?(?:view|visuali[sz](?:ation)?|exposure)\b/i.test(
      evidence,
    ) ||
    /\b(?:trouble|difficult(?:y|ies)|hard\s+time)\b[^.]{0,40}\bvisuali[sz](?:ation)?\b/i.test(evidence) ||
    /\baccess\s+(?:was\s+)?(?:difficult|challenging|hard)\b[^.]{0,80}\b(?:tight|tighter|deep|deeper|anatomy)\b/i.test(
      evidence,
    ) ||
    /\baccess\b[^.]{0,80}\b(?:tight|tighter|deep|deeper|anatomy)\b[^.]{0,80}\b(?:difficult|challenging|hard)\b/i.test(
      evidence,
    ) ||
    /\b(?:assistant|surgeon|staff)\b[^.]{0,80}\breposition(?:ed|ing)?\b/i.test(evidence) ||
    /\b(?:team|room|case)\b[^.]{0,80}\b(?:loses?|lost|spent|takes?|took)\s+time\b[^.]{0,80}\breposition/i.test(
      evidence,
    ) ||
    /\b(?:pooled\s+fluid|fluid)\b[^.]{0,80}\b(?:difficult|challenging|hard)\b[^.]{0,80}\b(?:reach|access|clear|remove|evacuate)\b/i.test(
      evidence,
    ) ||
    /\b(?:difficult|challenging|hard)\b[^.]{0,80}\b(?:reach|access|clear|remove|evacuate)\b[^.]{0,80}\b(?:pooled\s+fluid|fluid)\b/i.test(
      evidence,
    ) ||
    (/\bvisuali[sz](?:ation)?\b/i.test(evidence) &&
      /\b(?:recurring|confirmed|issue|concern|difficult|trouble)\b/i.test(evidence))
  );
}

export function fragmentExpressesSizingIssue(evidence: string): boolean {
  if (fragmentIsNegatedAbsence(evidence)) return false;
  return (
    /\b(?:implant\s+)?siz(?:e|ing)\b/i.test(evidence) ||
    /\b(?:right|correct|proper)\s+implant\s+size\b/i.test(evidence) ||
    /\b(?:trouble|issues?|difficult(?:y|ies)|problem|hard\s+time)\b[^.]{0,40}\b(?:implant\s+)?siz/i.test(
      evidence,
    ) ||
    /\b(?:handling|positioning|manipulation)\b[^.]{0,80}\b(?:larger|bigger)\s+(?:defects?|ventral hernias?)\b/i.test(
      evidence,
    ) ||
    /\b(?:larger|bigger)\s+(?:defects?|ventral hernias?)\b[^.]{0,140}\b(?:conform|contour|flexib|handling|positioning|manipulation|slows?|take\s+longer|takes\s+longer|annoyance)\b/i.test(
      evidence,
    ) ||
    /\bconfirming\s+implant\s+siz/i.test(evidence)
  );
}

export function scoreConfidence(
  evidence: string,
  uncertain: boolean,
  explicit: boolean,
): "high" | "medium" | "low" {
  if (uncertain) return "low";
  if (explicit) return "high";
  if (/\b(?:maybe|might|seemed|appeared)\b/i.test(evidence)) return "medium";
  return "high";
}
