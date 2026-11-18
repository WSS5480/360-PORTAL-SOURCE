"use client";

import React from "react";
import type { DebriefReviewSummary } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewSummary";
import {
  INTELLIGENCE_BRIEF_KEY_TAKEAWAYS,
  INTELLIGENCE_BRIEF_SUMMARY_TITLE,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBriefCopy";

export function DebriefReviewSummaryPanel({ summary }: { summary: DebriefReviewSummary }) {
  if (summary.takeaways.length === 0 && !summary.providerLabel) return null;

  return (
    <section className="ai-debrief-summary" data-testid="ai-debrief-summary">
      <div className="ai-debrief-summary__head">
        <h3 className="ai-debrief-summary__title">{INTELLIGENCE_BRIEF_SUMMARY_TITLE}</h3>
        {summary.providerLabel ? (
          <span className="ai-brief-chip ai-brief-chip--provider">{summary.providerLabel}</span>
        ) : null}
      </div>
      {summary.takeaways.length > 0 ? (
        <div className="ai-debrief-summary__takeaways-block">
          <span className="ai-debrief-summary__takeaways-heading">{INTELLIGENCE_BRIEF_KEY_TAKEAWAYS}</span>
          <ul className="ai-debrief-summary__takeaways">
            {summary.takeaways.map((line) => (
              <li key={line} className="ai-debrief-summary__takeaway">
                <span className="ai-debrief-summary__takeaway-mark" aria-hidden="true">
                  ✓
                </span>
                <span className="ai-debrief-summary__takeaway-text">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
