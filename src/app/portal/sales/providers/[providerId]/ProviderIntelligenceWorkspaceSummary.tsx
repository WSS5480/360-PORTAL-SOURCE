"use client";

import React from "react";
import { buildIntelligenceWorkspaceSummary } from "@/lib/surgical-sales/buildIntelligenceWorkspaceSummary";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { IntelligenceCardWorkspace } from "@/lib/surgical-sales/providerIntelligenceCardWorkspace";
import type { IntelligenceCardActionHandlers } from "./ProviderIntelligenceCardActions";
import type { IntelligenceStatusCard } from "@/lib/surgical-sales/providerIntelligenceStatusCards";
import { INTELLIGENCE_UNLOCKS_NEXT_LABEL } from "@/lib/surgical-sales/providerIntelligenceUnlocksNext";
import { ProviderIntelligenceAreaConfidenceCard } from "./ProviderIntelligenceAreaConfidenceCard";
import { PROVIDER_CANONICAL_SURFACES } from "@/lib/surgical-sales/providerProfileCanonicalSurfaces";
import { ProviderIntelligenceProgressionCompactStrip } from "./ProviderIntelligenceProgressionCompactStrip";

export const PROVIDER_AREA_OPERATIONAL_SCAN_TITLE = "Confirmed by area";

export function ProviderIntelligenceWorkspaceSummary({
  contact,
  planning,
  specialty,
  relationshipStage,
  engagements,
  opportunities,
  cases,
  onOpenSection,
  actionsBusy,
  workspaceForStatusCard,
  handlersForStatusCard,
}: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  specialty?: string | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  onOpenSection: (sectionId: ProviderIntelligenceSectionId, dbKey?: string) => void;
  actionsBusy?: boolean;
  workspaceForStatusCard: (card: IntelligenceStatusCard) => IntelligenceCardWorkspace;
  handlersForStatusCard: (card: IntelligenceStatusCard) => IntelligenceCardActionHandlers;
}) {
  const summary = React.useMemo(
    () =>
      buildIntelligenceWorkspaceSummary({
        contact,
        planning,
        specialty,
        relationshipStage,
        engagements,
        opportunities,
        cases,
      }),
    [contact, planning, specialty, relationshipStage, engagements, opportunities, cases],
  );

  if (!summary) return null;

  return (
    <section
      className="provider-intel-ws-summary provider-intel-ws-summary--scan provider-intel-ws-summary--flat"
      aria-label={PROVIDER_AREA_OPERATIONAL_SCAN_TITLE}
    >
      <ProviderIntelligenceProgressionCompactStrip
        contact={contact}
        planning={planning}
        relationshipStage={relationshipStage}
        engagements={engagements}
        opportunities={opportunities}
        cases={cases}
      />

      <header className="provider-intel-ws-summary-head provider-intel-ws-summary-head--flat">
        <h3 className="provider-intel-ws-summary-section-title">
          {PROVIDER_AREA_OPERATIONAL_SCAN_TITLE}
        </h3>
      </header>

      <div
        className="provider-intel-area-scan-header"
        aria-hidden="true"
      >
        <span>Area</span>
        <span>State</span>
        <span>Operational risk</span>
        <span>{INTELLIGENCE_UNLOCKS_NEXT_LABEL}</span>
        <span />
      </div>

      <ul className="provider-intel-area-scan-lanes" aria-label="Intelligence areas">
        {summary.statusCards.map((card) => (
          <li key={card.id} className="provider-intel-area-scan-lane-item">
            <ProviderIntelligenceAreaConfidenceCard
              card={card}
              contact={contact}
              planning={planning}
              workspace={workspaceForStatusCard(card)}
              handlers={handlersForStatusCard(card)}
              busy={actionsBusy}
              variant="lane"
              onGapClick={(sectionId, dbKey) => onOpenSection(sectionId, dbKey)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
