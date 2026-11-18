/**
 * Presentation mapper — rep-first Commercial Strategy Brief from existing strategy + framework data.
 * No AI calls; no extraction changes.
 */

import type {
  AiDebriefStrategyBuilderOutput,
  AiDebriefStrategyBuilderPath,
} from "@/lib/surgical-sales/engagements/aiDebriefStrategyBuilderTypes";
import type {
  DebriefCommercialProductCandidate,
  DebriefCommercialSynthesis,
} from "@/lib/surgical-sales/engagements/buildDebriefCommercialSynthesis";
import type {
  CommercialReadinessDimensionId,
  CommercialReadinessFramework,
} from "@/lib/surgical-sales/engagements/commercialReadinessFrameworkTypes";
import {
  getCommercialReadinessDimension,
} from "@/lib/surgical-sales/engagements/commercialReadinessFrameworkTypes";
import {
  getDebriefProductKnowledge,
  tryResolveDebriefProductKnowledgeId,
  type DebriefProductKnowledge,
} from "@/lib/surgical-sales/engagements/debriefProductKnowledge";
import type { AiDebriefStrategyBuilderSource } from "@/lib/surgical-sales/engagements/aiDebriefStrategyBuilderTypes";
import {
  buildAttributionsForFrameworkDimension,
  buildAttributionsForProductGuardrail,
  buildAttributionsForProductWhyItMayFit,
  classifyProductFieldFromAttributions,
  type EvidenceAttribution,
  type FieldClassification,
} from "@/lib/surgical-sales/engagements/commercialEvidenceAttribution";
import type { ProviderObservationNoteEntry } from "@/lib/surgical-sales/engagements/loadProviderObservationNoteCorpus";
import { resolveProductCardCopy } from "@/lib/surgical-sales/engagements/resolveProductCardCopy";
import type { ProviderDebriefPlanProductFitLevel } from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";
import {
  buildMotionIntelligenceReferences,
  motionItemToAttribution,
} from "@/lib/surgical-sales/engagements/buildDebriefMotionIntelligence";
import type {
  DebriefMotionIntelligenceBundle,
  MotionIntelligenceReferenceView,
} from "@/lib/surgical-sales/engagements/debriefMotionIntelligenceTypes";

export type DebriefPrepareAdvancementPathView = {
  path: AiDebriefStrategyBuilderPath;
  recommended: boolean;
  why: string;
  attributions?: EvidenceAttribution[];
};

export type DebriefPrepareCommercialReadinessDimensionView = {
  id: CommercialReadinessDimensionId;
  label: string;
  score: number;
  scoreBand: "weak" | "developing" | "strong" | "ready";
  scoreBandLabel: string;
  confidence: "High" | "Medium" | "Low";
  reasoning: string;
  evidence: string[];
  supportingObservations: Array<{
    observationIndex: number | null;
    sourceNoteId: string | null;
    excerpt: string;
    contribution: string;
  }>;
};

export type DebriefPrepareCommercialReadinessView = {
  framework: CommercialReadinessFramework;
  directorSummary: string;
  primaryCommercialLever: string;
  primaryCommercialLeverLabel: string;
  primaryRisk: string;
  dimensions: DebriefPrepareCommercialReadinessDimensionView[];
};

export type CommercialStrategyBriefSourceView = {
  missionWhy: string;
  missionSuccess: string;
  desiredOutcome: string;
  whatWeThinkWeLearned: string[];
  recommendedProductAngle: AiDebriefStrategyBuilderOutput["recommendedProductAngle"];
  conversationStrategy: AiDebriefStrategyBuilderOutput["conversationStrategy"];
  advancementPaths: DebriefPrepareAdvancementPathView[];
  commercialReadiness: DebriefPrepareCommercialReadinessView;
};

export type ProductOpportunityFitLevel = "high" | "moderate" | "low" | "explore_first";

export type ProductOpportunityFieldClassifications = {
  whyItMayFit: FieldClassification;
  whatMustBeValidated: FieldClassification;
  whatNotToSayYet: FieldClassification;
};

