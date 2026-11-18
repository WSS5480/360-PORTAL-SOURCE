"use client";

import React from "react";
import type { OperationalReadinessCardView } from "@/lib/surgical-sales/buildOperationalReadinessCardView";
import { sanitizeIntelligenceTabUserCopy } from "@/lib/surgical-sales/buildIntelligenceTabPresentation";
import { INTELLIGENCE_CARD_DRAWER_LABELS } from "@/lib/surgical-sales/intelligenceCardScanLayout";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";

function scopeSubtitle(label: string): string {
  if (/intelligence$/i.test(label)) return label;
  return `${label} intelligence`;
}

function DrawerList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) {
    return <p className="ops-ready-drawer-empty">{empty}</p>;
  }
  return (
    <ul className="ops-ready-drawer-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function ProviderOperationalReadinessCard({
  card,
  onPrimaryAction,
  onViewDetails,
  disabled = false,
  pulseKey = 0,
  className = "",
  defaultExpanded = false,
  compact = true,
  variant = "scan",
}: {
  card: OperationalReadinessCardView;
  onPrimaryAction: (sectionId: ProviderIntelligenceSectionId, dbKey: string) => void;
  onViewDetails: (sectionId: ProviderIntelligenceSectionId) => void;
  disabled?: boolean;
  pulseKey?: number;
  className?: string;
  defaultExpanded?: boolean;
  compact?: boolean;
  variant?: "scan" | "index";
}) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const isIndex = variant === "index";
  const showExpand = isIndex || compact;
  const isExpanded = !showExpand || expanded;
  const synthesisLine = sanitizeIntelligenceTabUserCopy(card.synthesisLine);
  const openItemsLabel = sanitizeIntelligenceTabUserCopy(card.openItemsLabel);

  const toggleExpand = () => {
    if (!showExpand) {
      onViewDetails(card.sectionId);
      return;
    }
    setExpanded((v) => !v);
  };

  if (isIndex) {
    return (
      <article
        key={pulseKey ? `pulse-${pulseKey}` : undefined}
        className={`ops-ready-card ops-ready-card--index ops-ready-card--${card.tone}${isExpanded ? " ops-ready-card--expanded" : ""}${pulseKey ? " ops-ready-card--pulse" : ""}${className ? ` ${className}` : ""}`}
      >
        <div className="ops-ready-index-row">
          <button
            type="button"
            className="ops-ready-index-main"
            disabled={disabled}
            onClick={toggleExpand}
            aria-expanded={isExpanded}
          >
            <h3 className="ops-ready-index-title">{card.title}</h3>
            <p className="ops-ready-index-scope">{scopeSubtitle(card.scopeBadgeLabel)}</p>
            <p className="ops-ready-index-summary">{synthesisLine}</p>
            <p className="ops-ready-index-open">{openItemsLabel}</p>
          </button>
          <div className="ops-ready-index-aside">
            <button
              type="button"
              className="ops-ready-index-refine"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                onPrimaryAction(card.sectionId, card.dbKey);
              }}
            >
              {card.primaryActionLabel}
            </button>
            <button
              type="button"
              className="ops-ready-index-expand"
              disabled={disabled}
              onClick={toggleExpand}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? "▾" : "▸"}
            </button>
          </div>
        </div>

        {isExpanded ? (
          <div className="ops-ready-card-drawer ops-ready-card-drawer--index">
            <section className="ops-ready-drawer-block">
              <h4 className="ops-ready-drawer-kicker">{INTELLIGENCE_CARD_DRAWER_LABELS.whatWeKnow}</h4>
              <DrawerList items={card.whatWeKnowItems} empty="Nothing confirmed yet." />
            </section>
            <section className="ops-ready-drawer-block">
              <h4 className="ops-ready-drawer-kicker">{INTELLIGENCE_CARD_DRAWER_LABELS.stillLearning}</h4>
              <DrawerList items={card.stillLearningItems} empty="No open items." />
            </section>
            {card.sourceTouchLines.length > 0 ? (
              <section className="ops-ready-drawer-block">
                <h4 className="ops-ready-drawer-kicker">{INTELLIGENCE_CARD_DRAWER_LABELS.sourceTouch}</h4>
                <DrawerList items={card.sourceTouchLines} empty="" />
              </section>
            ) : null}
            <div className="ops-ready-card-drawer-foot">
              <button
                type="button"
                className="ops-ready-index-link"
                disabled={disabled}
                onClick={() => onViewDetails(card.sectionId)}
              >
                Full section
              </button>
            </div>
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <article
      key={pulseKey ? `pulse-${pulseKey}` : undefined}
      className={`ops-ready-card ops-ready-card--${card.tone}${isExpanded ? " ops-ready-card--expanded" : " ops-ready-card--collapsed"}${pulseKey ? " ops-ready-card--pulse" : ""}${className ? ` ${className}` : ""}`}
    >
      <div className="ops-ready-card-scan">
        <button
          type="button"
          className="ops-ready-card-scan-main"
          disabled={disabled}
          onClick={toggleExpand}
          aria-expanded={showExpand ? isExpanded : undefined}
        >
          <div className="ops-ready-card-scan-top">
            <span className={`ops-ready-card-scope ops-ready-card-scope--${card.scopeBadge}`}>
              {card.scopeBadgeLabel}
            </span>
            <h3 className="ops-ready-card-title">{card.title}</h3>
          </div>
          <span className={`ops-ready-card-visibility ops-ready-card-visibility--${card.tone}`}>
            {card.readinessLabel}
          </span>
          <p className="ops-ready-card-summary">{synthesisLine}</p>
          <p className="ops-ready-card-open-count">{openItemsLabel}</p>
        </button>

        <div className="ops-ready-card-scan-actions">
          <button
            type="button"
            className="ops-ready-card-primary"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              onPrimaryAction(card.sectionId, card.dbKey);
            }}
          >
            {card.primaryActionLabel}
          </button>
          {showExpand ? (
            <button
              type="button"
              className="ops-ready-card-expand"
              disabled={disabled}
              onClick={toggleExpand}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Collapse details" : "Expand details"}
            >
              {isExpanded ? "▾" : "▸"}
            </button>
          ) : null}
        </div>
      </div>

      {isExpanded ? (
        <div className="ops-ready-card-drawer">
          <section className="ops-ready-drawer-block">
            <h4 className="ops-ready-drawer-kicker">{INTELLIGENCE_CARD_DRAWER_LABELS.whatWeKnow}</h4>
            <DrawerList items={card.whatWeKnowItems} empty="No confirmed detail captured yet." />
          </section>
          <section className="ops-ready-drawer-block">
            <h4 className="ops-ready-drawer-kicker">{INTELLIGENCE_CARD_DRAWER_LABELS.stillLearning}</h4>
            <DrawerList items={card.stillLearningItems} empty="No open items in this area." />
          </section>
          {card.sourceTouchLines.length > 0 ? (
            <section className="ops-ready-drawer-block">
              <h4 className="ops-ready-drawer-kicker">{INTELLIGENCE_CARD_DRAWER_LABELS.sourceTouch}</h4>
              <DrawerList items={card.sourceTouchLines} empty="" />
            </section>
          ) : null}
          <section className="ops-ready-drawer-block">
            <h4 className="ops-ready-drawer-kicker">{INTELLIGENCE_CARD_DRAWER_LABELS.recommendedNext}</h4>
            <p className="ops-ready-drawer-next">{card.recommendedNext}</p>
          </section>
          <div className="ops-ready-card-drawer-foot">
            <button
              type="button"
              className="ops-ready-card-secondary"
              disabled={disabled}
              onClick={() => onViewDetails(card.sectionId)}
            >
              Full section
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
