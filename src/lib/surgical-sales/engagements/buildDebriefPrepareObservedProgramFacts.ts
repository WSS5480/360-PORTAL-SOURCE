/**
 * Debrief prepare "Observed Across The Program" — same intelligence pipeline as
 * Observation Intelligence, formatted with pattern frequency for planning.
 */

import { buildObservationLearningTabView } from "@/lib/surgical-sales/buildObservationLearningTabView";
import {
  buildSharedUnresolvedEvidenceQuestions,
  OBSERVATION_INTELLIGENCE_STILL_NEED_MAX,
} from "@/lib/surgical-sales/buildSharedUnresolvedEvidenceQuestions";
import type { AggregatedFindingEvidence } from "@/lib/surgical-sales/observationFindingEvidenceConfidence";
import { findingToIntelligenceSignal } from "@/lib/surgical-sales/caseIntelligenceSignals";
import { resolveRepProductName } from "@/lib/surgical-sales/observationIntelligenceDisplayLabels";
import {
  formatWhatWeKnowLine,
  isEstablishedFinding,
  isVagueRepStoryLabel,
} from "@/lib/surgical-sales/observationRepPresentationCopy";
import { repDisplayCompletedObservationCount } from "@/lib/surgical-sales/observationRepFindingPresentation";
import { staffEfficiencyRepLabel } from "@/lib/surgical-sales/staffEfficiencyRepLabels";
import type { ProviderDebriefPlan } from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";
import type { DebriefCommercialSynthesis } from "@/lib/surgical-sales/engagements/buildDebriefCommercialSynthesis";
import {
  ensurePlanningSentenceCase,
  validateRepFacingFact,
  validateRepFacingProductName,
  type DebriefPrepareValidationContext,
} from "@/lib/surgical-sales/engagements/debriefPrepareIntelligenceValidation";
import {
  adaptUniversalFactsToWhatWeKnowLines,
  completedObservationCaseIds,
  resolveDebriefPrepareProgramRuns,
  resolveReadModelSection,
  type UniversalFactsReadModelPayload,
} from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import {
  scoreDebriefCommercialPriority,
  selectStrongestCommercialConversationPattern,
  sortDebriefKnownFactsPatterns,
  sortDebriefPatternsByCommercialPriority,
} from "@/lib/surgical-sales/engagements/debriefIntelligencePrioritization";

export type DebriefPrepareObservedPattern = {
  label: string;
  count: number;
  total: number;
  importance: number;
};

export const DEBRIEF_PREPARE_MAX_OBSERVED_FACTS = 5;

export type DebriefPrepareObservationIntelligenceInput = {
  caseRow: Record<string, unknown>;
  activities?: Array<{ activity_type?: string; body?: string; metadata_json?: Record<string, unknown> | null }>;
  priorCases?: Array<Record<string, unknown>>;
  providerContact?: Record<string, unknown> | null;
};

function formatProgramFrequency(count: number, total: number): string {
  const observationWord = total === 1 ? "observation" : "observations";
  return ` (${count} of ${total} ${observationWord})`;
}

function stripIntelligenceCountSuffix(line: string): string {
  return line
    .replace(/\s·\s*Also noted in this case \(not yet marked complete\)$/i, "")
    .replace(/\s+across \d+ completed cases$/i, "")
    .replace(/\s+across 2 completed cases$/i, "")
    .replace(/\s+in 1 completed case$/i, "")
    .trim();
}

