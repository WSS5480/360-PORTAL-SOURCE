/**
 * Maps Commercial Strategy Brief data into conversion-stage Prepare sections (A–G).
 */

import type { AiDebriefStrategyBuilderPath } from "@/lib/surgical-sales/engagements/aiDebriefStrategyBuilderTypes";
import type {
  CommercialStrategyBriefView,
  DebriefPrepareCommercialReadinessView,
  SupportingEvidenceView,
} from "@/lib/surgical-sales/engagements/buildCommercialStrategyBriefView";
const CONVERSION_MOTION_PATH_ORDER: AiDebriefStrategyBuilderPath[] = [
  "No Action",
  "360 Experience",
  "Case Commitment",
];
import {
  buildConversionOpening,
  buildConversionOpennessProbes,
  buildConversionPriorityProbes,
  CONVERSION_CLOSING_QUESTION,
  CONVERSION_DECISION_OUTCOMES,
  CONVERSION_MOTION_PATH_SCRIPTS,
  CONVERSION_NOT_DECIDING_TODAY,
  extractIncumbentProduct,
  formatProviderHonorific,
} from "@/lib/surgical-sales/engagements/debriefConversionCoaching";
import {
  buildValidatedMeetingObjective,
  selectHighestConfidenceWedgeTopic,
  validateRepFacingQuestion,
} from "@/lib/surgical-sales/engagements/debriefPrepareIntelligenceValidation";
import type { DebriefMotionIntelligenceBundle } from "@/lib/surgical-sales/engagements/debriefMotionIntelligenceTypes";
import { getCommercialReadinessDimension } from "@/lib/surgical-sales/engagements/commercialReadinessFrameworkTypes";

export type ConversionProgramFactView = {
  label: string;
  value: string;
};

export type ConversionProgramSummaryView = {
  subtitle: string;
  programFacts: ConversionProgramFactView[];
  crossCasePattern: string;
  crossCaseProofBullets: string[];
  incumbentContext: string | null;
  introCallContract: string | null;
};

export type ConversionDecisionView = {
  subtitle: string;
  primaryQuestion: string;
  notDecidingToday: string[];
  successOutcomes: Array<{
    outcome: string;
    meaning: string;
    repAction: string;
  }>;
  decisionHelper: string;
};

export type ConversionConversationStrategyView = {
  subtitle: string;
  opening: string;
  priorityProbes: string[];
  opennessProbes: string[];
  closingQuestion: string;
  toneCue: string | null;
};

export type ConversionMotionPathView = {
  path: AiDebriefStrategyBuilderPath;
  whenToUse: string;
  directorScript: string;
};

export type ConversionOperationalConsiderationView = {
  consideration: string;
  status: string;
  guidance: string;
};

export type ConversionConditionalProductView = {
  displayName: string;
  whyItMayBeRelevant: string;
  howToPosition: string;
  whatNotToSayYet: string;
};

export type ConversionPrepareHeaderView = {
  kicker: string;
  conversionQuestion: string;
};

export type ConversionPrepareBriefView = {
  header: ConversionPrepareHeaderView;
  observationProgramSummary: ConversionProgramSummaryView;
  conversionDecision: ConversionDecisionView;
  conversationStrategy: ConversionConversationStrategyView;
  nextMotionPaths: ConversionMotionPathView[];
  operationalConsiderations: ConversionOperationalConsiderationView[];
  conditionalProductsLabel: string;
  conditionalProducts: ConversionConditionalProductView[];
  reference: SupportingEvidenceView;
};

function formatIntroDate(date: string | null): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function pickSchedulerName(bundle: DebriefMotionIntelligenceBundle | undefined): string | null {
  if (!bundle) return null;

  const sources = [...bundle.introCall, ...bundle.contactScheduling];
  for (const item of sources) {
    const karen = item.excerpt.match(/\bKaren(?:\s+Smith)?\b/i);
    if (karen) return karen[0].replace(/\b\w/g, (c, i) => (i === 0 ? c.toUpperCase() : c));

    const scheduler = item.excerpt.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*(?:·\s*Scheduler|controls scheduling)\b/i);
    if (scheduler) return scheduler[1].trim();
  }

  return null;
}

