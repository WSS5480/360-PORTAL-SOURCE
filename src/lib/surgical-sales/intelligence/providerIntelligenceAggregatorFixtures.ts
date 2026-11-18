import type {
  ProviderIntelligenceAggregatorResult,
  ProviderIntelligenceAuditReport,
} from "@/lib/surgical-sales/intelligence/providerIntelligenceAggregatorTypes";

export const EMPTY_PROVIDER_INTELLIGENCE_AGGREGATOR: ProviderIntelligenceAggregatorResult = {
  providerId: "",
  salesRepId: "",
  assembledAt: "1970-01-01T00:00:00.000Z",
  organizationId: null,
  organizationName: null,
  timeline: [],
  sourceBuckets: [],
  totalFacts: 0,
};

export const EMPTY_PROVIDER_INTELLIGENCE_AUDIT: ProviderIntelligenceAuditReport = {
  assembledAt: "1970-01-01T00:00:00.000Z",
  providerId: "",
  salesRepId: "",
  engagementId: null,
  loaded: [],
  ignored: [],
  usedInScoring: [],
  usedInRecommendations: [],
  strategyEngineExposure: {
    aggregatorAttachedToContext: false,
    timelineFactCount: 0,
    fieldsPassedToPhase1Prompt: [],
    fieldsPassedToCommercialSynthesis: [],
    sourceTypesConsumedByScoring: [],
    sourceTypesConsumedByRecommendations: [],
    sourceTypesNotYetConsumed: [],
  },
  aggregator: EMPTY_PROVIDER_INTELLIGENCE_AGGREGATOR,
};
