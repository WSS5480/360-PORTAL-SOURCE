/**
 * Types for the Provider Intelligence Context Aggregator.
 * Collects commercial-pathway intelligence into a single chronological timeline.
 */

export type ProviderIntelligenceSourceType =
  | "discovery_contact"
  | "discovery_engagement"
  | "intro_call"
  | "observation_case"
  | "observation_note"
  | "provider_debrief"
  | "debrief_visit"
  | "evaluation_engagement"
  | "evaluation_outcome"
  | "provider_profile"
  | "organization_account";

export type ProviderIntelligenceCategory =
  | "access"
  | "clinical_workflow"
  | "competitive"
  | "product_fit"
  | "evaluation"
  | "relationship"
  | "procedure"
  | "validation"
  | "outcome"
  | "planning"
  | "organizational";

export type ProviderIntelligenceConfidence = "high" | "medium" | "low";

export type ProviderIntelligenceFact = {
  id: string;
  sourceType: ProviderIntelligenceSourceType;
  sourceEngagementId: string | null;
  sourceEngagementType: string | null;
  sourceCaseId: string | null;
  date: string | null;
  confidence: ProviderIntelligenceConfidence;
  category: ProviderIntelligenceCategory;
  label: string;
  excerpt: string;
  fieldKey: string | null;
};

export type ProviderIntelligenceSourceBucket = {
  sourceType: ProviderIntelligenceSourceType;
  loadedCount: number;
  ignoredCount: number;
  factIds: string[];
};

export type ProviderIntelligenceAggregatorResult = {
  providerId: string;
  salesRepId: string;
  assembledAt: string;
  organizationId: string | null;
  organizationName: string | null;
  timeline: ProviderIntelligenceFact[];
  sourceBuckets: ProviderIntelligenceSourceBucket[];
  totalFacts: number;
};

export type IntelligenceAuditEntry = {
  factId: string;
  sourceType: ProviderIntelligenceSourceType;
  sourceEngagementId: string | null;
  sourceEngagementType: string | null;
  date: string | null;
  category: ProviderIntelligenceCategory;
  label: string;
  excerpt: string;
  reason: string;
};

export type StrategyEngineExposureReport = {
  aggregatorAttachedToContext: boolean;
  timelineFactCount: number;
  fieldsPassedToPhase1Prompt: string[];
  fieldsPassedToCommercialSynthesis: string[];
  sourceTypesConsumedByScoring: ProviderIntelligenceSourceType[];
  sourceTypesConsumedByRecommendations: ProviderIntelligenceSourceType[];
  sourceTypesNotYetConsumed: ProviderIntelligenceSourceType[];
};

export type ProviderIntelligenceAuditReport = {
  assembledAt: string;
  providerId: string;
  salesRepId: string;
  engagementId: string | null;
  loaded: IntelligenceAuditEntry[];
  ignored: IntelligenceAuditEntry[];
  usedInScoring: IntelligenceAuditEntry[];
  usedInRecommendations: IntelligenceAuditEntry[];
  strategyEngineExposure: StrategyEngineExposureReport;
  aggregator: ProviderIntelligenceAggregatorResult;
};
