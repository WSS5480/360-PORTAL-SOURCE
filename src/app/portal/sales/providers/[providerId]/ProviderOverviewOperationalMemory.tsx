"use client";

import type { ProviderOverviewOperationalMemory } from "@/lib/surgical-sales/buildProviderOverviewOperationalMemory";
import { PROVIDER_FIELD_OPS_SECTION } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";

export function ProviderOverviewOperationalMemoryStrip({
  memory,
}: {
  memory: ProviderOverviewOperationalMemory;
}) {
  if (memory.lines.length === 0) return null;

  return (
    <section
      className="pov-ops-memory"
      aria-label={PROVIDER_FIELD_OPS_SECTION.operationalMemory}
    >
      <ul className="pov-ops-memory-list">
        {memory.lines.map((row) => (
          <li key={row.id} className={`pov-ops-memory-item pov-ops-memory-item--${row.tone}`}>
            <span className="pov-ops-memory-kicker">{row.kicker}</span>
            <span className="pov-ops-memory-line">{row.line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