export type ProductOpportunityCardView = {
  productName: string | null;
  displayName: string;
  fitLevel: ProductOpportunityFitLevel;
  fitLevelLabel: string;
  isLeadAngle: boolean;
  whyItMayFit: string;
  whatMustBeValidated: string;
  howToPosition: string;
  whatNotToSayYet: string;
  fieldClassifications?: ProductOpportunityFieldClassifications;
  attributions?: {
    whyItMayFit: EvidenceAttribution[];
    whatMustBeValidated: EvidenceAttribution[];
    whatNotToSayYet: EvidenceAttribution[];
  };
};

export type CommercialStrategySnapshotView = {
  primaryLever: string;
  primaryRisk: string;
  bestNextStep: string;
  confidence: "High" | "Medium" | "Low";
};

export type ConversationPlanView = {
  opening: string;
  validateObservation: string[];
  understandImpact: string[];
  exploreOpenness: string[];
  closingQuestion: string;
  attributions?: {
    validateObservation: EvidenceAttribution[][];
    exploreOpenness: EvidenceAttribution[][];
    closingQuestion: EvidenceAttribution[];
  };
};

export type ObservationReferenceView = {
  observationIndex: number | null;
  excerpt: string;
  contribution: string;
};

export type SupportingEvidenceView = {
  learnedBullets: string[];
  commercialReadiness: DebriefPrepareCommercialReadinessView;
  observationReferences: ObservationReferenceView[];
  dimensionAttributions?: Record<string, EvidenceAttribution[]>;
  motionIntelligenceReferences?: MotionIntelligenceReferenceView[];
};

export type CommercialStrategyBriefView = {
  executiveBrief: string;
  snapshot: CommercialStrategySnapshotView;
  productOpportunities: ProductOpportunityCardView[];
  conversationPlan: ConversationPlanView;
  advancementPaths: DebriefPrepareAdvancementPathView[];
  supportingEvidence: SupportingEvidenceView;
  frameworkSource?: AiDebriefStrategyBuilderSource | "generic";
};

const EXPLORE_FIRST_LABEL = "Potential product conversation";
const EXPLORE_FIRST_WHY =
  "Focus the debrief on whether observed workflow friction is worth acting on before naming a specific product.";
const EXPLORE_FIRST_VALIDATE =
  "Confirm whether what you observed matches the surgeon's priorities and is painful enough to explore a change.";
const EXPLORE_FIRST_POSITION =
  "Start with the workflow moment you observed — ask whether it affects case flow or decision-making before introducing any product.";
const EXPLORE_FIRST_AVOID =
  "Do not pitch a product until the surgeon confirms the workflow issue is meaningful.";

const FIT_LEVEL_LABELS: Record<ProductOpportunityFitLevel, string> = {
  high: "High fit",
  moderate: "Moderate fit",
  low: "Low fit",
  explore_first: "Explore workflow value first",
};

function truncate(text: string, max = 140): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

