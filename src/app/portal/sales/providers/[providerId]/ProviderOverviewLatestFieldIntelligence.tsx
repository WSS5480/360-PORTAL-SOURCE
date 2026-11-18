"use client";

import type { ProviderOverviewFieldIntelligenceItem } from "@/lib/surgical-sales/buildProviderOverviewLatestFieldIntelligence";

export function ProviderOverviewLatestFieldIntelligence({
  items,
}: {
  items: ProviderOverviewFieldIntelligenceItem[];
}) {
  if (items.length === 0) {
    return (
      <p className="pov-intel-empty">
        Nothing picked up on this account yet — log what you learn on your next touch.
      </p>
    );
  }

  return (
    <ul className="pov-intel-list" aria-label="Latest field intelligence">
      {items.map((item) => (
        <li key={item.id} className="pov-intel-item">
          {item.line}
        </li>
      ))}
    </ul>
  );
}
