"use client";

import React from "react";
import {
  buildProviderOperationalWarningCards,
  OPERATIONAL_WARNINGS_SECTION_TITLE,
  type OperationalWarningCard,
} from "@/lib/surgical-sales/buildProviderOperationalWarningCards";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

import { PROVIDER_INTEL_RISK_CARD } from "@/lib/surgical-sales/providerIntelligenceRepVocabulary";

const CARD_LABELS = PROVIDER_INTEL_RISK_CARD;

function OperationalWarningCardView({
  card,
  onCapture,
}: {
  card: OperationalWarningCard;
  onCapture: (sectionId: ProviderIntelligenceSectionId, dbKey: string) => void;
}) {
  return (
    <article className="provider-op-warning-card">
      <h3 className="provider-op-warning-title">{card.title}</h3>
      <dl className="provider-op-warning-facts">
        <div>
          <dt>{CARD_LABELS.why}</dt>
          <dd>{card.whyItMatters}</dd>
        </div>
        <div>
          <dt>{CARD_LABELS.reduceRisk}</dt>
          <dd>{card.reduceRisk}</dd>
        </div>
      </dl>
      <button
        type="button"
        className="provider-op-warning-cta"
        onClick={() => onCapture(card.sectionId, card.dbKey)}
      >
        {card.ctaLabel}
      </button>
    </article>
  );
}

export function ProviderOperationalWarningsPanel({
  contact,
  planning,
  relationshipStage,
  engagements,
  opportunities,
  cases,
  onCapture,
  title = OPERATIONAL_WARNINGS_SECTION_TITLE,
}: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  onCapture: (sectionId: ProviderIntelligenceSectionId, dbKey?: string) => void;
  title?: string;
}) {
  const cards = React.useMemo(
    () =>
      buildProviderOperationalWarningCards({
        contact,
        planning,
        relationshipStage,
        engagements,
        opportunities,
        cases,
      }),
    [contact, planning, relationshipStage, engagements, opportunities, cases],
  );

  if (!planning || cards.length === 0) return null;

  return (
    <section className="provider-op-warnings" aria-label={title}>
      <h2 className="provider-op-warnings-title">{title}</h2>
      <div className="provider-op-warnings-stack">
        {cards.map((card) => (
          <OperationalWarningCardView key={card.id} card={card} onCapture={onCapture} />
        ))}
      </div>
    </section>
  );
}