function ensureSentence(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (/[.!?]$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
}

function mapPlanFitToOpportunityFit(
  fitLevel: ProviderDebriefPlanProductFitLevel | undefined,
): ProductOpportunityFitLevel | null {
  switch (fitLevel) {
    case "strong":
      return "high";
    case "possible":
    case "needs_surgeon_confirmation":
      return "moderate";
    case "unknown":
      return "low";
    case "unlikely":
      return null;
    default:
      return null;
  }
}

function mapStrategyFitToOpportunityFit(
  fitLevel: AiDebriefStrategyBuilderOutput["recommendedProductAngle"]["fitLevel"],
): ProductOpportunityFitLevel {
  switch (fitLevel) {
    case "strong":
      return "high";
    case "moderate":
      return "moderate";
    case "weak":
      return "low";
    default:
      return "explore_first";
  }
}

function aggregateFrameworkConfidence(
  readiness: DebriefPrepareCommercialReadinessView,
): "High" | "Medium" | "Low" {
  const topDimensions = [...readiness.dimensions]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const highCount = topDimensions.filter((d) => d.confidence === "High").length;
  const mediumOrHigh = topDimensions.filter(
    (d) => d.confidence === "High" || d.confidence === "Medium",
  ).length;

  if (highCount >= 2) return "High";
  if (mediumOrHigh >= 1) return "Medium";
  return "Low";
}

export function buildExecutiveBriefParagraph(input: {
  readiness: DebriefPrepareCommercialReadinessView;
  missionWhy: string;
  desiredOutcome: string;
  learnedBullets: string[];
  providerName: string | null;
  priorDebriefCommitment?: string | null;
}): string {
  const provider = input.providerName?.trim() || "the surgeon";
  const observed =
    input.learnedBullets[0]?.replace(/\s*\([^)]*\/100[^)]*\)/g, "").trim() ||
    input.readiness.directorSummary.replace(/\.$/, "") ||
    input.missionWhy.replace(/\.$/, "");

  const commercialWhy = truncate(
    input.readiness.primaryCommercialLeverLabel
      ? `The primary commercial lever is ${input.readiness.primaryCommercialLeverLabel.toLowerCase()} — ${truncate(input.readiness.primaryRisk, 100).replace(/\.$/, "")}`
      : input.readiness.primaryRisk,
    160,
  );

  const outcome = truncate(
    input.desiredOutcome ||
      `Use this debrief to confirm what matters to ${provider} before recommending any commercial next step.`,
    160,
  );

  const observedClause = observed.charAt(0).toLowerCase() + observed.slice(1).replace(/\.$/, "");

  let paragraph = ensureSentence(
    `Across recent observations, ${observedClause}. Commercially, ${commercialWhy.replace(/\.$/, "")}. This debrief should ${outcome.charAt(0).toLowerCase()}${outcome.slice(1).replace(/^this debrief should /i, "").replace(/\.$/, "")}.`,
  );

  if (input.priorDebriefCommitment?.trim()) {
    paragraph = ensureSentence(
      `${paragraph} Carry forward the prior debrief commitment: ${input.priorDebriefCommitment.replace(/\.$/, "")}.`,
    );
  }

  return paragraph;
}

function shouldIncludeProductCandidate(candidate: DebriefCommercialProductCandidate): boolean {
  if (candidate.fitLevel === "unlikely") {
    return candidate.observationLinkedRationale.length > 0;
  }
  return (
    candidate.fitLevel === "strong" ||
    candidate.fitLevel === "possible" ||
    candidate.fitLevel === "needs_surgeon_confirmation" ||
    candidate.fitLevel === "unknown"
  );
}

