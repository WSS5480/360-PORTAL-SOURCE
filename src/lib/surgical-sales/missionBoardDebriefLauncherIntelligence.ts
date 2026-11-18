/**
 * Mission Board debrief launcher — debrief-ready intelligence summary.
 * Reuses the debrief prepare observed-program pipeline; does not modify planner or extraction.
 */

import { buildDebriefCommercialSynthesis } from "@/lib/surgical-sales/engagements/buildDebriefCommercialSynthesis";
import {
  buildDebriefPrepareObservedProgramFacts,
  type DebriefPrepareObservedPattern,
  type DebriefPrepareObservationIntelligenceInput,
} from "@/lib/surgical-sales/engagements/buildDebriefPrepareObservedProgramFacts";
import { extractIncumbentProduct } from "@/lib/surgical-sales/engagements/debriefConversionCoaching";
import {
  buildValidatedMeetingObjective,
  ensurePlanningSentenceCase,
  validateRepFacingFact,
  validateRepFacingQuestion,
  type DebriefPrepareValidationContext,
} from "@/lib/surgical-sales/engagements/debriefPrepareIntelligenceValidation";
import type { ProviderDebriefPlan } from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";

export type MissionBoardDebriefLauncherIntelligenceSummary = {
  objective: string;
  whatWeKnow: string[];
  biggestUnknown: string | null;
  suggestedOpeningQuestion: string | null;
};

const LAUNCHER_MAX_FACTS = 5;

const PRODUCT_UNKNOWN_PATTERNS = [
  /which products? or trays?/i,
  /what products? (?:or trays? )?(?:were|was) (?:actually )?used/i,
  /confirm (?:the )?product(?:s)? (?:in use|used)/i,
  /competitive product/i,
];

const LAUNCHER_NOISE_PATTERNS = [
  /still needed:/i,
  /validate in field intelligence/i,
  /^source:/i,
  /\bsource:\s/i,
  /observation access|credentialing|scheduler identified|procedure focus:/i,
];

function providerLastName(providerName: string | null | undefined): string {
  const raw = String(providerName ?? "").trim();
  if (!raw) return "the surgeon";
  const withoutTitle = raw.replace(/^dr\.?\s+/i, "").trim();
  const parts = withoutTitle.split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? withoutTitle;
}

function providerDisplayName(providerName: string | null | undefined): string {
  const last = providerLastName(providerName);
  return last === "the surgeon" ? last : `Dr. ${last}`;
}

function formatCaseFrequency(count: number, total: number): string {
  if (count >= 2 && count === total) return `across ${count} cases`;
  if (count >= 2) return `across ${count} cases`;
  if (total >= 2) return "across multiple cases";
  return "during observation";
}

function formatLauncherWhatWeKnowLine(pattern: DebriefPrepareObservedPattern): string {
  const { label, count, total } = pattern;
  const frequency = formatCaseFrequency(count, total);

  if (/used consistently$/i.test(label)) {
    const product = label.replace(/\s+used consistently$/i, "").trim();
    return `${product} observed ${frequency}`;
  }

  if (/staff appeared organized/i.test(label)) {
    return "Staff workflow appeared organized";
  }

  if (/extra visualization time before fixation/i.test(label)) {
    return `Extra visualization time before fixation observed ${frequency}`;
  }

  if (/provider frustration/i.test(label)) {
    return `${label} observed ${frequency}`;
  }

  if (/workflow delay|slowed case progress/i.test(label)) {
    return `${label} observed ${frequency}`;
  }

  if (/product availability/i.test(label)) {
    return `${label} observed ${frequency}`;
  }

  return `${label} observed ${frequency}`;
}

