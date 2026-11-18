"use client";

import React from "react";
import {
  assessEngagementWizardPrepReadiness,
  preparationReadinessGapChipLabel,
  preparationReadinessIntroCallHeadline,
  preparationReadinessMissingSignals,
  type PreparationReadiness,
} from "@/lib/surgical-sales/engagements/engagementWizardPrepReadiness";
import type { EngagementWorkflowDraft } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";
import type { TemplateSuggestContext } from "@/lib/surgical-sales/preCallPlanTemplateSuggest";

export function PreparationReadinessFeedback({
  isStrategic,
  engagementType,
  workflowDraft,
  basicsProductLine,
  suggestContext,
  opportunityProductLine,
}: {
  isStrategic: boolean;
  engagementType: string;
  workflowDraft: EngagementWorkflowDraft;
  basicsProductLine?: string;
  suggestContext: TemplateSuggestContext;
  opportunityProductLine?: string | null;
}) {
  const readiness = React.useMemo(
    () =>
      assessEngagementWizardPrepReadiness({
        isStrategic,
        engagementType,
        workflowDraft,
        basicsProductLine,
        suggestContext,
        opportunityProductLine,
      }),
    [
      isStrategic,
      engagementType,
      workflowDraft,
      basicsProductLine,
      suggestContext,
      opportunityProductLine,
    ],
  );

  return <PreparationReadinessBar readiness={readiness} />;
}

/** Compact intro-call snapshot — max ~2 lines; answers "Am I ready?" */
export function PreparationReadinessSnapshot({
  readiness,
}: {
  readiness: PreparationReadiness;
}) {
  const missing = preparationReadinessMissingSignals(readiness);
  const headline = preparationReadinessIntroCallHeadline(
    readiness.level,
    readiness.percent_complete,
  );

  return (
    <div
      className={`ew-prep-readiness-snapshot ew-prep-readiness-snapshot--${readiness.level}`}
      role="status"
      aria-label={`${headline}. ${readiness.percent_complete}% complete. ${readiness.met_count} of ${readiness.total_count} items.`}
    >
      <div className="ew-prep-readiness-snapshot-primary">
        <p className="ew-prep-readiness-snapshot-headline">{headline}</p>
        <div className="ew-prep-readiness-snapshot-stats">
          <span className="ew-prep-readiness-snapshot-level">{readiness.level_label}</span>
          <span className="ew-prep-readiness-snapshot-pct">{readiness.percent_complete}%</span>
        </div>
        <div
          className="ew-prep-readiness-snapshot-bar"
          role="progressbar"
          aria-valuenow={readiness.percent_complete}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Preparation progress"
        >
          <span
            className="ew-prep-readiness-snapshot-bar-fill"
            style={{ width: `${readiness.percent_complete}%` }}
          />
        </div>
      </div>

      {missing.length > 0 ? (
        <div className="ew-prep-readiness-snapshot-gaps">
          <span className="ew-prep-readiness-snapshot-gaps-label">Still need</span>
          <ul className="ew-prep-readiness-snapshot-chips" aria-label="Preparation items still to add">
            {missing.map((signal) => (
              <li key={signal.key} className="ew-prep-readiness-snapshot-chip">
                {preparationReadinessGapChipLabel(signal)}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="ew-prep-readiness-snapshot-complete">Checklist complete</p>
      )}
    </div>
  );
}

/** Full checklist bar for non–intro-call strategic prep */
export function PreparationReadinessBar({
  readiness,
}: {
  readiness: PreparationReadiness;
}) {
  return (
    <div
      className={`ew-prep-readiness ew-prep-readiness--${readiness.level}`}
      role="status"
      aria-label={`Preparation readiness: ${readiness.level_label}, ${readiness.percent_complete}%`}
    >
      <div className="ew-prep-readiness-bar-row">
        <span className="ew-prep-readiness-heading">
          Preparation readiness:{" "}
          <span className="ew-prep-readiness-level">{readiness.level_label}</span>
        </span>
        <span className="ew-prep-readiness-pct">{readiness.percent_complete}%</span>
      </div>
      <div
        className="ew-prep-readiness-progress"
        role="progressbar"
        aria-valuenow={readiness.percent_complete}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${readiness.percent_complete}%` }} />
      </div>
      <ul className="ew-prep-readiness-signals" aria-label="Preparation checklist">
        {readiness.signals.map((signal) => (
          <li
            key={signal.key}
            className={`ew-prep-readiness-signal${signal.met ? " ew-prep-readiness-signal--met" : ""}`}
          >
            <span className="ew-prep-readiness-dot" aria-hidden />
            {signal.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