function buildProductCardFromCandidate(input: {
  candidate: DebriefCommercialProductCandidate;
  knowledge: DebriefProductKnowledge | null;
  productFitReasoning: string;
  primaryRisk: string;
  isLeadAngle: boolean;
  strategyAngle?: AiDebriefStrategyBuilderOutput["recommendedProductAngle"];
  procedureLabel: string | null;
  completedObservationCount: number;
  observationCorpus: ProviderObservationNoteEntry[];
}): ProductOpportunityCardView {
  const fitLevel = mapPlanFitToOpportunityFit(input.candidate.fitLevel) ?? "low";
  const rationale =
    input.candidate.observationLinkedRationale[0] ||
    input.strategyAngle?.why ||
    input.productFitReasoning;

  const whyItMayFit = ensureSentence(
    rationale ||
      `${input.candidate.productName} may be relevant to what you observed — confirm workflow value with the surgeon first.`,
  );

  const copyContext = {
    procedureLabel: input.procedureLabel,
    completedObservationCount: input.completedObservationCount,
    productId: input.candidate.productName,
  };

  const resolvedCopy = resolveProductCardCopy({
    avoidWhen: input.knowledge?.avoidWhen[0],
    validationNeeded:
      input.candidate.validationNeeded ||
      input.strategyAngle?.risk ||
      input.primaryRisk,
    fallbackValidate: ensureSentence(
      input.strategyAngle?.risk || input.primaryRisk || EXPLORE_FIRST_VALIDATE,
    ),
    fallbackAvoid: ensureSentence(EXPLORE_FIRST_AVOID),
    context: copyContext,
  });

  const whatMustBeValidated = ensureSentence(resolvedCopy.whatMustBeValidated);
  const whatNotToSayYet = ensureSentence(resolvedCopy.whatNotToSayYet);

  const howToPosition = input.knowledge
    ? ensureSentence(
        input.knowledge.experience360Positioning ||
          input.knowledge.workflowTriggers[0] ||
          input.knowledge.shortDescription,
      )
    : ensureSentence(
        "Lead with the observed workflow moment and ask whether it affects case flow before positioning product.",
      );

  const whyAttributions = buildAttributionsForProductWhyItMayFit({
    candidate: input.candidate,
    strategyWhy: input.strategyAngle?.why,
    productFitReasoning: input.productFitReasoning,
    observationCorpus: input.observationCorpus,
  });
  const validateAttributions = buildAttributionsForProductGuardrail({
    knowledge: input.knowledge,
    validationNeeded:
      input.candidate.validationNeeded ||
      input.strategyAngle?.risk ||
      input.primaryRisk,
    fallbackValidate: ensureSentence(
      input.strategyAngle?.risk || input.primaryRisk || EXPLORE_FIRST_VALIDATE,
    ),
    fallbackAvoid: ensureSentence(EXPLORE_FIRST_AVOID),
    context: copyContext,
    field: "whatMustBeValidated",
  });
  const avoidAttributions = buildAttributionsForProductGuardrail({
    knowledge: input.knowledge,
    validationNeeded: null,
    fallbackValidate: ensureSentence(
      input.strategyAngle?.risk || input.primaryRisk || EXPLORE_FIRST_VALIDATE,
    ),
    fallbackAvoid: ensureSentence(EXPLORE_FIRST_AVOID),
    context: copyContext,
    field: "whatNotToSayYet",
  });

  return {
    productName: input.candidate.productName,
    displayName: input.candidate.productName,
    fitLevel,
    fitLevelLabel: FIT_LEVEL_LABELS[fitLevel],
    isLeadAngle: input.isLeadAngle,
    whyItMayFit,
    whatMustBeValidated,
    howToPosition,
    whatNotToSayYet,
    fieldClassifications: {
      whyItMayFit: classifyProductFieldFromAttributions(
        whyAttributions,
        input.candidate.observationLinkedRationale.length > 0,
      ),
      whatMustBeValidated: validateAttributions.classification,
      whatNotToSayYet: avoidAttributions.classification,
    },
    attributions: {
      whyItMayFit: whyAttributions,
      whatMustBeValidated: validateAttributions.attributions,
      whatNotToSayYet: avoidAttributions.attributions,
    },
  };
}

function buildExploreFirstCard(input: {
  workflowEvidence: string;
  primaryRisk: string;
  isLeadAngle: boolean;
}): ProductOpportunityCardView {
  const why = input.workflowEvidence
    ? ensureSentence(
        `${EXPLORE_FIRST_WHY.replace(/\.$/, "")} — ${input.workflowEvidence.replace(/\.$/, "")}.`,
      )
    : ensureSentence(EXPLORE_FIRST_WHY);

  return {
    productName: null,
    displayName: EXPLORE_FIRST_LABEL,
    fitLevel: "explore_first",
    fitLevelLabel: FIT_LEVEL_LABELS.explore_first,
    isLeadAngle: input.isLeadAngle,
    whyItMayFit: why,
    whatMustBeValidated: ensureSentence(input.primaryRisk || EXPLORE_FIRST_VALIDATE),
    howToPosition: ensureSentence(EXPLORE_FIRST_POSITION),
    whatNotToSayYet: ensureSentence(EXPLORE_FIRST_AVOID),
  };
}

