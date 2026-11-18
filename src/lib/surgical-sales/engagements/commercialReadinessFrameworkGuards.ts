/**
 * Guardrails for Commercial Readiness Framework — block ontology label leakage.
 */

import { containsInternalCategoryLabel } from "@/lib/surgical-sales/engagements/debriefClinicalTopicTranslation";
import { isCommercialCategoryLabel } from "@/lib/surgical-sales/engagements/buildDebriefCommercialSynthesis";
import type {
  CommercialReadinessDimensionAssessment,
  CommercialReadinessFramework,
} from "@/lib/surgical-sales/engagements/commercialReadinessFrameworkTypes";
import {
  COMMERCIAL_READINESS_DIMENSION_IDS,
  COMMERCIAL_READINESS_DIMENSION_LABELS,
  clampCommercialReadinessScore,
} from "@/lib/surgical-sales/engagements/commercialReadinessFrameworkTypes";
import type { AiDebriefStrategyBuilderOutput } from "@/lib/surgical-sales/engagements/aiDebriefStrategyBuilderTypes";
import type { AiDebriefStrategyBuilderPath } from "@/lib/surgical-sales/engagements/aiDebriefStrategyBuilderTypes";

export function commercialReadinessTextHasLabelLeak(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  return isCommercialCategoryLabel(trimmed) || containsInternalCategoryLabel(trimmed);
}

export function sanitizeCommercialReadinessText(text: string, fallback: string): string {
  const trimmed = text.trim();
  if (!trimmed || commercialReadinessTextHasLabelLeak(trimmed)) {
    return fallback;
  }
  return trimmed;
}

export function normalizeCommercialReadinessDimension(
  raw: CommercialReadinessDimensionAssessment,
): CommercialReadinessDimensionAssessment {
  const label = COMMERCIAL_READINESS_DIMENSION_LABELS[raw.id] ?? raw.label;

  const reasoning = sanitizeCommercialReadinessText(
    raw.reasoning,
    `Evidence from observation notes suggests ${label.toLowerCase()} warrants follow-up in the debrief conversation.`,
  );

  const evidence = raw.evidence
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && !commercialReadinessTextHasLabelLeak(item))
    .slice(0, 6);

  const supportingObservations = raw.supportingObservations
    .map((item) => ({
      observationIndex: item.observationIndex,
      sourceNoteId: item.sourceNoteId,
      excerpt: sanitizeCommercialReadinessText(
        item.excerpt,
        "Observation note excerpt unavailable.",
      ),
      contribution: sanitizeCommercialReadinessText(
        item.contribution,
        `Supports the ${label.toLowerCase()} assessment.`,
      ),
    }))
    .slice(0, 6);

  return {
    id: raw.id,
    label,
    score: clampCommercialReadinessScore(raw.score),
    confidence: raw.confidence,
    reasoning,
    evidence,
    supportingObservations,
  };
}

export function normalizeCommercialReadinessFramework(
  raw: CommercialReadinessFramework,
): CommercialReadinessFramework {
  const byId = new Map(raw.dimensions.map((item) => [item.id, item]));
  const dimensions = COMMERCIAL_READINESS_DIMENSION_IDS.map((id) =>
    normalizeCommercialReadinessDimension(
      byId.get(id) ?? {
        id,
        label: COMMERCIAL_READINESS_DIMENSION_LABELS[id],
        score: 0,
        confidence: "Low",
        reasoning: `Insufficient observation evidence to assess ${COMMERCIAL_READINESS_DIMENSION_LABELS[id].toLowerCase()}.`,
        evidence: [],
        supportingObservations: [],
      },
    ),
  );

  const directorSummary = sanitizeCommercialReadinessText(
    raw.directorSummary,
    "Observation evidence is still forming — use the debrief to confirm what matters to the surgeon before recommending a commercial next step.",
  );

  const primaryRisk = sanitizeCommercialReadinessText(
    raw.primaryRisk,
    "Commercial next steps are premature until the surgeon confirms observed workflow value.",
  );

  const primaryCommercialLever = COMMERCIAL_READINESS_DIMENSION_IDS.includes(
    raw.primaryCommercialLever,
  )
    ? raw.primaryCommercialLever
    : "workflow_pain";

  return {
    dimensions,
    directorSummary,
    primaryCommercialLever,
    primaryRisk,
  };
}

