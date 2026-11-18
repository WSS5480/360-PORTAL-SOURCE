/**
 * Multi-pass debrief intelligence pipeline — each pass has a single responsibility.
 */

import type { DebriefIntelligenceCategory } from "@/lib/surgical-sales/debriefIntelligenceCategories";
import type { ClassifiedEngagementOutcomeId } from "@/lib/surgical-sales/engagements/classifyEngagementOutcomeFromDebrief";
import type { DebriefExtractedFacts } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefFactKeys";
import type { SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";

export type {
  DebriefExtractedFacts,
  DebriefExtractedFactRecord,
  DebriefFactKey,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefFactKeys";

import type { ExtractedIntelligenceMaturity } from "@/lib/surgical-sales/extractedIntelligenceClassification";

export type DebriefFactConfidence = "High" | "Medium" | "Low";

/** Pass 2 classification buckets (do not alter fact text). */
export type DebriefFactClassification =
  | "observation_access"
  | "credentialing"
  | "scheduling"
  | "workflow_participant"
  | "clinical_focus"
  | "relationship"
  | "product_fit"
  | "current_product"
  | "next_step";

export type DebriefRawFact = {
  id: string;
  /** Machine fact key from Pass 1 — primary input for Pass 2 classification. */
  fact_key: string;
  attributes?: Record<string, string | string[] | boolean>;
  /** Stable token (fact_key); not AI-generated UI copy. */
  fact_text: string;
  evidence_quote: string;
  subject: string | null;
  named_people: string[];
  confidence: DebriefFactConfidence;
};

export type DebriefClassifiedFact = DebriefRawFact & {
  classification: DebriefFactClassification;
  intelligenceCategory: DebriefIntelligenceCategory;
};

export type DebriefRulesOutcome = {
  observationApprovedExplicit: boolean;
  observationInterestOnly: boolean;
  engagementOutcomeId: ClassifiedEngagementOutcomeId;
  credentialingPlatformLabel: string;
  credentialingPlatformConfirmed: boolean;
  pathwayStageId: SalesPathwayStageId;
  workflowParticipantNames: string[];
  supportContactCandidateNames: string[];
  rejectedFactIds: string[];
};

export type DebriefPass4Synthesis = {
  accessSummaryLines: string[];
  clinicalFocusLines: string[];
  relationshipNextStepLines: string[];
  keyTakeawayLines: string[];
  nextActionLines: string[];
};

/** @deprecated Use DebriefIntelligenceCapturedKind */
export type DebriefReviewCardKind =
  | "access_summary"
  | "workflow_participant"
  | "clinical_focus"
  | "relationship_next_steps"
  | "product_fit";

/** Durable provider/account intelligence shown in review Section 1. */
export type DebriefIntelligenceCapturedKind =
  | "observation_access_status"
  | "credentialing_requirement"
  | "clinical_focus"
  | "workflow_ownership"
  | "product_relevance"
  | "current_product_use";

export type DebriefIntelligenceCapturedItem = {
  id: string;
  kind: DebriefIntelligenceCapturedKind;
  title: string;
  learned: string;
  evidenceQuotes: string[];
  confidence: DebriefFactConfidence;
  whatWillUpdate: string;
  intelligenceCategory: DebriefIntelligenceCategory;
  linkedFactIds: string[];
  fieldUpdateIds: string[];
  platformId?: string;
  intelligenceMaturity: ExtractedIntelligenceMaturity;
  intelligenceMaturityLabel: string;
};

export type DebriefRecommendedActionKind =
  | "create_workflow_contact"
  | "follow_up_task"
  | "schedule_engagement"
  | "update_observation_status";

export type DebriefRecommendedAction = {
  id: string;
  kind: DebriefRecommendedActionKind;
  title: string;
  body: string;
  confidence: DebriefFactConfidence;
  evidenceQuote: string | null;
  /** Workflow contact action fields */
  contactId?: string;
  participantName?: string;
  possibleRole?: string | null;
  contactInfoStatus?: "On file" | "Missing" | "Partial";
  /** Follow-up / scheduling copy */
  actionLabel?: string;
  fieldUpdateIds: string[];
};

/** @deprecated Use intelligenceCaptured + recommendedActions */
export type DebriefPipelineReviewCard = DebriefIntelligenceCapturedItem & {
  kind: DebriefReviewCardKind;
  contactId?: string;
};

export type DebriefIntelligencePipelineResult = {
  /** Pass 1 structured buckets (no prose). */
  pass1_extractedFacts: DebriefExtractedFacts;
  pass1_rawFacts: DebriefRawFact[];
  pass2_classifiedFacts: DebriefClassifiedFact[];
  pass3_rules: DebriefRulesOutcome;
  pass4_synthesis: DebriefPass4Synthesis;
  intelligenceCaptured: DebriefIntelligenceCapturedItem[];
  recommendedActions: DebriefRecommendedAction[];
  /** @deprecated Use intelligenceCaptured */
  pass5_reviewCards: DebriefIntelligenceCapturedItem[];
};
