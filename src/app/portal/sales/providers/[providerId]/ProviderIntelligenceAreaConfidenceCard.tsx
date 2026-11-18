"use client";

import React from "react";
import type { IntelligenceStatusCard } from "@/lib/surgical-sales/providerIntelligenceStatusCards";
import { INTELLIGENCE_UNLOCKS_NEXT_LABEL } from "@/lib/surgical-sales/providerIntelligenceUnlocksNext";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { IntelligenceCardWorkspace } from "@/lib/surgical-sales/providerIntelligenceCardWorkspace";
import type { IntelligenceCardActionHandlers } from "./ProviderIntelligenceCardActions";

export function ProviderIntelligenceAreaConfidenceCard({
  card,
  workspace: _workspace,
  handlers,
  busy = false,
  variant = "lane",
  onGapClick: _onGapClick,
}: {
  card: IntelligenceStatusCard;
  contact?: Record<string, unknown>;
  planning?: unknown;
  workspace: IntelligenceCardWorkspace;
  handlers: IntelligenceCardActionHandlers;
  busy?: boolean;
  variant?: "lane" | "card";
  onGapClick: (sectionId: ProviderIntelligenceSectionId, dbKey: string) => void;
}) {
  const primaryId: keyof IntelligenceCardActionHandlers =
    card.ctaMode === "capture" ? "onCaptureSignal" : "onOpenFullArea";

  return (
    <article
      className={`provider-intel-area-lane provider-intel-area-lane--${card.confidence}${variant === "card" ? " provider-intel-area-lane--legacy-card" : ""}`}
      title={card.interpretation}
    >
      <ProviderIntelligenceAreaConfidenceLaneBody
        card={card}
        primaryId={primaryId}
        handlers={handlers}
        busy={busy}
      />
    </article>
  );
}

function ProviderIntelligenceAreaConfidenceLaneBody({
  card,
  primaryId,
  handlers,
  busy,
}: {
  card: IntelligenceStatusCard;
  primaryId: keyof IntelligenceCardActionHandlers;
  handlers: IntelligenceCardActionHandlers;
  busy: boolean;
}) {
  return (
    <div className="provider-intel-area-lane-grid">
      <div className="provider-intel-area-lane-cell provider-intel-area-lane-cell--area">
        <h4 className="provider-intel-area-lane-title">{card.title}</h4>
      </div>

      <div className="provider-intel-area-lane-cell provider-intel-area-lane-cell--state">
        <span className="provider-intel-area-lane-kicker">State</span>
        <span
          className={`provider-intel-area-lane-state provider-intel-area-lane-state--${card.confidence}`}
        >
          {card.confidenceLabel}
        </span>
      </div>

      <div className="provider-intel-area-lane-cell provider-intel-area-lane-cell--blocker">
        <span className="provider-intel-area-lane-kicker">Operational risk</span>
        <span className="provider-intel-area-lane-value">{card.keyBlocker}</span>
      </div>

      <div className="provider-intel-area-lane-cell provider-intel-area-lane-cell--unlock">
        <span className="provider-intel-area-lane-kicker">{INTELLIGENCE_UNLOCKS_NEXT_LABEL}</span>
        <span className="provider-intel-area-lane-value provider-intel-area-lane-value--unlock">
          {card.nextUnlock}
        </span>
      </div>

      <div className="provider-intel-area-lane-cell provider-intel-area-lane-cell--cta">
        <button
          type="button"
          className="provider-intel-area-lane-cta"
          disabled={busy}
          onClick={handlers[primaryId]}
        >
          {card.ctaLabel}
        </button>
      </div>
    </div>
  );
}