function isLauncherNoiseLine(line: string): boolean {
  const normalized = line.trim();
  if (!normalized) return true;
  return LAUNCHER_NOISE_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isProductUsageKnown(
  patterns: DebriefPrepareObservedPattern[],
  plan: ProviderDebriefPlan,
): boolean {
  if (patterns.some((pattern) => /used consistently$/i.test(pattern.label))) return true;
  return plan.whatWeLearned.some(
    (item) =>
      item.category === "competitive_usage" &&
      !isLauncherNoiseLine(item.signal) &&
      !/needs confirmation/i.test(item.signal),
  );
}

function selectLauncherDisplayPatterns(
  patterns: DebriefPrepareObservedPattern[],
): DebriefPrepareObservedPattern[] {
  const sorted = [...patterns].sort(
    (a, b) => b.importance - a.importance || b.count - a.count || a.label.localeCompare(b.label),
  );
  const selected: DebriefPrepareObservedPattern[] = [];
  const usedKeys = new Set<string>();

  const add = (pattern: DebriefPrepareObservedPattern | undefined) => {
    if (!pattern) return;
    const key = pattern.label.toLowerCase();
    if (usedKeys.has(key)) return;
    usedKeys.add(key);
    selected.push(pattern);
  };

  const strongest = sorted.find(
    (pattern) =>
      !/staff appeared organized/i.test(pattern.label) && !/used consistently$/i.test(pattern.label),
  );
  add(strongest);
  add(sorted.find((pattern) => /used consistently$/i.test(pattern.label)));
  add(sorted.find((pattern) => /staff appeared organized/i.test(pattern.label)));

  const hasVisualizationFocus = selected.some((pattern) => /visualization|fixation/i.test(pattern.label));

  for (const pattern of sorted) {
    if (selected.length >= 3) break;
    const key = pattern.label.toLowerCase();
    if (usedKeys.has(key)) continue;
    if (/staff appeared organized|used consistently$/i.test(pattern.label)) continue;
    if (hasVisualizationFocus && /product availability verification/i.test(pattern.label)) continue;
    if (hasVisualizationFocus && /provider frustration/i.test(pattern.label)) continue;
    add(pattern);
  }

  return selected.slice(0, 4);
}

function buildStaffComplaintGapLine(patterns: DebriefPrepareObservedPattern[]): string | null {
  const hasOrganizedStaff = patterns.some((pattern) => /staff appeared organized/i.test(pattern.label));
  const hasStaffComplaint = patterns.some((pattern) =>
    /staff frustration|staff complaint/i.test(pattern.label),
  );
  if (hasOrganizedStaff && !hasStaffComplaint) {
    return "No staff complaints confirmed yet";
  }
  return null;
}

function dedupeLauncherLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const normalized = line.trim();
    if (!normalized || isLauncherNoiseLine(normalized)) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function filterLauncherUnknownQuestion(input: {
  question: string;
  productUsageKnown: boolean;
  strongestPattern: DebriefPrepareObservedPattern | null;
  ctx: DebriefPrepareValidationContext;
}): string | null {
  const question = String(input.question ?? "").trim();
  if (!question || isLauncherNoiseLine(question)) return null;

  if (input.productUsageKnown && PRODUCT_UNKNOWN_PATTERNS.some((pattern) => pattern.test(question))) {
    return null;
  }

  if (/product usage|trays were|products were actually used/i.test(question) && input.productUsageKnown) {
    return null;
  }

  const validated = validateRepFacingQuestion(question, input.ctx);
  if (!validated) return null;

  const strongest = input.strongestPattern?.label.toLowerCase() ?? "";
  if (/visualization|fixation/i.test(strongest) && /which products|what products|trays were/i.test(validated)) {
    return null;
  }

  return ensurePlanningSentenceCase(validated);
}

function buildLauncherObjective(input: {
  strongestPattern: DebriefPrepareObservedPattern | null;
  providerName: string | null;
  completedObservationCount: number;
}): string {
  const prepareObjective = sanitizeLauncherObjective(
    buildValidatedMeetingObjective({
      strongestPatternLabel: input.strongestPattern?.label ?? null,
      providerName: input.providerName,
      completedObservationCount: input.completedObservationCount,
    }),
  );

  const patternLabel = String(input.strongestPattern?.label ?? "")
    .replace(/\s*\(\d+ of \d+ observations?\)$/i, "")
    .trim()
    .toLowerCase();

  if (/extra visualization time before fixation|visualization before fixation/i.test(patternLabel)) {
    return "Validate whether extra visualization time before fixation is a meaningful workflow issue worth acting on.";
  }

  if (/provider frustration.*fixation|provider frustration during fixation/i.test(patternLabel)) {
    return "Validate whether frustration during fixation decisions reflects a meaningful workflow issue worth acting on.";
  }

  if (/workflow delay|slowed case progress/i.test(patternLabel)) {
    return "Validate whether the workflow delays you observed are meaningful enough to discuss a change.";
  }

  if (/product availability verification/i.test(patternLabel)) {
    return "Validate whether product availability delays are affecting case flow enough to warrant a conversation.";
  }

  if (prepareObjective && !/most important observation patterns/i.test(prepareObjective)) {
    return prepareObjective
      .replace(/^Confirm whether /i, "Validate whether ")
      .replace(/^Understand whether /i, "Validate whether ")
      .replace(/^Determine whether /i, "Validate whether ")
      .replace(/^Explore whether /i, "Validate whether ")
      .replace(/ — and what next step makes sense if they agree\.?$/i, " worth acting on.")
      .replace(/ — and whether they would consider a next step\.?$/i, " worth acting on.")
      .replace(/ — and what a reasonable first step would look like\.?$/i, " worth acting on.");
  }

  return "Validate the strongest observation pattern with the provider and agree on whether it is worth acting on.";
}

function sanitizeLauncherObjective(objective: string): string {
  const cleaned = String(objective ?? "").trim();
  if (!cleaned || isLauncherNoiseLine(cleaned)) {
    return "Validate the strongest observation pattern with the provider and agree on whether it is worth acting on.";
  }
  return cleaned;
}

function validateLauncherOpeningQuestion(
  question: string,
  _ctx: DebriefPrepareValidationContext,
): string | null {
  const sanitized = ensurePlanningSentenceCase(String(question ?? "").trim());
  if (!sanitized || isLauncherNoiseLine(sanitized)) return null;
  return sanitized;
}

function buildVisualizationOpeningQuestion(): string {
  return "During these cases, we noticed extra time spent getting visualization before fixation. Is that just routine, or does it create enough workflow friction that you'd want to improve it?";
}

function buildFrustrationOpeningQuestion(providerName: string | null): string {
  const provider = providerDisplayName(providerName);
  return `During these cases, we noticed frustration around fixation decisions. From your perspective, ${provider}, is that a manageable part of the case or something you'd want to improve?`;
}

function buildLauncherOpeningQuestion(input: {
  strongestPattern: DebriefPrepareObservedPattern | null;
  providerName: string | null;
  biggestUnknown: string | null;
  ctx: DebriefPrepareValidationContext;
}): string | null {
  const patternLabel = String(input.strongestPattern?.label ?? "").toLowerCase();

  if (/extra visualization time before fixation|visualization before fixation/i.test(patternLabel)) {
    return validateLauncherOpeningQuestion(buildVisualizationOpeningQuestion(), input.ctx);
  }

  if (/provider frustration/i.test(patternLabel) && /fixation|visualization/i.test(patternLabel)) {
    return validateLauncherOpeningQuestion(buildFrustrationOpeningQuestion(input.providerName), input.ctx);
  }

  if (/extra visualization time before fixation/i.test(String(input.biggestUnknown ?? "").toLowerCase())) {
    return validateLauncherOpeningQuestion(buildVisualizationOpeningQuestion(), input.ctx);
  }

  if (input.biggestUnknown) {
    const unknown = input.biggestUnknown.replace(/\?$/, "").trim();
    if (/visualization|fixation|workflow friction/i.test(unknown)) {
      return validateLauncherOpeningQuestion(buildVisualizationOpeningQuestion(), input.ctx);
    }
    const provider = providerDisplayName(input.providerName);
    const conversational = `We kept seeing a pattern around ${unknown.toLowerCase()}. From your perspective, ${provider}, is that routine or something you'd want to improve?`;
    return validateLauncherOpeningQuestion(conversational, input.ctx);
  }

  return validateLauncherOpeningQuestion(buildVisualizationOpeningQuestion(), input.ctx);
}

function buildVisualizationBiggestUnknown(providerName: string | null): string {
  const provider = providerDisplayName(providerName);
  return `Does ${provider} view the extra visualization time as a real workflow problem or just a manageable part of the case?`;
}

function buildLauncherBiggestUnknown(input: {
  learnPrompts: string[];
  plan: ProviderDebriefPlan;
  productUsageKnown: boolean;
  strongestPattern: DebriefPrepareObservedPattern | null;
  providerName: string | null;
  ctx: DebriefPrepareValidationContext;
}): string | null {
  const patternLabel = String(input.strongestPattern?.label ?? "").toLowerCase();

  if (/extra visualization time before fixation|visualization before fixation/i.test(patternLabel)) {
    return buildVisualizationBiggestUnknown(input.providerName);
  }

  if (/provider frustration/i.test(patternLabel) && /fixation|visualization/i.test(patternLabel)) {
    const provider = providerDisplayName(input.providerName);
    return `Does ${provider} see the frustration during fixation as a meaningful problem or just part of the workflow?`;
  }

  const candidates = [
    ...input.learnPrompts,
    ...input.plan.whatWeStillDontKnow.map((row) => row.question),
  ];

  for (const candidate of candidates) {
    const filtered = filterLauncherUnknownQuestion({
      question: candidate,
      productUsageKnown: input.productUsageKnown,
      strongestPattern: input.strongestPattern,
      ctx: input.ctx,
    });
    if (filtered) return filtered.endsWith("?") ? filtered : `${filtered}?`;
  }

  if (/visualization|fixation/i.test(patternLabel)) {
    return buildVisualizationBiggestUnknown(input.providerName);
  }

  const provider = providerDisplayName(input.providerName);
  return `Does ${provider} see the observed pattern as a meaningful problem worth addressing?`;
}

function buildLauncherWhatWeKnow(input: {
  patterns: DebriefPrepareObservedPattern[];
  ctx: DebriefPrepareValidationContext;
}): string[] {
  const selectedPatterns = selectLauncherDisplayPatterns(input.patterns);

  const lines: string[] = [];
  for (const pattern of selectedPatterns) {
    const line = formatLauncherWhatWeKnowLine(pattern);
    const validated = validateRepFacingFact(line, input.ctx);
    if (validated && !isLauncherNoiseLine(validated)) {
      lines.push(validated);
    }
  }

  const gapLine = buildStaffComplaintGapLine(input.patterns);
  if (gapLine) lines.push(gapLine);

  return dedupeLauncherLines(lines).slice(0, LAUNCHER_MAX_FACTS);
}

function buildGenericLauncherSummary(input: {
  completedObservationCount: number;
  providerName: string | null;
  ctx: DebriefPrepareValidationContext;
}): MissionBoardDebriefLauncherIntelligenceSummary {
  if (input.completedObservationCount <= 0) {
    return {
      objective:
        "Confirm observation access and case focus before planning the debrief conversation.",
      whatWeKnow: ["No validated observation findings yet — capture field notes before the debrief."],
      biggestUnknown: "Whether observation access and case focus are aligned before planning the conversation.",
      suggestedOpeningQuestion: validateRepFacingQuestion(
        "Before we debrief, is there anything from the cases we observed that you already see as worth discussing?",
        input.ctx,
      ),
    };
  }

  return {
    objective: "Validate the most important observation patterns with the provider and agree on next steps.",
    whatWeKnow: ["Observation notes exist — open Prepare Full Briefing for the complete validated list."],
    biggestUnknown: `Does ${providerDisplayName(input.providerName)} see the observed pattern as a meaningful problem?`,
    suggestedOpeningQuestion: validateRepFacingQuestion(
      "From your perspective, what stood out most from the cases we observed?",
      input.ctx,
    ),
  };
}

export function summarizeMissionBoardDebriefLauncherIntelligence(input: {
  plan: ProviderDebriefPlan;
  providerName: string | null;
  completedObservationCount: number;
  observationIntelligence?: DebriefPrepareObservationIntelligenceInput | null;
}): MissionBoardDebriefLauncherIntelligenceSummary {
  const ctx: DebriefPrepareValidationContext = {
    providerName: input.providerName,
    completedObservationCount: input.completedObservationCount,
  };

  if (!input.observationIntelligence?.caseRow || input.completedObservationCount <= 0) {
    if (input.plan.hasSufficientInputs && input.plan.whatWeLearned.length > 0) {
      // Fall back to longitudinal patterns when observation bundle is unavailable.
      const synthesis = buildDebriefCommercialSynthesis({
        plan: input.plan,
        providerName: input.providerName,
        organizationName: null,
        completedObservationCount: input.completedObservationCount,
        pathwayStageLabel: "Debrief",
        observationNotes: [],
        productKnowledge: [],
      });
      const incumbentProduct = extractIncumbentProduct({
        competitorSummaries: input.plan.longitudinalIntelligence.competitiveProductsSeen.map(
          (row) => row.signal,
        ),
        learnedBullets: input.plan.whatWeLearned.map((row) => row.signal),
        providerName: input.providerName,
      });
      const observed = buildDebriefPrepareObservedProgramFacts({
        plan: input.plan,
        commercialSynthesis: synthesis,
        completedObservationCount: input.completedObservationCount,
        providerName: input.providerName,
        incumbentProduct,
        ctx,
      });
      if (observed.patterns.length > 0) {
        return finalizeLauncherSummary({
          observed,
          plan: input.plan,
          providerName: input.providerName,
          completedObservationCount: input.completedObservationCount,
          ctx,
        });
      }
    }
    return buildGenericLauncherSummary({
      completedObservationCount: input.completedObservationCount,
      providerName: input.providerName,
      ctx,
    });
  }

  const synthesis = buildDebriefCommercialSynthesis({
    plan: input.plan,
    providerName: input.providerName,
    organizationName: null,
    completedObservationCount: input.completedObservationCount,
    pathwayStageLabel: "Debrief",
    observationNotes: [],
    productKnowledge: [],
  });

  const incumbentProduct = extractIncumbentProduct({
    competitorSummaries: input.plan.longitudinalIntelligence.competitiveProductsSeen.map(
      (row) => row.signal,
    ),
    learnedBullets: input.plan.whatWeLearned.map((row) => row.signal),
    providerName: input.providerName,
  });

  const observed = buildDebriefPrepareObservedProgramFacts({
    observationIntelligence: input.observationIntelligence,
    plan: input.plan,
    commercialSynthesis: synthesis,
    completedObservationCount: input.completedObservationCount,
    providerName: input.providerName,
    incumbentProduct,
    ctx,
  });

  if (observed.patterns.length === 0) {
    return buildGenericLauncherSummary({
      completedObservationCount: input.completedObservationCount,
      providerName: input.providerName,
      ctx,
    });
  }

  return finalizeLauncherSummary({
    observed,
    plan: input.plan,
    providerName: input.providerName,
    completedObservationCount: input.completedObservationCount,
    ctx,
  });
}

function finalizeLauncherSummary(input: {
  observed: ReturnType<typeof buildDebriefPrepareObservedProgramFacts>;
  plan: ProviderDebriefPlan;
  providerName: string | null;
  completedObservationCount: number;
  ctx: DebriefPrepareValidationContext;
}): MissionBoardDebriefLauncherIntelligenceSummary {
  const productUsageKnown = isProductUsageKnown(input.observed.patterns, input.plan);
  const strongestPattern = input.observed.strongestPattern;
  const whatWeKnow = buildLauncherWhatWeKnow({
    patterns: input.observed.patterns,
    ctx: input.ctx,
  });
  const objective = buildLauncherObjective({
    strongestPattern,
    providerName: input.providerName,
    completedObservationCount: input.completedObservationCount,
  });
  const biggestUnknown = buildLauncherBiggestUnknown({
    learnPrompts: input.observed.learnPrompts,
    plan: input.plan,
    productUsageKnown,
    strongestPattern,
    providerName: input.providerName,
    ctx: input.ctx,
  });
  const suggestedOpeningQuestion = buildLauncherOpeningQuestion({
    strongestPattern,
    providerName: input.providerName,
    biggestUnknown,
    ctx: input.ctx,
  });

  return {
    objective,
    whatWeKnow,
    biggestUnknown,
    suggestedOpeningQuestion,
  };
}
