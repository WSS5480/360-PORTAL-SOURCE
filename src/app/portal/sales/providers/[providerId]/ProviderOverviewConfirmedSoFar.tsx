"use client";

import { PROVIDER_OVERVIEW_CONFIRMED_SO_FAR_TITLE } from "@/lib/surgical-sales/providerOverviewVocabulary";

export function ProviderOverviewConfirmedSoFar({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;

  return (
    <section className="pov-confirmed" aria-label={PROVIDER_OVERVIEW_CONFIRMED_SO_FAR_TITLE}>
      <h2 className="pov-confirmed-heading">{PROVIDER_OVERVIEW_CONFIRMED_SO_FAR_TITLE}</h2>
      <ul className="pov-confirmed-list">
        {lines.map((line) => (
          <li key={line} className="pov-confirmed-item">
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}
