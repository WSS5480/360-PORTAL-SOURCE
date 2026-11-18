/**
 * Commercial strategy synthesis — assembles evidence-backed reasoning inputs
 * from observation notes, findings, patterns, competitor usage, provider history,
 * and product knowledge. Does not emit intelligence category labels.
 */

import type { ProviderLongitudinalIntelligence } from "@/lib/surgical-sales/buildProviderLongitudinalIntelligence";
import {
  getDebriefProductKnowledge,
  tryResolveDebriefProductKnowledgeId,
  type DebriefProductKnowledge,
} from "@/lib/surgical-sales/engagements/debriefProductKnowledge";
import type {
  ProviderDebriefPlan,
  ProviderDebriefPlanLearningItem,
  ProviderDebriefPlanProductAssessment,
} from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";
import { stripDebriefBuilderPrefixes } from "@/lib/surgical-sales/engagements/debriefRepFacingCopy";
import { containsInternalCategoryLabel } from "@/lib/surgical-sales/engagements/debriefClinicalTopicTranslation";

export type DebriefCommercialEvidenceFinding = {
  narrative: string;
  evidenceExcerpt: string | null;
  recurrenceCount: number;
  source: ProviderDebriefPlanLearningItem["source"] | "recurring_pattern" | "observation_note";
};

export type DebriefCommercialRecurringPattern = {
  pattern: string;
  observationCount: number;
  totalObservations: number;
};

export type DebriefCommercialCompetitorUsage = {
  summary: string;
  observationCount: number;
};

export type DebriefCommercialValidationNeed = {
  question: string;
  rationale: string | null;
};

export type DebriefCommercialProductCandidate = {
  productName: string;
  fitLevel: ProviderDebriefPlanProductAssessment["fitLevel"];
  observationLinkedRationale: string[];
  validationNeeded: string | null;
};

export type DebriefCommercialSynthesis = {
  providerName: string | null;
  organizationName: string | null;
  procedureFocus: string | null;
  observationMission: string | null;
  completedObservationCount: number;
  pathwayStageLabel: string;
  observationNotes: string[];
  findings: DebriefCommercialEvidenceFinding[];
  recurringPatterns: DebriefCommercialRecurringPattern[];
  competitorUsage: DebriefCommercialCompetitorUsage[];
  providerHistory: string[];
  validationNeeds: DebriefCommercialValidationNeed[];
  productCandidates: DebriefCommercialProductCandidate[];
  /** Q1 — what we believe is happening (complete sentence). */
  beliefSummary: string | null;
  /** Q2 — why we believe it (evidence-backed bullets). */
  beliefRationale: string[];
  hasSubstantiveEvidence: boolean;
};

const BOILERPLATE_SIGNAL_PATTERNS: RegExp[] = [
  /^workflow friction was observed during the case\.?$/i,
  /^you noted workflow friction during the case\.?$/i,
  /^a competitor product was observed in the or\.?$/i,
  /^a competitor product was in the or\.?$/i,
  /^workflow fit looks (strong|possible|weak) from field signals\.?$/i,
  /^workflow fit looked (strong|possible|weak) from what you observed\.?$/i,
  /^product interest was (mentioned|strong) during observation\.?$/i,
  /^product interest came up during observation \((mentioned|strong)\)\.?$/i,
  /^product signal\.?$/i,
  /^workflow delays?\.?$/i,
  /^staff familiarity with the workflow\.?$/i,
  /^clinical pain point\.?$/i,
  /^workflow friction\.?$/i,
  /^was validated on this case\.?$/i,
];

const CATEGORY_LABEL_PATTERNS: RegExp[] = [
  /^workflow delays?\.?$/i,
  /^staff familiarity with the workflow\.?$/i,
  /^product signal(s)?\.?$/i,
  /^clinical pain point(s)?\.?$/i,
  /^workflow friction\.?$/i,
  /^provider profile\.?$/i,
  /^visualization challenge fixation\.?$/i,
  /^determine whether staff familiarity/i,
  /^confirm whether workflow delays/i,
];

