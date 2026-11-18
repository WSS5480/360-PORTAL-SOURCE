"use client";

import type {
  ProviderMissionMetricId,
  ProviderMissionPortfolioSummary,
} from "@/lib/surgical-sales/providerMissionPortfolio";

export function ProvidersMissionCommandCenter({
  summary,
  activeMetric,
  onMetricSelect,
}: {
  summary: ProviderMissionPortfolioSummary;
  activeMetric: ProviderMissionMetricId | null;
  onMetricSelect: (metricId: ProviderMissionMetricId | null) => void;
}) {
  return (
    <div className="providers-mission-command-center" aria-label="Provider mission command center">
      <div className="providers-mission-command-center-head">
        <p className="providers-mission-command-center-kicker">Sales pathway</p>
        {activeMetric ? (
          <button
            type="button"
            className="providers-mission-command-center-clear"
            onClick={() => onMetricSelect(null)}
          >
            Show all providers
          </button>
        ) : null}
      </div>
      <div className="providers-mission-command-center-metrics" role="list">
        {summary.metrics.map((metric) => {
          const active = activeMetric === metric.id;
          return (
            <button
              key={metric.id}
              type="button"
              role="listitem"
              className={`providers-mission-metric providers-mission-metric--${metric.id}${
                active ? " providers-mission-metric--active" : ""
              }${metric.count > 0 ? " providers-mission-metric--populated" : ""}`}
              title={metric.title}
              aria-pressed={active}
              onClick={() => onMetricSelect(active ? null : metric.id)}
            >
              <span className="providers-mission-metric-label">{metric.label}</span>
              <span className="providers-mission-metric-value">{metric.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
