/**
 * Lightweight auto-generated draft for debrief prepare workspace — observation facts only.
 */

import type { ConversionPrepareBriefView } from "@/lib/surgical-sales/engagements/buildConversionPrepareBriefView";
import { extractIncumbentProduct } from "@/lib/surgical-sales/engagements/debriefConversionCoaching";
import {
  buildDebriefPrepareObservedProgramFacts,
  type DebriefPrepareObservationIntelligenceInput,
} from "@/lib/surgical-sales/engagements/buildDebriefPrepareObservedProgramFacts";
import {
  buildValidatedMeetingObjective,
  planningContentContainsBannedPattern,
  sanitizeMeetingObjectiveForDisplay,
  selectHighestConfidenceWedgeTopic,
  type DebriefPrepareValidationContext,
} from "@/lib/surgical-sales/engagements/debriefPrepareIntelligenceValidation";
import type { DebriefPrepareWorkspaceDraft } from "@/lib/surgical-sales/engagements/debriefPrepareWorkspace";
import { buildCommercialSignalDraft } from "@/lib/surgical-sales/engagements/debriefPreparePlanningAssist";
import { buildDebriefGuidanceIntelligence } from "@/lib/surgical-sales/engagements/buildDebriefGuidanceIntelligence";
import type { DebriefPrepareCommercialReadinessView } from "@/lib/surgical-sales/engagements/buildCommercialStrategyBriefView";
import type { DebriefCommercialSynthesis } from "@/lib/surgical-sales/engagements/buildDebriefCommercialSynthesis";
import type { ProviderDebriefPlan } from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";
import { getCommercialReadinessDimension } from "@/lib/surgical-sales/engagements/commercialReadinessFrameworkTypes";
import type { UniversalFactsReadModelPayload } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";

function filterObservationOnlyFacts(facts: string[]): string[] {
  return facts.filter(
    (fact) =>
      !/scheduler|credentialing|observation access|permission approved|procedure focus|commercial wedge|primary commercial|apple product|product used surgery/i.test(
        fact,
      ),
  );
}

export function buildDebriefPrepareWorkspaceDraft(input: {
  conversionBrief: ConversionPrepareBriefView;
  commercialReadiness: DebriefPrepareCommercialReadinessView;
  commercialSynthesis: DebriefCommercialSynthesis;
  plan: ProviderDebriefPlan;
  completedObservationCount: number;
  competitorSummaries?: string[];
  isFirstDebrief?: boolean;
  providerName?: string | null;
  procedureLabel?: string | null;
  observationIntelligence?: DebriefPrepareObservationIntelligenceInput | null;
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
}): DebriefPrepareWorkspaceDraft {
  const { conversionBrief: brief, commercialReadiness, commercialSynthesis, plan, completedObservationCount } =
    input;
  const ctx: DebriefPrepareValidationContext = {
    providerName: input.providerName,
    completedObservationCount,
  };

  const workflowPain = getCommercialReadinessDimension(
    commercialReadiness.framework,
    "workflow_pain",
  );

  const wedgeTopic = selectHighestConfidenceWedgeTopic({
    workflowPainEvidence: workflowPain.evidence[0] ?? null,
    workflowPainReasoning: workflowPain.reasoning,
    workflowPainScore: workflowPain.score,
    learnedBullets: [
      ...brief.reference.learnedBullets,
      ...brief.reference.observationReferences.map((ref) => ref.excerpt),
    ],
    providerName: input.providerName,
  });

  const incumbentProduct = extractIncumbentProduct({
    competitorSummaries: input.competitorSummaries ?? [],
    learnedBullets: [
      ...brief.reference.learnedBullets,
      ...brief.reference.observationReferences.map((ref) => ref.excerpt),
    ],
    providerName: input.providerName,
  });

  const procedureLabel =
    input.procedureLabel?.trim() ||
    brief.observationProgramSummary.programFacts
      .find((row) => row.label === "Procedure focus")
      ?.value.replace(/\s*—\s*\d+\s+observations?.*$/i, "")
      .trim() ||
    null;

  const observedProgram = buildDebriefPrepareObservedProgramFacts({
    observationIntelligence: input.observationIntelligence,
    plan,
    commercialSynthesis,
    completedObservationCount,
    providerName: input.providerName,
    incumbentProduct,
    ctx,
    universalFactsReadModel: input.universalFactsReadModel,
  });

  const strongestConversationPattern = observedProgram.strongestPattern;

  const meetingObjective = sanitizeMeetingObjectiveForDisplay(
    buildValidatedMeetingObjective({
      strongestPatternLabel: strongestConversationPattern?.label ?? null,
      wedgeTopic,
      providerName: input.providerName,
      completedObservationCount,
    }),
  );

  const knownFacts = filterObservationOnlyFacts(observedProgram.facts);

  const planningContext = {
    draft: {
      meetingObjective,
      knownFacts,
      whyItMatters: "",
      suggestedHypothesis: "",
      suggestedLearnItems: [],
      suggestedQuestions: [],
      wedgeTopic,
      incumbentProduct,
      procedureLabel,
      providerName: input.providerName ?? null,
      strongestObservedPattern: strongestConversationPattern?.label ?? null,
    },
    patterns: observedProgram.patterns,
    providerName: input.providerName ?? null,
    procedureLabel,
    wedgeTopic,
    incumbentProduct,
  };

  // Staged intelligence pipeline — generate once from observation patterns and unresolved gaps only.
  const guidanceIntelligence = buildDebriefGuidanceIntelligence({
    patterns: observedProgram.patterns,
    unresolvedObservationPrompts: observedProgram.learnPrompts,
    providerName: input.providerName,
    procedureLabel,
  });

  const draft: DebriefPrepareWorkspaceDraft = {
    meetingObjective,
    knownFacts,
    whyItMatters: buildCommercialSignalDraft(planningContext),
    suggestedHypothesis: guidanceIntelligence.primaryHypothesis,
    suggestedLearnItems: guidanceIntelligence.whatToValidate,
    suggestedQuestions: guidanceIntelligence.conversationStarters,
    wedgeTopic,
    incumbentProduct,
    procedureLabel,
    providerName: input.providerName ?? null,
    strongestObservedPattern: strongestConversationPattern?.label ?? null,
    guidanceIntelligence,
  };

  if (planningContentContainsBannedPattern(draft)) {
    return {
      ...draft,
      meetingObjective: sanitizeMeetingObjectiveForDisplay(draft.meetingObjective),
      knownFacts: filterObservationOnlyFacts(draft.knownFacts),
    };
  }

  return draft;
}
