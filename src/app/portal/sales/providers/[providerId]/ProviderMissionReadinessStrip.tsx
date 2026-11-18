"use client";

import type { CommercialDeploymentReadinessSnapshot } from "@/lib/surgical-sales/commercialDeploymentReadiness";
import {
  combineVisibilityStates,
  deploymentTierToVisibilityState,
  OPERATIONAL_VISIBILITY_BECAUSE_KICKER,
  OPERATIONAL_VISIBILITY_GUIDANCE,
  OPERATIONAL_VISIBILITY_LABEL,
  operationalVisibilityStateLabel,
} from "@/lib/surgical-sales/operationalVisibilityVocabulary";

export function ProviderMissionReadinessStrip({
  deployment,
  readinessChangelog = [],
}: {
  deployment: CommercialDeploymentReadinessSnapshot;
  readinessChangelog?: string[];
}) {
  const combinedVisibility = operationalVisibilityStateLabel(
    combineVisibilityStates([
      deploymentTierToVisibilityState(deployment.facility.tier),
      deploymentTierToVisibilityState(deployment.provider.tier),
    ]),
  );

  return (
    <section className="pau-mission-readiness" aria-label={OPERATIONAL_VISIBILITY_LABEL}>
      <div className="pau-mission-readiness-head">
        <h2 className="pau-mission-readiness-title">
          {OPERATIONAL_VISIBILITY_LABEL}: {combinedVisibility}
        </h2>
        <div className="pau-mission-readiness-tiers">
          <span
            className={`pau-mission-readiness-tier pau-mission-readiness-tier--${deployment.facility.tier}`}
            title={deployment.facility.headline}
          >
            Facility · {deployment.facility.tierLabel}
          </span>
          <span
            className={`pau-mission-readiness-tier pau-mission-readiness-tier--${deployment.provider.tier}`}
            title={deployment.provider.headline}
          >
            Provider · {deployment.provider.tierLabel}
          </span>
        </div>
      </div>

      {readinessChangelog.length > 0 ? (
        <div className="pau-mission-readiness-why">
          <span className="pau-mission-readiness-why-kicker">{OPERATIONAL_VISIBILITY_BECAUSE_KICKER}</span>
          <ul className="pau-mission-readiness-why-list">
            {readinessChangelog.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="pau-mission-readiness-guidance">{OPERATIONAL_VISIBILITY_GUIDANCE}</p>
      <ul className="pau-mission-readiness-recs" aria-label="Suggested next field priorities">
        {deployment.combinedRecommendations.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}