function pickAccessStatus(bundle: DebriefMotionIntelligenceBundle | undefined): string | null {
  if (!bundle) return null;
  const approved = bundle.contactScheduling.find((item) =>
    /\bapproved\b/i.test(item.excerpt),
  );
  if (approved) return "Approved — program complete";
  const access = bundle.contactScheduling.find((item) => item.coachingUse === "access");
  if (access) return access.excerpt;
  return null;
}

function pickCredentialingNote(bundle: DebriefMotionIntelligenceBundle | undefined): string | null {
  if (!bundle) return null;
  const intro = bundle.introCall.find((item) => /\bcredential/i.test(item.excerpt));
  if (intro) return "Required per intro call";
  const contact = bundle.contactScheduling.find((item) =>
    /\bcredential/i.test(item.excerpt),
  );
  return contact ? contact.excerpt : "Confirm hospital vendor credentialing path";
}

function pickIntroCallContract(input: {
  bundle: DebriefMotionIntelligenceBundle | undefined;
  introWorkflowHint: string | null;
}): string | null {
  const { bundle, introWorkflowHint } = input;
  if (!bundle || bundle.introCall.length === 0) return null;

  const workflowFirst = bundle.introCall.find((item) =>
    /\b(workflow|before product|in the or)\b/i.test(item.excerpt),
  );
  const excerpt = workflowFirst?.excerpt ?? introWorkflowHint ?? bundle.introCall[0]?.excerpt;
  if (!excerpt) return null;

  const date = formatIntroDate(workflowFirst?.date ?? bundle.introCall[0]?.date ?? null);
  const dateClause = date ? `On the intro call (${date}), ` : "On the intro call, ";

  if (
    /\b(workflow|before product|in the or)\b/i.test(excerpt) ||
    /\b(workflow|before product)\b/i.test(introWorkflowHint ?? "")
  ) {
    return `${dateClause}the surgeon asked to see how solutions fit actual workflow in the OR before discussing product. You have now completed that program — honor that sequence in the room.`;
  }

  return `${dateClause}the surgeon set terms for this relationship before product talk. You have now completed the observation program — honor that sequence in the room.`;
}

function pickIntroWorkflowHint(lines: string[]): string | null {
  const match = lines.find((line) =>
    /\b(workflow|before product|in the or)\b/i.test(line),
  );
  return match?.trim() ?? null;
}

function buildCrossCaseProofBullets(
  evidence: SupportingEvidenceView,
  wedgeTopic: string,
): string[] {
  const refs = evidence.observationReferences
    .filter((ref) => {
      const blob = `${ref.excerpt} ${ref.contribution}`.toLowerCase();
      const topicTokens = wedgeTopic.toLowerCase().split(/\s+/).filter((t) => t.length > 4);
      return topicTokens.some((token) => blob.includes(token)) || ref.observationIndex != null;
    })
    .slice(0, 4)
    .map((ref) => {
      const prefix = ref.observationIndex ? `Obs #${ref.observationIndex}: ` : "";
      return `${prefix}${ref.excerpt}`;
    });

  if (refs.length > 0) return refs;

  return evidence.learnedBullets.slice(0, 3);
}

function buildOperationalConsiderations(input: {
  schedulerName: string | null;
  accessStatus: string | null;
  credentialingNote: string | null;
}): ConversionOperationalConsiderationView[] {
  const scheduler = input.schedulerName ?? "Scheduler on file";
  const access = input.accessStatus ?? "Approved — observation program complete";

  return [
    {
      consideration: "Scheduler",
      status: scheduler,
      guidance: "Any next step: coordinate follow-up through the scheduler.",
    },
    {
      consideration: "Credentialing",
      status: input.credentialingNote ?? "Required before OR activity",
      guidance: "Do not promise OR activity until hospital vendor credentialing is confirmed.",
    },
    {
      consideration: "Observation access",
      status: access,
      guidance: "Do not re-ask for observation permission.",
    },
    {
      consideration: "Scheduling",
      status: `Route through ${scheduler}`,
      guidance: "Do not invent dates in the debrief room.",
    },
  ];
}

