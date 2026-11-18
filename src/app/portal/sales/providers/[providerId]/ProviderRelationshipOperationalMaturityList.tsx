"use client";

import React from "react";
import type {
  ProviderRelationshipOperationalMaturity,
  RelationshipMaturityIndicator,
} from "@/lib/surgical-sales/buildProviderRelationshipOperationalMaturity";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";

export function ProviderRelationshipOperationalMaturityList({
  maturity,
  onIndicatorClick,
  compact = false,
}: {
  maturity: ProviderRelationshipOperationalMaturity;
  onIndicatorClick?: (sectionId: ProviderIntelligenceSectionId, dbKey: string) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`provider-intel-rel-maturity${compact ? " provider-intel-rel-maturity--compact" : ""}`}
      aria-label={maturity.title}
    >
      <header className="provider-intel-rel-maturity-head">
        <p className="provider-intel-rel-maturity-kicker">{maturity.kicker}</p>
        <p className={`provider-intel-rel-maturity-headline provider-intel-rel-maturity-headline--${maturity.tone}`}>
          {maturity.headline}
        </p>
        <p className="provider-intel-rel-maturity-meta">
          {maturity.documentedCount} of {maturity.indicators.length} dimensions on file
        </p>
      </header>
      <ul className="provider-intel-rel-maturity-list">
        {maturity.indicators.map((indicator) => (
          <MaturityRow
            key={indicator.id}
            indicator={indicator}
            onClick={
              onIndicatorClick
                ? () => onIndicatorClick(indicator.sectionId, indicator.dbKey)
                : undefined
            }
          />
        ))}
      </ul>
    </div>
  );
}

function MaturityRow({
  indicator,
  onClick,
}: {
  indicator: RelationshipMaturityIndicator;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="provider-intel-rel-maturity-label">{indicator.label}</span>
      <span className="provider-intel-rel-maturity-scan">{indicator.scanLine}</span>
    </>
  );

  if (onClick) {
    return (
      <li className={`provider-intel-rel-maturity-item provider-intel-rel-maturity-item--${indicator.status}`}>
        <button type="button" className="provider-intel-rel-maturity-btn" onClick={onClick}>
          {content}
        </button>
      </li>
    );
  }

  return (
    <li className={`provider-intel-rel-maturity-item provider-intel-rel-maturity-item--${indicator.status}`}>
      {content}
    </li>
  );
}
