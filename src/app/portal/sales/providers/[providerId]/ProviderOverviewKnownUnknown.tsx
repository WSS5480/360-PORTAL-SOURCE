"use client";

import type {
  ProviderDiscoveryKnownItem,
  ProviderDiscoveryUnknownItem,
} from "@/lib/surgical-sales/buildProviderOverviewDiscoveryAreas";
import {
  IntelligenceScanEmpty,
  IntelligenceScanLaneHeader,
  IntelligenceScanOpenRow,
  IntelligenceScanValidatedRow,
} from "./ProviderIntelligenceScanSignals";

export function ProviderOverviewKnownUnknown({
  known,
  unknown,
  onSelectKnown,
  onSelectUnknown,
  compact = false,
}: {
  known: ProviderDiscoveryKnownItem[];
  unknown: ProviderDiscoveryUnknownItem[];
  onSelectKnown?: (item: ProviderDiscoveryKnownItem) => void;
  onSelectUnknown?: (item: ProviderDiscoveryUnknownItem) => void;
  compact?: boolean;
}) {
  const rootClass = [
    "provider-intel-scan-lanes",
    "provider-ops-known-unknown",
    "provider-ops-known-unknown--surgical",
    compact ? "provider-intel-scan-lanes--compact" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      <section className="provider-intel-scan-lane provider-intel-scan-lane--validated">
        <IntelligenceScanLaneHeader kind="validated" count={known.length} />
        {known.length === 0 ? (
          <IntelligenceScanEmpty kind="validated" />
        ) : (
          <ul className="provider-intel-scan-list">
            {known.map((item) => (
              <IntelligenceScanValidatedRow
                key={item.dbKey}
                label={item.label}
                onClick={onSelectKnown ? () => onSelectKnown(item) : undefined}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="provider-intel-scan-lane provider-intel-scan-lane--open">
        <IntelligenceScanLaneHeader kind="open" count={unknown.length} />
        {unknown.length === 0 ? (
          <IntelligenceScanEmpty kind="open" />
        ) : (
          <ul className="provider-intel-scan-list">
            {unknown.map((item) => (
              <IntelligenceScanOpenRow
                key={item.dbKey}
                label={item.label}
                consequence={item.operationalConsequence}
                fieldGuidance={item.fieldGuidance}
                onClick={onSelectUnknown ? () => onSelectUnknown(item) : undefined}
                showTags={!compact}
                showFieldGuidance={!compact}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
