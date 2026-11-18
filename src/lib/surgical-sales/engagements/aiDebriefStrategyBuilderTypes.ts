/**
 * AI Debrief Strategy Builder — structured coaching output for Observation Debrief prep.
 */

import { z } from "zod";
import type { CommercialReadinessFramework } from "@/lib/surgical-sales/engagements/commercialReadinessFrameworkTypes";

export const AI_DEBRIEF_STRATEGY_BUILDER_FIT_LEVELS = [
  "strong",
  "moderate",
  "weak",
  "none",
] as const;

export type AiDebriefStrategyBuilderFitLevel =
  (typeof AI_DEBRIEF_STRATEGY_BUILDER_FIT_LEVELS)[number];

export const AI_DEBRIEF_STRATEGY_BUILDER_PATHS = [
  "360 Experience",
  "Case Commitment",
  "No Action",
] as const;

export type AiDebriefStrategyBuilderPath =
  (typeof AI_DEBRIEF_STRATEGY_BUILDER_PATHS)[number];

export type AiDebriefStrategyBuilderOutput = {
  debriefMission: string;
  whatWeThinkWeLearned: string[];
  primaryHypothesis: string;
  recommendedProductAngle: {
    productName: string | null;
    fitLevel: AiDebriefStrategyBuilderFitLevel;
    why: string;
    risk: string;
  };
  conversationStrategy: {
    opening: string;
    validateObservationQuestions: string[];
    impactQuestions: string[];
    opennessToChangeQuestions: string[];
    closingQuestion: string;
  };
  recommendedAdvancementPath: {
    path: AiDebriefStrategyBuilderPath;
    why: string;
  };
  desiredOutcome: string;
};

export const AiDebriefStrategyBuilderOutputSchema = z.object({
  debriefMission: z.string().min(1).max(600),
  whatWeThinkWeLearned: z.array(z.string().min(1).max(400)).min(1).max(5),
  primaryHypothesis: z.string().min(1).max(500),
  recommendedProductAngle: z.object({
    productName: z.string().min(1).max(120).nullable(),
    fitLevel: z.enum(AI_DEBRIEF_STRATEGY_BUILDER_FIT_LEVELS),
    why: z.string().min(1).max(500),
    risk: z.string().min(1).max(400),
  }),
  conversationStrategy: z.object({
    opening: z.string().min(1).max(400),
    validateObservationQuestions: z.array(z.string().min(1).max(300)).min(1).max(3),
    impactQuestions: z.array(z.string().min(1).max(300)).min(1).max(3),
    opennessToChangeQuestions: z.array(z.string().min(1).max(300)).min(1).max(3),
    closingQuestion: z.string().min(1).max(400),
  }),
  recommendedAdvancementPath: z.object({
    path: z.enum(AI_DEBRIEF_STRATEGY_BUILDER_PATHS),
    why: z.string().min(1).max(500),
  }),
  desiredOutcome: z.string().min(1).max(500),
});

export type AiDebriefStrategyBuilderSource = "openai" | "rules_fallback";

export type AiDebriefStrategyBuilderResult = {
  framework: CommercialReadinessFramework;
  strategy: AiDebriefStrategyBuilderOutput;
  source: AiDebriefStrategyBuilderSource;
  frameworkSource: AiDebriefStrategyBuilderSource;
};

export type GenerateAiDebriefStrategyBuilderResult =
  | {
      ok: true;
      strategy: AiDebriefStrategyBuilderOutput;
      framework: CommercialReadinessFramework;
      source: AiDebriefStrategyBuilderSource;
    }
  | { ok: false; message: string; status: 400 | 404 | 500 | 503 };
