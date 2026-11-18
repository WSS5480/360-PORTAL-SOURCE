"use client";

import React from "react";
import type { CaseIdentity } from "@/lib/surgical-sales/buildCaseIdentity";
import { buildObservationCaseSidebarView } from "@/lib/surgical-sales/buildObservationCaseSidebarView";

export function ObservationCaseNextAction({
  identity,
  caseRow,
  engagement,
  activities,
  disabled,
  onAction,
}: {
  identity: CaseIdentity;
  caseRow: Record<string, unknown>;
  engagement?: Record<string, unknown> | null;
  activities?: Array<{ activity_type?: string }>;
  disabled?: boolean;
  onAction?: (actionId: string) => void;
}) {
  const view = React.useMemo(
    () =>
      buildObservationCaseSidebarView({
        identity,
        caseRow,
        engagement,
        activities,
      }),
    [activities, caseRow, engagement, identity],
  );

  return (
    <section className="case-obs-detail-card" aria-labelledby="case-obs-next-action-title">
      <h2 id="case-obs-next-action-title" className="case-obs-detail-card-title">
        Next Action
      </h2>
      <p className="case-obs-sidebar-action-copy">
        {view.totalIntelligenceSignals > 0
          ? `${view.totalIntelligenceSignals} intelligence signal${view.totalIntelligenceSignals === 1 ? "" : "s"} captured so far.`
          : "Start capturing notes to build observation intelligence."}
      </p>
      {onAction ? (
        <button
          type="button"
          className="case-obs-sidebar-action-btn"
          disabled={disabled}
          onClick={() => onAction(view.recommendedAction.id)}
        >
          {view.recommendedAction.label}
        </button>
      ) : (
        <p className="case-obs-mission-plan-empty">{view.recommendedAction.label}</p>
      )}
    </section>
  );
}
