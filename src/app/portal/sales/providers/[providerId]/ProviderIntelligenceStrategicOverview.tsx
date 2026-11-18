"use client";

import React from "react";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { buildInteractionCaptureRecommendations } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  buildIntelligenceLearningGaps,
  formatLearningGapsHeadline,
  INTELLIGENCE_LEARNING_GAPS_TITLE,
} from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import type { ProviderPlanningTabSectionId } from "@/lib/surgical-sales/providerPlanningTabSections";
import { intelligenceGapChipLabel } from "@/lib/surgical-sales/providerIntelligenceBriefing";

export function ProviderIntelligenceStrategicOverview({
  contact,
  planning,
  onOpenSection,
}: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  onOpenSection: (sectionId: ProviderPlanningTabSectionId, dbKey?: string) => void;
}) {
  const gaps = React.useMemo(
    () => buildIntelligenceLearningGaps(contact, planning, 4),
    [contact, planning],
  );
  const headline = formatLearningGapsHeadline(planning, contact);
  const visitPrompts = React.useMemo(
    () => buildInteractionCaptureRecommendations(contact, planning, 2),
    [contact, planning],
  );
  const [promptsOpen, setPromptsOpen] = React.useState(false);

  if (gaps.length === 0 && visitPrompts.length === 0) {
    return (
      <div className="provider-intel-overview provider-intel-overview--mature">
        <p className="provider-intel-overview-headline">{headline}</p>
      </div>
    );
  }

  return (
    <section className="provider-intel-overview" aria-label="Intelligence overview">
      <p className="provider-intel-overview-headline">{headline}</p>

      {gaps.length > 0 ? (
        <div className="provider-intel-overview-gaps">
          <span className="provider-intel-overview-gaps-label">{INTELLIGENCE_LEARNING_GAPS_TITLE}</span>
          <ul className="provider-intel-overview-gap-chips">
            {gaps.slice(0, 4).map((gap) => (
              <li key={gap.dbKey}>
                <button
                  type="button"
                  className={`provider-intel-gap-chip provider-intel-gap-chip--${gap.state === "unknown" ? "unknown" : "emerging"}`}
                  onClick={() => onOpenSection(gap.sectionId, gap.dbKey)}
                  title={gap.phrase}
                >
                  {intelligenceGapChipLabel(gap.dbKey, gap.state)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {visitPrompts.length > 0 ? (
        <div className="provider-intel-overview-prompts">
          <button
            type="button"
            className="provider-intel-overview-prompts-toggle"
            aria-expanded={promptsOpen}
            onClick={() => setPromptsOpen((v) => !v)}
          >
            {promptsOpen ? "Hide next-visit prompts" : `Next visit (${visitPrompts.length})`}
          </button>
          {promptsOpen ? (
            <ul className="provider-intel-overview-prompts-list">
              {visitPrompts.map((rec) => (
                <li key={rec.dbKey}>
                  <button
                    type="button"
                    className="provider-intel-overview-prompt"
                    onClick={() => onOpenSection(rec.sectionId, rec.dbKey)}
                  >
                    {rec.prompt}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
