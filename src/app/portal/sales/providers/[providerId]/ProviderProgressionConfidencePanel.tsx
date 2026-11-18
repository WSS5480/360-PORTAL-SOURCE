"use client";

import type { ProviderProgressionConfidenceIndicator } from "@/lib/surgical-sales/buildProviderProgressionConfidence";
import { PROVIDER_OVERVIEW_PROGRESSION_CONFIDENCE_HEADING } from "@/lib/surgical-sales/providerOverviewVocabulary";

export function ProviderProgressionConfidencePanel({
  indicators,
}: {
  indicators: ProviderProgressionConfidenceIndicator[];
}) {
  if (indicators.length === 0) return null;

  return (
    <div className="provider-ops-pathway-confidence" aria-label={PROVIDER_OVERVIEW_PROGRESSION_CONFIDENCE_HEADING}>
      <h2 className="provider-ops-cmd-brief-label">{PROVIDER_OVERVIEW_PROGRESSION_CONFIDENCE_HEADING}</h2>
      <ul className="provider-ops-pathway-confidence-list">
        {indicators.map((row) => (
          <li
            key={row.id}
            className={`provider-ops-pathway-confidence-row provider-ops-pathway-confidence-row--${row.confidence}`}
          >
            <div className="provider-ops-pathway-confidence-top">
              <span className="provider-ops-pathway-confidence-label">{row.label}</span>
              <span
                className={`provider-ops-pathway-confidence-badge provider-ops-pathway-confidence-badge--${row.confidence}`}
              >
                {row.confidenceLabel}
              </span>
            </div>
            <p className="provider-ops-pathway-confidence-scan">{row.scan}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
