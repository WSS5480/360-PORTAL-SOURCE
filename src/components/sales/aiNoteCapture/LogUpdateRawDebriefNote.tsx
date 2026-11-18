"use client";

import React from "react";
import {
  AI_DEBRIEF_ORIGINAL_NOTE_HIDE,
  AI_DEBRIEF_ORIGINAL_NOTE_SAVED_ENGAGEMENT,
  AI_DEBRIEF_ORIGINAL_NOTE_SHOW,
  AI_DEBRIEF_VIEW_ORIGINAL,
} from "@/lib/surgical-sales/debriefApprovalUx";

export function LogUpdateRawDebriefNote({
  sourceText,
  savedSubtext = AI_DEBRIEF_ORIGINAL_NOTE_SAVED_ENGAGEMENT,
}: {
  sourceText: string;
  savedSubtext?: string;
}) {
  const body = sourceText.trim();
  if (!body) return null;

  return (
    <details className="log-update-review-raw-debrief">
      <summary className="log-update-review-raw-summary">
        <span className="log-update-review-raw-summary-text">
          <span className="log-update-review-raw-preview">{AI_DEBRIEF_VIEW_ORIGINAL}</span>
          <span className="log-update-review-raw-hint">{savedSubtext}</span>
        </span>
        <span className="log-update-review-raw-toggle log-update-review-raw-toggle--show">
          {AI_DEBRIEF_ORIGINAL_NOTE_SHOW}
        </span>
        <span className="log-update-review-raw-toggle log-update-review-raw-toggle--hide">
          {AI_DEBRIEF_ORIGINAL_NOTE_HIDE}
        </span>
      </summary>
      <div className="log-update-review-raw-body">
        <p className="log-update-review-raw-text">{body}</p>
      </div>
    </details>
  );
}
