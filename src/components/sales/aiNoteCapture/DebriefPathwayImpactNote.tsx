"use client";

import React from "react";
import { PATHWAY_IMPACT_LABEL } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligencePathwayImpact";

export function DebriefPathwayImpactNote({ line }: { line: string | null | undefined }) {
  const text = line?.trim();
  if (!text) return null;

  return (
    <p className="ai-debrief-pathway-impact" data-testid="ai-debrief-pathway-impact">
      <span className="ai-debrief-pathway-impact__label">{PATHWAY_IMPACT_LABEL}:</span>{" "}
      <span className="ai-debrief-pathway-impact__text">{text}</span>
    </p>
  );
}
