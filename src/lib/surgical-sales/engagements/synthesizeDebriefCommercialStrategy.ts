/**
 * Rules-based commercial strategy synthesis and OpenAI prompt assembly.
 * Formats evidence into regional-sales-director coaching — not intelligence labels.
 */

import {
  buildAiDebriefStrategyFromProviderDebriefPlan,
  type DebriefAdvancementPathId,
} from "@/lib/surgical-sales/engagements/buildAiDebriefStrategy";
import {
  coachingDetermineImportance,
  coachingExploreOpenness,
  coachingPathPrerequisites,
  coachingRecommendPath,
  coachingUnderstandImpact,
  coachingValidateObservation,
} from "@/lib/surgical-sales/engagements/debriefClinicalTopicTranslation";
import {
  getDebriefProductKnowledge,
  tryResolveDebriefProductKnowledgeId,
  type DebriefProductKnowledge,
} from "@/lib/surgical-sales/engagements/debriefProductKnowledge";
import type {
  AiDebriefStrategyBuilderFitLevel,
  AiDebriefStrategyBuilderOutput,
  AiDebriefStrategyBuilderPath,
} from "@/lib/surgical-sales/engagements/aiDebriefStrategyBuilderTypes";
import type { DebriefCommercialSynthesis } from "@/lib/surgical-sales/engagements/buildDebriefCommercialSynthesis";
import { frameworkAdvancementPathFromScores } from "@/lib/surgical-sales/engagements/commercialReadinessFrameworkGuards";
import type { CommercialReadinessFramework } from "@/lib/surgical-sales/engagements/commercialReadinessFrameworkTypes";
import {
  getCommercialReadinessDimension,
  COMMERCIAL_READINESS_DIMENSION_LABELS,
} from "@/lib/surgical-sales/engagements/commercialReadinessFrameworkTypes";
import type { ProviderDebriefPlanProductFitLevel } from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";

const ADVANCEMENT_PATH_LABELS: Record<DebriefAdvancementPathId, AiDebriefStrategyBuilderPath> = {
  "360_experience": "360 Experience",
  case_commitment: "Case Commitment",
  no_action: "No Action",
};

function providerLabel(synthesis: DebriefCommercialSynthesis): string {
  return synthesis.providerName?.trim() || "the surgeon";
}

function topicPhraseFromSynthesis(synthesis: DebriefCommercialSynthesis): string {
  const lead =
    synthesis.recurringPatterns[0]?.pattern.replace(/\.$/, "").replace(/ — a recurring theme.*/i, "") ??
    synthesis.findings[0]?.narrative.replace(/\.$/, "") ??
    synthesis.beliefSummary?.replace(/\.$/, "");

  if (!lead) {
    return "the workflow moments you observed in the OR";
  }

  const lower = lead.charAt(0).toLowerCase() + lead.slice(1);
  return lower.replace(/^this surgeon may be experiencing /i, "").replace(/^based on .*?, /i, "");
}

function mapPlanFitToBuilderFit(
  fitLevel: ProviderDebriefPlanProductFitLevel | undefined,
): AiDebriefStrategyBuilderFitLevel {
  switch (fitLevel) {
    case "strong":
      return "strong";
    case "possible":
    case "needs_surgeon_confirmation":
      return "moderate";
    case "unlikely":
      return "weak";
    default:
      return "none";
  }
}

