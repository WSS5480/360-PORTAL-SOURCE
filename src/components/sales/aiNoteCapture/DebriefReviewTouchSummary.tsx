"use client";

import React from "react";
import type { TouchCapturedReviewSummary } from "@/lib/surgical-sales/buildDebriefTouchCapturedSummary";

export function DebriefReviewTouchSummary({ summary }: { summary: TouchCapturedReviewSummary }) {
  return (
    <section
      className="ai-debrief-touch-summary"
      data-testid="ai-debrief-touch-summary"
      aria-label={summary.title}
      aria-live="polite"
    >
      <div className="ai-debrief-touch-summary__row">
        <p className="ai-debrief-touch-summary__total">
          <span className="ai-debrief-touch-summary__check" aria-hidden>
            ✓
          </span>
          {summary.totalUpdatesLabel}
        </p>
        {summary.categories.length > 0 ? (
          <div className="ai-debrief-touch-summary__badges">
            {summary.categories.map((category) => (
              <span key={category.id} className="ai-debrief-touch-summary__badge">
                {category.label} ({category.count})
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {summary.recommendedNextMove ? (
        <p className="ai-debrief-touch-summary__next-move">
          <span className="ai-debrief-touch-summary__next-move-label">Recommended next move:</span>{" "}
          <span className="ai-debrief-touch-summary__next-move-text">{summary.recommendedNextMove}</span>
        </p>
      ) : null}
    </section>
  );
}
