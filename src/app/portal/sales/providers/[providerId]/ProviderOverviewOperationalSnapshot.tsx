"use client";

import type { ProviderOperationalSnapshot } from "@/lib/surgical-sales/buildProviderOperationalSnapshot";
import {
  PROVIDER_OVERVIEW_OPERATIONAL_SNAPSHOT_TITLE,
} from "@/lib/surgical-sales/providerOverviewFieldBriefingVocabulary";
import { PROVIDER_FIELD_OPS_SECTION } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";

export function ProviderOverviewOperationalSnapshot({
  snapshot,
}: {
  snapshot: ProviderOperationalSnapshot;
}) {
  if (snapshot.groups.length === 0) return null;

  return (
    <section
      className="pov-snapshot pov-simple-card pov-surface--support"
      aria-labelledby="pov-snapshot-heading"
    >
      <header className="pov-snapshot-head">
        <div className="pov-snapshot-head-main">
          <h2 className="pov-simple-section-title" id="pov-snapshot-heading">
            {PROVIDER_OVERVIEW_OPERATIONAL_SNAPSHOT_TITLE}
          </h2>
          <p className="pov-snapshot-subtitle">{PROVIDER_FIELD_OPS_SECTION.tacticalSnapshotSubtitle}</p>
        </div>
        {snapshot.briefingFreshness ? (
          <span className="pov-snapshot-briefing-freshness">{snapshot.briefingFreshness}</span>
        ) : null}
      </header>

      <div className="pov-snapshot-groups">
        {snapshot.groups.map((group) => (
          <div key={group.id} className={`pov-snapshot-group pov-snapshot-group--${group.id}`}>
            <h3 className="pov-snapshot-group-label">{group.label}</h3>
            <ul className="pov-snapshot-insight-list">
              {group.insights.map((insight) => {
                const meta = [insight.contextHint, insight.confidenceLabel, insight.freshnessLabel]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <li key={insight.id} className="pov-snapshot-insight">
                    <p className="pov-snapshot-synthesis">{insight.synthesis}</p>
                    {meta ? <p className="pov-snapshot-insight-meta">{meta}</p> : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <footer className="pov-snapshot-foot">
        <span className="pov-simple-snapshot-next-label">
          {PROVIDER_FIELD_OPS_SECTION.suggestedFieldMove}
        </span>
        <p className="pov-snapshot-next-value">{snapshot.suggestedNextStep}</p>
      </footer>
    </section>
  );
}
