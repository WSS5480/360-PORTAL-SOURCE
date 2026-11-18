"use client";

import React from "react";
import type { DebriefStructuredEvidence } from "@/lib/surgical-sales/debriefReviewStructuredEvidence";
import {
  DEBRIEF_REVIEW_HIDE_EVIDENCE,
  DEBRIEF_REVIEW_VIEW_EVIDENCE,
  hasStructuredEvidence,
} from "@/lib/surgical-sales/debriefReviewStructuredEvidence";

export function DebriefReviewEvidencePanel({
  evidence,
  expanded,
  onToggle,
  className,
}: {
  evidence: DebriefStructuredEvidence;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}) {
  if (!hasStructuredEvidence(evidence)) return null;

  return (
    <div className={className ? `ai-debrief-evidence ${className}` : "ai-debrief-evidence"}>
      <button type="button" className="ai-debrief-evidence__toggle" onClick={onToggle}>
        {expanded ? DEBRIEF_REVIEW_HIDE_EVIDENCE : DEBRIEF_REVIEW_VIEW_EVIDENCE}
      </button>
      {expanded ? (
        <div className="ai-debrief-evidence__panel" aria-label="Evidence">
          <p className="ai-debrief-evidence__heading">Evidence</p>
          <dl className="ai-debrief-evidence__fields">
            {evidence.sourceQuote ? (
              <div className="ai-debrief-evidence__field">
                <dt>Source</dt>
                <dd>&ldquo;{evidence.sourceQuote}&rdquo;</dd>
              </div>
            ) : null}
            {evidence.confidenceLabel ? (
              <div className="ai-debrief-evidence__field">
                <dt>Confidence</dt>
                <dd>{evidence.confidenceLabel}</dd>
              </div>
            ) : null}
            {evidence.reasoning ? (
              <div className="ai-debrief-evidence__field">
                <dt>Reasoning</dt>
                <dd>{evidence.reasoning}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}
    </div>
  );
}