export function buildProductOpportunityCards(input: {
  productCandidates: DebriefCommercialProductCandidate[];
  productKnowledge: DebriefProductKnowledge[];
  strategy: AiDebriefStrategyBuilderOutput;
  readiness: DebriefPrepareCommercialReadinessView;
  procedureLabel?: string | null;
  completedObservationCount?: number;
  observationCorpus?: ProviderObservationNoteEntry[];
}): ProductOpportunityCardView[] {
  const procedureLabel = input.procedureLabel ?? null;
  const completedObservationCount = Math.max(0, input.completedObservationCount ?? 0);
  const observationCorpus = input.observationCorpus ?? [];
  const leadProductName = input.strategy.recommendedProductAngle.productName;
  const productFit = getCommercialReadinessDimension(
    input.readiness.framework,
    "product_fit",
  );
  const workflowPain = getCommercialReadinessDimension(
    input.readiness.framework,
    "workflow_pain",
  );

  const cards: ProductOpportunityCardView[] = [];
  const included = input.productCandidates
    .filter(shouldIncludeProductCandidate)
    .slice(0, 3);

  for (const candidate of included) {
    const resolved = tryResolveDebriefProductKnowledgeId(candidate.productName);
    const knowledge = resolved ? getDebriefProductKnowledge(resolved) : null;
    const isLead =
      !!leadProductName &&
      candidate.productName.toLowerCase() === leadProductName.toLowerCase();

    cards.push(
      buildProductCardFromCandidate({
        candidate,
        knowledge,
        productFitReasoning: productFit.reasoning,
        primaryRisk: input.readiness.primaryRisk,
        isLeadAngle: isLead,
        strategyAngle: isLead ? input.strategy.recommendedProductAngle : undefined,
        procedureLabel,
        completedObservationCount,
        observationCorpus,
      }),
    );
  }

  const leadInCards = cards.some((c) => c.isLeadAngle);

  if (
    leadProductName &&
    !cards.some((c) => c.productName?.toLowerCase() === leadProductName.toLowerCase())
  ) {
    const resolved = tryResolveDebriefProductKnowledgeId(leadProductName);
    const knowledge = resolved ? getDebriefProductKnowledge(resolved) : null;
    const fitLevel = mapStrategyFitToOpportunityFit(
      input.strategy.recommendedProductAngle.fitLevel,
    );

    if (fitLevel !== "explore_first" || workflowPain.score >= 35) {
      const leadCopy = resolveProductCardCopy({
        avoidWhen: knowledge?.avoidWhen[0],
        validationNeeded: input.strategy.recommendedProductAngle.risk,
        fallbackValidate: ensureSentence(
          input.strategy.recommendedProductAngle.risk || input.readiness.primaryRisk,
        ),
        fallbackAvoid: ensureSentence(EXPLORE_FIRST_AVOID),
        context: {
          procedureLabel,
          completedObservationCount,
          productId: leadProductName,
        },
      });
      const leadValidateAttributions = buildAttributionsForProductGuardrail({
        knowledge,
        validationNeeded: input.strategy.recommendedProductAngle.risk,
        fallbackValidate: ensureSentence(
          input.strategy.recommendedProductAngle.risk || input.readiness.primaryRisk,
        ),
        fallbackAvoid: ensureSentence(EXPLORE_FIRST_AVOID),
        context: {
          procedureLabel,
          completedObservationCount,
          productId: leadProductName,
        },
        field: "whatMustBeValidated",
      });
      const leadAvoidAttributions = buildAttributionsForProductGuardrail({
        knowledge,
        validationNeeded: null,
        fallbackValidate: ensureSentence(
          input.strategy.recommendedProductAngle.risk || input.readiness.primaryRisk,
        ),
        fallbackAvoid: ensureSentence(EXPLORE_FIRST_AVOID),
        context: {
          procedureLabel,
          completedObservationCount,
          productId: leadProductName,
        },
        field: "whatNotToSayYet",
      });

      cards.unshift({
        productName: leadProductName,
        displayName: leadProductName,
        fitLevel: fitLevel === "explore_first" ? "low" : fitLevel,
        fitLevelLabel:
          fitLevel === "explore_first"
            ? FIT_LEVEL_LABELS.low
            : FIT_LEVEL_LABELS[fitLevel],
        isLeadAngle: true,
        whyItMayFit: ensureSentence(input.strategy.recommendedProductAngle.why),
        whatMustBeValidated: ensureSentence(leadCopy.whatMustBeValidated),
        howToPosition: knowledge
          ? ensureSentence(
              knowledge.experience360Positioning || knowledge.workflowTriggers[0] || "",
            )
          : ensureSentence(EXPLORE_FIRST_POSITION),
        whatNotToSayYet: ensureSentence(leadCopy.whatNotToSayYet),
        fieldClassifications: {
          whyItMayFit: "reasonable_inference",
          whatMustBeValidated: leadValidateAttributions.classification,
          whatNotToSayYet: leadAvoidAttributions.classification,
        },
        attributions: {
          whyItMayFit: [],
          whatMustBeValidated: leadValidateAttributions.attributions,
          whatNotToSayYet: leadAvoidAttributions.attributions,
        },
      });
    }
  }

  if (cards.length === 0 || (!leadInCards && cards.length > 0 && workflowPain.score >= 35)) {
    const workflowEvidence =
      workflowPain.evidence[0] ||
      workflowPain.supportingObservations[0]?.excerpt ||
      "";

    const hasExplore = cards.some((c) => c.fitLevel === "explore_first");
    if (!hasExplore) {
      cards.push(
        buildExploreFirstCard({
          workflowEvidence: workflowEvidence,
          primaryRisk: input.readiness.primaryRisk,
          isLeadAngle: cards.length === 0,
        }),
      );
    }
  }

  if (cards.length === 0) {
    cards.push(
      buildExploreFirstCard({
        workflowEvidence: "",
        primaryRisk: input.readiness.primaryRisk,
        isLeadAngle: true,
      }),
    );
  }

  return cards.slice(0, 4);
}

