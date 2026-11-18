"use client";

import React from "react";
import type { DebriefRecommendedAction } from "@/lib/surgical-sales/debriefIntelligencePipeline/types";

export function DebriefRecommendedActionCard({
  action,
  readOnly,
  onDismiss,
}: {
  action: DebriefRecommendedAction;
  readOnly?: boolean;
  onDismiss?: () => void;
}) {
  return (
    <article className="ai-debrief-action-card" data-testid={action.id}>
      <h4 className="ai-debrief-action-card__title">{action.title}</h4>
      <p className="ai-debrief-action-card__body">{action.body}</p>
      {action.evidenceQuote ? (
        <blockquote className="ai-debrief-quote">&ldquo;{action.evidenceQuote}&rdquo;</blockquote>
      ) : null}
      <p className="ai-debrief-action-card__meta">Confidence: {action.confidence}</p>
      {onDismiss ? (
        <button type="button" className="ai-debrief-btn--ghost" disabled={readOnly} onClick={onDismiss}>
          Skip
        </button>
      ) : null}
    </article>
  );
}