function debriefPatternLabelFromFinding(input: {
  finding: AggregatedFindingEvidence;
  intelligenceLine: string;
  peerFindings: AggregatedFindingEvidence[];
  providerName: string | null;
}): string | null {
  const { finding, intelligenceLine, peerFindings } = input;
  const signal = findingToIntelligenceSignal(finding, { procedureContext: null });
  const blob = `${finding.normalizedFindingId} ${finding.label} ${finding.matchKey}`.toLowerCase();

  if (finding.normalizedFindingId.startsWith("product_fit_")) return null;

  if (finding.isPositiveStaffSignal) {
    const staffLabel = staffEfficiencyRepLabel(finding.label);
    if (/organized/i.test(staffLabel)) return "Staff appeared organized";
    if (/coordinated|efficient|smooth|prepared|familiar/i.test(staffLabel)) {
      return staffLabel.replace(/^Staff appeared /i, "Staff appeared ");
    }
    return staffLabel.replace(/^Staff workflow appeared /i, "Staff appeared ");
  }

  if (
    finding.normalizedFindingId.startsWith("product_in_use:") ||
    finding.normalizedFindingId.startsWith("competitor_product:")
  ) {
    const productName = resolveRepProductName(finding, signal);
    if (!productName) return null;
    return `${productName} used consistently`;
  }

  if (
    finding.normalizedFindingId === "workflow_visualization_before_fixation" ||
    finding.normalizedFindingId === "visualization_challenge" ||
    /visualization.*fixation|fixation.*visualization|visualization challenge/i.test(blob)
  ) {
    return "Extra visualization time before fixation";
  }

  if (
    finding.normalizedFindingId.includes("provider_frustration") ||
    finding.normalizedFindingId.includes("provider_pain") ||
    signal.type === "provider_pain_point"
  ) {
    const mentionsFrustration = /\bfrustrat|complain|irritat|annoyed|upset|tension\b/i.test(
      blob + intelligenceLine,
    );
    const isVisualizationSignal =
      finding.normalizedFindingId === "workflow_visualization_before_fixation" ||
      finding.normalizedFindingId === "visualization_challenge" ||
      /visualization|visibility|exposure time|extra time.*visual/i.test(blob + intelligenceLine);

    if (isVisualizationSignal && !mentionsFrustration) {
      return "Extra visualization time before fixation";
    }
    if (!mentionsFrustration && !finding.normalizedFindingId.includes("provider_frustration")) {
      return null;
    }

    if (/visuali|fixation|decision/.test(blob + intelligenceLine)) {
      return "Provider frustration during fixation decisions";
    }
    const stripped = stripIntelligenceCountSuffix(intelligenceLine)
      .replace(/^Provider expressed frustration during /i, "Provider frustration during ")
      .replace(/^[^ ]+ [^ ]+ expressed frustration during /i, "Provider frustration during ");
    if (!isVagueRepStoryLabel(stripped.replace(/^Provider frustration during /i, ""))) {
      return stripped.replace(/\s+observed.*$/i, "").trim();
    }
    return "Provider frustration during key workflow moments";
  }

  if (
    finding.normalizedFindingId === "workflow_delay" ||
    /workflow delay|pace slowed|slowed the flow|slowed case progress/i.test(blob + intelligenceLine)
  ) {
    return "Workflow delays slowed case progress";
  }

  if (
    finding.normalizedFindingId.startsWith("staff_supply") ||
    finding.normalizedFindingId === "staff_supply_delay" ||
    /product availability|stocked product|verify product|uncertainty.*product|product was not ready/i.test(
      blob + intelligenceLine,
    )
  ) {
    return "Product availability verification caused delays";
  }

  if (signal.type === "staff_pain_point" || finding.normalizedFindingId === "staff_friction") {
    if (/product availability|stocked product|verify product/i.test(blob + intelligenceLine)) {
      return "Product availability verification caused delays";
    }
    if (/workflow delay|pace slowed/i.test(blob + intelligenceLine)) {
      return "Workflow delays slowed case progress";
    }
  }

  if (signal.type === "workflow_signal" || finding.normalizedFindingId.startsWith("workflow_")) {
    const stripped = stripIntelligenceCountSuffix(intelligenceLine);
    if (/extra time.*visualization|visualization before fixation/i.test(stripped)) {
      return "Extra visualization time before fixation";
    }
    if (/workflow delay|slowed/i.test(stripped)) {
      return "Workflow delays slowed case progress";
    }
  }

  const fallback = stripIntelligenceCountSuffix(intelligenceLine)
    .replace(/\s+observed.*$/i, "")
    .replace(/^Provider expressed frustration during /i, "Provider frustration during ")
    .trim();

  if (!fallback || isVagueRepStoryLabel(fallback)) return null;
  if (/^Staff frustrations related to product availability/i.test(fallback)) {
    return "Product availability verification caused delays";
  }

  void peerFindings;
  return fallback.charAt(0).toUpperCase() + fallback.slice(1);
}

