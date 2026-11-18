"use client";

import React from "react";
import type { AccountUnderstandingUncertaintyCard } from "@/lib/surgical-sales/buildAccountUnderstandingUncertaintyCards";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { ACCOUNT_UNDERSTANDING_CARD } from "@/lib/surgical-sales/providerAccountUnderstanding";
import { UnderstandingCaptureActionRow } from "./UnderstandingCaptureActionRow";

const LABELS = ACCOUNT_UNDERSTANDING_CARD;

export type UnderstandingUncertaintyCardModel = Pick<
  AccountUnderstandingUncertaintyCard,
  | "id"
  | "sectionTitle"
  | "primaryUnknown"
  | "whyItMatters"
  | "bestSource"
  | "nextMove"
  | "captureLabel"
  | "captureHelper"
  | "summaryLines"
  | "recentNotes"
  | "recentNotesHistory"
  | "sectionId"
  | "dbKey"
>;

export function UnderstandingUncertaintyCard({
  card,
  onCapture,
  className = "",
  headingLevel = "h2",
}: {
  card: UnderstandingUncertaintyCardModel;
  onCapture: (sectionId: ProviderIntelligenceSectionId, dbKey: string) => void;
  className?: string;
  headingLevel?: "h2" | "h3";
}) {
  const [expanded, setExpanded] = React.useState(false);
  const TitleTag = headingLevel;

  return (
    <article
      className={`pau-uncertainty-card${expanded ? " pau-uncertainty-card--expanded" : ""}${className ? ` ${className}` : ""}`}
      aria-labelledby={`pau-card-${card.id}`}
    >
      <header className="pau-uncertainty-card-head">
        <TitleTag id={`pau-card-${card.id}`} className="pau-uncertainty-section-title">
          {card.sectionTitle}
        </TitleTag>
      </header>

      <div className="pau-uncertainty-summary" aria-label="Summary">
        {card.summaryLines.map((line) => (
          <p key={line} className="pau-uncertainty-summary-line">
            {line}
          </p>
        ))}
      </div>

      <button
        type="button"
        className="pau-uncertainty-disclosure-toggle"
        aria-expanded={expanded}
        aria-controls={`pau-detail-${card.id}`}
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? LABELS.hideOperationalDetail : LABELS.showOperationalDetail}
      </button>

      {expanded ? (
        <div id={`pau-detail-${card.id}`} className="pau-uncertainty-detail">
          <dl className="pau-uncertainty-facts">
            <div className="pau-uncertainty-fact">
              <dt>{LABELS.whyItMatters}</dt>
              <dd>{card.whyItMatters}</dd>
            </div>
            <div className="pau-uncertainty-fact">
              <dt>{LABELS.bestSource}</dt>
              <dd>{card.bestSource}</dd>
            </div>
            <div className="pau-uncertainty-fact">
              <dt>{LABELS.nextMove}</dt>
              <dd>{card.nextMove}</dd>
            </div>
            <div className="pau-uncertainty-fact">
              <dt>{LABELS.recentNotes}</dt>
              <dd>
                {card.recentNotes ? (
                  <>
                    <span className="pau-uncertainty-note-text">{card.recentNotes}</span>
                    {card.recentNotesHistory ? (
                      <span className="pau-uncertainty-note-meta">{card.recentNotesHistory}</span>
                    ) : null}
                  </>
                ) : (
                  <span className="pau-uncertainty-note-empty">{LABELS.noRecentNotes}</span>
                )}
              </dd>
            </div>
          </dl>

          <UnderstandingCaptureActionRow
            captureLabel={card.captureLabel}
            captureHelper={card.captureHelper}
            onCapture={() => onCapture(card.sectionId, card.dbKey)}
          />
        </div>
      ) : null}
    </article>
  );
}
