"use client";

import React from "react";
import {
  buildProviderFieldDiscoveryCards,
  FIELD_DISCOVERIES_SECTION_TITLE,
} from "@/lib/surgical-sales/buildProviderFieldDiscoveryCards";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { UnderstandingUncertaintyCard } from "./UnderstandingUncertaintyCard";

export function ProviderFieldDiscoveriesPanel({
  contact,
  planning,
  specialty,
  relationshipStage,
  engagements,
  opportunities,
  cases,
  fieldMetadata,
  onCapture,
  title = FIELD_DISCOVERIES_SECTION_TITLE,
}: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  specialty?: string | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;
  onCapture: (sectionId: ProviderIntelligenceSectionId, dbKey?: string) => void;
  title?: string;
}) {
  const cards = React.useMemo(
    () =>
      buildProviderFieldDiscoveryCards({
        contact,
        planning,
        specialty,
        relationshipStage,
        engagements,
        opportunities,
        cases,
        fieldMetadata,
      }),
    [contact, planning, specialty, relationshipStage, engagements, opportunities, cases, fieldMetadata],
  );

  if (!planning || cards.length === 0) return null;

  return (
    <section className="provider-field-discoveries" aria-label={title}>
      <h2 className="provider-field-discoveries-title">{title}</h2>
      <div className="pau-uncertainty-stack provider-field-discoveries-stack">
        {cards.map((card) => (
          <UnderstandingUncertaintyCard
            key={card.id}
            card={card}
            className="provider-field-discovery-card"
            headingLevel="h3"
            onCapture={onCapture}
          />
        ))}
      </div>
    </section>
  );
}
