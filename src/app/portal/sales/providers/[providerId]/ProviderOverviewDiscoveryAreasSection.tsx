"use client";

import {
  PROVIDER_OVERVIEW_DISCOVERY_TITLE,
  type ProviderOverviewOperationalAreaDiscovery,
} from "@/lib/surgical-sales/buildProviderOverviewDiscoveryAreas";
import {
  PROVIDER_OVERVIEW_DISCOVERY_COMPACT_KICKER,
  PROVIDER_OVERVIEW_DISCOVERY_KICKER,
  PROVIDER_OVERVIEW_LINK_INTELLIGENCE,
  providerOverviewDiscoveryPulseLabel,
} from "@/lib/surgical-sales/providerOverviewVocabulary";
import { ProviderOverviewKnownUnknown } from "./ProviderOverviewKnownUnknown";
import { ProviderOverviewSectionHeader } from "./ProviderOverviewSectionHeader";

export function ProviderOverviewDiscoveryAreasSection({
  areas,
  mode,
  onOpenIntelligence,
}: {
  areas: ProviderOverviewOperationalAreaDiscovery[];
  mode: "full" | "compact";
  onOpenIntelligence: (sectionId?: string) => void;
}) {
  if (areas.length === 0) return null;

  const compact = mode === "compact";

  return (
    <section
      className={`provider-ops-discovery-panel provider-ops-ops-panel provider-ops-ops-panel--surgical${compact ? " provider-ops-discovery-panel--compact" : ""}`}
      aria-labelledby="provider-ops-discovery-title"
    >
      <ProviderOverviewSectionHeader
        title={PROVIDER_OVERVIEW_DISCOVERY_TITLE}
        kicker={compact ? PROVIDER_OVERVIEW_DISCOVERY_COMPACT_KICKER : PROVIDER_OVERVIEW_DISCOVERY_KICKER}
        linkLabel={PROVIDER_OVERVIEW_LINK_INTELLIGENCE}
        onLink={() => onOpenIntelligence()}
      />

      {compact ? (
        <ul className="provider-ops-discovery-pulses" aria-label="Operational area coverage">
          {areas.map((area) => (
            <li key={area.areaId}>
              <button
                type="button"
                className="provider-ops-discovery-pulse"
                onClick={() => onOpenIntelligence(area.areaId)}
              >
                <span className="provider-ops-discovery-pulse-label">{area.areaLabel}</span>
                <span className="provider-ops-discovery-pulse-meta">
                  {providerOverviewDiscoveryPulseLabel(area.known.length, area.unknown.length)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="provider-ops-discovery-areas">
          {areas.map((area) => (
            <li key={area.areaId} className="provider-ops-discovery-area provider-ops-discovery-area--scan">
              <h3 className="provider-ops-discovery-area-title">{area.areaLabel}</h3>
              <ProviderOverviewKnownUnknown
                known={area.known}
                unknown={area.unknown}
                onSelectKnown={() => onOpenIntelligence(area.areaId)}
                onSelectUnknown={() => onOpenIntelligence(area.areaId)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
