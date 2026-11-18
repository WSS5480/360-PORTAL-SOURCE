"use client";

import React from "react";
import type { IntelligenceBriefOutcome } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";

export function DebriefOutcomeDetails({
  outcome,
  evidenceQuotes,
  children,
}: {
  outcome: IntelligenceBriefOutcome;
  evidenceQuotes: string[];
  children?: React.ReactNode;
}) {
  return (
    <div className="ai-intelligence-brief__details-panel" data-testid={`ai-intelligence-brief-details-${outcome.id}`}>
      {evidenceQuotes.length > 0 ? (
        <blockquote className="ai-intelligence-brief__evidence">
          {evidenceQuotes.map((quote) => (
            <p key={quote}>{quote}</p>
          ))}
        </blockquote>
      ) : null}
      {children}
    </div>
  );
}
