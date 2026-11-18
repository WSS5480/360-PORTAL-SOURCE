"use client";

import type { ProviderOverviewOperationalContextModel } from "@/lib/surgical-sales/buildProviderOverviewBody";
import { PROVIDER_OVERVIEW_STATE_CLASS } from "./providerOverviewStateTokens";

function ContextMemoryCard({
  scopeState,
  column,
  onOpen,
}: {
  scopeState: "scopeFacility" | "scopeProvider";
  column: ProviderOverviewOperationalContextModel["facility"];
  onOpen?: () => void;
}) {
  const variant = scopeState === "scopeFacility" ? "facility" : "provider";
  const badgeClass = `${PROVIDER_OVERVIEW_STATE_CLASS[scopeState]} ${PROVIDER_OVERVIEW_STATE_CLASS.badge}`;

  const inner = (
    <div className="pov-ctx-memory-body">
      <div className="pov-ctx-memory-head">
        <div className="pov-ctx-memory-titles">
          <h3 className="pov-ctx-memory-title">{column.title}</h3>
          <span className={`pov-ctx-memory-scope ${badgeClass}`}>{column.subtext}</span>
        </div>
        {onOpen ? (
          <span className="pov-ctx-memory-arrow" aria-hidden>
            →
          </span>
        ) : null}
      </div>
      <ul className="pov-ctx-memory-list">
        {column.bullets.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );

  return (
    <article className={`pov-ctx-memory pov-ctx-memory--${variant}`}>
      {onOpen ? (
        <button
          type="button"
          className="pov-ctx-memory-open"
          onClick={onOpen}
          aria-label={`${column.title} — open operational intelligence`}
        >
          {inner}
        </button>
      ) : (
        inner
      )}
    </article>
  );
}

export function ProviderOverviewOperationalContextCard({
  model,
  onOpenFacility,
  onOpenProvider,
}: {
  model: ProviderOverviewOperationalContextModel;
  onOpenFacility?: () => void;
  onOpenProvider?: () => void;
}) {
  return (
    <div className="pov-ctx-split" aria-label="Operational context">
      <ContextMemoryCard scopeState="scopeFacility" column={model.facility} onOpen={onOpenFacility} />
      <ContextMemoryCard scopeState="scopeProvider" column={model.provider} onOpen={onOpenProvider} />
    </div>
  );
}
