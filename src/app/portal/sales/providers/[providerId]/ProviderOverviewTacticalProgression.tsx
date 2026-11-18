"use client";

import React from "react";
import type { ProviderOverviewTacticalProgressionModel } from "@/lib/surgical-sales/buildProviderOverviewBody";
import { formatOperationalBlockerLabel } from "@/lib/surgical-sales/buildProviderOverviewTacticalLayout";

export function ProviderOverviewTacticalProgression({
  model,
  primaryGap = null,
}: {
  model: ProviderOverviewTacticalProgressionModel;
  primaryGap?: string | null;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const gapLine =
    model.gapCount === 0
      ? "Ready to advance"
      : model.gapCount === 1
        ? "Still Needed: 1"
        : `Still Needed: ${model.gapCount}`;

  return (
    <section
      className="pov-main-section pov-main-section--detail pov-progression"
      aria-label="Pathway progression"
      data-testid="pov-progression"
    >
      <h2 className="pov-section-kicker">Pathway detail</h2>
      <div className="pov-progression-head">
        <p className={`pov-progression-milestone-line${model.milestoneMet ? " pov-progression-milestone-line--met" : ""}`}>
          <span className="pov-progression-marker" aria-hidden>
            {model.milestoneMet ? "✓" : "○"}
          </span>
          {model.nextTarget}
        </p>
        <p className="pov-progression-gaps">{gapLine}</p>
        {model.gapPhrase && model.gapPhrase !== primaryGap ? (
          <p className="pov-progression-focus">{model.gapPhrase}</p>
        ) : null}
      </div>
      {model.details.length > 0 ? (
        <>
          <button
            type="button"
            className="pov-progression-toggle"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Hide operational detail" : "Show operational detail"}
          </button>
          {expanded ? (
            <ul className="pov-progression-details">
              {model.details.map((row) => (
                <li key={row.id} className={`pov-progression-row pov-progression-row--${row.tone}`}>
                  <span className="pov-progression-row-marker" aria-hidden>
                    {row.marker}
                  </span>
                  <span>{formatOperationalBlockerLabel(row.label, row.id)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
      {model.lockedItems.length > 0 ? (
        <p className="pov-progression-locked-note">
          {model.lockedItems.map((i) => i.label).join(" · ")} unlock after observation approval.
        </p>
      ) : null}
    </section>
  );
}
