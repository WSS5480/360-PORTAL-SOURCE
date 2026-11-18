import type { ProviderDebriefPlan } from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";
import { PROVIDER_DEBRIEF_PLAN_VERSION } from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";
import { PROVIDER_OBSERVATION_TARGET } from "@/lib/surgical-sales/providerObservationProgress";

export type GenericProviderDebriefPlanInput = {
  providerId: string | null;
  providerName: string | null;
  facilityName: string | null;
  completedObservationCount: number;
  generatedAt?: string;
};

const GENERIC_DEBRIEF_OBJECTIVE =
  "Review what you observed with the surgeon, validate your takeaways, and agree on one concrete next step.";

const GENERIC_DISCUSSION_TOPICS = [
  "Clinical workflow patterns that stood out during observations",
  "Recurring frustrations or friction in the OR",
  "Current product usage and competitive context",
  "Whether what you observed matches the surgeon's priorities",
  "What would need to be true to move toward evaluation",
] as const;

const GENERIC_QUESTIONS = [
  "What stood out to you most from the cases we observed?",
  "Which workflow challenges show up most often in your cases?",
  "How are you using products today, and what would you change if you could?",
  "What would need to be true before you'd consider trying something new?",
  "From your perspective, what is the best next step?",
] as const;

function genericNextStep(input: GenericProviderDebriefPlanInput): ProviderDebriefPlan["recommendedNextStep"] {
  const providerLabel = input.providerName?.trim() || "the surgeon";
  const count = Math.max(0, input.completedObservationCount);

  if (count === 0) {
    return {
      action: "capture_additional_observation_notes",
      title: "Complete observation cases first",
      body: "Schedule and document OR observations before the provider debrief so you have concrete learnings to review.",
      priority: 100,
    };
  }

  if (count < PROVIDER_OBSERVATION_TARGET) {
    return {
      action: "capture_additional_observation_notes",
      title: "Continue the observation program",
      body: `${count} of ${PROVIDER_OBSERVATION_TARGET} observations complete — capture notes on remaining cases, then validate patterns with ${providerLabel}.`,
      priority: 95,
    };
  }

  return {
    action: "schedule_provider_debrief",
    title: "Guide the debrief conversation",
    body: `Use this preparation guide to walk through learnings with ${providerLabel} and confirm what matters most clinically.`,
    priority: 90,
  };
}

/** Fallback debrief plan when no observation case intelligence is on file yet. */
export function buildGenericProviderDebriefPlan(input: GenericProviderDebriefPlanInput): ProviderDebriefPlan {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const count = Math.max(0, input.completedObservationCount);
  const supporting: string[] = [];

  if (count > 0) {
    supporting.push(
      count >= PROVIDER_OBSERVATION_TARGET
        ? `${count} completed observations on file — use the conversation to validate recurring patterns.`
        : `${count} observation${count === 1 ? "" : "s"} on file — confirm whether early signals are repeatable.`,
    );
  } else {
    supporting.push("Document observation notes as cases complete so future debriefs get sharper.");
  }
  supporting.push("Leave with one agreed next step before ending the conversation.");

  return {
    version: PROVIDER_DEBRIEF_PLAN_VERSION,
    generatedAt,
    context: {
      caseId: "generic-debrief-plan",
      providerId: input.providerId,
      providerName: input.providerName,
      facilityName: input.facilityName,
      procedureLabel: null,
      caseDateLabel: null,
      observationMission: null,
    },
    whatWeLearned: [],
    whatWeStillDontKnow: GENERIC_QUESTIONS.slice(0, 3).map((question, index) => ({
      id: `generic-unknown-${index}`,
      kind: "clinical_gap" as const,
      question,
      rationale: "Validate assumptions directly with the surgeon.",
      priority: 90 - index,
    })),
    suggestedObjectives: GENERIC_DISCUSSION_TOPICS.map((text, index) => ({
      id: `generic-topic-${index}`,
      text,
      derivedFrom: [],
    })),
    suggestedQuestions: GENERIC_QUESTIONS.map((text, index) => ({
      id: `generic-q-${index}`,
      text,
      objectiveId: null,
      priority: 100 - index,
    })),
    productOpportunityAssessment: [
      {
        product: "future_opportunity",
        fitLevel: "unknown",
        fitRationale: [
          count > 0
            ? "Product fit will become clearer once you validate observation notes with the surgeon."
            : "Complete observations and note product interest before assessing fit.",
        ],
        evidence: [],
      },
    ],
    desiredMeetingOutcome: {
      primary: GENERIC_DEBRIEF_OBJECTIVE,
      supporting,
    },
    recommendedNextStep: genericNextStep(input),
    alternateNextSteps: [],
    hasSufficientInputs: false,
    inputSummary: {
      noteCount: 0,
      extractedSignalCount: 0,
      validationTargetsObserved: 0,
      validationTargetsPlanned: 0,
      priorObservationCaseCount: count,
    },
    longitudinalIntelligence: {
      observationCaseCount: count,
      observedProcedures: [],
      recurringPainPoints: [],
      competitiveProductsSeen: [],
      opportunitySignals: [],
      productFitTrends: [],
    },
  };
}

export function resolveProviderDebriefPlanMode(plan: ProviderDebriefPlan): "generic" | "intelligence" {
  if (plan.context.caseId === "generic-debrief-plan") return "generic";
  if (plan.hasSufficientInputs || plan.whatWeLearned.length > 0) return "intelligence";

  const li = plan.longitudinalIntelligence;
  if (
    li.recurringPainPoints.length > 0 ||
    li.competitiveProductsSeen.length > 0 ||
    li.productFitTrends.length > 0 ||
    li.opportunitySignals.length > 0
  ) {
    return "intelligence";
  }

  return "generic";
}
