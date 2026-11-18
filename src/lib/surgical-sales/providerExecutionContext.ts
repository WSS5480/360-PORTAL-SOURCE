/**
 * Shared read model for provider-scoped downstream intelligence (debrief → profile, prep, cases).
 * Composes existing builders — no extraction logic here.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { buildDiscoveryIntelligenceGroupsView } from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";
import {
  buildProviderOverviewIntelligenceSummary,
  type ProviderOverviewIntelligenceSummary,
} from "@/lib/surgical-sales/buildProviderOverviewIntelligenceSummary";
import { hasProviderObservationApprovalValidated } from "@/lib/surgical-sales/buildProviderDiscoveryStageProgression";
import {
  buildNewCaseUnresolvedProviderSignals,
  type NewCaseUnresolvedProviderSignal,
} from "@/lib/surgical-sales/buildNewCaseUnresolvedProviderSignals";
import {
  buildEngagementIntelligenceReadiness,
  type EngagementIntelligenceReadiness,
} from "@/lib/surgical-sales/engagements/engagementIntelligenceReadiness";
import type { DiscoveryIntelligenceGroupsView } from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";
import {
  buildProviderIntelligenceSnapshot,
  type ProviderIntelligenceSnapshot,
} from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

export type ProviderExecutionContext = {
  overviewSummary: ProviderOverviewIntelligenceSummary;
  intelligenceSnapshot: ProviderIntelligenceSnapshot;
  discoveryGroups: DiscoveryIntelligenceGroupsView;
  engagementReadiness: (engagementType: string) => EngagementIntelligenceReadiness;
  unresolvedCaseSignals: NewCaseUnresolvedProviderSignal[];
  observationApproved: boolean;
};

export function getProviderExecutionContext(input: {
  contact: Record<string, unknown>;
  providerId: string;
  relatedContacts?: Array<Record<string, unknown>>;
  organizationName?: string | null;
  specialty?: string | null;
  planning?: ProviderPlanningCompletion | null;
  engagements?: ProviderEngagementSummary[];
}): ProviderExecutionContext {
  const contact = input.contact;
  const providerId = input.providerId;

  return {
    overviewSummary: buildProviderOverviewIntelligenceSummary({
      contact,
      organizationName: input.organizationName,
      specialty: input.specialty,
      relatedContacts: input.relatedContacts,
      engagements: input.engagements,
    }),
    intelligenceSnapshot: buildProviderIntelligenceSnapshot(contact, providerId),
    discoveryGroups: buildDiscoveryIntelligenceGroupsView({ contact }),
    engagementReadiness: (engagementType: string) =>
      buildEngagementIntelligenceReadiness({
        provider: contact,
        engagementType,
        providerId,
      }),
    unresolvedCaseSignals: buildNewCaseUnresolvedProviderSignals(
      contact,
      input.planning ?? null,
    ),
    observationApproved: hasProviderObservationApprovalValidated(contact),
  };
}
