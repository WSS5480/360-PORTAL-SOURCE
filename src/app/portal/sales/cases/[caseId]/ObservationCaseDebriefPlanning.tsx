"use client";

import React from "react";
import {
  buildObservationDebriefDiscussionTopics,
  observationHasSufficientNotesForDebriefPlanning,
} from "@/lib/surgical-sales/buildObservationDebriefDiscussionTopics";
import {
  OBSERVATION_DEBRIEF_PLANNING_EMPTY,
  OBSERVATION_DEBRIEF_PLANNING_TOPICS_HEADING,
  OBSERVATION_DETAIL_SECTION_LABELS,
} from "@/lib/surgical-sales/observationCaseDetailVocabulary";
import { GENERATE_DEBRIEF_LABEL } from "@/lib/surgical-sales/observationProgramGate";
import { observationCaseBriefingCss } from "./observationCaseBriefingCss";

type PlanningActivity = { activity_type?: string; body?: string; metadata_json?: Record<string, unknown> | null };

export function ObservationCaseDebriefPlanning({
  caseRow,
  activities,
  disabled,
  debriefUnlocked = false,
  onPlanDebrief,
}: {
  caseRow: Record<string, unknown>;
  activities?: PlanningActivity[];
  disabled?: boolean;
  debriefUnlocked?: boolean;
  onPlanDebrief?: () => void;
}) {
  if (!debriefUnlocked) return null;
  const sufficient = React.useMemo(
    () => observationHasSufficientNotesForDebriefPlanning({ caseRow, activities }),
    [activities, caseRow],
  );
  const topics = React.useMemo(
    () => buildObservationDebriefDiscussionTopics({ caseRow, activities }),
    [activities, caseRow],
  );

  return (
    <section className="case-obs-debrief-planning" aria-labelledby="case-obs-debrief-planning-title">
      <style dangerouslySetInnerHTML={{ __html: observationCaseBriefingCss }} />
      <header className="case-obs-briefing-head">
        <h2 id="case-obs-debrief-planning-title" className="case-obs-briefing-title">
          {OBSERVATION_DETAIL_SECTION_LABELS.debriefPlanner}
        </h2>
      </header>

      {!sufficient ? (
        <p className="case-obs-debrief-planning-empty">{OBSERVATION_DEBRIEF_PLANNING_EMPTY}</p>
      ) : (
        <div className="case-obs-debrief-planning-topics">
          <h3 className="case-obs-debrief-planning-topics-title">{OBSERVATION_DEBRIEF_PLANNING_TOPICS_HEADING}</h3>
          <ul className="case-obs-debrief-planning-topics-list">
            {topics.map((topic) => (
              <li key={topic} className="case-obs-debrief-planning-topic">
                {topic}
              </li>
            ))}
          </ul>
        </div>
      )}

      {onPlanDebrief ? (
        <button
          type="button"
          className="case-obs-debrief-planning-cta"
          disabled={disabled || !sufficient}
          onClick={onPlanDebrief}
        >
          {GENERATE_DEBRIEF_LABEL}
        </button>
      ) : null}
    </section>
  );
}
