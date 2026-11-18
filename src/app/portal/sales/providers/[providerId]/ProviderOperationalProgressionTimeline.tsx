"use client";

/**
 * @deprecated Prefer ProviderIntelligenceProgressionDashboard — deployment track only wrapper.
 */

import { ProviderIntelligenceProgressionDashboard } from "./ProviderIntelligenceProgressionDashboard";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

export function ProviderOperationalProgressionTimeline(props: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
}) {
  return <ProviderIntelligenceProgressionDashboard {...props} />;
}
