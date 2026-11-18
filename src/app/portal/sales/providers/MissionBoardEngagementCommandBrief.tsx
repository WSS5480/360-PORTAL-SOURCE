"use client";

import React from "react";
import {
  MISSION_COMMAND_BIGGEST_UNKNOWN_LABEL,
  MISSION_COMMAND_OBJECTIVE_LABEL,
  MISSION_COMMAND_OPENING_QUESTION_LABEL,
  MISSION_COMMAND_WHAT_WE_KNOW_LABEL,
  type MissionBoardEngagementCommandBrief,
} from "@/lib/surgical-sales/missionBoardEngagementCommand";

export function MissionBoardEngagementCommandBrief({
  brief,
  completeStateMessage,
}: {
  brief: MissionBoardEngagementCommandBrief;
  completeStateMessage?: string | null;
}) {
  return (
    <div className="mb-debrief-launcher__body">
      {completeStateMessage ? (
        <p className="mb-debrief-launcher__complete-state" role="status">
          {completeStateMessage}
        </p>
      ) : null}

      <section className="mb-debrief-launcher__section">
        <h3 className="mb-debrief-launcher__label">{MISSION_COMMAND_OBJECTIVE_LABEL}</h3>
        <p className="mb-debrief-launcher__lead">{brief.objective}</p>
      </section>

      <section className="mb-debrief-launcher__section">
        <h3 className="mb-debrief-launcher__label">{MISSION_COMMAND_WHAT_WE_KNOW_LABEL}</h3>
        <ul className="mb-debrief-launcher__facts">
          {brief.whatWeKnow.map((fact) => (
            <li key={fact}>✓ {fact}</li>
          ))}
        </ul>
      </section>

      {brief.biggestUnknown ? (
        <section className="mb-debrief-launcher__section">
          <h3 className="mb-debrief-launcher__label">{MISSION_COMMAND_BIGGEST_UNKNOWN_LABEL}</h3>
          <p className="mb-debrief-launcher__text">{brief.biggestUnknown}</p>
        </section>
      ) : null}

      {brief.suggestedOpeningQuestion ? (
        <section className="mb-debrief-launcher__section">
          <h3 className="mb-debrief-launcher__label">{MISSION_COMMAND_OPENING_QUESTION_LABEL}</h3>
          <p className="mb-debrief-launcher__quote">{brief.suggestedOpeningQuestion}</p>
        </section>
      ) : null}
    </div>
  );
}
