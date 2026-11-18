"use client";

import React from "react";
import {
  buildProviderIntelligenceStatusCards,
  type IntelligenceStatusCard,
} from "@/lib/surgical-sales/providerIntelligenceStatusCards";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { IntelligenceCardWorkspace } from "@/lib/surgical-sales/providerIntelligenceCardWorkspace";
import {
  ProviderIntelligenceCardActions,
  type IntelligenceCardActionHandlers,
} from "./ProviderIntelligenceCardActions";

export function ProviderIntelligenceStatusCards({
  contact,
  planning,
  actionsBusy,
  workspaceForCard,
  handlersForCard,
}: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  actionsBusy?: boolean;
  workspaceForCard: (card: IntelligenceStatusCard) => IntelligenceCardWorkspace;
  handlersForCard: (card: IntelligenceStatusCard) => IntelligenceCardActionHandlers;
}) {
  const cards = React.useMemo(
    () => buildProviderIntelligenceStatusCards(contact, planning),
    [contact, planning],
  );

  return (
    <section className="provider-intel-status-cards" aria-label="Intelligence status at a glance">
      <div className="provider-intel-status-cards-grid">
        {cards.map((card) => (
          <article
            key={card.id}
            className={`provider-intel-status-card provider-intel-status-card--workspace provider-intel-status-card--${card.confidence}`}
          >
            <header className="provider-intel-status-card-head">
              <h3 className="provider-intel-status-card-title">{card.title}</h3>
              <span
                className={`provider-intel-status-card-confidence provider-intel-status-card-confidence--${card.confidence}`}
              >
                {card.confidenceLabel}
              </span>
            </header>
            <p className="provider-intel-status-card-interpretation">{card.interpretation}</p>
            {card.topMissingSignal ? (
              <p className="provider-intel-status-card-missing">
                <span className="provider-intel-status-card-missing-label">Supporting detail</span>
                {card.topMissingSignal}
              </p>
            ) : null}
            <ProviderIntelligenceCardActions
              compact
              busy={actionsBusy}
              workspace={workspaceForCard(card)}
              handlers={handlersForCard(card)}
            />
          </article>
        ))}
      </div>
    </section>
  );
}

export type { IntelligenceStatusCard };

export function statusCardTargetSection(
  card: IntelligenceStatusCard,
): ProviderIntelligenceSectionId {
  return card.targetSectionId;
}