function collectObservationReferences(
  readiness: DebriefPrepareCommercialReadinessView,
): ObservationReferenceView[] {
  const seen = new Set<string>();
  const refs: ObservationReferenceView[] = [];

  for (const dimension of readiness.dimensions) {
    for (const obs of dimension.supportingObservations) {
      const key = `${obs.observationIndex ?? ""}:${obs.excerpt}`;
      if (seen.has(key) || obs.excerpt.length < 12) continue;
      seen.add(key);
      refs.push({
        observationIndex: obs.observationIndex,
        excerpt: obs.excerpt,
        contribution: obs.contribution,
      });
    }
  }

  return refs.slice(0, 8);
}

function questionMatchesMotionExcerpt(question: string, excerpt: string): boolean {
  const normalizedQuestion = question.toLowerCase();
  const excerptSnippet = excerpt.slice(0, 48).toLowerCase();
  return normalizedQuestion.includes(excerptSnippet) || excerptSnippet.split(/\s+/).slice(0, 4).every((word) => word.length < 4 || normalizedQuestion.includes(word));
}

function attributionsForConversationQuestion(
  question: string,
  bundle: DebriefMotionIntelligenceBundle | undefined,
  section: "validateObservation" | "exploreOpenness" | "closingQuestion",
): EvidenceAttribution[] {
  if (!bundle) return [];

  const items =
    section === "validateObservation"
      ? bundle.priorDebrief
      : section === "exploreOpenness"
        ? bundle.introCall
        : [...bundle.contactScheduling, ...bundle.introCall.filter((item) => item.coachingUse === "scheduling")];

  const matched = items.filter((item) => questionMatchesMotionExcerpt(question, item.excerpt));
  return matched.map((item) => motionItemToAttribution(item));
}

function advancementPathAttributions(
  path: DebriefPrepareAdvancementPathView,
  bundle: DebriefMotionIntelligenceBundle | undefined,
): EvidenceAttribution[] {
  if (!bundle || !path.recommended) return [];

  const items = [
    ...bundle.priorDebrief,
    ...bundle.introCall,
    ...bundle.contactScheduling,
  ];

  return items
    .filter((item) => questionMatchesMotionExcerpt(path.why, item.excerpt))
    .map((item) => motionItemToAttribution(item))
    .slice(0, 4);
}

function priorDebriefCommitmentLine(
  bundle: DebriefMotionIntelligenceBundle | undefined,
): string | null {
  if (!bundle) return null;
  const commitment = bundle.priorDebrief.find((item) => item.coachingUse === "commitment");
  return commitment?.excerpt ?? null;
}

function buildDimensionAttributions(
  readiness: DebriefPrepareCommercialReadinessView,
): Record<string, EvidenceAttribution[]> {
  const dimensionAttributions: Record<string, EvidenceAttribution[]> = {};
  for (const dimension of readiness.dimensions) {
    dimensionAttributions[dimension.id] = buildAttributionsForFrameworkDimension({
      id: dimension.id,
      label: dimension.label,
      score: dimension.score,
      confidence: dimension.confidence,
      reasoning: dimension.reasoning,
      evidence: dimension.evidence,
      supportingObservations: dimension.supportingObservations,
    });
  }
  return dimensionAttributions;
}

