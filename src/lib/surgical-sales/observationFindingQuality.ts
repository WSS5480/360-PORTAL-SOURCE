import { isGenericObservationIntelligenceLabel } from "@/lib/surgical-sales/observationCaseIntelligenceDedup";
import {
  qualifiesCompetitorContent,
  qualifiesPainPointContent,
  qualifiesProductSignalContent,
  qualifiesWorkflowFrictionContent,
} from "@/lib/surgical-sales/leaderboardIntelligenceQuality";

const CONVERSATIONAL_FILLER_PATTERNS: RegExp[] = [
  /^(?:yeah|yep|yup|ok|okay|um+|uh+|well|so|hey|hi|hello)\b/i,
  /^first case\b/i,
  /\boverall went pretty well\b/i,
  /\boverall went well\b/i,
  /\bwent pretty well\b/i,
  /\bhad a quick conversation\b/i,
  /\bquick conversation afterward\b/i,
  /\bconversation afterward\b/i,
  /\bthis morning\b/i,
  /\bgood day\b/i,
  /\bno (?:real )?issues?\b/i,
  /\beverything (?:was )?fine\b/i,
  /\bteam seemed fine\b/i,
  /\bnothing major\b/i,
  /\bwrap(?:ping)? up\b/i,
  /\bpretty (?:good|well)\b/i,
  /\btoday went\b/i,
  /\bcase went well\b/i,
  /\bnice case\b/i,
  /\bglad (?:we|i)\b/i,
  /\bthanks for\b/i,
];

const INTELLIGENCE_SIGNAL_PATTERN =
  /\b(competitor|mesh|tray|rival|vendor|using|visuali[sz]\w*|fixation|pain|difficult|turnover|delay|setup|bottleneck|friction|staff|nurse|tech|surgeon|provider|doctor|frustrat\w*|opened?|opening|product|acsis|trial|fit|evaluat|scheduling|hernia|robotic|follow[- ]?up|peel[- ]?pack|rep|instrument|implant|workaround|inefficien|extra time|trouble getting|organized|comfortable|better view|complain\w*|hard to see|equipment|angle|exposure|reposition|waiting|ready|slowed|everyone|supplies|noticed)\b/i;

const NARRATIVE_PRONOUN_PATTERN = /\b(they(?:'re|re|ve)?|we(?:'re|re|ve)?|i(?:'m|ve)?|our|their|today|overall|yeah|pretty|went)\b/i;

const STRUCTURED_FINDING_PATTERN =
  /\b(observed|identified|present|delay|challenges?|inconsisten|interest|evaluation|frustration|bottleneck|difficulty)\b/i;

/** Dictation filler — never intelligence. */
export function isConversationalFillerText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (trimmed.length < 8 && !/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/.test(trimmed)) return true;
  const lower = trimmed.toLowerCase();
  if (CONVERSATIONAL_FILLER_PATTERNS.some((pattern) => pattern.test(lower))) return true;
  if (
    trimmed.length < 48 &&
    !INTELLIGENCE_SIGNAL_PATTERN.test(trimmed) &&
    NARRATIVE_PRONOUN_PATTERN.test(trimmed)
  ) {
    return true;
  }
  return false;
}

/** Fragment must mention a signal before extractors run. */
export function fragmentHasIntelligenceSignal(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || isConversationalFillerText(trimmed)) return false;
  return INTELLIGENCE_SIGNAL_PATTERN.test(trimmed);
}

function qualifiesStaffPainContent(content: string): boolean {
  const normalized = content.trim();
  if (!normalized || normalized.length < 12) return false;
  if (isGenericObservationIntelligenceLabel(normalized)) return false;
  return /\b(staff|nurse|tech|setup|opening|opened|delay|availability|frustrat|product)\b/i.test(
    normalized,
  );
}

/** Concise finding suitable for storage and display — not transcript. */
export function isActionableIntelligenceFinding(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 3) return false;
  if (isConversationalFillerText(trimmed)) return false;
  if (isGenericObservationIntelligenceLabel(trimmed)) return false;

  const lower = trimmed.toLowerCase();
  if (lower === "yes" || lower === "no" || lower === "unknown") return false;

  if (trimmed.length <= 72 && STRUCTURED_FINDING_PATTERN.test(trimmed)) return true;
  if (/^[A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2}$/.test(trimmed) && trimmed.length <= 40) {
    return true;
  }
  if (trimmed.length <= 48 && !NARRATIVE_PRONOUN_PATTERN.test(trimmed)) return true;

  if (
    qualifiesPainPointContent(trimmed) ||
    qualifiesWorkflowFrictionContent(trimmed) ||
    qualifiesCompetitorContent(trimmed) ||
    qualifiesProductSignalContent(trimmed) ||
    qualifiesStaffPainContent(trimmed)
  ) {
    return true;
  }

  if (trimmed.length > 72 && NARRATIVE_PRONOUN_PATTERN.test(trimmed)) return false;

  return trimmed.length <= 64 && !/\.\.\./.test(trimmed);
}

export function isTranscriptChunkText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (isConversationalFillerText(trimmed)) return true;
  if (trimmed.length > 80 && NARRATIVE_PRONOUN_PATTERN.test(trimmed)) return true;
  if (/\b(they're|theyre|we're|weve|i'm|i've|pretty heavily|in the room)\b/i.test(trimmed) && trimmed.length > 40) {
    return true;
  }
  return !isActionableIntelligenceFinding(trimmed) && trimmed.length > 64;
}