function patternCountForFinding(
  finding: AggregatedFindingEvidence,
  programCompletedCount: number,
): number {
  return Math.max(
    1,
    repDisplayCompletedObservationCount(finding, programCompletedCount) || finding.observationCount,
  );
}

function patternImportance(label: string, count: number, total: number): number {
  return scoreDebriefCommercialPriority({ label, count, total });
}

function isOperationalPlanningNoise(label: string): boolean {
  return /scheduler|credentialing|observation access|permission|procedure focus|commercial wedge|primary commercial/i.test(
    label,
  );
}

function sortDebriefPreparePatterns(
  patterns: DebriefPrepareObservedPattern[],
): DebriefPrepareObservedPattern[] {
  return sortDebriefPatternsByCommercialPriority(patterns).map((pattern) => ({
    ...pattern,
    importance: scoreDebriefCommercialPriority(pattern),
  }));
}

function buildPatternsFromFindings(input: {
  findings: AggregatedFindingEvidence[];
  providerName: string | null;
  programCompletedCount: number;
  ctx: DebriefPrepareValidationContext;
}): DebriefPrepareObservedPattern[] {
  const total = Math.max(1, input.programCompletedCount);
  const patternByLabel = new Map<string, DebriefPrepareObservedPattern>();

  for (const finding of input.findings) {
    if (finding.isInferred) continue;
    if (!isEstablishedFinding(finding, input.programCompletedCount)) continue;

    const intelligenceLine =
      formatWhatWeKnowLine(
        finding,
        input.providerName,
        input.programCompletedCount,
        input.findings,
      ) ?? "";

    const label = debriefPatternLabelFromFinding({
      finding,
      intelligenceLine,
      peerFindings: input.findings,
      providerName: input.providerName,
    });
    if (!label || isOperationalPlanningNoise(label)) continue;

    const count = patternCountForFinding(finding, total);
    const importance = patternImportance(label, count, total);
    const key = label.toLowerCase();
    const existing = patternByLabel.get(key);
    if (existing) {
      if (count > existing.count) {
        patternByLabel.set(key, { label, count, total, importance });
      }
      continue;
    }
    patternByLabel.set(key, { label, count, total, importance });
  }

  const sorted = sortDebriefPreparePatterns([...patternByLabel.values()]);
  const validated: DebriefPrepareObservedPattern[] = [];
  for (const pattern of sorted) {
    const fact = `${pattern.label}${formatProgramFrequency(pattern.count, pattern.total)}`;
    if (!validateRepFacingFact(fact, input.ctx)) continue;
    validated.push(pattern);
    if (validated.length >= DEBRIEF_PREPARE_MAX_OBSERVED_FACTS) break;
  }

  return validated;
}

function buildPatternsFromLongitudinalFallback(input: {
  plan: ProviderDebriefPlan;
  commercialSynthesis: DebriefCommercialSynthesis;
  incumbentProduct: string | null;
  ctx: DebriefPrepareValidationContext;
}): DebriefPrepareObservedPattern[] {
  const total = Math.max(1, input.commercialSynthesis.completedObservationCount);
  const patterns: DebriefPrepareObservedPattern[] = [];
  const li = input.plan.longitudinalIntelligence;

  for (const pain of li.recurringPainPoints) {
    const normalized = pain.signal.toLowerCase();
    let label: string | null = null;
    if (/visualization|fixation/.test(normalized)) {
      label = "Extra visualization time before fixation";
    } else if (/frustration/.test(normalized)) {
      label = "Provider frustration during fixation decisions";
    } else if (/delay|slow/.test(normalized)) {
      label = "Workflow delays slowed case progress";
    } else if (/staff|organiz/.test(normalized)) {
      label = "Staff appeared organized";
    } else if (/product availability|stock|verify/.test(normalized)) {
      label = "Product availability verification caused delays";
    } else {
      label = ensurePlanningSentenceCase(pain.signal.replace(/\.$/, ""));
    }
    if (!label || isOperationalPlanningNoise(label)) continue;
    patterns.push({ label, count: pain.count, total, importance: patternImportance(label, pain.count, total) });
  }

  for (const comp of li.competitiveProductsSeen) {
    const product = validateRepFacingProductName(
      comp.signal.replace(/\s+observed$/i, ""),
      input.ctx,
    );
    if (!product) continue;
    patterns.push({
      label: `${product} used consistently`,
      count: comp.count,
      total,
      importance: patternImportance(`${product} used consistently`, comp.count, total),
    });
  }

  if (input.incumbentProduct && !patterns.some((p) => p.label.includes(input.incumbentProduct!))) {
    patterns.push({
      label: `${input.incumbentProduct} used consistently`,
      count: total,
      total,
      importance: patternImportance(`${input.incumbentProduct} used consistently`, total, total),
    });
  }

  const sorted = sortDebriefPreparePatterns(patterns).slice(0, DEBRIEF_PREPARE_MAX_OBSERVED_FACTS);
  return sorted;
}

