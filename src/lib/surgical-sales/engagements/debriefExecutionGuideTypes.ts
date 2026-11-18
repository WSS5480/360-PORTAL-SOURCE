import type { DebriefGuidanceIntelligence } from "@/lib/surgical-sales/engagements/debriefGuidanceIntelligenceTypes";

export type DebriefExecutionGuideSource =
  | "saved_prepare_workspace"
  | "generated_from_observation_patterns";

export type DebriefExecutionGuide = {
  meetingObjective: string | null;
  whatWeObserved: string[];
  whatToValidate: string[];
  conversationStarters: string[];
  recommendedOutcome: string;
  primaryHypothesis: string | null;
  source: DebriefExecutionGuideSource;
  guidanceIntelligence?: DebriefGuidanceIntelligence;
};