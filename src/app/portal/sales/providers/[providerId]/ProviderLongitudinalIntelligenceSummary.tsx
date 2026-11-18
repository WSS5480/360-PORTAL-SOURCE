"use client";

import type { ProviderLongitudinalIntelligence } from "@/lib/surgical-sales/buildProviderLongitudinalIntelligence";
import { providerLongitudinalHasSignals } from "@/lib/surgical-sales/buildProviderLongitudinalIntelligence";

function SignalList({
  title,
  items,
  empty,
}: {
  title: string;
  items: Array<{ signal: string; count?: number; label?: string }>;
  empty: string;
}) {
  if (!items.length) {
    return (
      <div className="provider-longitudinal-section">
        <h3 className="provider-longitudinal-section-title">{title}</h3>
        <p className="provider-longitudinal-empty">{empty}</p>
      </div>
    );
  }

  return (
    <div className="provider-longitudinal-section">
      <h3 className="provider-longitudinal-section-title">{title}</h3>
      <ul className="provider-longitudinal-list">
        {items.map((item) => {
          const text = item.signal ?? item.label ?? "";
          const key = `${title}-${text}`;
          return (
            <li key={key} className="provider-longitudinal-item">
              <span className="provider-longitudinal-item-text">{text}</span>
              {item.count && item.count > 1 ? (
                <span className="provider-longitudinal-item-count">{item.count} observations</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ProviderLongitudinalIntelligenceSummary({
  summary,
}: {
  summary: ProviderLongitudinalIntelligence;
}) {
  if (!providerLongitudinalHasSignals(summary)) {
    return (
      <section className="provider-longitudinal-panel provider-longitudinal-panel--empty" aria-label="Observation intelligence">
        <h2 className="provider-longitudinal-title">Observation intelligence</h2>
        <p className="provider-longitudinal-intro">
          Longitudinal learning will appear after observation cases capture outcomes and field notes.
        </p>
      </section>
    );
  }

  return (
    <section className="provider-longitudinal-panel" aria-label="Observation intelligence">
      <div className="provider-longitudinal-head">
        <h2 className="provider-longitudinal-title">Observation intelligence</h2>
        <p className="provider-longitudinal-intro">
          Aggregated across {summary.observationCaseCount} observation
          {summary.observationCaseCount === 1 ? "" : "s"} — use this pattern history during debrief planning.
        </p>
      </div>

      <div className="provider-longitudinal-grid">
        <SignalList
          title="Observed Procedures"
          items={summary.observedProcedures.map((item) => ({
            signal: item.procedure,
            count: item.count,
          }))}
          empty="No procedures recorded yet."
        />
        <SignalList
          title="Recurring Pain Points"
          items={summary.recurringPainPoints.map((item) => ({
            signal: item.signal,
            count: item.count,
          }))}
          empty="No recurring clinical themes yet."
        />
        <SignalList
          title="Competitive Products Seen"
          items={summary.competitiveProductsSeen.map((item) => ({
            signal: item.signal,
            count: item.count,
          }))}
          empty="No competitive products captured yet."
        />
        <SignalList
          title="Product Fit Signals"
          items={summary.opportunitySignals.map((item) => ({
            signal: item.signal,
            count: item.count,
          }))}
          empty="No opportunity signals yet."
        />
        <SignalList
          title="Product Fit Trends"
          items={summary.productFitTrends.map((item) => ({
            signal: item.label,
            count: item.count,
          }))}
          empty="No product fit trends yet."
        />
      </div>
    </section>
  );
}
