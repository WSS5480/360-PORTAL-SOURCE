/**
 * Validation gate for debrief prepare intelligence — blocks ontology junk,
 * placeholder labels, and provider-name collisions from rep-facing output.
 */

import type { ProviderDebriefPlanLearningCategory } from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";
import {
  containsInternalCategoryLabel,
  translateDebriefClinicalTopic,
} from "@/lib/surgical-sales/engagements/debriefClinicalTopicTranslation";
import {
  debriefCopyContainsBannedPattern,
  humanizeDebriefTopic,
  sanitizeDebriefQuestion,
  sanitizeDebriefRepFacingCopy,
} from "@/lib/surgical-sales/engagements/debriefRepFacingCopy";
import { cleanProductDisplayName } from "@/lib/surgical-sales/findingDisplayLabels";
import {
  isOntologyDisplayLabel,
  isOntologyProductLabel,
} from "@/lib/surgical-sales/observationIntelligenceDisplayLabels";
import { isValidProductName } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefProductIntelligenceExtraction";

export const APPROVED_DEBRIEF_OBSERVATION_CATEGORIES = new Set<ProviderDebriefPlanLearningCategory>([
  "clinical_pain_point",
  "workflow_friction",
  "competitive_usage",
  "product_signal",
  "staff_observation",
  "procedure_insight",
]);

const PLACEHOLDER_CONCEPT_PATTERNS: RegExp[] = [
  /\bapple product used surgery\b/i,
  /\bproduct used surgery\b/i,
  /\bcurrent product used\b/i,
  /\bcompetitor product observed\b/i,
  /\bproduct observed\b/i,
  /\bproduct in use\b/i,
  /\bobserved pattern\b/i,
  /\bunknown concept\b/i,
  /\bplaceholder\b/i,
  /\bvisualization challenge fixation\b/i,
  /\b[a-z]+ product used [a-z]+\b/i,
];

const GENERIC_WEDGE_FALLBACK =
  "recurring workflow friction across observed cases";

export const GENERIC_MEETING_OBJECTIVE =
  "Determine whether the strongest pattern observed during the observation program is important enough to justify a next step.";

const MEETING_OBJECTIVE_LEAK_PATTERNS: RegExp[] = [
  /\b(provider|staff|workflow|product|clinical|competitor)\s+observed\b/i,
  /\b[a-z]+ product used [a-z]+\b/i,
  /\bapple product used surgery\b/i,
  /\bproduct used surgery\b/i,
  /\bobservation category\b/i,
  /\bplaceholder\b/i,
  /^[a-z0-9]+(?:[-_][a-z0-9_-]+)+$/i,
];

const APPROVED_DEBRIEF_OBSERVATION_PATTERNS: RegExp[] = [
  /^staff appeared organized$/i,
  /^staff appeared comfortable with current process$/i,
  /^staff workflow appeared organized$/i,
  /^staff workflow appeared /i,
  /^extra visualization time before fixation$/i,
  /^extra time establishing visualization before fixation$/i,
  /^provider frustration during /i,
  /^workflow delays slowed case progress$/i,
  /^product availability verification caused delays$/i,
  / used consistently$/i,
  / used consistently across observed cases$/i,
];

function stripObservationFrequencySuffix(text: string): string {
  return text.replace(/\s*\(\d+ of \d+ observations?\)$/i, "").trim();
}

function isApprovedDebriefObservationPattern(text: string): boolean {
  const core = stripObservationFrequencySuffix(text);
  return APPROVED_DEBRIEF_OBSERVATION_PATTERNS.some((pattern) => pattern.test(core));
}

export type DebriefPrepareValidationContext = {
  providerName?: string | null;
  completedObservationCount?: number;
};

function normalizeForCompare(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function providerNameTokens(providerName: string | null | undefined): string[] {
  const name = String(providerName ?? "").trim();
  if (!name) return [];
  return name
    .replace(/^dr\.?\s+/i, "")
    .split(/\s+/)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 2);
}

function productCollidesWithProviderName(productName: string, providerName?: string | null): boolean {
  const productLower = normalizeForCompare(productName);
  const tokens = providerNameTokens(providerName);
  if (tokens.length === 0) return false;

  for (const token of tokens) {
    if (productLower === token) return true;
    if (productLower.startsWith(`${token} product`)) return true;
    if (new RegExp(`\\b${token}\\b`, "i").test(productName) && isOntologyProductLabel(productName)) {
      return true;
    }
  }
  return false;
}

