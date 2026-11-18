"use client";

import type { ProviderAccountMomentum } from "@/lib/surgical-sales/buildProviderAccountMomentumIndicators";
export function ProviderOverviewAccountMomentumSection({
  momentum,
}: {
  momentum: ProviderAccountMomentum;
}) {
  if (momentum.indicators.length === 0) return null;

  return (
    <section className="provider-ops-momentum-indicators" aria-labelledby="provider-ops-momentum-indicators-title">
      <h3 id="provider-ops-momentum-indicators-title" className="provider-ops-momentum-indicators-heading">
        {momentum.title}
      </h3>

      <ul className="provider-ops-momentum-indicators-list">
        {momentum.indicators.map((item) => (
          <li key={item.id}>
            <div
              className={`provider-ops-momentum-chip provider-ops-momentum-chip--${item.tone}`}
              title={item.scan}
            >
              <span className="provider-ops-momentum-chip-label">{item.label}</span>
              <span className="provider-ops-momentum-chip-scan">{item.scan}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
