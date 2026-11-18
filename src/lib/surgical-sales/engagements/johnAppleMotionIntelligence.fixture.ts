/**
 * Motion intelligence fixtures for John Apple regression (prior debrief, intro call, scheduling).
 */

import type { ProviderIntelligenceAggregatorResult } from "@/lib/surgical-sales/intelligence/providerIntelligenceAggregatorTypes";
import { EMPTY_PROVIDER_INTELLIGENCE_CONTEXT } from "@/lib/surgical-sales/engagements/providerIntelligenceContext";
import type { AiDebriefStrategyBuilderContext } from "@/lib/surgical-sales/engagements/loadAiDebriefStrategyBuilderContext";
import type { ProviderIntelligenceFact } from "@/lib/surgical-sales/intelligence/providerIntelligenceAggregatorTypes";

export const JOHN_APPLE_CURRENT_DEBRIEF_ENGAGEMENT_ID = "engagement-debrief-current";

export const JOHN_APPLE_PRIOR_DEBRIEF_COMMITMENT =
  "confirm visualization workflow concerns on next case";

export const JOHN_APPLE_PRIOR_DEBRIEF_DATE = "2026-05-15";

export const JOHN_APPLE_INTRO_CALL_SCHEDULING =
  "Karen controls scheduling for robotic cases. Wanted to see workflow fit in the OR before product conversation.";

export const JOHN_APPLE_INTRO_CALL_DATE = "2026-04-01";

export const JOHN_APPLE_CONTACT_ACCESS_PATH =
  "Route robotic case scheduling through peri-op coordinator Karen";

function makeMotionFacts(): ProviderIntelligenceFact[] {
  return [
    {
      id: "provider_debrief-1",
      sourceType: "provider_debrief",
      sourceEngagementId: "engagement-debrief-prior",
      sourceEngagementType: "provider_debrief",
      sourceCaseId: "prior-4",
      date: JOHN_APPLE_PRIOR_DEBRIEF_DATE,
      confidence: "medium",
      category: "clinical_workflow",
      label: "Provider debrief learning: workflow_validation",
      excerpt: JOHN_APPLE_PRIOR_DEBRIEF_COMMITMENT,
      fieldKey: "debrief_intelligence_snapshot.whatWeLearned",
    },
    {
      id: "intro_call-1",
      sourceType: "intro_call",
      sourceEngagementId: "engagement-intro-1",
      sourceEngagementType: "intro_call",
      sourceCaseId: null,
      date: JOHN_APPLE_INTRO_CALL_DATE,
      confidence: "high",
      category: "access",
      label: "Intro call visit debrief narrative",
      excerpt: JOHN_APPLE_INTRO_CALL_SCHEDULING,
      fieldKey: "debrief_intelligence_snapshot.narrative",
    },
    {
      id: "discovery_contact-1",
      sourceType: "discovery_contact",
      sourceEngagementId: null,
      sourceEngagementType: null,
      sourceCaseId: null,
      date: "2026-03-20",
      confidence: "medium",
      category: "access",
      label: "Observation access path",
      excerpt: JOHN_APPLE_CONTACT_ACCESS_PATH,
      fieldKey: "provider_observation_access_path",
    },
  ];
}

export function buildJohnAppleMotionAggregator(): ProviderIntelligenceAggregatorResult {
  const facts = makeMotionFacts();
  return {
    providerId: "provider-apple",
    salesRepId: "rep-1",
    assembledAt: "2026-06-09T00:00:00.000Z",
    organizationId: null,
    organizationName: null,
    timeline: facts,
    sourceBuckets: [],
    totalFacts: facts.length,
  };
}

export function buildJohnAppleMotionIntelligenceContextStub(
  base: Pick<
    AiDebriefStrategyBuilderContext,
    | "commercialSynthesis"
    | "plan"
    | "observationNotes"
    | "observationCorpus"
    | "productKnowledge"
    | "completedObservationCount"
    | "planMode"
    | "providerName"
  >,
): Pick<
  AiDebriefStrategyBuilderContext,
  "engagementId" | "providerIntelligence" | "intelligenceAggregator"
> {
  return {
    engagementId: JOHN_APPLE_CURRENT_DEBRIEF_ENGAGEMENT_ID,
    providerIntelligence: {
      ...EMPTY_PROVIDER_INTELLIGENCE_CONTEXT,
      introCallSummary: {
        engagementId: "engagement-intro-1",
        snapshotSummary: JOHN_APPLE_INTRO_CALL_SCHEDULING,
        updatedAt: `${JOHN_APPLE_INTRO_CALL_DATE}T12:00:00.000Z`,
      },
    },
    intelligenceAggregator: buildJohnAppleMotionAggregator(),
  };
}