export function buildCommercialStrategyBriefView(input: {
  prepareView: CommercialStrategyBriefSourceView;
  productCandidates?: DebriefCommercialProductCandidate[];
  productKnowledge?: DebriefProductKnowledge[];
  providerName?: string | null;
  commercialSynthesis?: DebriefCommercialSynthesis;
  procedureLabel?: string | null;
  completedObservationCount?: number;
  observationCorpus?: ProviderObservationNoteEntry[];
  frameworkSource?: AiDebriefStrategyBuilderSource | "generic";
  motionIntelligence?: DebriefMotionIntelligenceBundle;
}): CommercialStrategyBriefView {
  const { prepareView } = input;
  const readiness = prepareView.commercialReadiness;
  const productCandidates =
    input.productCandidates ?? input.commercialSynthesis?.productCandidates ?? [];
  const productKnowledge = input.productKnowledge ?? [];
  const providerName =
    input.providerName ?? input.commercialSynthesis?.providerName ?? null;

  const recommendedPath =
    prepareView.advancementPaths.find((p) => p.recommended) ??
    prepareView.advancementPaths[0];

  const validateObservation = prepareView.conversationStrategy.validateObservationQuestions;
  const exploreOpenness = prepareView.conversationStrategy.opennessToChangeQuestions;
  const closingQuestion = prepareView.conversationStrategy.closingQuestion;

  const advancementPathsWithAttributions = prepareView.advancementPaths.map((path) => ({
    ...path,
    attributions: advancementPathAttributions(path, input.motionIntelligence),
  }));

  return {
    executiveBrief: buildExecutiveBriefParagraph({
      readiness,
      missionWhy: prepareView.missionWhy,
      desiredOutcome: prepareView.desiredOutcome,
      learnedBullets: prepareView.whatWeThinkWeLearned,
      providerName,
      priorDebriefCommitment: priorDebriefCommitmentLine(input.motionIntelligence),
    }),
    snapshot: {
      primaryLever: readiness.primaryCommercialLeverLabel,
      primaryRisk: truncate(readiness.primaryRisk, 120),
      bestNextStep: recommendedPath?.path ?? "No Action",
      confidence: aggregateFrameworkConfidence(readiness),
    },
    productOpportunities: buildProductOpportunityCards({
      productCandidates,
      productKnowledge,
      strategy: {
        debriefMission: prepareView.missionWhy,
        whatWeThinkWeLearned: prepareView.whatWeThinkWeLearned,
        primaryHypothesis: prepareView.missionSuccess,
        recommendedProductAngle: prepareView.recommendedProductAngle,
        conversationStrategy: prepareView.conversationStrategy,
        recommendedAdvancementPath: {
          path: recommendedPath?.path ?? "No Action",
          why: recommendedPath?.why ?? "",
        },
        desiredOutcome: prepareView.desiredOutcome,
      },
      readiness,
      procedureLabel: input.procedureLabel ?? input.commercialSynthesis?.procedureFocus ?? null,
      completedObservationCount:
        input.completedObservationCount ?? input.commercialSynthesis?.completedObservationCount,
      observationCorpus: input.observationCorpus,
    }),
    conversationPlan: {
      opening: prepareView.conversationStrategy.opening,
      validateObservation,
      understandImpact: prepareView.conversationStrategy.impactQuestions,
      exploreOpenness,
      closingQuestion,
      attributions: input.motionIntelligence
        ? {
            validateObservation: validateObservation.map((question) =>
              attributionsForConversationQuestion(
                question,
                input.motionIntelligence,
                "validateObservation",
              ),
            ),
            exploreOpenness: exploreOpenness.map((question) =>
              attributionsForConversationQuestion(
                question,
                input.motionIntelligence,
                "exploreOpenness",
              ),
            ),
            closingQuestion: attributionsForConversationQuestion(
              closingQuestion,
              input.motionIntelligence,
              "closingQuestion",
            ),
          }
        : undefined,
    },
    advancementPaths: advancementPathsWithAttributions,
    supportingEvidence: {
      learnedBullets: prepareView.whatWeThinkWeLearned,
      commercialReadiness: readiness,
      observationReferences: collectObservationReferences(readiness),
      dimensionAttributions: buildDimensionAttributions(readiness),
      motionIntelligenceReferences: input.motionIntelligence
        ? buildMotionIntelligenceReferences(input.motionIntelligence)
        : undefined,
    },
    frameworkSource: input.frameworkSource,
  };
}
