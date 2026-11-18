"use client";

import type { ReactNode } from "react";

export type ProviderOverviewSignalRow = {
  label: string;
  value: ReactNode;
  valueClassName?: string;
};

export function ProviderOverviewSignalGrid({ rows }: { rows: ProviderOverviewSignalRow[] }) {
  return (
    <dl className="provider-ops-signals">
      {rows.map((row) => (
        <div key={row.label} className="provider-ops-signals-row">
          <dt>{row.label}</dt>
          <dd className={row.valueClassName}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