function resolveLeadProduct(synthesis: DebriefCommercialSynthesis): {
  productName: string | null;
  fitLevel: AiDebriefStrategyBuilderFitLevel;
  why: string;
  risk: string;
} {
  const lead = synthesis.productCandidates[0];

  if (!lead || lead.fitLevel === "unlikely" || lead.fitLevel === "unknown") {
    return {
      productName: null,
      fitLevel: "none",
      why: "Observation detail does not yet support recommending a specific product in the room — focus the debrief on confirming what workflow issue, if any, is worth acting on.",
      risk: "Positioning product before the surgeon confirms workflow value will feel premature.",
    };
  }

  const fitLevel = mapPlanFitToBuilderFit(lead.fitLevel);
  const productName = lead.productName;
  const resolved = tryResolveDebriefProductKnowledgeId(productName);
  const knowledge = resolved ? getDebriefProductKnowledge(resolved) : null;

  const observationHook =
    lead.observationLinkedRationale[0] ??
    synthesis.findings[0]?.narrative.replace(/\.$/, "") ??
    synthesis.recurringPatterns[0]?.pattern.replace(/\.$/, "").replace(/ — a recurring theme.*/i, "");

  const why = observationHook
    ? `${productName} may be relevant because ${observationHook.charAt(0).toLowerCase()}${observationHook.slice(1)} — but only if ${providerLabel(synthesis)} agrees that issue matters enough to explore a change.`
    : `${productName} surfaced in observation notes, but the commercial case is not strong enough to pitch until ${providerLabel(synthesis)} confirms workflow value.`;

  const risk =
    lead.validationNeeded ??
    knowledge?.avoidWhen[0] ??
    `Do not position ${productName} until the surgeon confirms the observed workflow issue is meaningful.`;

  return {
    productName: fitLevel === "none" ? null : productName,
    fitLevel: fitLevel === "none" ? "none" : fitLevel,
    why,
    risk: risk.endsWith(".") ? risk : `${risk}.`,
  };
}

function buildLearnedBullets(synthesis: DebriefCommercialSynthesis): string[] {
  const bullets: string[] = [];

  if (synthesis.beliefSummary) {
    bullets.push(synthesis.beliefSummary);
  }

  for (const line of synthesis.beliefRationale.slice(0, 3)) {
    bullets.push(line);
  }

  for (const competitor of synthesis.competitorUsage.slice(0, 1)) {
    bullets.push(competitor.summary);
  }

  if (bullets.length === 0 && synthesis.observationNotes.length > 0) {
    bullets.push(
      `Your observation notes suggest follow-up is warranted, but the commercial story is still forming — use the debrief to confirm what actually matters to ${providerLabel(synthesis)}.`,
    );
  }

  return bullets.slice(0, 4);
}

function buildValidationRisk(synthesis: DebriefCommercialSynthesis, productRisk: string): string {
  const validation = synthesis.validationNeeds[0];
  if (validation) {
    return validation.rationale
      ? `${validation.question.replace(/\.$/, "")} — ${validation.rationale}`
      : validation.question;
  }
  return productRisk;
}