function personalizeMotionScript(script: string, schedulerName: string | null): string {
  if (!schedulerName) return script;
  return script.replace(/\bthe scheduler\b/gi, schedulerName);
}

function buildConditionalProducts(
  brief: CommercialStrategyBriefView,
  wedgeTopic: string,
): ConversionConditionalProductView[] {
  return brief.productOpportunities
    .filter(
      (product) =>
        product.productName != null &&
        product.fitLevel !== "explore_first" &&
        product.fitLevel !== "low",
    )
    .slice(0, 2)
    .map((product) => ({
      displayName: product.displayName,
      whyItMayBeRelevant: product.whyItMayFit || wedgeTopic,
      howToPosition: product.howToPosition,
      whatNotToSayYet: product.whatNotToSayYet,
    }));
}

function sanitizeProbeList(probes: string[], providerName: string | null): string[] {
  const ctx = { providerName };
  return probes
    .map((probe) => validateRepFacingQuestion(probe, ctx))
    .filter((probe): probe is string => Boolean(probe));
}

export function buildConversionPrepareBriefView(input: {
  commercialStrategyBrief: CommercialStrategyBriefView;
  commercialReadiness: DebriefPrepareCommercialReadinessView;
  providerName?: string | null;
  organizationName?: string | null;
  procedureLabel?: string | null;
  completedObservationCount?: number;
  competitorSummaries?: string[];
  motionIntelligence?: DebriefMotionIntelligenceBundle;
  introWorkflowHints?: string[];
}): ConversionPrepareBriefView {
  const brief = input.commercialStrategyBrief;
  const readiness = input.commercialReadiness;
  const providerName = input.providerName ?? null;
  const completedObservationCount = Math.max(0, input.completedObservationCount ?? 0);
  const isFirstDebrief = (input.motionIntelligence?.priorDebrief.length ?? 0) === 0;

  const workflowPain = getCommercialReadinessDimension(readiness.framework, "workflow_pain");
  const wedgeTopic = selectHighestConfidenceWedgeTopic({
    workflowPainEvidence: workflowPain.evidence[0] ?? null,
    workflowPainReasoning: workflowPain.reasoning,
    workflowPainScore: workflowPain.score,
    learnedBullets: [
      ...brief.supportingEvidence.learnedBullets,
      ...brief.supportingEvidence.observationReferences.map((ref) => ref.excerpt),
    ],
    providerName,
  });

  const incumbentProduct = extractIncumbentProduct({
    competitorSummaries: input.competitorSummaries ?? [],
    learnedBullets: [
      ...brief.supportingEvidence.learnedBullets,
      ...brief.supportingEvidence.observationReferences.map((ref) => ref.excerpt),
    ],
    providerName,
  });

  const schedulerName = pickSchedulerName(input.motionIntelligence);
  const accessStatus = pickAccessStatus(input.motionIntelligence);
  const credentialingNote = pickCredentialingNote(input.motionIntelligence);
  const introWorkflowHint = pickIntroWorkflowHint(input.introWorkflowHints ?? []);
  const introCallContract = pickIntroCallContract({
    bundle: input.motionIntelligence,
    introWorkflowHint,
  });

  const procedureLabel = input.procedureLabel?.trim() || null;
  const countLabel =
    completedObservationCount === 1
      ? "1 observation"
      : `${completedObservationCount} observations`;

  const programFacts: ConversionProgramFactView[] = [
    {
      label: "Procedure focus",
      value: procedureLabel
        ? `${procedureLabel} — ${countLabel} completed`
        : `${countLabel} completed`,
    },
    {
      label: "Observation approval",
      value: accessStatus?.includes("Approved") ? accessStatus : "Granted — program complete",
    },
  ];

  if (schedulerName) {
    programFacts.push({ label: "Scheduler", value: schedulerName });
  }

  programFacts.push({
    label: "Program status",
    value: isFirstDebrief
      ? "Complete — first provider debrief"
      : "Complete — observation program delivered",
  });

  const crossCasePattern =
    completedObservationCount >= 2
      ? `Across multiple observed cases, the team repeatedly experienced ${wedgeTopic}. This is the primary commercial wedge for today — not a single-case anecdote.`
      : `The primary workflow signal from observation is ${wedgeTopic}.`;

  const priorityProbes = sanitizeProbeList(
    buildConversionPriorityProbes({
      wedgeTopic,
      impactQuestions: brief.conversationPlan.understandImpact,
      validateQuestions: brief.conversationPlan.validateObservation,
      introPostProofQuestion: introCallContract
        ? "On our intro call you said you wanted to see workflow in the OR before product talk. Now that we've completed the observation program, is there a workflow issue here you'd actually consider acting on?"
        : null,
      isFirstDebrief,
    }),
    providerName,
  );

  const opennessProbes = sanitizeProbeList(
    buildConversionOpennessProbes({
      opennessQuestions: brief.conversationPlan.exploreOpenness,
      incumbentProduct,
      isFirstDebrief,
    }),
    providerName,
  );

  const provider = formatProviderHonorific(providerName);

  return {
    header: {
      kicker: isFirstDebrief
        ? "First Debrief · Observation Program Complete"
        : "Debrief · Observation Program Complete",
      conversionQuestion: buildValidatedMeetingObjective({
        wedgeTopic,
        providerName,
        completedObservationCount,
      }),
    },
    observationProgramSummary: {
      subtitle: "What we already proved — do not re-ask these in the debrief",
      programFacts,
      crossCasePattern,
      crossCaseProofBullets: buildCrossCaseProofBullets(brief.supportingEvidence, wedgeTopic),
      incumbentContext: incumbentProduct
        ? `${incumbentProduct} was used across observed cases. Competitive conversation today is about timing and appetite, not whether the product is present.`
        : null,
      introCallContract,
    },
    conversionDecision: {
      subtitle: "What you must decide in this debrief",
      primaryQuestion: buildValidatedMeetingObjective({
        wedgeTopic,
        providerName,
        completedObservationCount,
      }),
      notDecidingToday: CONVERSION_NOT_DECIDING_TODAY,
      successOutcomes: [...CONVERSION_DECISION_OUTCOMES],
      decisionHelper:
        "You are not asking whether you were right. You are asking whether this rises to the level of something they would consider changing. If they say no, that is a successful debrief — not a failed one.",
    },
    conversationStrategy: {
      subtitle: "How to test priority and openness — program language",
      opening: buildConversionOpening({
        providerName,
        procedureLabel,
        completedObservationCount,
        wedgeTopic,
      }),
      priorityProbes,
      opennessProbes,
      closingQuestion: CONVERSION_CLOSING_QUESTION,
      toneCue: /frustration|visualization|fixation/.test(wedgeTopic)
        ? "Match empathy, not optimization cheerfulness. Later observations documented frustration during that phase — acknowledge that weight if they bring it up."
        : null,
    },
    nextMotionPaths: CONVERSION_MOTION_PATH_ORDER.map((path) => {
      const script = CONVERSION_MOTION_PATH_SCRIPTS[path];
      return {
        path,
        whenToUse: script.whenToUse,
        directorScript: personalizeMotionScript(script.directorScript, schedulerName),
      };
    }),
    operationalConsiderations: buildOperationalConsiderations({
      schedulerName,
      accessStatus,
      credentialingNote,
    }),
    conditionalProductsLabel: `If ${provider} agrees the observed issue is worth addressing…`,
    conditionalProducts: buildConditionalProducts(brief, wedgeTopic),
    reference: brief.supportingEvidence,
  };
}
