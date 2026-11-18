"use client";

import React from "react";
import { buildObservationDebriefSummaryView } from "@/lib/surgical-sales/buildObservationDebriefSummaryView";
import { OBSERVATION_DETAIL_SECTION_LABELS } from "@/lib/surgical-sales/observationCaseDetailVocabulary";
import { observationCaseBriefingCss } from "./observationCaseBriefingCss";

export function ObservationCaseDebriefSummary({
  caseRow,
  activities,
  onViewDebrief,
}: {
  caseRow: Record<string, unknown>;
  activities?: Array<{ activity_type?: string; body?: string; metadata_json?: Record<string, unknown> | null }>;
  onViewDebrief?: () => void;
}) {
  const view = React.useMemo(
    () => buildObservationDebriefSummaryView({ caseRow, activities }),
    [activities, caseRow],
  );

  if (!view) return null;

  return (
    <section className="case-obs-debrief-summary" aria-labelledby="case-obs-debrief-summary-title">
      <style dangerouslySetInnerHTML={{ __html: observationCaseBriefingCss }} />
      <header className="case-obs-briefing-head case-obs-debrief-summary-head">
        <div>
          <h2 id="case-obs-debrief-summary-title" className="case-obs-briefing-title">
            {OBSERVATION_DETAIL_SECTION_LABELS.debriefSummary}
          </h2>
          {view.debriefDateLabel ? (
            <p className="case-obs-briefing-lead">
              You debriefed this case on {view.debriefDateLabel}.
            </p>
          ) : null}
        </div>
        <span className="case-obs-debrief-summary-badge">Debriefed</span>
      </header>

      <div className="case-obs-debrief-summary-stats">
        <article className="case-obs-debrief-summary-stat">
          <p className="case-obs-debrief-summary-stat-value">{view.discussionTopics}</p>
          <p className="case-obs-debrief-summary-stat-label">Discussion topics</p>
        </article>
        <article className="case-obs-debrief-summary-stat">
          <p className="case-obs-debrief-summary-stat-value">{view.keyInsights}</p>
          <p className="case-obs-debrief-summary-stat-label">Key insights</p>
        </article>
        <article className="case-obs-debrief-summary-stat">
          <p className="case-obs-debrief-summary-stat-value">{view.actionItems}</p>
          <p className="case-obs-debrief-summary-stat-label">Action items</p>
        </article>
        <article className="case-obs-debrief-summary-stat">
          <p className="case-obs-debrief-summary-stat-value">{view.followUps}</p>
          <p className="case-obs-debrief-summary-stat-label">Follow-ups</p>
        </article>
      </div>

      {onViewDebrief ? (
        <button type="button" className="case-obs-debrief-summary-cta" onClick={onViewDebrief}>
          View debrief summary
        </button>
      ) : null}
    </section>
  );
}
