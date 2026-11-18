"use client";

import {
  PROVIDER_OPERATIONAL_RISKS_TITLE,
  type ProviderOperationalRisk,
} from "@/lib/surgical-sales/buildProviderOperationalRisks";
import {
  PROVIDER_OVERVIEW_EXECUTION_BLOCKERS_CLEAR,
  PROVIDER_OVERVIEW_EXECUTION_BLOCKERS_KICKER,
  PROVIDER_OVERVIEW_LINK_INTELLIGENCE,
  PROVIDER_OVERVIEW_SIGNAL_BLOCKER,
  PROVIDER_OVERVIEW_SIGNAL_RESOLVE,
} from "@/lib/surgical-sales/providerOverviewVocabulary";
import { ProviderOverviewSectionHeader } from "./ProviderOverviewSectionHeader";
import { ProviderOverviewSignalGrid } from "./ProviderOverviewSignalGrid";

export function ProviderOverviewOperationalRisksSection({
  risks,
  onMitigate,
  onOpenIntelligence,
}: {
  risks: ProviderOperationalRisk[];
  onMitigate: (sectionId: string, dbKey: string) => void;
  onOpenIntelligence: () => void;
}) {
  return (
    <section
      className="provider-ops-risks-panel provider-ops-ops-panel"
      aria-labelledby="provider-ops-risks-panel-title"
    >
      <ProviderOverviewSectionHeader
        title={PROVIDER_OPERATIONAL_RISKS_TITLE}
        kicker={PROVIDER_OVERVIEW_EXECUTION_BLOCKERS_KICKER}
        linkLabel={risks.length > 0 ? PROVIDER_OVERVIEW_LINK_INTELLIGENCE : undefined}
        onLink={risks.length > 0 ? onOpenIntelligence : undefined}
      />

      {risks.length === 0 ? (
        <p className="provider-ops-risks-panel-clear">No operational risks flagged.</p>
      ) : (
        <ul className="provider-ops-risks-panel-list">
          {risks.map((risk) => (
            <li key={risk.id} className={`provider-ops-risk-card provider-ops-risk-card--${risk.severity}`}>
              <div className="provider-ops-risk-card-top">
                <h3 className="provider-ops-risk-card-title">{risk.title}</h3>
                <span
                  className={`provider-ops-risk-severity provider-ops-risk-severity--${risk.severity}`}
                >
                  {risk.severityLabel}
                </span>
              </div>
              {risk.headline !== risk.title ? (
                <p className="provider-ops-risk-card-headline">{risk.headline}</p>
              ) : null}
              <ProviderOverviewSignalGrid
                rows={[
                  { label: PROVIDER_OVERVIEW_SIGNAL_BLOCKER, value: risk.consequenceScan },
                  { label: PROVIDER_OVERVIEW_SIGNAL_RESOLVE, value: risk.mitigationScan },
                ]}
              />
              <button
                type="button"
                className="provider-ops-risk-mitigate"
                onClick={() => onMitigate(risk.sectionId, risk.dbKey)}
              >
                Resolve
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
