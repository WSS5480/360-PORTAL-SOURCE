"use client";

import { useMemo } from "react";
import { buildProviderOverviewAccessIntelligence } from "@/lib/surgical-sales/buildProviderOverviewAccessIntelligence";

function formatAccessRow(row: { label: string; value: string; captured: boolean }): string {
  if (!row.captured) return `${row.label}: ${row.value}`;
  if (!row.value.trim()) return row.label;
  return `${row.label}: ${row.value}`;
}

export function ProviderOverviewAccessIntelligence({
  contact,
  nested = false,
}: {
  contact: Record<string, unknown>;
  nested?: boolean;
  defaultOpen?: boolean;
}) {
  const view = useMemo(() => buildProviderOverviewAccessIntelligence({ contact }), [contact]);

  const body = (
    <ul className="pov-access-intelligence__list">
      {view.rows.map((row) => (
        <li
          key={row.id}
          className={`pov-access-intelligence__row${row.captured ? "" : " pov-access-intelligence__row--empty"}`}
        >
          {formatAccessRow(row)}
        </li>
      ))}
    </ul>
  );

  if (nested) {
    return (
      <section className="pov-supporting-subsection pov-access-intelligence" data-testid="pov-access-intelligence">
        <h4 className="pov-supporting-subsection__title">{view.title}</h4>
        {body}
      </section>
    );
  }

  return (
    <details className="pov-bottom-accordion pov-access-intelligence" data-testid="pov-access-intelligence">
      <summary className="pov-bottom-accordion__summary">
        <span className="pov-bottom-accordion__summary-label">{view.title}</span>
        {view.capturedCount > 0 ? (
          <span className="pov-bottom-accordion__badge" aria-label={`${view.capturedCount} captured`}>
            {view.capturedCount}
          </span>
        ) : null}
      </summary>
      <div className="pov-bottom-accordion__body">{body}</div>
    </details>
  );
}
