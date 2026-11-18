"use client";

import React from "react";

function CaptureInsightIcon() {
  return (
    <svg
      className="pau-capture-action-icon-svg"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M6 3.5h8a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 6 3.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="M7.25 7h5.5M7.25 10h5.5M7.25 13h3.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M12.5 3.5V5a1 1 0 0 0 1 1h1.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UnderstandingCaptureActionRow({
  captureLabel,
  captureHelper,
  onCapture,
}: {
  captureLabel: string;
  captureHelper: string;
  onCapture: () => void;
}) {
  return (
    <div className="pau-capture-action-wrap">
      <button
        type="button"
        className="pau-capture-action"
        onClick={onCapture}
        aria-label={`${captureLabel}. ${captureHelper}`}
      >
        <span className="pau-capture-action-icon" aria-hidden>
          <CaptureInsightIcon />
        </span>
        <span className="pau-capture-action-text">
          <span className="pau-capture-action-label">
            {captureLabel}
            <span className="pau-capture-action-chevron" aria-hidden>
              →
            </span>
          </span>
          <span className="pau-capture-action-helper">{captureHelper}</span>
        </span>
      </button>
    </div>
  );
}
