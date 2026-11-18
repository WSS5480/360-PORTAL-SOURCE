"use client";

import type { ProviderEvaluationPathView } from "@/lib/surgical-sales/buildProviderEvaluationPathView";

export function ProviderEvaluationPathPanel({
  evaluationPath,
  className = "",
  compact = false,
}: {
  evaluationPath: ProviderEvaluationPathView;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`evaluation-path-panel${compact ? " evaluation-path-panel--compact" : ""}${
        className ? ` ${className}` : ""
      }`}
      aria-label="Evaluation pathway"
      data-testid="evaluation-path-panel"
    >
      <dl className="evaluation-path-panel__stats">
        <div className="evaluation-path-panel__stat">
          <dt>Evaluation Path</dt>
          <dd>{evaluationPath.pathLabel}</dd>
        </div>
        <div className="evaluation-path-panel__stat">
          <dt>Evaluation Status</dt>
          <dd>{evaluationPath.statusLabel}</dd>
        </div>
        <div className="evaluation-path-panel__stat evaluation-path-panel__stat--wide">
          <dt>Next Action</dt>
          <dd>{evaluationPath.nextActionLabel}</dd>
        </div>
      </dl>
    </div>
  );
}
