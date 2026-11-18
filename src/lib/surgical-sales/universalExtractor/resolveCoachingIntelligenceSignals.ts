import {
  buildIntelligenceSignals,
  type CaseBriefingKind,
  type IntelligenceSignal,
} from "@/lib/surgical-sales/caseIntelligenceSignals";
import type { AggregatedFindingEvidence } from "@/lib/surgical-sales/observationFindingEvidenceConfidence";
import type { EvidenceProgressItem } from "@/lib/surgical-sales/buildObservationLearningTabView";
import {
  adaptUfCoachingToIntelligenceSignals,
  ufGapsToEvidenceGaps,
} from "@/lib/surgical-sales/universalExtractor/adaptUfCoachingToIntelligenceSignals";
import { adaptUniversalFactsToEvidencePillarScores } from "@/lib/surgical-sales/universalExtractor/adaptUniversalFactsToEvidencePillarScores";
import { summarizeUfCoachingGuidanceInputs } from "@/lib/surgical-sales/universalExtractor/summarizeUfCoachingGuidanceInputs";
import {
  completedObservationCaseIds,
  priorCompletedObservationCaseIds,
  resolveReadModelSection,
  type UniversalFactsReadModelPayload,
} from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import type { EvidencePillarScore } from "@/lib/surgical-sales/observationIntelligence/scoreObservationEvidence";

export function resolveCoachingIntelligenceSignals(input: {
  oieFindings: AggregatedFindingEvidence[];
  evidenceProgress: EvidenceProgressItem[];
  procedureContext: string | null;
  priorCases: Array<Record<string, unknown>>;
  caseRow: Record<string, unknown>;
  briefingKind: CaseBriefingKind;
  programCompletedCount: number;
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
  signalScope?: "prior" | "merged";
}): IntelligenceSignal[] {
  const oieSignals = buildIntelligenceSignals({
    findings: input.oieFindings,
    evidenceProgress: input.evidenceProgress,
    procedureContext: input.procedureContext,
    priorCases: input.priorCases,
    caseRow: input.caseRow,
  });

  const ufSignals =
    input.universalFactsReadModel?.programRuns?.length
      ? adaptUfCoachingToIntelligenceSignals(
          summarizeUfCoachingGuidanceInputs({
            programRuns: input.universalFactsReadModel.programRuns,
            caseRuns: input.universalFactsReadModel.caseRuns,
            caseRow: input.caseRow,
            priorCases: input.priorCases,
            briefingKind: input.briefingKind,
            programCompletedCount: input.programCompletedCount,
          }),
          input.signalScope ?? "prior",
        )
      : [];

  return resolveReadModelSection(ufSignals, () => oieSignals);
}

export function resolveEvidenceGapsForCase(input: {
  oieGaps: string[];
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
  caseRow: Record<string, unknown>;
  priorCases?: Array<Record<string, unknown>>;
  briefingKind: CaseBriefingKind;
  programCompletedCount: number;
}): string[] {
  const ufGaps =
    input.universalFactsReadModel?.programRuns?.length
      ? ufGapsToEvidenceGaps(
          summarizeUfCoachingGuidanceInputs({
            programRuns: input.universalFactsReadModel.programRuns,
            caseRuns: input.universalFactsReadModel.caseRuns,
            caseRow: input.caseRow,
            priorCases: input.priorCases,
            briefingKind: input.briefingKind,
            programCompletedCount: input.programCompletedCount,
          }).gaps,
        )
      : [];

  return resolveReadModelSection(ufGaps, () => input.oieGaps);
}

export function resolveEvidencePillarScores(input: {
  oiePillars: EvidencePillarScore[];
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
  caseRow: Record<string, unknown>;
  priorCases?: Array<Record<string, unknown>>;
}): EvidencePillarScore[] {
  const completedIds = completedObservationCaseIds({
    caseRow: input.caseRow,
    priorCases: input.priorCases,
  });

  const ufPillars =
    input.universalFactsReadModel?.programRuns?.length
      ? adaptUniversalFactsToEvidencePillarScores({
          programRuns: input.universalFactsReadModel.programRuns,
          completedCaseIds: completedIds,
        }).pillars
      : [];

  return resolveReadModelSection(ufPillars, () => input.oiePillars);
}

export { priorCompletedObservationCaseIds, completedObservationCaseIds };
