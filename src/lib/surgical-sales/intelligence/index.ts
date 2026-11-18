export type {
  IntelligenceAuditEntry,
  ProviderIntelligenceAggregatorResult,
  ProviderIntelligenceAuditReport,
  ProviderIntelligenceCategory,
  ProviderIntelligenceConfidence,
  ProviderIntelligenceFact,
  ProviderIntelligenceSourceBucket,
  ProviderIntelligenceSourceType,
  StrategyEngineExposureReport,
} from "@/lib/surgical-sales/intelligence/providerIntelligenceAggregatorTypes";

export {
  EMPTY_PROVIDER_INTELLIGENCE_AGGREGATOR,
  EMPTY_PROVIDER_INTELLIGENCE_AUDIT,
} from "@/lib/surgical-sales/intelligence/providerIntelligenceAggregatorFixtures";

export { loadProviderIntelligenceAggregator } from "@/lib/surgical-sales/intelligence/loadProviderIntelligenceAggregator";
export { buildStrategyIntelligenceConsumptionAudit } from "@/lib/surgical-sales/intelligence/buildStrategyIntelligenceConsumptionAudit";
export {
  extractDiscoveryContactFacts,
  extractObservationNoteFacts,
  resetProviderIntelligenceFactCounter,
  sortTimelineFacts,
} from "@/lib/surgical-sales/intelligence/extractProviderIntelligenceFacts";
