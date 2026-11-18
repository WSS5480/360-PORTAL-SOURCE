"use client";

/**
 * Field-time cautions — delegates to calm operational warning cards.
 */
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { ProviderOperationalWarningsPanel } from "./ProviderOperationalWarningsPanel";

export function ProviderFieldTimeWastePreventionPanel({
  contact,
  planning,
  relationshipStage,
  engagements,
  opportunities,
  cases,
  onCapture,
}: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  onCapture: (sectionId: ProviderIntelligenceSectionId, dbKey?: string) => void;
}) {
  return (
    <ProviderOperationalWarningsPanel
      contact={contact}
      planning={planning}
      relationshipStage={relationshipStage}
      engagements={engagements}
      opportunities={opportunities}
      cases={cases}
      onCapture={onCapture}
    />
  );
}