export function frameworkAdvancementPathFromScores(
  framework: CommercialReadinessFramework,
): AiDebriefStrategyBuilderPath {
  const evaluation = framework.dimensions.find((d) => d.id === "evaluation_readiness");
  const experience360 = framework.dimensions.find((d) => d.id === "experience_360_readiness");
  const workflowPain = framework.dimensions.find((d) => d.id === "workflow_pain");
  const openness = framework.dimensions.find((d) => d.id === "openness_to_change");

  const evalScore = evaluation?.score ?? 0;
  const exp360Score = experience360?.score ?? 0;
  const painScore = workflowPain?.score ?? 0;
  const openScore = openness?.score ?? 0;

  if (painScore < 35 && openScore < 35) {
    return "No Action";
  }

  if (evalScore >= 65 && openScore >= 50 && painScore >= 50) {
    return "Case Commitment";
  }

  if (exp360Score >= 50 || (painScore >= 50 && openScore >= 40)) {
    return "360 Experience";
  }

  return "No Action";
}

export function alignAdvancementPathWithFramework(
  strategy: AiDebriefStrategyBuilderOutput,
  framework: CommercialReadinessFramework,
): AiDebriefStrategyBuilderOutput {
  const alignedPath = frameworkAdvancementPathFromScores(framework);
  const evaluation = framework.dimensions.find((d) => d.id === "evaluation_readiness");

  if (
    strategy.recommendedAdvancementPath.path === "Case Commitment" &&
    (evaluation?.score ?? 0) < 50
  ) {
    return {
      ...strategy,
      recommendedAdvancementPath: {
        path: alignedPath,
        why:
          alignedPath === "360 Experience"
            ? "Evaluation readiness is not high enough for case commitment — a 360 Experience is the safer next step after the surgeon confirms workflow value."
            : "Evaluation readiness is not high enough for case commitment — hold commercial next steps until appetite and procedural alignment are confirmed.",
      },
    };
  }

  if (strategy.recommendedAdvancementPath.path !== alignedPath) {
    const experience360 = framework.dimensions.find((d) => d.id === "experience_360_readiness");
    const why =
      alignedPath === "Case Commitment"
        ? `Evaluation readiness (${evaluation?.score ?? 0}/100) and openness support moving toward case commitment after validation.`
        : alignedPath === "360 Experience"
          ? `360 Experience readiness (${experience360?.score ?? 0}/100) suggests a lower-commitment evaluation before asking for OR cases.`
          : "Workflow pain and openness scores do not yet support a commercial advancement — confirm value first.";

    return {
      ...strategy,
      recommendedAdvancementPath: {
        path: alignedPath,
        why,
      },
    };
  }

  return strategy;
}

const DIMENSION_ID_ALIASES: Record<string, string> = {
  workflow_pain: "workflow_pain",
  product_fit: "product_fit",
  competitive_displacement: "competitive_displacement_opportunity",
  competitive_displacement_opportunity: "competitive_displacement_opportunity",
  openness_to_change: "openness_to_change",
  evaluation_readiness: "evaluation_readiness",
  experience_360_readiness: "experience_360_readiness",
  "360_experience_readiness": "experience_360_readiness",
};

export function learnedBulletReferencesFramework(
  bullet: string,
  framework: CommercialReadinessFramework,
): boolean {
  const lower = bullet.toLowerCase();
  for (const dimension of framework.dimensions) {
    if (lower.includes(dimension.id.replace(/_/g, " "))) return true;
    if (lower.includes(dimension.label.toLowerCase())) return true;
    for (const evidence of dimension.evidence) {
      if (evidence.length >= 24 && lower.includes(evidence.slice(0, 24).toLowerCase())) {
        return true;
      }
    }
  }
  return false;
}

export function enrichLearnedBulletsWithFramework(
  bullets: string[],
  framework: CommercialReadinessFramework,
): string[] {
  const enriched = bullets.map((bullet) => {
    if (learnedBulletReferencesFramework(bullet, framework)) {
      return bullet;
    }
    const topDimension = [...framework.dimensions].sort((a, b) => b.score - a.score)[0];
    if (!topDimension || topDimension.score < 35) return bullet;
    const evidence = topDimension.evidence[0] ?? topDimension.reasoning;
    return `${bullet} (Grounded in ${topDimension.label}: ${evidence.replace(/\.$/, "")}.)`;
  });

  if (enriched.length >= 3) return enriched.slice(0, 5);

  const additions: string[] = [];
  for (const dimension of [...framework.dimensions].sort((a, b) => b.score - a.score)) {
    if (dimension.score < 40) continue;
    const evidence = dimension.evidence[0] ?? dimension.reasoning;
    additions.push(
      `${dimension.label} (${dimension.score}/100): ${evidence.replace(/\.$/, "")}.`,
    );
    if (enriched.length + additions.length >= 3) break;
  }

  return [...enriched, ...additions].slice(0, 5);
}

export function resolveDimensionIdAlias(raw: string): string | null {
  const key = raw.trim().toLowerCase().replace(/\s+/g, "_");
  return DIMENSION_ID_ALIASES[key] ?? null;
}