export function isMalformedObservationConcept(
  text: string,
  ctx: DebriefPrepareValidationContext = {},
): boolean {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return true;

  if (isApprovedDebriefObservationPattern(trimmed)) return false;

  if (debriefCopyContainsBannedPattern(trimmed)) return true;
  if (containsInternalCategoryLabel(trimmed)) return true;
  if (isOntologyDisplayLabel(trimmed)) return true;
  if (PLACEHOLDER_CONCEPT_PATTERNS.some((pattern) => pattern.test(trimmed))) return true;

  const withoutObserved = trimmed.replace(/\s+observed$/i, "").trim();
  if (isOntologyProductLabel(withoutObserved)) return true;
  if (isOntologyProductLabel(trimmed)) return true;

  const cleanedProduct = cleanProductDisplayName(withoutObserved);
  if (cleanedProduct && isOntologyProductLabel(cleanedProduct)) return true;
  if (cleanedProduct && productCollidesWithProviderName(cleanedProduct, ctx.providerName)) {
    return true;
  }

  return false;
}

export function validateRepFacingWedgeTopic(
  raw: string | null | undefined,
  ctx: DebriefPrepareValidationContext = {},
): string | null {
  const candidate = String(raw ?? "").trim();
  if (!candidate) return null;

  const humanized = humanizeDebriefTopic(candidate);
  if (!humanized || isMalformedObservationConcept(humanized, ctx)) {
    const translated = translateDebriefClinicalTopic(candidate, "workflow_friction");
    if (translated && !isMalformedObservationConcept(translated, ctx)) {
      return translated;
    }
    return null;
  }

  return humanized;
}

export function validateRepFacingProductName(
  raw: string | null | undefined,
  ctx: DebriefPrepareValidationContext = {},
): string | null {
  const candidate = cleanProductDisplayName(String(raw ?? "").trim());
  if (!candidate) return null;
  if (!isValidProductName(candidate)) return null;
  if (isOntologyProductLabel(candidate)) return null;
  if (isMalformedObservationConcept(candidate, ctx)) return null;
  if (productCollidesWithProviderName(candidate, ctx.providerName)) return null;
  return candidate;
}

export function validateRepFacingFact(
  fact: string,
  ctx: DebriefPrepareValidationContext = {},
): string | null {
  const sanitized = ensurePlanningSentenceCase(sanitizeDebriefRepFacingCopy(fact));
  if (!sanitized || isMalformedObservationConcept(sanitized, ctx)) return null;
  if (/ observed$/i.test(sanitized) && isMalformedObservationConcept(sanitized.replace(/\s+observed$/i, ""), ctx)) {
    return null;
  }
  return sanitized;
}

export function validateRepFacingQuestion(
  question: string,
  ctx: DebriefPrepareValidationContext = {},
): string | null {
  const sanitized = ensurePlanningSentenceCase(sanitizeDebriefQuestion(question));
  if (!sanitized || isMalformedObservationConcept(sanitized, ctx)) return null;
  if (debriefCopyContainsBannedPattern(sanitized)) return null;
  return sanitized;
}

