"use client";

import type { ProviderFieldEfficiencyIntelligence } from "@/lib/surgical-sales/buildProviderFieldEfficiencyIntelligence";
import {
  PROVIDER_OVERVIEW_FIELD_EXECUTION_KICKER,
  PROVIDER_OVERVIEW_LINK_INTELLIGENCE,
} from "@/lib/surgical-sales/providerOverviewVocabulary";
import { ProviderFieldTimeRiskPanel } from "./ProviderFieldTimeRiskPanel";
import { ProviderOverviewSectionHeader } from "./ProviderOverviewSectionHeader";

export function ProviderOverviewFieldEfficiencySection({
  intelligence,
  onOpenIntelligence,
}: {
  intelligence: ProviderFieldEfficiencyIntelligence;
  onOpenIntelligence: (sectionId?: string) => void;
}) {
  const { fieldTimeRisk, supporting } = intelligence;

  return (
    <section
      className="provider-ops-efficiency-panel provider-ops-ops-panel provider-ops-ops-panel--surgical"
      aria-labelledby="provider-ops-efficiency-panel-title"
    >
      <ProviderOverviewSectionHeader
        title={intelligence.title}
        kicker={PROVIDER_OVERVIEW_FIELD_EXECUTION_KICKER}
        linkLabel={PROVIDER_OVERVIEW_LINK_INTELLIGENCE}
        onLink={() => onOpenIntelligence(fieldTimeRisk.primarySectionId)}
      />

      <ProviderFieldTimeRiskPanel
        risk={fieldTimeRisk}
        variant="full"
        onOpenIntelligence={onOpenIntelligence}
      />

      {supporting.length > 0 ? (
        <ul className="provider-ops-efficiency-supporting" aria-label="Also consider">
          {supporting.map((signal) => (
            <li key={signal.id}>
              <button
                type="button"
                className="provider-ops-efficiency-supporting-btn"
                onClick={() =>
                  signal.sectionId ? onOpenIntelligence(signal.sectionId) : onOpenIntelligence()
                }
              >
                <span className="provider-ops-efficiency-supporting-headline">{signal.headline}</span>
                <span
                  className={`provider-ops-efficiency-supporting-posture provider-ops-efficiency-supporting-posture--${signal.posture}`}
                >
                  {signal.postureLabel}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
