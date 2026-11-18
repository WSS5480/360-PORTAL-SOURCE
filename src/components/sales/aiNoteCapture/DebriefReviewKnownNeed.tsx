"use client";

import React from "react";

export function DebriefReviewKnownNeed({
  known,
  needs,
}: {
  known?: string | null;
  needs?: string[];
}) {
  const needItems = (needs ?? []).map((item) => item.trim()).filter(Boolean);
  const knownLine = known?.trim() ?? "";

  if (!knownLine && needItems.length === 0) return null;

  return (
    <div className="ai-debrief-known-need">
      {knownLine ? (
        <div className="ai-debrief-known-need__block">
          <p className="ai-debrief-known-need__label">Known:</p>
          <p className="ai-debrief-known-need__known-line">
            <span className="ai-debrief-known-need__check" aria-hidden>
              ✓
            </span>
            {knownLine}
          </p>
        </div>
      ) : null}
      {needItems.length > 0 ? (
        <div className="ai-debrief-known-need__block">
          <p className="ai-debrief-known-need__label">Need:</p>
          <ul className="ai-debrief-known-need__need-list">
            {needItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
