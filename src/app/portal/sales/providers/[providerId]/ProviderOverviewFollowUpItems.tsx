"use client";

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderDebriefNarrativeContext } from "@/lib/surgical-sales/engagements/loadLatestProviderDebriefNarrative";
import { ProviderFollowUpItemsSection } from "./ProviderFollowUpItemsSection";
import { useProviderFollowUpItems } from "./useProviderFollowUpItems";

export function ProviderOverviewFollowUpItems({
  providerId,
  engagements,
  debriefNarrativeContext,
  onEngagementsUpdated,
  onProviderUpdated,
}: {
  providerId: string;
  engagements?: ProviderEngagementSummary[];
  debriefNarrativeContext?: ProviderDebriefNarrativeContext | null;
  onEngagementsUpdated?: (engagements: ProviderEngagementSummary[]) => void;
  onProviderUpdated?: (provider: Record<string, unknown>) => void | Promise<void>;
}) {
  const { followUpItems, toggleFollowUpItem } = useProviderFollowUpItems({
    engagements,
    debriefNarrativeContext,
    providerId,
    onEngagementsUpdated,
    onProviderUpdated,
  });

  if (followUpItems.length === 0) return null;

  return (
    <div className="pov-bottom-stack" data-testid="pov-follow-up-items">
      <ProviderFollowUpItemsSection
        items={followUpItems}
        onToggleComplete={(item, completed) => void toggleFollowUpItem(item, completed)}
      />
    </div>
  );
}
