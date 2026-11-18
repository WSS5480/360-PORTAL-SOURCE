"use client";

import type { AccountUnderstandingConfirmCard as CardModel } from "@/lib/surgical-sales/buildAccountUnderstandingUncertaintyCards";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { buildOperationalReadinessCardFromConfirmCard } from "@/lib/surgical-sales/buildOperationalReadinessCardView";
import { ProviderOperationalReadinessCard } from "./ProviderOperationalReadinessCard";

export function AccountUnderstandingConfirmCard({
  card,
  contact,
  onAddNote,
  onViewDetails,
  disabled = false,
  pulseKey = 0,
}: {
  card: CardModel;
  contact: Record<string, unknown>;
  onAddNote: (sectionId: ProviderIntelligenceSectionId, dbKey: string) => void;
  onViewDetails: (sectionId: ProviderIntelligenceSectionId) => void;
  disabled?: boolean;
  pulseKey?: number;
}) {
  const view = buildOperationalReadinessCardFromConfirmCard(card, contact);
  return (
    <ProviderOperationalReadinessCard
      card={view}
      onPrimaryAction={onAddNote}
      onViewDetails={onViewDetails}
      disabled={disabled}
      pulseKey={pulseKey}
    />
  );
}