export function selectStrongestConversationPattern(
  patterns: DebriefPrepareObservedPattern[],
): DebriefPrepareObservedPattern | null {
  const selected = selectStrongestCommercialConversationPattern(patterns);
  if (!selected) return null;
  return {
    ...selected,
    importance: selected.importance ?? scoreDebriefCommercialPriority(selected),
  };
}

export function formatDebriefPrepareObservedFacts(
  patterns: DebriefPrepareObservedPattern[],
): string[] {
  return sortDebriefKnownFactsPatterns(patterns)
    .slice(0, DEBRIEF_PREPARE_MAX_OBSERVED_FACTS)
    .map((pattern) => `${pattern.label}${formatProgramFrequency(pattern.count, pattern.total)}`);
}

function parseProgramFractionLine(line: string): { label: string; count: number; total: number } | null {
  const parenMatch = line.match(/^(.+?)\s+\((\d+) of (\d+) observations?\)$/i);
  if (parenMatch) {
    return {
      label: parenMatch[1].trim(),
      count: Number(parenMatch[2]),
      total: Number(parenMatch[3]),
    };
  }

  const emDashMatch = line.match(/^(.+?)\s+—\s+seen in (\d+) of (\d+) observations$/i);
  if (emDashMatch) {
    return {
      label: emDashMatch[1].trim(),
      count: Number(emDashMatch[2]),
      total: Number(emDashMatch[3]),
    };
  }

  return null;
}

function buildPatternsFromUniversalFacts(input: {
  programRuns: UniversalFactExtractionRun[];
  completedCaseIds: string[];
  programCompletedCount: number;
  providerName?: string | null;
  ctx: DebriefPrepareValidationContext;
}): DebriefPrepareObservedPattern[] {
  const lines = adaptUniversalFactsToWhatWeKnowLines({
    programRuns: input.programRuns,
    completedCaseIds: input.completedCaseIds,
    programCompletedCount: input.programCompletedCount,
    countStyle: "program_fraction",
    providerName: input.providerName,
  });

  const patterns: DebriefPrepareObservedPattern[] = [];
  for (const line of lines) {
    const parsed = parseProgramFractionLine(line);
    if (!parsed || isOperationalPlanningNoise(parsed.label)) continue;
    const fact = `${parsed.label}${formatProgramFrequency(parsed.count, parsed.total)}`;
    if (!validateRepFacingFact(fact, input.ctx)) continue;
    patterns.push({
      label: parsed.label,
      count: parsed.count,
      total: parsed.total,
      importance: patternImportance(parsed.label, parsed.count, parsed.total),
    });
    if (patterns.length >= DEBRIEF_PREPARE_MAX_OBSERVED_FACTS) break;
  }

  return sortDebriefPreparePatterns(patterns);
}

function buildOieObservedPatterns(input: {
  observationIntelligence?: DebriefPrepareObservationIntelligenceInput | null;
  plan: ProviderDebriefPlan;
  commercialSynthesis: DebriefCommercialSynthesis;
  incumbentProduct?: string | null;
  programCompletedCount: number;
  providerName?: string | null;
  ctx: DebriefPrepareValidationContext;
}): DebriefPrepareObservedPattern[] {
  let patterns: DebriefPrepareObservedPattern[] = [];

  if (input.observationIntelligence?.caseRow) {
    const learningView = buildObservationLearningTabView({
      caseRow: input.observationIntelligence.caseRow,
      activities: input.observationIntelligence.activities,
      priorCases: input.observationIntelligence.priorCases,
      providerContact: input.observationIntelligence.providerContact,
    });

    patterns = buildPatternsFromFindings({
      findings: learningView.knownFindings,
      providerName: input.providerName ?? null,
      programCompletedCount: input.programCompletedCount,
      ctx: input.ctx,
    });
  }

  if (patterns.length === 0) {
    patterns = buildPatternsFromLongitudinalFallback({
      plan: input.plan,
      commercialSynthesis: input.commercialSynthesis,
      incumbentProduct: input.incumbentProduct ?? null,
      ctx: input.ctx,
    });
  }

  return patterns;
}

