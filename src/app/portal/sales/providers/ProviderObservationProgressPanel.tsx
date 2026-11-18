"use client";

import Link from "next/link";
import {
  GENERATE_DEBRIEF_LABEL,
  formatObservationProgramProgressCount,
  OBSERVATION_PROGRAM_PROGRESS_HEADING,
} from "@/lib/surgical-sales/observationProgramGate";
import {
  resolveObservationProgressRecommendedStep,
  type ProviderObservationProgress,
} from "@/lib/surgical-sales/providerObservationProgress";

export function ProviderObservationProgressPanel({
  progress,
  debriefStrategyHref,
  className = "",
  compact = false,
}: {
  progress: ProviderObservationProgress;
  debriefStrategyHref?: string | null;
  className?: string;
  compact?: boolean;
}) {
  const nextDate = progress.nextObservationDateLabel ?? "None scheduled";
  const recommendedStep = resolveObservationProgressRecommendedStep(progress.completed);

  return (
    <div
      className={`observation-progress-panel${compact ? " observation-progress-panel--compact" : ""}${
        className ? ` ${className}` : ""
      }`}
      aria-label="Observation progress"
      data-testid="observation-progress-panel"
    >
      <div className="observation-progress-panel__head">
        <span className="observation-progress-panel__title">{OBSERVATION_PROGRAM_PROGRESS_HEADING}</span>
        <span className="observation-progress-panel__count">
          {formatObservationProgramProgressCount(progress.completed, progress.total)}
        </span>
      </div>
      <p className="observation-progress-panel__next-step">{recommendedStep}</p>
      <dl className="observation-progress-panel__stats">
        <div className="observation-progress-panel__stat">
          <dt>Completed</dt>
          <dd>{progress.completedObservationCount}</dd>
        </div>
        <div className="observation-progress-panel__stat">
          <dt>Remaining</dt>
          <dd>{progress.remaining}</dd>
        </div>
        <div className="observation-progress-panel__stat observation-progress-panel__stat--wide">
          <dt>Next Observation Date</dt>
          <dd
            className={
              progress.nextObservationDateLabel
                ? undefined
                : "observation-progress-panel__stat-value--muted"
            }
          >
            {nextDate}
          </dd>
        </div>
      </dl>
      {progress.debriefReady && debriefStrategyHref ? (
        <Link href={debriefStrategyHref} className="observation-progress-panel__cta">
          {GENERATE_DEBRIEF_LABEL}
        </Link>
      ) : null}
    </div>
  );
}
