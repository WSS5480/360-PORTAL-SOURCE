"use client";

import React from "react";
import {
  buildObservationTakeaways,
  splitObservationTakeawayPreview,
} from "@/lib/surgical-sales/buildObservationTakeaways";
import { OBSERVATION_DETAIL_SECTION_LABELS } from "@/lib/surgical-sales/observationCaseDetailVocabulary";
import { observationCaseBriefingCss } from "./observationCaseBriefingCss";

type LearnedActivity = {
  activity_type?: string;
  body?: string;
  metadata_json?: Record<string, unknown> | null;
};

type PriorCaseRow = {
  id: string;
  procedure_type?: string | null;
  live_observation_competitors?: unknown;
  live_observation_product_fit?: unknown;
  live_observation_workflow?: unknown;
  live_observation_clinical_pain_points?: unknown;
  live_observation_staff_process?: unknown;
};

export function ObservationCaseThingsLearned({
  caseRow,
  activities,
  providerContact,
  priorCases,
}: {
  caseRow: Record<string, unknown>;
  activities?: LearnedActivity[];
  providerContact?: Record<string, unknown> | null;
  priorCases?: PriorCaseRow[];
}) {
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = React.useState(false);

  const takeaways = React.useMemo(
    () => buildObservationTakeaways({ caseRow, activities, providerContact, priorCases }),
    [activities, caseRow, priorCases, providerContact],
  );
  const { preview, hiddenCount } = React.useMemo(
    () => splitObservationTakeawayPreview(takeaways),
    [takeaways],
  );
  const visible = showAll ? takeaways : preview;

  return (
    <section className="case-obs-things-learned" aria-labelledby="case-obs-things-learned-title">
      <style dangerouslySetInnerHTML={{ __html: observationCaseBriefingCss }} />
      <header className="case-obs-briefing-head case-obs-things-learned-head">
        <div>
          <h2 id="case-obs-things-learned-title" className="case-obs-briefing-title">
            {OBSERVATION_DETAIL_SECTION_LABELS.thingsLearnedSoFar}
          </h2>
          <p className="case-obs-briefing-lead">{OBSERVATION_DETAIL_SECTION_LABELS.thingsLearnedLead}</p>
        </div>
        {takeaways.length > 0 ? (
          <span className="case-obs-things-learned-count">{takeaways.length} items</span>
        ) : null}
      </header>

      {takeaways.length > 0 ? (
        <>
          <ul className="case-obs-things-learned-list">
            {visible.map((item) => {
              const isOpen = expanded[item.id] ?? false;
              return (
                <li key={item.id} className="case-obs-things-learned-item">
                  <button
                    type="button"
                    className="case-obs-things-learned-row"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setExpanded((current) => ({ ...current, [item.id]: !isOpen }))
                    }
                  >
                    <span className="case-obs-things-learned-check" aria-hidden>
                      ✓
                    </span>
                    <span className="case-obs-things-learned-text">{item.text}</span>
                    <span className="case-obs-things-learned-chevron" aria-hidden>
                      {isOpen ? "▾" : "▸"}
                    </span>
                  </button>
                  {isOpen ? (
                    <ul className="case-obs-things-learned-sources">
                      {item.sources.map((source) => (
                        <li key={`${item.id}-${source.label}-${source.detail ?? ""}`}>
                          <strong>{source.label}</strong>
                          {source.detail ? ` — ${source.detail}` : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {!showAll && hiddenCount > 0 ? (
            <button
              type="button"
              className="case-obs-things-learned-more"
              onClick={() => setShowAll(true)}
            >
              +{hiddenCount} more takeaways
            </button>
          ) : null}
        </>
      ) : (
        <p className="case-obs-things-learned-empty">{OBSERVATION_DETAIL_SECTION_LABELS.thingsLearnedEmpty}</p>
      )}
    </section>
  );
}
