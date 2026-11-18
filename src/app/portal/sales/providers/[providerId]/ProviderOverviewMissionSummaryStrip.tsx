"use client";

import type { ProviderOverviewMissionSummary } from "@/lib/surgical-sales/buildProviderOverviewMissionSummary";
import { PROVIDER_OVERVIEW_BRIEFING_LABEL } from "@/lib/surgical-sales/providerOverviewBriefingCopy";

export function ProviderOverviewMissionSummaryStrip({
  summary,
}: {
  summary: ProviderOverviewMissionSummary;
}) {
  return (
    <section
      className="pov-mission-summary"
      aria-label={PROVIDER_OVERVIEW_BRIEFING_LABEL.missionSummaryAria}
      data-testid="pov-mission-summary"
    >
      <div className="pov-mission-summary__status">
        <h2 className="pov-mission-summary__title">{PROVIDER_OVERVIEW_BRIEFING_LABEL.missionSummary}</h2>
        <ul className="pov-mission-summary__list">
          {summary.statusLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      <div className="pov-mission-summary__move">
        <p className="pov-mission-summary__move-label">
          {PROVIDER_OVERVIEW_BRIEFING_LABEL.missionRecommendedMove}
        </p>
        <p className="pov-mission-summary__move-value">{summary.recommendedMove}</p>
      </div>
    </section>
  );
}
