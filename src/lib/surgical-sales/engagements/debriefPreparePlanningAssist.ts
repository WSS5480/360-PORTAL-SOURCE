/**
 * On-demand planning assists — hypothesis, validation goals, questions, commercial signal.
 */

import type { DebriefPrepareObservedPattern } from "@/lib/surgical-sales/engagements/buildDebriefPrepareObservedProgramFacts";
import type { DebriefPrepareWorkspaceDraft } from "@/lib/surgical-sales/engagements/debriefPrepareWorkspace";
import {
  buildCommercialSignalFromPrimaryPattern,
  buildHypothesisAlignedLearnPrompts,
  buildHypothesisAlignedQuestions,
  buildHypothesisFromPrimaryPattern,
  isLowValuePositiveWorkflowSignal,
  selectPrimaryHypothesisPattern,
} from "@/lib/surgical-sales/engagements/debriefIntelligencePrioritization";
import {
  ensurePlanningSentenceCase,
  meetingObjectiveContainsLeakedInternalCopy,
  validateRepFacingFact,
  validateRepFacingQuestion,
  type DebriefPrepareValidationContext,
} from "@/lib/surgical-sales/engagements/debriefPrepareIntelligenceValidation";

export type DebriefPreparePlanningContext = {
  draft: DebriefPrepareWorkspaceDraft;
  patterns?: DebriefPrepareObservedPattern[];
  providerName?: string | null;
  procedureLabel?: string | null;
  wedgeTopic?: string | null;
  incumbentProduct?: string | null;
};

function validationCtx(input: DebriefPreparePlanningContext): DebriefPrepareValidationContext {
  return { providerName: input.providerName };
}

function providerDisplayName(providerName?: string | null): string {
  const raw = String(providerName ?? "").trim();
  if (!raw) return "the surgeon";
  const withoutTitle = raw.replace(/^dr\.?\s+/i, "").trim();
  const parts = withoutTitle.split(/\s+/).filter(Boolean);
  const lastName = parts[parts.length - 1] ?? withoutTitle;
  return `Dr. ${lastName}`;
}

function resolvePatterns(input: DebriefPreparePlanningContext): DebriefPrepareObservedPattern[] {
  if (input.patterns?.length) return input.patterns;
  return input.draft.knownFacts.map((fact) => {
    const match = fact.match(/^(.*)\s*\((\d+) of (\d+) observations?\)$/i);
    if (!match) {
      return { label: fact.trim(), count: 1, total: 1, importance: 0 };
    }
    return {
      label: match[1].trim(),
      count: Number(match[2]),
      total: Number(match[3]),
      importance: 0,
    };
  });
}

function resolvePrimaryPattern(input: DebriefPreparePlanningContext) {
  return selectPrimaryHypothesisPattern(resolvePatterns(input));
}

export function buildCommercialSignalDraft(input: DebriefPreparePlanningContext): string {
  const patterns = resolvePatterns(input);
  const primary = selectPrimaryHypothesisPattern(patterns);
  return buildCommercialSignalFromPrimaryPattern({
    pattern: primary,
    supportingPatterns: patterns,
  });
}

export function buildHypothesisDraft(input: DebriefPreparePlanningContext): string {
  const primary = resolvePrimaryPattern(input);
  const hypothesis = buildHypothesisFromPrimaryPattern({
    pattern: primary,
    providerDisplayName: providerDisplayName(input.providerName),
    procedureLabel: input.procedureLabel,
  });

  if (
    primary &&
    isLowValuePositiveWorkflowSignal(primary.label) &&
    /workflow friction|may create/i.test(hypothesis)
  ) {
    return ensurePlanningSentenceCase(
      buildHypothesisFromPrimaryPattern({
        pattern: null,
        providerDisplayName: providerDisplayName(input.providerName),
        procedureLabel: input.procedureLabel,
      }),
    );
  }

  return ensurePlanningSentenceCase(hypothesis);
}

const CONFIRM_OBJECTIVE_POOL = [
  "Is this actually a problem from the surgeon's perspective?",
  "How often does this occur in real cases?",
  "Does it impact efficiency, workflow, or satisfaction?",
  "Would they consider changing anything?",
  "What type of next step would feel appropriate?",
  "Does this pattern match how they experience cases day to day?",
  "Who else would need to be involved in a change?",
];

