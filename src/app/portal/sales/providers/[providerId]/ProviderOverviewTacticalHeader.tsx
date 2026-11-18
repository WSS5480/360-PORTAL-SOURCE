"use client";

import type { ProviderOverviewTacticalHeader as TacticalHeaderModel } from "@/lib/surgical-sales/buildProviderOverviewTacticalPresentation";

export function ProviderOverviewTacticalHeader({
  header,
}: {
  header: TacticalHeaderModel;
}) {
  return (
    <div className="pov-tactical-header" aria-label="Operational status">
      <div className="pov-tactical-header-top">
        <span className={`pov-ops-pill pov-ops-pill--${header.statusTone}`}>
          {header.statusPill}
        </span>
        <span className="pov-tactical-header-move">
          Next: <strong>{header.nextFieldMove}</strong>
        </span>
      </div>
      <p className="pov-tactical-header-context">{header.contextLine}</p>
    </div>
  );
}
