"use client";

import React from "react";
import {
  buildObservationCaseCompletionSummary,
  type ObservationCaseCompletionSummary,
} from "@/lib/surgical-sales/observationCaseLifecycle";
import { OBSERVATION_DETAIL_SECTION_LABELS } from "@/lib/surgical-sales/observationCaseDetailVocabulary";
import { observationFieldExecutionCss } from "./observationFieldExecutionCss";

function formatCompletedAt(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ObservationCaseCompletionSummary({
  caseRow,
  activities,
  providerContact,
  priorCases,
}: {
  caseRow: Record<string, unknown>;
  activities?: Array<{
    activity_type?: string;
    body?: string;
    metadata_json?: Record<string, unknown> | null;
  }>;
  providerContact?: Record<string, unknown> | null;
  priorCases?: Array<Record<string, unknown>>;
}) {
  const summary = React.useMemo<ObservationCaseCompletionSummary>(
    () => buildObservationCaseCompletionSummary({ caseRow, activities, providerContact, priorCases }),
    [activities, caseRow, priorCases, providerContact],
  );
  const completedLabel = formatCompletedAt(summary.completedAt);

  return (
    <section className="case-obs-execution-complete-summary" aria-label="Observation complete">
      <style dangerouslySetInnerHTML={{ __html: observationFieldExecutionCss }} />
      <h2 className="case-obs-execution-complete-title">
        {OBSERVATION_DETAIL_SECTION_LABELS.observationComplete}
      </h2>
      {completedLabel ? (
        <p className="case-obs-execution-complete-meta">Completed {completedLabel}</p>
      ) : null}
      <dl className="case-obs-execution-complete-stats">
        <div className="case-obs-execution-complete-stat">
          <dt>{OBSERVATION_DETAIL_SECTION_LABELS.notesCaptured}</dt>
          <dd>{summary.notesCapturedCount}</dd>
        </div>
        <div className="case-obs-execution-complete-stat">
          <dt>{OBSERVATION_DETAIL_SECTION_LABELS.intelligenceIdentified}</dt>
          <dd>{summary.intelligenceItemsCount}</dd>
        </div>
      </dl>
    </section>
  );
}
