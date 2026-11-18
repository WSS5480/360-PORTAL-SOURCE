/**
 * Rules-based Commercial Readiness Framework — deterministic fallback when OpenAI is unavailable.
 */

import type { DebriefCommercialSynthesis } from "@/lib/surgical-sales/engagements/buildDebriefCommercialSynthesis";
import { normalizeCommercialReadinessFramework } from "@/lib/surgical-sales/engagements/commercialReadinessFrameworkGuards";
import type {
  CommercialReadinessConfidence,
  CommercialReadinessDimensionAssessment,
  CommercialReadinessDimensionId,
  CommercialReadinessFramework,
  CommercialReadinessSupportingObservation,
} from "@/lib/surgical-sales/engagements/commercialReadinessFrameworkTypes";
import {
  COMMERCIAL_READINESS_DIMENSION_IDS,
  COMMERCIAL_READINESS_DIMENSION_LABELS,
  clampCommercialReadinessScore,
} from "@/lib/surgical-sales/engagements/commercialReadinessFrameworkTypes";
import { scoreCompetitiveDisplacementSignals } from "@/lib/surgical-sales/engagements/scoreCompetitiveDisplacement";
import {
  resolveObservationIndexFromCorpus,
  type ProviderObservationNoteEntry,
} from "@/lib/surgical-sales/engagements/loadProviderObservationNoteCorpus";
import type {
  ProviderDebriefPlan,
  ProviderDebriefPlanLearningCategory,
  ProviderDebriefPlanLearningItem,
} from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";

function providerLabel(name: string | null): string {
  return name?.trim() || "the surgeon";
}

