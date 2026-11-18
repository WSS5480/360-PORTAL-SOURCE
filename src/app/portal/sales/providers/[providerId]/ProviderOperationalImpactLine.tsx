"use client";

import type { IntelligenceGapOperationalConsequence } from "@/lib/surgical-sales/providerOperationalImpact";
import { PROVIDER_OVERVIEW_OPERATIONAL_IMPACT_LABEL } from "@/lib/surgical-sales/providerOverviewVocabulary";

export function ProviderOperationalImpactLine({
  impact,
  consequence,
  compact = false,
}: {
  impact?: string | null;
  consequence?: IntelligenceGapOperationalConsequence | null;
  compact?: boolean;
}) {
  const resolved = consequence ?? null;
  const summary = impact?.trim() || resolved?.summary;

  if (!resolved && !summary) return null;

  if (compact || !resolved) {
    if (!summary) return null;
    return (
      <p className="provider-ops-operational-impact provider-ops-operational-impact--compact">
        <span className="provider-ops-operational-impact-label">{PROVIDER_OVERVIEW_OPERATIONAL_IMPACT_LABEL}:</span>{" "}
        <span className="provider-ops-operational-impact-text">{summary}</span>
      </p>
    );
  }

  return (
    <div className="provider-ops-operational-impact provider-ops-operational-impact--structured">
      <p className="provider-ops-operational-impact-heading">{PROVIDER_OVERVIEW_OPERATIONAL_IMPACT_LABEL}</p>
      <ul className="provider-ops-operational-impact-list">
        <li className="provider-ops-operational-impact-item">
          <span className="provider-ops-operational-impact-dim">Operational problem</span>
          <span className="provider-ops-operational-impact-text">{resolved.operationalProblem}</span>
        </li>
        <li className="provider-ops-operational-impact-item">
          <span className="provider-ops-operational-impact-dim">Business risk</span>
          <span className="provider-ops-operational-impact-text">{resolved.businessRisk}</span>
        </li>
        <li className="provider-ops-operational-impact-item">
          <span className="provider-ops-operational-impact-dim">Field inefficiency</span>
          <span className="provider-ops-operational-impact-text">{resolved.fieldInefficiency}</span>
        </li>
      </ul>
    </div>
  );
}