export function buildCommercialStrategyUserPrompt(input: {
  synthesis: DebriefCommercialSynthesis;
  productKnowledge: DebriefProductKnowledge[];
  planMode: "generic" | "intelligence";
}): string {
  const { synthesis } = input;

  const notesBlock =
    synthesis.observationNotes.length > 0
      ? synthesis.observationNotes
          .slice(-6)
          .map((note, index) => `${index + 1}. """${note.slice(0, 900)}"""`)
          .join("\n")
      : "- (no captured observation notes on file)";

  const findingsBlock =
    synthesis.findings.length > 0
      ? synthesis.findings
          .map(
            (f) =>
              `- ${f.narrative}${f.evidenceExcerpt ? ` (source: "${f.evidenceExcerpt.slice(0, 120)}")` : ""}`,
          )
          .join("\n")
      : "- (none synthesized yet)";

  const patternsBlock =
    synthesis.recurringPatterns.length > 0
      ? synthesis.recurringPatterns.map((p) => `- ${p.pattern}`).join("\n")
      : "- (no cross-case patterns yet)";

  const competitorBlock =
    synthesis.competitorUsage.length > 0
      ? synthesis.competitorUsage.map((c) => `- ${c.summary}`).join("\n")
      : "- (no competitor usage noted)";

  const historyBlock =
    synthesis.providerHistory.length > 0
      ? synthesis.providerHistory.map((line) => `- ${line}`).join("\n")
      : "- (limited provider history)";

  const validationBlock =
    synthesis.validationNeeds.length > 0
      ? synthesis.validationNeeds.map((v) => `- ${v.question}`).join("\n")
      : "- (confirm whether observed patterns match surgeon priorities)";

  const productBlock =
    synthesis.productCandidates.length > 0
      ? synthesis.productCandidates
          .map((candidate) => {
            const resolved = tryResolveDebriefProductKnowledgeId(candidate.productName);
            const knowledge = resolved ? getDebriefProductKnowledge(resolved) : null;
            const observationEvidence =
              candidate.observationLinkedRationale.length > 0
                ? candidate.observationLinkedRationale.join("; ")
                : "(link to observation evidence required)";
            return [
              `Product: ${candidate.productName} (fit: ${candidate.fitLevel})`,
              `Observation-linked evidence: ${observationEvidence}`,
              knowledge
                ? `Workflow context (do not copy as marketing): ${knowledge.workflowTriggers.slice(0, 2).join("; ")}`
                : "",
              candidate.validationNeeded ? `Validate before pitching: ${candidate.validationNeeded}` : "",
            ]
              .filter(Boolean)
              .join("\n");
          })
          .join("\n\n")
      : "- (stay conservative — no product recommendation without observation evidence)";

  const workingHypothesis = synthesis.beliefSummary
    ? `Working hypothesis: ${synthesis.beliefSummary}`
    : "Working hypothesis: (form from notes and patterns — do not use category labels)";

  const rationaleBlock =
    synthesis.beliefRationale.length > 0
      ? synthesis.beliefRationale.map((line) => `- ${line}`).join("\n")
      : "- (build from notes and recurrence)";

  return [
    "Write like a regional sales director briefing a rep before an Observation Debrief.",
    "Synthesize commercial reasoning from the evidence below — never echo intelligence category labels.",
    "",
    `Provider: ${synthesis.providerName ?? "Unknown surgeon"}`,
    synthesis.organizationName ? `Organization: ${synthesis.organizationName}` : "",
    `Completed observations: ${synthesis.completedObservationCount}`,
    `Pathway stage: ${synthesis.pathwayStageLabel}`,
    synthesis.procedureFocus ? `Procedure focus: ${synthesis.procedureFocus}` : "",
    synthesis.observationMission ? `Observation mission: ${synthesis.observationMission}` : "",
    `Plan mode: ${input.planMode}`,
    "",
    workingHypothesis,
    "",
    "Why we believe it (evidence):",
    rationaleBlock,
    "",
    "Observation notes / dictations (primary source):",
    notesBlock,
    "",
    "Case findings (note-backed, not category labels):",
    findingsBlock,
    "",
    "Recurring patterns across observations:",
    patternsBlock,
    "",
    "Competitor usage:",
    competitorBlock,
    "",
    "Provider history:",
    historyBlock,
    "",
    "What must be validated in the room:",
    validationBlock,
    "",
    "Product candidates (link recommendations to observation evidence only):",
    productBlock,
    "",
    "Answer these seven questions in the JSON output:",
    "1) debriefMission — What do we believe is happening?",
    "2) primaryHypothesis — Why do we believe it? (evidence summary, 1-2 sentences)",
    "3) recommendedProductAngle — Which product appears most relevant and why might it matter?",
    "4) recommendedProductAngle.risk — What must be validated before pitching?",
    "5) whatWeThinkWeLearned — 3-4 evidence-backed belief bullets",
    "6) conversationStrategy — How should the rep run the conversation?",
    "7) recommendedAdvancementPath — Which path (360 Experience / Case Commitment / No Action) and why?",
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

function mapFrameworkScoreToFitLevel(
  score: number,
  confidence: string,
): AiDebriefStrategyBuilderFitLevel {
  if (score < 50) return "none";
  if (score >= 75 && confidence === "High") return "strong";
  if (score >= 50) return "moderate";
  return "weak";
}

function buildLearnedBulletsFromFramework(
  framework: CommercialReadinessFramework,
): string[] {
  const bullets = [...framework.dimensions]
    .sort((a, b) => b.score - a.score)
    .filter((dimension) => dimension.score >= 35)
    .slice(0, 4)
    .map((dimension) => {
      const evidence = dimension.evidence[0] ?? dimension.reasoning;
      return `${dimension.label} (${dimension.score}/100): ${evidence.replace(/\.$/, "")}.`;
    });

  if (bullets.length > 0) return bullets;

  return [
    framework.directorSummary,
    `Primary commercial lever: ${COMMERCIAL_READINESS_DIMENSION_LABELS[framework.primaryCommercialLever]}.`,
    `Primary risk: ${framework.primaryRisk.replace(/\.$/, "")}.`,
  ];
}

export function synthesizeDebriefCommercialStrategyFromFramework(input: {
  synthesis: DebriefCommercialSynthesis;
  planMode: "generic" | "intelligence";
  plan: Parameters<typeof buildAiDebriefStrategyFromProviderDebriefPlan>[0]["plan"];
  completedObservationCount: number;
  providerName: string | null;
  framework: CommercialReadinessFramework;
}): AiDebriefStrategyBuilderOutput {
  const { synthesis, framework } = input;
  const provider = providerLabel(synthesis);

  const workflowPain = getCommercialReadinessDimension(framework, "workflow_pain");
  const productFit = getCommercialReadinessDimension(framework, "product_fit");
  const openness = getCommercialReadinessDimension(framework, "openness_to_change");
  const experience360 = getCommercialReadinessDimension(framework, "experience_360_readiness");

  const topicPhrase =
    workflowPain.evidence[0]?.replace(/\.$/, "") ??
    topicPhraseFromSynthesis(synthesis);

  const leadProduct = resolveLeadProduct(synthesis);
  const fitLevel = mapFrameworkScoreToFitLevel(productFit.score, productFit.confidence);
  const productName = fitLevel === "none" ? null : leadProduct.productName;

  const advancementPath = frameworkAdvancementPathFromScores(framework);

  const pathWhy =
    advancementPath === "Case Commitment"
      ? `Evaluation readiness (${getCommercialReadinessDimension(framework, "evaluation_readiness").score}/100) and openness (${openness.score}/100) support exploring case commitment after validation.`
      : advancementPath === "360 Experience"
        ? `360 Experience readiness (${experience360.score}/100) suggests a lower-commitment evaluation before asking for OR cases.`
        : framework.primaryRisk;

  const learnedBullets = buildLearnedBulletsFromFramework(framework);
  while (learnedBullets.length < 3) {
    learnedBullets.push(
      `Treat this as a working hypothesis until ${provider} confirms it matches their experience.`,
    );
  }

  const rulesStrategy = buildAiDebriefStrategyFromProviderDebriefPlan({
    plan: input.plan,
    planMode: input.planMode,
    completedObservationCount: input.completedObservationCount,
    providerName: input.providerName,
  });

  const productWhy =
    productName && fitLevel !== "none"
      ? `${productName} may be relevant (${productFit.score}/100 product fit) because ${productFit.evidence[0] ?? productFit.reasoning.replace(/\.$/, "")} — but only if ${provider} agrees the issue matters.`
      : "Product fit score is not high enough to recommend a specific product — confirm workflow value first.";

  return {
    debriefMission: framework.directorSummary,
    whatWeThinkWeLearned: learnedBullets.slice(0, 4),
    primaryHypothesis: `${workflowPain.label} (${workflowPain.score}/100): ${workflowPain.reasoning}`,
    recommendedProductAngle: {
      productName,
      fitLevel,
      why: productWhy,
      risk: framework.primaryRisk,
    },
    conversationStrategy: {
      opening: coachingValidateObservation(topicPhrase),
      validateObservationQuestions: [coachingValidateObservation(topicPhrase)],
      impactQuestions: [coachingUnderstandImpact(topicPhrase)],
      opennessToChangeQuestions: [
        coachingDetermineImportance(topicPhrase),
        coachingExploreOpenness(topicPhrase),
        openness.score < 50
          ? `What would need to be true for you to consider exploring a workflow change?`
          : coachingExploreOpenness(topicPhrase),
      ].slice(0, 2),
      closingQuestion: `${coachingRecommendPath(advancementPath)} ${coachingPathPrerequisites()}`.trim(),
    },
    recommendedAdvancementPath: {
      path: advancementPath,
      why: pathWhy,
    },
    desiredOutcome: rulesStrategy.desiredOutcome,
  };
}

export function synthesizeDebriefCommercialStrategy(input: {
  synthesis: DebriefCommercialSynthesis;
  planMode: "generic" | "intelligence";
  plan: Parameters<typeof buildAiDebriefStrategyFromProviderDebriefPlan>[0]["plan"];
  completedObservationCount: number;
  providerName: string | null;
  framework?: CommercialReadinessFramework;
}): AiDebriefStrategyBuilderOutput {
  if (input.framework) {
    return synthesizeDebriefCommercialStrategyFromFramework({
      synthesis: input.synthesis,
      planMode: input.planMode,
      plan: input.plan,
      completedObservationCount: input.completedObservationCount,
      providerName: input.providerName,
      framework: input.framework,
    });
  }
  const { synthesis } = input;
  const provider = providerLabel(synthesis);
  const topicPhrase = topicPhraseFromSynthesis(synthesis);
  const product = resolveLeadProduct(synthesis);

  const rulesStrategy = buildAiDebriefStrategyFromProviderDebriefPlan({
    plan: input.plan,
    planMode: input.planMode,
    completedObservationCount: input.completedObservationCount,
    providerName: input.providerName,
  });

  const recommendedPath =
    rulesStrategy.advancementPaths.find((path) => path.status === "recommended") ??
    rulesStrategy.advancementPaths[0];

  const pathLabel = recommendedPath
    ? ADVANCEMENT_PATH_LABELS[recommendedPath.id]
    : "No Action";

  const beliefSummary =
    synthesis.beliefSummary ??
    `Use this debrief with ${provider} to confirm what you actually observed in the OR and whether a commercial next step is warranted.`;

  const beliefRationale =
    synthesis.beliefRationale.length > 0
      ? synthesis.beliefRationale.slice(0, 2).join(" ")
      : `Your observation notes are the basis for this read — ${provider} must confirm whether the pattern you saw matches their experience and priorities.`;

  const learnedBullets = buildLearnedBullets(synthesis);
  if (learnedBullets.length < 3) {
    learnedBullets.push(
      `Focus the conversation on workflow moments ${provider} would recognize — not every field note needs to be discussed.`,
    );
    learnedBullets.push(
      `You still need ${provider}'s read on whether what you saw is worth acting on.`,
    );
  }

  return {
    debriefMission: beliefSummary,
    whatWeThinkWeLearned: learnedBullets.slice(0, 4),
    primaryHypothesis: beliefRationale,
    recommendedProductAngle: {
      productName: product.productName,
      fitLevel: product.fitLevel,
      why: product.why,
      risk: buildValidationRisk(synthesis, product.risk),
    },
    conversationStrategy: {
      opening: coachingValidateObservation(topicPhrase),
      validateObservationQuestions: [coachingValidateObservation(topicPhrase)],
      impactQuestions: [coachingUnderstandImpact(topicPhrase)],
      opennessToChangeQuestions: [
        coachingDetermineImportance(topicPhrase),
        coachingExploreOpenness(topicPhrase),
      ],
      closingQuestion: `${coachingRecommendPath(pathLabel)} ${coachingPathPrerequisites()}`.trim(),
    },
    recommendedAdvancementPath: {
      path: pathLabel,
      why:
        recommendedPath?.coachingNote ??
        "Hold commercial next steps until the surgeon confirms observed workflow value.",
    },
    desiredOutcome: rulesStrategy.desiredOutcome,
  };
}

export { topicPhraseFromSynthesis };
