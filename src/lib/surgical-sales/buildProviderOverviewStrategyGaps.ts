/**
 * Top operational intelligence actions for provider overview Strategy section.
 * Evidence → Conclusion → Recommendation — not missing-field gaps.
 */

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { discoveryPriorityExpectedOutcome } from "@/lib/surgical-sales/providerDiscoveryPriorityNarrative";
import type { IntelligenceGapOperationalConsequence } from "@/lib/surgical-sales/providerOperationalImpact";
import type { IntelligenceGapFieldGuidance } from "@/lib/surgical-sales/providerIntelligenceGapFieldGuidance";
import { intelligenceGapFieldGuidance } from "@/lib/surgical-sales/providerIntelligenceGapFieldGuidance";
import {
  isIntelligenceSectionVisibleForCommercialStage,
  type ProviderCommercialWorkflowStage,
} from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { scanLine, scanWords } from "@/lib/surgical-sales/providerOverviewScanCopy";
import { providerOperationalConsequenceForField } from "@/lib/surgical-sales/providerOperationalImpact";
import { buildProviderEvidenceBasedRecommendations } from "@/lib/surgical-sales/providerEvidenceBasedRecommendations";

export type ProviderOverviewOperationalGap = {
  id: string;
  headline: string;
  operationalConsequence: IntelligenceGapOperationalConsequence;
  /** Compact scan — field inefficiency line. */
  operationalImpact: string;
  unlockValue: string;
  /** Short operational summary for overview scan. */
  unlockScan: string;
  sectionId: ProviderIntelligenceSectionId;
  dbKey: string;
  fieldGuidance: IntelligenceGapFieldGuidance;
  /** Evidence that triggered this action. */
  evidence?: string;
  /** Conclusion drawn from evidence. */
  conclusion?: string;
};

export { PROVIDER_OVERVIEW_STRATEGY_TITLE } from "@/lib/surgical-sales/providerOverviewVocabulary";

export function buildProviderOverviewStrategyGaps(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  commercialStage: ProviderCommercialWorkflowStage;
  maxItems?: number;
}): ProviderOverviewOperationalGap[] {
  const limit = input.maxItems ?? 3;
  const chains = buildProviderEvidenceBasedRecommendations({
    contact: input.contact,
    planning: input.planning,
    maxItems: limit + 4,
  }).filter((chain) =>
    isIntelligenceSectionVisibleForCommercialStage(chain.sectionId, input.commercialStage),
  );

  return chains.slice(0, limit).map((chain) => {
    const unlockValue = discoveryPriorityExpectedOutcome(chain.dbKey);
    const operationalConsequence = providerOperationalConsequenceForField(chain.dbKey);
    return {
      id: chain.id,
      headline: scanLine(chain.recommendation, 96),
      operationalConsequence,
      operationalImpact: scanLine(chain.whyItMatters, 120),
      unlockValue,
      unlockScan: scanWords(unlockValue, 9),
      sectionId: chain.sectionId,
      dbKey: chain.dbKey,
      fieldGuidance: intelligenceGapFieldGuidance(chain.dbKey, chain.sectionId),
      evidence: chain.evidence,
      conclusion: chain.conclusion,
    };
  });
}
