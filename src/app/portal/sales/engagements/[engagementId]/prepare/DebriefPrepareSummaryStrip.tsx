"use client";

import React from "react";
import type { DebriefPrepareWorkspaceView } from "@/lib/surgical-sales/engagements/debriefPrepareWorkspace";
import { PROVIDER_DEBRIEF_FIELD_BRIEFING_LEAD } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";

function readinessChips(workspace: DebriefPrepareWorkspaceView) {
  const chips: Array<{ id: string; label: string; done: boolean }> = [
    {
      id: "objective",
      label: "Objective",
      done: workspace.meetingObjective.trim().length > 0,
    },
    {
      id: "hypothesis",
      label: "Hypothesis",
      done: workspace.hypothesis.trim().length > 0,
    },
    {
      id: "learn",
      label: "Gaps to confirm",
      done: workspace.learnItems.some((item) => item.checked),
    },
    {
      id: "outcome",
      label: "Desired outcome",
      done: workspace.desiredOutcome !== null,
    },
  ];
  return chips;
}

export function DebriefPrepareSummaryStrip({
  workspace,
  completedObservationCount,
  saveState,
}: {
  workspace: DebriefPrepareWorkspaceView;
  completedObservationCount: number;
  saveState: "idle" | "saving" | "saved" | "error";
}) {
  const chips = readinessChips(workspace);
  const doneCount = chips.filter((chip) => chip.done).length;
  const procedure = workspace.draft.procedureLabel?.trim();
  const incumbent = workspace.draft.incumbentProduct?.trim();
  const observationLabel =
    completedObservationCount === 1
      ? "1 completed observation"
      : `${completedObservationCount} completed observations`;

  return (
    <section className="dpb-prepare-summary" aria-label="Debrief prepare overview">
      <div className="dpb-prepare-summary__head">
        <div>
          <p className="dpb-prepare-summary__lead">{PROVIDER_DEBRIEF_FIELD_BRIEFING_LEAD}</p>
          <div className="dpb-prepare-summary__meta">
            <span className="dpb-prepare-summary__pill dpb-prepare-summary__pill--accent">
              {observationLabel}
            </span>
            {procedure ? (
              <span className="dpb-prepare-summary__pill">{procedure}</span>
            ) : null}
            {incumbent ? (
              <span className="dpb-prepare-summary__pill">Incumbent: {incumbent}</span>
            ) : null}
          </div>
        </div>
        <div
          className={`dpb-prepare-summary__save dpb-prepare-summary__save--${saveState}`}
          aria-live="polite"
        >
          {saveState === "saving" ? "Saving…" : null}
          {saveState === "saved" ? "Saved" : null}
          {saveState === "error" ? "Save failed" : null}
          {saveState === "idle" ? `${doneCount}/${chips.length} ready` : null}
        </div>
      </div>
      <ul className="dpb-prepare-summary__checklist" aria-label="Prepare checklist">
        {chips.map((chip) => (
          <li
            key={chip.id}
            className={`dpb-prepare-summary__check${chip.done ? " dpb-prepare-summary__check--done" : ""}`}
          >
            <span className="dpb-prepare-summary__check-dot" aria-hidden />
            {chip.label}
          </li>
        ))}
      </ul>
    </section>
  );
}

function DebriefPrepareFactItem({ fact }: { fact: string }) {
  const parenMatch = fact.match(/^(.+?)\s+\((\d+ of \d+ observations?)\)$/i);
  const emDashMatch = fact.match(/^(.+?)\s+—\s+seen in (\d+ of \d+ observations?)$/i);
  const match = parenMatch ?? emDashMatch;

  if (!match) {
    return (
      <li className="dpb-plan__fact">
        <span className="dpb-plan__fact-label">{fact}</span>
      </li>
    );
  }

  return (
    <li className="dpb-plan__fact">
      <span className="dpb-plan__fact-label">{match[1]}</span>
      <span className="dpb-plan__fact-count">{match[2]}</span>
    </li>
  );
}

export function DebriefPrepareKnownFactsList({ facts }: { facts: string[] }) {
  if (facts.length === 0) {
    return <p className="dpb-coach-empty">No observation patterns captured yet.</p>;
  }

  return (
    <ul className="dpb-plan__facts dpb-plan__facts--chips">
      {facts.slice(0, 5).map((fact) => (
        <DebriefPrepareFactItem key={fact} fact={fact} />
      ))}
    </ul>
  );
}