const CONVERSATIONAL_QUESTION_POOL = [
  "When this happens during a case, is it just a minor annoyance or does it actually affect how you work?",
  "How often do you run into that situation during real cases?",
  "If you could change one thing about that part of the workflow, what would it be?",
  "When it happens, is it something you notice every case or only sometimes?",
  "Does it slow you down enough that you'd want to talk about it, or is it manageable?",
  "What would need to be true for you to want to try something different?",
  "If this came up tomorrow, would you shrug it off or would it bother you?",
  "Is this the kind of thing you'd bring up on your own, or only if someone asked?",
];

export function buildInitialConfirmObjectives(ctx: DebriefPrepareValidationContext = {}): string[] {
  return buildConfirmObjectives({ existing: [], count: 6, ctx });
}

export function buildConfirmObjectives(input: {
  existing: string[];
  count?: number;
  ctx?: DebriefPrepareValidationContext;
}): string[] {
  const seen = new Set(input.existing.map((item) => item.toLowerCase()));
  const out: string[] = [];

  for (const candidate of CONFIRM_OBJECTIVE_POOL) {
    const validated = ensurePlanningSentenceCase(
      validateRepFacingFact(candidate, input.ctx ?? {}) ?? candidate,
    );
    if (meetingObjectiveContainsLeakedInternalCopy(validated)) continue;
    if (seen.has(validated.toLowerCase())) continue;
    seen.add(validated.toLowerCase());
    out.push(validated);
    if (out.length >= (input.count ?? 3)) break;
  }

  return out;
}

export function buildPrioritizedLearnItems(input: DebriefPreparePlanningContext): string[] {
  const primary = resolvePrimaryPattern(input);
  const ctx = validationCtx(input);
  const prompts = buildHypothesisAlignedLearnPrompts({
    pattern: primary,
    providerDisplayName: providerDisplayName(input.providerName),
  });

  const out: string[] = [];
  const seen = new Set<string>();
  for (const candidate of prompts) {
    const validated = ensurePlanningSentenceCase(validateRepFacingFact(candidate, ctx) ?? candidate);
    if (meetingObjectiveContainsLeakedInternalCopy(validated)) continue;
    const key = validated.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(validated);
    if (out.length >= 4) break;
  }
  return out;
}

export function buildPrioritizedSuggestedQuestions(input: DebriefPreparePlanningContext): string[] {
  const primary = resolvePrimaryPattern(input);
  const ctx = validationCtx(input);
  const prompts = buildHypothesisAlignedQuestions({ pattern: primary });

  const out: string[] = [];
  const seen = new Set<string>();
  for (const candidate of prompts) {
    const validated = validateRepFacingQuestion(candidate, ctx);
    if (!validated || meetingObjectiveContainsLeakedInternalCopy(validated)) continue;
    const normalized = ensurePlanningSentenceCase(validated);
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
    if (out.length >= 4) break;
  }
  return out;
}

export function buildInitialSuggestedQuestions(ctx: DebriefPrepareValidationContext = {}): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const candidate of CONVERSATIONAL_QUESTION_POOL) {
    const validated = validateRepFacingQuestion(candidate, ctx);
    if (!validated || meetingObjectiveContainsLeakedInternalCopy(validated)) continue;
    const normalized = ensurePlanningSentenceCase(validated);
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
    if (out.length >= 5) break;
  }

  return out;
}

export function buildMoreQuestions(input: {
  draft: DebriefPrepareWorkspaceDraft;
  existing: string[];
  count?: number;
  ctx?: DebriefPrepareValidationContext;
}): string[] {
  const pool = [...input.draft.suggestedQuestions, ...CONVERSATIONAL_QUESTION_POOL];
  const seen = new Set(input.existing.map((item) => item.toLowerCase()));
  const out: string[] = [];

  for (const candidate of pool) {
    const validated = validateRepFacingQuestion(candidate, input.ctx ?? {});
    if (!validated || meetingObjectiveContainsLeakedInternalCopy(validated)) continue;
    const normalized = ensurePlanningSentenceCase(validated);
    if (seen.has(normalized.toLowerCase())) continue;
    seen.add(normalized.toLowerCase());
    out.push(normalized);
    if (out.length >= (input.count ?? 3)) break;
  }

  return out;
}
