"use client";

import { useMemo, useState } from "react";
import type { ProviderOverviewTacticalProgressionModel } from "@/lib/surgical-sales/buildProviderOverviewBody";
import { buildProviderOverviewConfirmedFacts } from "@/lib/surgical-sales/buildProviderOverviewConfirmedFacts";
import { formatOperationalBlockerLabel } from "@/lib/surgical-sales/buildProviderOverviewTacticalLayout";
import { ProviderOverviewWhatWeKnow } from "./ProviderOverviewWhatWeKnow";

export function ProviderOverviewOperationalBrief({
  progression,
  contact,
  organizationName,
}: {
  progression: ProviderOverviewTacticalProgressionModel;
  contact: Record<string, unknown>;
  organizationName?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const showDetailsToggle = progression.details.length > 1;
  const confirmedFacts = useMemo(
    () => buildProviderOverviewConfirmedFacts({ contact, organizationName }),
    [contact, organizationName],
  );

  return (
    <section className="pov-ops-brief" aria-label="Operational intelligence" data-testid="pov-ops-brief">
      <ProviderOverviewWhatWeKnow facts={confirmedFacts} />

      {showDetailsToggle ? (
        <button
          type="button"
          className="pov-ops-brief__toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Hide readiness detail" : "Readiness detail"}
        </button>
      ) : null}
      {expanded && progression.details.length > 0 ? (
        <ul className="pov-ops-brief__details">
          {progression.details.map((row) => (
            <li key={row.id} className={`pov-ops-brief__detail pov-ops-brief__detail--${row.tone}`}>
              <span className="pov-ops-brief__detail-marker" aria-hidden>
                {row.marker}
              </span>
              {formatOperationalBlockerLabel(row.label, row.id)}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