function confidenceFromScore(score: number, hasEvidence: boolean): CommercialReadinessConfidence {
  if (!hasEvidence) return "Low";
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

function supportingFromNotes(
  notes: string[],
  learnings: ProviderDebriefPlanLearningItem[],
  contribution: string,
  max = 2,
  observationCorpus: ProviderObservationNoteEntry[] = [],
): CommercialReadinessSupportingObservation[] {
  const results: CommercialReadinessSupportingObservation[] = [];

  for (const learning of learnings.slice(0, max)) {
    const excerpt = learning.evidence?.trim() || learning.signal.trim();
    if (!excerpt || excerpt.length < 8) continue;
    const observationIndex = observationCorpus.length
      ? resolveObservationIndexFromCorpus(observationCorpus, {
          sourceNoteId: learning.sourceNoteId,
          excerpt,
        }) ??
        resolveObservationIndexFromCorpus(observationCorpus, {
          sourceNoteId: learning.sourceNoteId,
          excerpt: learning.signal,
        })
      : null;
    results.push({
      observationIndex,
      sourceNoteId: learning.sourceNoteId,
      excerpt: excerpt.slice(0, 400),
      contribution,
    });
  }

  if (results.length < max) {
    const corpusEntries =
      observationCorpus.length > 0
        ? observationCorpus
        : notes.map((note, index) => ({
            caseId: "",
            caseDate: null,
            observationIndex: index + 1,
            body: note,
            sourceNoteId: null,
            createdAt: null,
          }));

    for (const entry of corpusEntries) {
      if (results.length >= max) break;
      const note = entry.body?.trim();
      if (!note || note.length < 12) continue;
      if (results.some((item) => item.excerpt === note.slice(0, 400))) continue;
      results.push({
        observationIndex: entry.observationIndex,
        sourceNoteId: entry.sourceNoteId,
        excerpt: note.slice(0, 400),
        contribution,
      });
    }
  }

  return results;
}

function learningsByCategories(
  plan: ProviderDebriefPlan,
  categories: ProviderDebriefPlanLearningCategory[],
): ProviderDebriefPlanLearningItem[] {
  return plan.whatWeLearned.filter((item) => categories.includes(item.category));
}

function scoreWorkflowPain(input: {
  synthesis: DebriefCommercialSynthesis;
  plan: ProviderDebriefPlan;
  observationNotes: string[];
  observationCorpus: ProviderObservationNoteEntry[];
}): CommercialReadinessDimensionAssessment {
  const workflowLearnings = learningsByCategories(input.plan, [
    "clinical_pain_point",
    "workflow_friction",
    "staff_observation",
  ]);

  const findings = input.synthesis.findings;
  const patterns = input.synthesis.recurringPatterns;
  const count = input.synthesis.completedObservationCount;

  let score = 15;
  if (findings.length > 0) score += 20;
  if (patterns.length > 0) score += 25;
  if (workflowLearnings.length > 0) score += 15;
  if (count >= 3) score += 15;
  if (patterns.some((p) => p.observationCount >= 2)) score += 10;

  const evidence = [
    ...patterns.map((p) => p.pattern),
    ...findings.map((f) => f.narrative),
    ...workflowLearnings.map((l) => l.evidence ?? l.signal).filter(Boolean) as string[],
  ]
    .map((item) => item.trim())
    .filter((item) => item.length >= 12)
    .slice(0, 4);

  const reasoning =
    patterns[0]?.pattern ??
    findings[0]?.narrative ??
    (workflowLearnings[0]
      ? `Observation notes describe OR workflow friction that may be worth validating with ${providerLabel(input.synthesis.providerName)}.`
      : `Limited workflow pain signals on file — use the debrief to confirm whether any observed friction matters to ${providerLabel(input.synthesis.providerName)}.`);

  const hasEvidence = evidence.length > 0;

  return {
    id: "workflow_pain",
    label: COMMERCIAL_READINESS_DIMENSION_LABELS.workflow_pain,
    score: clampCommercialReadinessScore(score),
    confidence: confidenceFromScore(score, hasEvidence),
    reasoning,
    evidence,
    supportingObservations: supportingFromNotes(
      input.observationNotes,
      workflowLearnings,
      "Documents workflow friction or clinical pain observed in the OR.",
      2,
      input.observationCorpus,
    ),
  };
}

function fitLevelToScore(fitLevel: string | undefined): number {
  switch (fitLevel) {
    case "strong":
      return 82;
    case "possible":
      return 58;
    case "needs_surgeon_confirmation":
      return 48;
    case "unlikely":
      return 22;
    default:
      return 12;
  }
}

function scoreProductFit(input: {
  synthesis: DebriefCommercialSynthesis;
  plan: ProviderDebriefPlan;
  observationNotes: string[];
  observationCorpus: ProviderObservationNoteEntry[];
}): CommercialReadinessDimensionAssessment {
  const productLearnings = learningsByCategories(input.plan, ["product_signal"]);
  const lead = input.synthesis.productCandidates[0];
  const score = lead ? fitLevelToScore(lead.fitLevel) : productLearnings.length > 0 ? 35 : 10;

  const evidence = [
    ...(lead?.observationLinkedRationale ?? []),
    ...productLearnings.map((l) => l.evidence ?? l.signal).filter(Boolean) as string[],
  ]
    .map((item) => item.trim())
    .filter((item) => item.length >= 12)
    .slice(0, 4);

  const productName = lead?.productName;
  const reasoning = productName
    ? `${productName} may fit the observed workflow, but ${providerLabel(input.synthesis.providerName)} must confirm the issue is meaningful before any product conversation.`
    : "Observation evidence does not yet support recommending a specific product — confirm workflow value first.";

  return {
    id: "product_fit",
    label: COMMERCIAL_READINESS_DIMENSION_LABELS.product_fit,
    score: clampCommercialReadinessScore(score),
    confidence: confidenceFromScore(score, evidence.length > 0),
    reasoning,
    evidence,
    supportingObservations: supportingFromNotes(
      input.observationNotes,
      productLearnings,
      "Links observed OR moments to a potential product angle.",
      2,
      input.observationCorpus,
    ),
  };
}

function scoreCompetitiveDisplacement(input: {
  synthesis: DebriefCommercialSynthesis;
  plan: ProviderDebriefPlan;
  observationNotes: string[];
  observationCorpus: ProviderObservationNoteEntry[];
}): CommercialReadinessDimensionAssessment {
  const competitiveLearnings = learningsByCategories(input.plan, ["competitive_usage"]);
  const signals = scoreCompetitiveDisplacementSignals({
    synthesis: input.synthesis,
    plan: input.plan,
    observationNotes: input.observationNotes,
  });

  const evidence = [
    ...signals.displacementEvidence,
    ...signals.incumbentSummaries,
    ...competitiveLearnings.map((l) => l.evidence ?? l.signal).filter(Boolean) as string[],
  ]
    .map((item) => item.trim())
    .filter((item) => item.length >= 12)
    .slice(0, 4);

  const reasoning = signals.hasIncumbentDissatisfaction
    ? "Incumbent products are in use and observation notes suggest dissatisfaction or switching friction — displacement may be possible if the surgeon agrees workflow value is worth changing."
    : signals.hasIncumbentPresence
      ? "Incumbent competitive products are visible in the OR, but displacement opportunity is limited until the surgeon expresses dissatisfaction or openness to evaluate alternatives."
      : "No strong competitive displacement signal on file — confirm incumbents and switching friction in the debrief.";

  return {
    id: "competitive_displacement_opportunity",
    label: COMMERCIAL_READINESS_DIMENSION_LABELS.competitive_displacement_opportunity,
    score: clampCommercialReadinessScore(signals.totalScore),
    confidence: confidenceFromScore(signals.totalScore, evidence.length > 0),
    reasoning,
    evidence,
    supportingObservations: supportingFromNotes(
      input.observationNotes,
      competitiveLearnings,
      signals.hasIncumbentDissatisfaction
        ? "Links incumbent usage to dissatisfaction or switching signals observed in the OR."
        : "Documents incumbent or competitive product usage in the OR.",
      2,
      input.observationCorpus,
    ),
  };
}

function scoreOpennessToChange(input: {
  synthesis: DebriefCommercialSynthesis;
  plan: ProviderDebriefPlan;
  observationNotes: string[];
  observationCorpus: ProviderObservationNoteEntry[];
}): CommercialReadinessDimensionAssessment {
  const validationCount = input.synthesis.validationNeeds.length;
  const historySignals = input.synthesis.providerHistory.length;
  const unknownCount = input.plan.whatWeStillDontKnow.length;

  let score = 25;
  if (historySignals >= 2) score += 15;
  if (validationCount <= 2) score += 15;
  if (validationCount >= 4) score -= 10;
  if (unknownCount >= 4) score -= 15;

  const behaviorLearnings = input.plan.whatWeLearned.filter(
    (item) => item.category === "procedure_insight" || item.source === "provider_profile",
  );

  if (behaviorLearnings.length > 0) score += 10;

  const evidence = [
    ...input.synthesis.validationNeeds.map((v) => v.question),
    ...input.synthesis.providerHistory.slice(0, 2),
    ...behaviorLearnings.map((l) => l.evidence ?? l.signal).filter(Boolean) as string[],
  ]
    .map((item) => item.trim())
    .filter((item) => item.length >= 12)
    .slice(0, 4);

  const reasoning =
    validationCount > 0
      ? `Several assumptions still need surgeon confirmation — openness is unclear until ${providerLabel(input.synthesis.providerName)} validates what you observed.`
      : `Provider history and observation patterns suggest room to explore change, but appetite must be confirmed directly in the debrief.`;

  return {
    id: "openness_to_change",
    label: COMMERCIAL_READINESS_DIMENSION_LABELS.openness_to_change,
    score: clampCommercialReadinessScore(score),
    confidence: confidenceFromScore(score, evidence.length > 0),
    reasoning,
    evidence,
    supportingObservations: supportingFromNotes(
      input.observationNotes,
      behaviorLearnings,
      "Informs whether the surgeon may be open to exploring workflow change.",
      2,
      input.observationCorpus,
    ),
  };
}

function scoreEvaluationReadiness(input: {
  synthesis: DebriefCommercialSynthesis;
  plan: ProviderDebriefPlan;
  observationNotes: string[];
  observationCorpus: ProviderObservationNoteEntry[];
  completedObservationCount: number;
}): CommercialReadinessDimensionAssessment {
  const procedureLearnings = learningsByCategories(input.plan, ["procedure_insight"]);
  const count = input.completedObservationCount;

  let score = 20;
  if (input.synthesis.procedureFocus) score += 15;
  if (procedureLearnings.length > 0) score += 15;
  if (count >= 3) score += 20;
  if (count >= 5) score += 10;
  if (input.synthesis.pathwayStageLabel.toLowerCase().includes("debrief")) score += 10;

  const evidence = [
    input.synthesis.procedureFocus ? `Procedure focus: ${input.synthesis.procedureFocus}` : "",
    input.synthesis.observationMission ? `Mission: ${input.synthesis.observationMission}` : "",
    ...procedureLearnings.map((l) => l.evidence ?? l.signal).filter(Boolean) as string[],
    `${count} completed observation${count === 1 ? "" : "s"} on file`,
  ]
    .map((item) => item.trim())
    .filter((item) => item.length >= 12)
    .slice(0, 4);

  const reasoning =
    count >= 3
      ? `${count} completed observations and procedural context support a structured evaluation conversation — confirm alignment before proposing trials.`
      : "Evaluation readiness is early — more observation alignment or surgeon confirmation is needed before proposing OR trials.";

  return {
    id: "evaluation_readiness",
    label: COMMERCIAL_READINESS_DIMENSION_LABELS.evaluation_readiness,
    score: clampCommercialReadinessScore(score),
    confidence: confidenceFromScore(score, evidence.length > 0),
    reasoning,
    evidence,
    supportingObservations: supportingFromNotes(
      input.observationNotes,
      procedureLearnings,
      "Supports procedural alignment for evaluation planning.",
      2,
      input.observationCorpus,
    ),
  };
}

function score360ExperienceReadiness(input: {
  productFit: CommercialReadinessDimensionAssessment;
  openness: CommercialReadinessDimensionAssessment;
  workflowPain: CommercialReadinessDimensionAssessment;
  synthesis: DebriefCommercialSynthesis;
  observationNotes: string[];
  observationCorpus: ProviderObservationNoteEntry[];
}): CommercialReadinessDimensionAssessment {
  const base = Math.round(
    input.productFit.score * 0.35 +
      input.openness.score * 0.3 +
      input.workflowPain.score * 0.35,
  );

  let score = base;
  if (input.productFit.score >= 50 && input.productFit.score < 70) score += 10;
  if (input.openness.score < 35) score -= 15;

  const evidence = [
    ...input.workflowPain.evidence.slice(0, 1),
    ...input.productFit.evidence.slice(0, 1),
    ...input.openness.evidence.slice(0, 1),
  ].filter((item) => item.length >= 12);

  const reasoning =
    score >= 55
      ? "Workflow pain and moderate product fit may support a lower-commitment 360 Experience before asking for OR case commitment."
      : "360 Experience is premature until workflow value and openness are confirmed in the debrief.";

  return {
    id: "experience_360_readiness",
    label: COMMERCIAL_READINESS_DIMENSION_LABELS.experience_360_readiness,
    score: clampCommercialReadinessScore(score),
    confidence: confidenceFromScore(score, evidence.length > 0),
    reasoning,
    evidence,
    supportingObservations: supportingFromNotes(
      input.observationNotes,
      [],
      "Informs whether a sim-lab or office visit evaluation is appropriate.",
      2,
      input.observationCorpus,
    ),
  };
}

function resolvePrimaryLever(
  dimensions: CommercialReadinessDimensionAssessment[],
): CommercialReadinessDimensionId {
  const ranked = [...dimensions].sort((a, b) => b.score - a.score);
  return ranked[0]?.id ?? "workflow_pain";
}

function buildDirectorSummary(
  dimensions: CommercialReadinessDimensionAssessment[],
  providerName: string | null,
): string {
  const provider = providerLabel(providerName);
  const workflow = dimensions.find((d) => d.id === "workflow_pain");
  const product = dimensions.find((d) => d.id === "product_fit");
  const openness = dimensions.find((d) => d.id === "openness_to_change");

  const painClause =
    (workflow?.score ?? 0) >= 50
      ? workflow?.reasoning.replace(/\.$/, "") ?? "workflow friction may be meaningful"
      : "workflow value is not yet confirmed";

  const productClause =
    (product?.score ?? 0) >= 50 && product?.evidence[0]
      ? `Product fit is developing (${product.score}/100) — ${product.evidence[0].replace(/\.$/, "")}`
      : "No strong product recommendation yet";

  const openClause =
    (openness?.score ?? 0) >= 50
      ? "openness to change looks possible but must be validated"
      : "surgeon appetite for change is still unclear";

  return `Reviewing observation evidence for ${provider}: ${painClause}. ${productClause}. Before any advancement, confirm ${openClause} in the debrief conversation.`;
}

export function buildDeterministicCommercialReadinessFramework(input: {
  synthesis: DebriefCommercialSynthesis;
  plan: ProviderDebriefPlan;
  observationNotes: string[];
  observationCorpus?: ProviderObservationNoteEntry[];
  completedObservationCount: number;
}): CommercialReadinessFramework {
  const observationCorpus = input.observationCorpus ?? [];
  const workflowPain = scoreWorkflowPain({
    ...input,
    observationCorpus,
  });
  const productFit = scoreProductFit({
    ...input,
    observationCorpus,
  });
  const competitive = scoreCompetitiveDisplacement({
    ...input,
    observationCorpus,
  });
  const openness = scoreOpennessToChange({
    ...input,
    observationCorpus,
  });
  const evaluation = scoreEvaluationReadiness({
    ...input,
    observationCorpus,
  });
  const experience360 = score360ExperienceReadiness({
    productFit,
    openness,
    workflowPain,
    synthesis: input.synthesis,
    observationNotes: input.observationNotes,
    observationCorpus,
  });

  const dimensions = [
    workflowPain,
    productFit,
    competitive,
    openness,
    evaluation,
    experience360,
  ];

  const primaryCommercialLever = resolvePrimaryLever(dimensions);
  const primaryRisk =
    input.synthesis.validationNeeds[0]?.question ??
    "Positioning product or advancement before the surgeon confirms workflow value will feel premature.";

  return normalizeCommercialReadinessFramework({
    dimensions,
    directorSummary: buildDirectorSummary(dimensions, input.synthesis.providerName),
    primaryCommercialLever,
    primaryRisk,
  });
}

export function buildGenericCommercialReadinessFramework(input: {
  providerName: string | null;
  completedObservationCount: number;
}): CommercialReadinessFramework {
  const provider = providerLabel(input.providerName);
  const count = Math.max(0, input.completedObservationCount);

  const baseDimension = (
    id: CommercialReadinessDimensionId,
    score: number,
    reasoning: string,
  ): CommercialReadinessDimensionAssessment => ({
    id,
    label: COMMERCIAL_READINESS_DIMENSION_LABELS[id],
    score: clampCommercialReadinessScore(score),
    confidence: "Low",
    reasoning,
    evidence: [],
    supportingObservations: [],
  });

  const dimensions = COMMERCIAL_READINESS_DIMENSION_IDS.map((id) => {
    if (id === "workflow_pain") {
      return baseDimension(
        id,
        count >= 1 ? 25 : 10,
        count > 0
          ? `You have ${count} observation${count === 1 ? "" : "s"} on file — use the debrief to confirm what workflow moments matter to ${provider}.`
          : `No completed observations on file — align with ${provider} on what to watch for next.`,
      );
    }
    if (id === "evaluation_readiness") {
      return baseDimension(
        id,
        count >= 3 ? 40 : 15,
        count >= 3
          ? "Enough observation touchpoints exist to structure an evaluation conversation — confirm priorities first."
          : "Evaluation readiness is early until more observation evidence is captured.",
      );
    }
    if (id === "experience_360_readiness") {
      return baseDimension(
        id,
        count >= 3 ? 35 : 10,
        count >= 3
          ? "A 360 Experience may be appropriate after confirming workflow value — not before."
          : "360 Experience is not supported until observation evidence strengthens.",
      );
    }
    return baseDimension(id, 10, `Insufficient evidence to assess ${COMMERCIAL_READINESS_DIMENSION_LABELS[id].toLowerCase()} — validate in the debrief.`);
  });

  return normalizeCommercialReadinessFramework({
    dimensions,
    directorSummary: `Observation evidence is limited for ${provider}. Use the debrief to validate what you saw before recommending product or advancement paths.`,
    primaryCommercialLever: "workflow_pain",
    primaryRisk: "Commercial next steps are premature until the surgeon confirms observed workflow value.",
  });
}