/** Ensures rep-facing planning copy starts with a capital letter. */
export function ensurePlanningSentenceCase(text: string): string {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function meetingObjectiveContainsLeakedInternalCopy(text: string): boolean {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return true;
  if (MEETING_OBJECTIVE_LEAK_PATTERNS.some((pattern) => pattern.test(trimmed))) return true;
  if (isMalformedObservationConcept(trimmed)) return true;
  if (debriefCopyContainsBannedPattern(trimmed)) return true;
  if (containsInternalCategoryLabel(trimmed)) return true;
  return false;
}

export function sanitizeMeetingObjectiveForDisplay(
  raw: string | null | undefined,
  fallback: string = GENERIC_MEETING_OBJECTIVE,
): string {
  const candidate = String(raw ?? "").trim();
  if (!candidate || meetingObjectiveContainsLeakedInternalCopy(candidate)) {
    return fallback;
  }
  return ensurePlanningSentenceCase(candidate);
}

export function buildValidatedMeetingObjective(input: {
  strongestPatternLabel?: string | null;
  wedgeTopic?: string | null;
  providerName?: string | null;
  completedObservationCount?: number;
}): string {
  const ctx: DebriefPrepareValidationContext = {
    providerName: input.providerName,
    completedObservationCount: input.completedObservationCount,
  };

  const patternLabel = String(input.strongestPatternLabel ?? "")
    .replace(/\s*\(\d+ of \d+ observations?\)$/i, "")
    .trim();
  if (
    patternLabel &&
    !isMalformedObservationConcept(patternLabel, ctx) &&
    !/^[a-z0-9]+(?:[-_][a-z0-9_-]+)+$/i.test(patternLabel)
  ) {
    const normalized = patternLabel.toLowerCase();

    if (/extra visualization time before fixation|extra time establishing visualization before fixation|visualization before fixation|visualization time before fixation/i.test(normalized)) {
      return ensurePlanningSentenceCase(
        "Confirm whether the extra visualization time before fixation matters enough to act on — and what next step makes sense if they agree.",
      );
    }

    if (/provider frustration.*visualization|provider frustration.*fixation|provider frustration during fixation/i.test(normalized)) {
      return ensurePlanningSentenceCase(
        "Understand whether the frustration during fixation decisions is worth addressing — and whether they would consider a next step.",
      );
    }

    if (/workflow delay|slowed case progress/i.test(normalized)) {
      return ensurePlanningSentenceCase(
        "Determine whether the workflow delays you observed are frustrating enough to discuss a change — and what a reasonable first step would look like.",
      );
    }

    if (/product availability verification/i.test(normalized)) {
      return ensurePlanningSentenceCase(
        "Explore whether product availability delays are affecting case flow enough to warrant a conversation about change.",
      );
    }
  }

  const wedge = validateRepFacingWedgeTopic(input.wedgeTopic, ctx);
  if (!wedge || meetingObjectiveContainsLeakedInternalCopy(wedge)) {
    return GENERIC_MEETING_OBJECTIVE;
  }

  if (/visualization|fixation/.test(wedge)) {
    return ensurePlanningSentenceCase(
      "Confirm whether the extra visualization time before fixation matters enough to act on — and what next step makes sense if they agree.",
    );
  }

  if (/frustration/.test(wedge)) {
    return ensurePlanningSentenceCase(
      "Understand whether the frustration you observed during cases is worth addressing — and whether they would consider a next step.",
    );
  }

  return GENERIC_MEETING_OBJECTIVE;
}

export function formatWorkflowPatternFact(wedgeTopic: string | null): string | null {
  const wedge = validateRepFacingWedgeTopic(wedgeTopic);
  if (!wedge) return null;

  if (/visualization|fixation/.test(wedge)) {
    return "Extra visualization time before fixation observed across cases";
  }

  if (/frustration/.test(wedge)) {
    return "Clinical frustration during key workflow moments observed";
  }

  const firstChar = wedge.charAt(0).toUpperCase() + wedge.slice(1);
  return `${firstChar} observed across cases`;
}

export function selectHighestConfidenceWedgeTopic(input: {
  workflowPainEvidence: string | null;
  workflowPainReasoning: string | null;
  workflowPainScore: number;
  learnedBullets: string[];
  providerName?: string | null;
}): string {
  const ctx: DebriefPrepareValidationContext = { providerName: input.providerName };
  const minScore = 40;

  const candidates: string[] = [];
  if (input.workflowPainScore >= minScore && input.workflowPainEvidence?.trim()) {
    candidates.push(input.workflowPainEvidence.trim());
  }
  if (input.workflowPainScore >= minScore && input.workflowPainReasoning?.trim()) {
    candidates.push(input.workflowPainReasoning.trim());
  }
  for (const bullet of input.learnedBullets) {
    if (/visualization|fixation|frustration|bard mesh|workflow/i.test(bullet)) {
      candidates.push(bullet.trim());
    }
  }

  for (const candidate of candidates) {
    const validated = validateRepFacingWedgeTopic(candidate, ctx);
    if (validated) return validated;
  }

  if (/visualization|fixation|frustration/.test(input.learnedBullets.join(" "))) {
    const fromNotes = validateRepFacingWedgeTopic(
      "extra time spent establishing visualization before fixation",
      ctx,
    );
    if (fromNotes) return fromNotes;
  }

  return GENERIC_WEDGE_FALLBACK;
}

export function sanitizePlanningStringList(
  items: string[],
  ctx: DebriefPrepareValidationContext = {},
  validate: (item: string, ctx: DebriefPrepareValidationContext) => string | null,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const validated = validate(item, ctx);
    if (!validated) continue;
    const key = normalizeForCompare(validated);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(validated);
  }
  return out;
}

export function planningContentContainsBannedPattern(content: {
  meetingObjective?: string;
  knownFacts?: string[];
  whyItMatters?: string;
  suggestedLearnItems?: string[];
  suggestedQuestions?: string[];
}): boolean {
  const blob = JSON.stringify(content);
  return (
    debriefCopyContainsBannedPattern(blob) ||
    (content.meetingObjective ? meetingObjectiveContainsLeakedInternalCopy(content.meetingObjective) : false)
  );
}
