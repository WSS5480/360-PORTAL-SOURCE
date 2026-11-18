"use client";

import type { ProviderCommitmentView, ProviderOutcomesTrackingView } from "@/lib/surgical-sales/providerCommitmentOutcomes";

export function ProviderCommitmentOutcomesPanel({
  commitment,
  outcomes,
  className = "",
  compact = false,
}: {
  commitment: ProviderCommitmentView | null;
  outcomes: ProviderOutcomesTrackingView | null;
  className?: string;
  compact?: boolean;
}) {
  if (!commitment && !outcomes) return null;

  return (
    <div
      className={`evaluation-path-panel${compact ? " evaluation-path-panel--compact" : ""}${
        className ? ` ${className}` : ""
      }`}
      aria-label="Commitment and outcomes"
      data-testid="commitment-outcomes-panel"
    >
      <dl className="evaluation-path-panel__stats">
        {commitment ? (
          <>
            <div className="evaluation-path-panel__stat">
              <dt>Commitment</dt>
              <dd>{commitment.summaryLabel}</dd>
            </div>
            {commitment.evaluationPathCompleted ? (
              <div className="evaluation-path-panel__stat">
                <dt>Evaluation path</dt>
                <dd>{commitment.evaluationPathCompleted}</dd>
              </div>
            ) : null}
          </>
        ) : null}
        {outcomes ? (
          <>
            <div className="evaluation-path-panel__stat">
              <dt>Outcomes tracking</dt>
              <dd>{outcomes.statusLabel}</dd>
            </div>
            {outcomes.lastUpdateLabel ? (
              <div className="evaluation-path-panel__stat">
                <dt>Last update</dt>
                <dd>{outcomes.lastUpdateLabel}</dd>
              </div>
            ) : null}
          </>
        ) : null}
      </dl>
    </div>
  );
}
