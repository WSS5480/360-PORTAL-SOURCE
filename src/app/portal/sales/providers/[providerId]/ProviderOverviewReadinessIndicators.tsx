"use client";

import type { ProviderOverviewReadinessIndicator } from "@/lib/surgical-sales/providerOverviewQualitativeReadiness";

export function ProviderOverviewReadinessIndicators({
  indicators,
  variant = "command",
  heading = "Readiness",
}: {
  indicators: ProviderOverviewReadinessIndicator[];
  variant?: "command" | "strip";
  heading?: string;
}) {
  const rootClass =
    variant === "strip"
      ? "provider-ops-readiness provider-ops-readiness--strip"
      : "provider-ops-readiness";

  return (
    <div className={rootClass} aria-label={heading}>
      <p className="provider-ops-readiness-heading">{heading}</p>
      <ul className="provider-ops-readiness-grid">
        {indicators.map((indicator) => (
          <li key={indicator.id} className="provider-ops-readiness-cell">
            <p className="provider-ops-readiness-label">{indicator.label}</p>
            <p
              className={`provider-ops-readiness-state provider-ops-readiness-state--${indicator.state}`}
            >
              {indicator.stateLabel}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
