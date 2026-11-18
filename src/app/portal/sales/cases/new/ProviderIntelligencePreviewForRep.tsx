"use client";

import React from "react";
import {
  buildProviderIntelligenceInsightCards,
  buildProviderIntelligencePreviewForRep,
} from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";
import { ProviderIntelligenceInsightCards } from "@/components/sales/ProviderIntelligenceInsightCards";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

export function ProviderIntelligencePreviewForRep({
  contact,
  planning,
}: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
}) {
  const hasContent = React.useMemo(() => {
    return (
      buildProviderIntelligenceInsightCards(contact, { planning }).hasContent ||
      buildProviderIntelligencePreviewForRep(contact, { planning }).hasContent
    );
  }, [contact, planning]);

  if (!hasContent) return null;

  return <ProviderIntelligenceInsightCards contact={contact} planning={planning} />;
}
