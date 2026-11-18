/**
 * Commercial Readiness Framework — structured commercial reasoning for Observation Debrief prep.
 */

import { z } from "zod";

export const COMMERCIAL_READINESS_DIMENSION_IDS = [
  "workflow_pain",
  "product_fit",
  "competitive_displacement_opportunity",
  "openness_to_change",
  "evaluation_readiness",
  "experience_360_readiness",
] as const;

export type CommercialReadinessDimensionId =
  (typeof COMMERCIAL_READINESS_DIMENSION_IDS)[number];

export const COMMERCIAL_READINESS_CONFIDENCE_LEVELS = ["High", "Medium", "Low"] as const;

export type CommercialReadinessConfidence =
  (typeof COMMERCIAL_READINESS_CONFIDENCE_LEVELS)[number];

export const COMMERCIAL_READINESS_SCORE_BANDS = [
  "weak",
  "developing",
  "strong",
  "ready",
] as const;

export type CommercialReadinessScoreBand =
  (typeof COMMERCIAL_READINESS_SCORE_BANDS)[number];

export const COMMERCIAL_READINESS_DIMENSION_LABELS: Record<
  CommercialReadinessDimensionId,
  string
> = {
  workflow_pain: "Workflow Pain",
  product_fit: "Product Fit",
  competitive_displacement_opportunity: "Competitive Displacement Opportunity",
  openness_to_change: "Openness To Change",
  evaluation_readiness: "Evaluation Readiness",
  experience_360_readiness: "360 Experience Readiness",
};

export type CommercialReadinessSupportingObservation = {
  observationIndex: number | null;
  sourceNoteId: string | null;
  excerpt: string;
  contribution: string;
};

export type CommercialReadinessDimensionAssessment = {
  id: CommercialReadinessDimensionId;
  label: string;
  score: number;
  confidence: CommercialReadinessConfidence;
  reasoning: string;
  evidence: string[];
  supportingObservations: CommercialReadinessSupportingObservation[];
};

export type CommercialReadinessFramework = {
  dimensions: CommercialReadinessDimensionAssessment[];
  directorSummary: string;
  primaryCommercialLever: CommercialReadinessDimensionId;
  primaryRisk: string;
};

const SupportingObservationSchema = z.object({
  observationIndex: z.number().int().min(1).nullable(),
  sourceNoteId: z.string().max(120).nullable(),
  excerpt: z.string().min(1).max(600),
  contribution: z.string().min(1).max(400),
});

const DimensionAssessmentSchema = z.object({
  id: z.enum(COMMERCIAL_READINESS_DIMENSION_IDS),
  label: z.string().min(1).max(80),
  score: z.number().min(0).max(100),
  confidence: z.enum(COMMERCIAL_READINESS_CONFIDENCE_LEVELS),
  reasoning: z.string().min(1).max(600),
  evidence: z.array(z.string().min(1).max(600)).min(0).max(6),
  supportingObservations: z.array(SupportingObservationSchema).min(0).max(6),
});

export const CommercialReadinessFrameworkSchema = z.object({
  dimensions: z.array(DimensionAssessmentSchema).length(6),
  directorSummary: z.string().min(1).max(800),
  primaryCommercialLever: z.enum(COMMERCIAL_READINESS_DIMENSION_IDS),
  primaryRisk: z.string().min(1).max(500),
});

export function commercialReadinessScoreBand(score: number): CommercialReadinessScoreBand {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  if (clamped <= 34) return "weak";
  if (clamped <= 64) return "developing";
  if (clamped <= 84) return "strong";
  return "ready";
}

export function commercialReadinessScoreBandLabel(band: CommercialReadinessScoreBand): string {
  switch (band) {
    case "weak":
      return "Weak";
    case "developing":
      return "Developing";
    case "strong":
      return "Strong";
    case "ready":
      return "Ready";
  }
}

export function clampCommercialReadinessScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getCommercialReadinessDimension(
  framework: CommercialReadinessFramework,
  id: CommercialReadinessDimensionId,
): CommercialReadinessDimensionAssessment {
  const dimension = framework.dimensions.find((item) => item.id === id);
  if (!dimension) {
    throw new Error(`Missing commercial readiness dimension: ${id}`);
  }
  return dimension;
}
