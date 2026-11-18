import type { DebriefPrioritizedPattern } from "@/lib/surgical-sales/engagements/debriefIntelligencePrioritization";
import {
  isLowValuePositiveWorkflowSignal,
  isProductUsageSignal,
  selectPrimaryHypothesisPattern,
} from "@/lib/surgical-sales/engagements/debriefIntelligencePrioritization";
import {
  DEBRIEF_PREPARE_DESIRED_OUTCOMES,
  type DebriefPrepareDesiredOutcome,
} from "@/lib/surgical-sales/engagements/debriefPrepareWorkspace";

function trimLine(text: string): string {
  return String(text ?? "").trim();
}

function ensureSentence(text: string): string {
  const trimmed = trimLine(text);
  if (!trimmed) return "";
  if (/[.?!]$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
}

function parseObservedFact(fact: string): { label: string; count: number | null; total: number | null } {
  const trimmed = trimLine(fact);
  const match = trimmed.match(/^(.*)\s*\((\d+) of (\d+) observations?\)$/i);
  if (!match) {
    return { label: trimmed.replace(/[.]$/, ""), count: null, total: null };
  }
  return {
    label: match[1].trim(),
    count: Number(match[2]),
    total: Number(match[3]),
  };
}

function isInconsistentPattern(count: number, total: number): boolean {
  if (!Number.isFinite(count) || !Number.isFinite(total) || total <= 0) return false;
  return count < total && count <= Math.max(1, Math.floor(total / 2));
}

function isMajorityPattern(count: number, total: number): boolean {
  if (!Number.isFinite(count) || !Number.isFinite(total) || total <= 0) return false;
  return count >= total;
}

function extractProductFromUsageLabel(label: string): string | null {
  const match = label.match(/^(.+?) used consistently$/i);
  return match?.[1]?.trim() || null;
}

export function formatDebriefObservedFact(fact: string): string {
  const { label, count, total } = parseObservedFact(fact);
  if (!label) return "";

  if (isProductUsageSignal(label)) {
    const product = extractProductFromUsageLabel(label) ?? label.replace(/ used consistently$/i, "").trim();
    return `${product} was used across observed cases.`;
  }

  if (isLowValuePositiveWorkflowSignal(label)) {
    return ensureSentence(label);
  }

  if (count != null && total != null) {
    if (isMajorityPattern(count, total)) {
      return ensureSentence(label);
    }
    if (isInconsistentPattern(count, total)) {
      return ensureSentence(`${label} in some cases, but not consistently`);
    }
    return ensureSentence(`${label} in several observed cases`);
  }

  return ensureSentence(label);
}

export function resolveDebriefConversationRecommendedOutcome(input: {
  observationPatterns?: DebriefPrioritizedPattern[];
  desiredOutcome?: DebriefPrepareDesiredOutcome | null;
  primaryPattern?: DebriefPrioritizedPattern | null;
}): string {
  if (input.desiredOutcome === "other") {
    return "Follow Up / Low Opportunity";
  }

  if (input.desiredOutcome) {
    const match = DEBRIEF_PREPARE_DESIRED_OUTCOMES.find((row) => row.id === input.desiredOutcome);
    if (match) return match.label;
  }

  const patterns = input.observationPatterns ?? [];
  const primary = input.primaryPattern ?? selectPrimaryHypothesisPattern(patterns);

  if (!primary) {
    return "Follow Up / Low Opportunity";
  }

  if (isProductUsageSignal(primary.label) || isLowValuePositiveWorkflowSignal(primary.label)) {
    return "Follow Up / Low Opportunity";
  }

  return "Follow Up / Continue Discovery";
}