function shouldIncludeDebriefPreparePattern(pattern: DebriefPrepareObservedPattern): boolean {
  if (
    /Provider frustration during fixation decisions/i.test(pattern.label) &&
    pattern.count < 2 &&
    pattern.total >= 2
  ) {
    return false;
  }
  return true;
}

export function buildDebriefPrepareObservedProgramFacts(input: {
  observationIntelligence?: DebriefPrepareObservationIntelligenceInput | null;
  plan: ProviderDebriefPlan;
  commercialSynthesis: DebriefCommercialSynthesis;
  completedObservationCount: number;
  providerName?: string | null;
  incumbentProduct?: string | null;
  ctx?: DebriefPrepareValidationContext;
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
}): {
  facts: string[];
  patterns: DebriefPrepareObservedPattern[];
  strongestPattern: DebriefPrepareObservedPattern | null;
  /** Validated "still need to learn" prompts — same source as the case Intelligence tab. */
  learnPrompts: string[];
} {
  const ctx: DebriefPrepareValidationContext = {
    providerName: input.providerName,
    completedObservationCount: input.completedObservationCount,
    ...input.ctx,
  };
  const programCompletedCount = Math.max(1, input.completedObservationCount);

  let patterns: DebriefPrepareObservedPattern[] = [];
  let learnPrompts: string[] = [];

  const completedCaseIds =
    input.observationIntelligence?.caseRow
      ? completedObservationCaseIds({
          caseRow: input.observationIntelligence.caseRow,
          priorCases: input.observationIntelligence.priorCases,
        })
      : [];

  const debriefProgramRuns = resolveDebriefPrepareProgramRuns(input.universalFactsReadModel);
  const ufPatterns = debriefProgramRuns.length
    ? buildPatternsFromUniversalFacts({
        programRuns: debriefProgramRuns,
        completedCaseIds,
        programCompletedCount,
        providerName: input.providerName,
        ctx,
      })
    : [];

  patterns = resolveReadModelSection(ufPatterns, () =>
    buildOieObservedPatterns({
      observationIntelligence: input.observationIntelligence,
      plan: input.plan,
      commercialSynthesis: input.commercialSynthesis,
      incumbentProduct: input.incumbentProduct,
      programCompletedCount,
      providerName: input.providerName,
      ctx,
    }),
  );

  if (input.observationIntelligence?.caseRow) {
    const learningView = buildObservationLearningTabView({
      caseRow: input.observationIntelligence.caseRow,
      activities: input.observationIntelligence.activities,
      priorCases: input.observationIntelligence.priorCases,
      providerContact: input.observationIntelligence.providerContact,
    });

    learnPrompts = buildSharedUnresolvedEvidenceQuestions({
      caseRow: input.observationIntelligence.caseRow,
      priorCases: input.observationIntelligence.priorCases,
      providerContact: input.observationIntelligence.providerContact,
      activities: input.observationIntelligence.activities,
      learningView,
      maxItems: OBSERVATION_INTELLIGENCE_STILL_NEED_MAX,
      universalFactsReadModel: input.universalFactsReadModel,
    }).filter((line) => Boolean(validateRepFacingFact(line, ctx)));
  }

  const sortedPatterns = sortDebriefPreparePatterns(patterns).filter(shouldIncludeDebriefPreparePattern);
  const facts = formatDebriefPrepareObservedFacts(sortedPatterns).filter((fact) =>
    Boolean(validateRepFacingFact(fact, ctx)),
  );

  return {
    facts,
    patterns: sortedPatterns,
    strongestPattern: selectStrongestConversationPattern(sortedPatterns),
    learnPrompts,
  };
}
