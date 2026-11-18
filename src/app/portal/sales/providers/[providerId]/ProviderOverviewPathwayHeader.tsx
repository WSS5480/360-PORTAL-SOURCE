"use client";

import type { ProviderOverviewPathwayStageModel } from "@/lib/surgical-sales/buildProviderOverviewBody";
import type { ProviderOverviewPathwayTimelineModel } from "@/lib/surgical-sales/buildProviderOverviewBody";
import {
  formatRequirementProgress,
  shouldShowAbstractMetrics,
} from "@/lib/surgical-sales/fieldIntelligenceMetricPolicy";
import { providerOverviewRequirementsMetCount } from "@/lib/surgical-sales/buildProviderOverviewPathwayRequirements";
import { ProviderOverviewPathwayTracker } from "./ProviderOverviewPathwayTracker";

export function ProviderOverviewPathwayHeader({
  pathway,
  timeline,
  missionLine,
}: {
  pathway: ProviderOverviewPathwayStageModel;
  timeline: ProviderOverviewPathwayTimelineModel;
  missionLine: string;
}) {
  const objective = pathway.stageObjective?.trim() || missionLine;
  const discovery = pathway.discoveryProgression;
  const metCount = discovery
    ? discovery.readinessCompleteCount
    : providerOverviewRequirementsMetCount(pathway.requirements);
  const totalRequirements = discovery
    ? discovery.readinessTotal
    : pathway.requirements.length;
  const showProgress = shouldShowAbstractMetrics({
    hasFieldEvidence: pathway.hasFieldEvidence,
    confirmedCount: metCount,
  });
  const progressLabel = showProgress
    ? formatRequirementProgress(metCount, totalRequirements, pathway.hasFieldEvidence)
    : null;

  return (
    <header className="pov-pathway-hero" data-testid="pov-pathway-header">
      <div className="pov-pathway-hero__intro">
        <p className="pov-pathway-hero__kicker">Pathway stage</p>
        <div className="pov-pathway-hero__title-row">
          <h1 className="pov-pathway-hero__stage" data-testid="pov-mission">
            {pathway.stageLabel}
          </h1>
          {progressLabel ? (
            <span className="pov-pathway-hero__progress" aria-label={`Stage progress ${progressLabel}`}>
              <span className="pov-pathway-hero__progress-value">{progressLabel}</span>
            </span>
          ) : null}
        </div>
        {objective ? <p className="pov-pathway-hero__mission">{objective}</p> : null}
      </div>
      <ProviderOverviewPathwayTracker timeline={timeline} />
    </header>
  );
}