export function isCommercialCategoryLabel(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (CATEGORY_LABEL_PATTERNS.some((pattern) => pattern.test(trimmed))) return true;
  if (containsInternalCategoryLabel(trimmed)) return true;
  if (trimmed.length <= 42 && !trimmed.includes(",") && !/\b(the|during|before|after|surgeon|team|case)\b/i.test(trimmed)) {
    return BOILERPLATE_SIGNAL_PATTERNS.some((pattern) => pattern.test(trimmed));
  }
  return false;
}

function isBoilerplateSignal(signal: string): boolean {
  const trimmed = signal.trim();
  return BOILERPLATE_SIGNAL_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function ensureSentence(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  if (/[.!?]$/.test(capitalized)) return capitalized;
  return `${capitalized}.`;
}

function excerptFromNote(note: string, maxLen = 220): string {
  const trimmed = note.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1).trim()}…`;
}

function narrativeFromLearning(item: ProviderDebriefPlanLearningItem): DebriefCommercialEvidenceFinding | null {
  if (isBoilerplateSignal(item.signal)) return null;

  const evidence = item.evidence?.trim() || null;
  const signal = stripDebriefBuilderPrefixes(item.signal).trim();

  const primary =
    evidence && !isCommercialCategoryLabel(evidence) && evidence.length >= 16
      ? evidence
      : signal && !isCommercialCategoryLabel(signal) && signal.length >= 16
        ? signal
        : evidence && !isCommercialCategoryLabel(evidence)
          ? evidence
          : null;

  if (!primary) return null;

  return {
    narrative: ensureSentence(primary),
    evidenceExcerpt: evidence && evidence !== primary ? excerptFromNote(evidence) : null,
    recurrenceCount: item.source === "prior_observation" ? 2 : 1,
    source: item.source,
  };
}

function patternFromLongitudinal(
  signal: string,
  count: number,
  totalObservations: number,
): string {
  const cleaned = stripDebriefBuilderPrefixes(signal).trim();
  if (!cleaned || isCommercialCategoryLabel(cleaned)) return "";

  if (count >= 2 && totalObservations >= 2) {
    return ensureSentence(
      `${cleaned.charAt(0).toUpperCase() + cleaned.slice(1)} — a recurring theme across ${count} of ${totalObservations} observations`,
    );
  }

  return ensureSentence(cleaned);
}

function competitorSummary(signal: string, count: number): string {
  const cleaned = stripDebriefBuilderPrefixes(signal).trim();
  if (!cleaned || isCommercialCategoryLabel(cleaned)) return "";

  if (count >= 2) {
    return ensureSentence(
      `Competitive product activity (${cleaned}) has appeared in ${count} observations`,
    );
  }

  return ensureSentence(`Competitive product noted in the OR: ${cleaned}`);
}

function providerHistoryLines(li: ProviderLongitudinalIntelligence): string[] {
  const lines: string[] = [];

  if (li.observationCaseCount > 0) {
    lines.push(
      ensureSentence(
        `${li.observationCaseCount} observation case${li.observationCaseCount === 1 ? "" : "s"} on file for this provider`,
      ),
    );
  }

  for (const procedure of li.observedProcedures.slice(0, 3)) {
    if (procedure.count >= 2) {
      lines.push(
        ensureSentence(
          `${procedure.procedure} observed ${procedure.count} times`,
        ),
      );
    }
  }

  for (const trend of li.productFitTrends.slice(0, 2)) {
    if (trend.count >= 2 && trend.latestSignal && !isCommercialCategoryLabel(trend.latestSignal)) {
      lines.push(
        ensureSentence(
          `Product-fit signals (${trend.label}) recurred across ${trend.count} observations — latest: ${trend.latestSignal}`,
        ),
      );
    }
  }

  return lines;
}

function validationFromUnknowns(plan: ProviderDebriefPlan): DebriefCommercialValidationNeed[] {
  const needs: DebriefCommercialValidationNeed[] = [];

  for (const item of plan.whatWeStillDontKnow.sort((a, b) => b.priority - a.priority).slice(0, 5)) {
    const question = item.question.trim();
    if (!question || isCommercialCategoryLabel(question)) continue;

    const rationale = item.rationale?.trim() || null;
    if (isCommercialCategoryLabel(rationale ?? "")) continue;

    needs.push({ question: ensureSentence(question), rationale });
  }

  return needs;
}

function productCandidatesFromPlan(
  plan: ProviderDebriefPlan,
  productKnowledge: DebriefProductKnowledge[],
): DebriefCommercialProductCandidate[] {
  const candidates: DebriefCommercialProductCandidate[] = [];

  for (const assessment of plan.productOpportunityAssessment) {
    if (assessment.product === "future_opportunity") continue;

    const resolved = tryResolveDebriefProductKnowledgeId(assessment.product);
    const productName = resolved ? getDebriefProductKnowledge(resolved).name : assessment.product;

    const observationLinkedRationale = [
      ...assessment.evidence.filter((line) => line.length >= 12 && !isCommercialCategoryLabel(line)),
      ...assessment.fitRationale.filter((line) => line.length >= 12 && !isCommercialCategoryLabel(line)),
    ].slice(0, 3);

    const knowledge = resolved ? productKnowledge.find((p) => p.id === resolved) : null;
    const validationNeeded =
      knowledge?.avoidWhen[0] && !isCommercialCategoryLabel(knowledge.avoidWhen[0])
        ? ensureSentence(knowledge.avoidWhen[0])
        : null;

    candidates.push({
      productName,
      fitLevel: assessment.fitLevel,
      observationLinkedRationale,
      validationNeeded,
    });
  }

  return candidates.sort((a, b) => fitRank(b.fitLevel) - fitRank(a.fitLevel));
}

function fitRank(fitLevel: ProviderDebriefPlanProductAssessment["fitLevel"]): number {
  switch (fitLevel) {
    case "strong":
      return 5;
    case "possible":
      return 4;
    case "needs_surgeon_confirmation":
      return 3;
    case "unknown":
      return 2;
    default:
      return 1;
  }
}

function buildBeliefSummary(input: {
  providerName: string | null;
  procedureFocus: string | null;
  recurringPatterns: DebriefCommercialRecurringPattern[];
  findings: DebriefCommercialEvidenceFinding[];
  completedObservationCount: number;
}): string | null {
  const provider = input.providerName?.trim() || "This surgeon";
  const procedure = input.procedureFocus?.trim();

  const leadPattern = input.recurringPatterns[0]?.pattern.replace(/\.$/, "");
  const leadFinding = input.findings[0]?.narrative.replace(/\.$/, "");

  if (leadPattern) {
    const procedureClause = procedure ? ` during ${procedure.toLowerCase()} cases` : "";
    return ensureSentence(
      `${provider} may be dealing with a recurring workflow issue${procedureClause}: ${leadPattern.replace(/^[^a-z]+/i, "").replace(/ — a recurring theme.*/i, "")}`,
    );
  }

  if (leadFinding) {
    const countClause =
      input.completedObservationCount > 1
        ? `Based on ${input.completedObservationCount} observations, `
        : "Based on recent observations, ";
    return ensureSentence(`${countClause}${provider} may be experiencing ${leadFinding.charAt(0).toLowerCase()}${leadFinding.slice(1)}`);
  }

  return null;
}

function buildBeliefRationale(input: {
  findings: DebriefCommercialEvidenceFinding[];
  recurringPatterns: DebriefCommercialRecurringPattern[];
  competitorUsage: DebriefCommercialCompetitorUsage[];
  observationNotes: string[];
  completedObservationCount: number;
}): string[] {
  const rationale: string[] = [];
  const seen = new Set<string>();

  function push(line: string) {
    const normalized = line.trim().toLowerCase();
    if (!line || seen.has(normalized)) return;
    seen.add(normalized);
    rationale.push(ensureSentence(line));
  }

  for (const pattern of input.recurringPatterns.slice(0, 2)) {
    push(pattern.pattern);
  }

  for (const finding of input.findings.slice(0, 3)) {
    if (finding.evidenceExcerpt) {
      push(`Rep note excerpt: "${finding.evidenceExcerpt}"`);
    } else {
      push(finding.narrative);
    }
  }

  for (const competitor of input.competitorUsage.slice(0, 1)) {
    push(competitor.summary);
  }

  if (rationale.length === 0 && input.observationNotes.length > 0) {
    const latest = input.observationNotes[input.observationNotes.length - 1]!;
    push(`Most recent observation note: "${excerptFromNote(latest)}"`);
  }

  if (input.completedObservationCount > 1 && rationale.length > 0) {
    push(
      `This read is based on ${input.completedObservationCount} completed observations — treat it as a working hypothesis until the surgeon confirms.`,
    );
  }

  return rationale.slice(0, 5);
}

export function buildDebriefCommercialSynthesis(input: {
  plan: ProviderDebriefPlan;
  providerName: string | null;
  organizationName: string | null;
  completedObservationCount: number;
  pathwayStageLabel: string;
  observationNotes: string[];
  productKnowledge: DebriefProductKnowledge[];
}): DebriefCommercialSynthesis {
  const li = input.plan.longitudinalIntelligence;
  const totalObservations = Math.max(input.completedObservationCount, li.observationCaseCount, 1);

  const findings: DebriefCommercialEvidenceFinding[] = [];
  const seenFindingKeys = new Set<string>();

  for (const learning of input.plan.whatWeLearned) {
    const finding = narrativeFromLearning(learning);
    if (!finding) continue;
    const key = finding.narrative.toLowerCase();
    if (seenFindingKeys.has(key)) continue;
    seenFindingKeys.add(key);
    findings.push(finding);
  }

  for (const note of input.observationNotes.slice(-4)) {
    const excerpt = excerptFromNote(note);
    if (excerpt.length < 20) continue;
    const key = excerpt.toLowerCase();
    if (seenFindingKeys.has(key)) continue;
    seenFindingKeys.add(key);
    findings.push({
      narrative: ensureSentence(excerpt),
      evidenceExcerpt: excerpt,
      recurrenceCount: 1,
      source: "observation_note",
    });
  }

  const recurringPatterns: DebriefCommercialRecurringPattern[] = [];
  for (const pain of li.recurringPainPoints.slice(0, 4)) {
    const pattern = patternFromLongitudinal(pain.signal, pain.count, totalObservations);
    if (!pattern) continue;
    recurringPatterns.push({
      pattern,
      observationCount: pain.count,
      totalObservations,
    });
  }

  const competitorUsage: DebriefCommercialCompetitorUsage[] = [];
  for (const comp of li.competitiveProductsSeen.slice(0, 3)) {
    const summary = competitorSummary(comp.signal, comp.count);
    if (!summary) continue;
    competitorUsage.push({ summary, observationCount: comp.count });
  }

  for (const learning of input.plan.whatWeLearned) {
    if (learning.category !== "competitive_usage") continue;
    const finding = narrativeFromLearning(learning);
    if (!finding) continue;
    competitorUsage.push({
      summary: finding.narrative,
      observationCount: 1,
    });
  }

  const providerHistory = providerHistoryLines(li);
  const validationNeeds = validationFromUnknowns(input.plan);
  const productCandidates = productCandidatesFromPlan(input.plan, input.productKnowledge);

  const beliefSummary = buildBeliefSummary({
    providerName: input.providerName,
    procedureFocus: input.plan.context.procedureLabel,
    recurringPatterns,
    findings,
    completedObservationCount: input.completedObservationCount,
  });

  const beliefRationale = buildBeliefRationale({
    findings,
    recurringPatterns,
    competitorUsage,
    observationNotes: input.observationNotes,
    completedObservationCount: input.completedObservationCount,
  });

  const hasSubstantiveEvidence =
    findings.length > 0 ||
    recurringPatterns.length > 0 ||
    competitorUsage.length > 0 ||
    input.observationNotes.some((note) => note.trim().length >= 20);

  return {
    providerName: input.providerName,
    organizationName: input.organizationName,
    procedureFocus: input.plan.context.procedureLabel,
    observationMission: input.plan.context.observationMission,
    completedObservationCount: input.completedObservationCount,
    pathwayStageLabel: input.pathwayStageLabel,
    observationNotes: input.observationNotes,
    findings,
    recurringPatterns,
    competitorUsage,
    providerHistory,
    validationNeeds,
    productCandidates,
    beliefSummary,
    beliefRationale,
    hasSubstantiveEvidence,
  };
}
