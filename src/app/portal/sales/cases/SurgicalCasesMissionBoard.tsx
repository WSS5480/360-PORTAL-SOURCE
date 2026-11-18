"use client";

import React from "react";
import type { EnrichedSurgicalCaseListItem } from "@/lib/surgical-sales/enrichSurgicalCasesForList";
import {
  groupCasesByBoardWorkflowStage,
  visibleCaseBoardWorkflowStages,
} from "@/lib/surgical-sales/buildCaseBoardWorkflowStage";
import { SurgicalCasesBoardCard } from "./SurgicalCasesBoardCard";
import { sortCasesForExecutionList } from "./surgicalCasesListMobileHelpers";

export function SurgicalCasesMissionBoard({
  cases,
  sortNewestFirst,
}: {
  cases: EnrichedSurgicalCaseListItem[];
  sortNewestFirst: boolean;
}) {
  const grouped = React.useMemo(() => {
    const sortFn = (a: EnrichedSurgicalCaseListItem, b: EnrichedSurgicalCaseListItem) =>
      sortCasesForExecutionList(a, b, sortNewestFirst);
    return groupCasesByBoardWorkflowStage(cases, sortFn);
  }, [cases, sortNewestFirst]);

  const workflowStages = React.useMemo(() => visibleCaseBoardWorkflowStages(grouped), [grouped]);

  return (
    <div className="mission-board" role="region" aria-label="Case workflow board">
      <div className="mission-board-columns">
        {workflowStages.map((stage) => {
          const stageCases = grouped.get(stage.id) ?? [];
          return (
            <section
              key={stage.id}
              className="mission-board-column"
              data-workflow-stage={stage.id}
              aria-label={`${stage.label}, ${stageCases.length} cases`}
            >
              <header className="mission-board-column-header">
                <h2 className="mission-board-column-title" title={stage.title}>
                  {stage.label}
                </h2>
                <span className="mission-board-column-count" aria-label={`${stageCases.length} cases`}>
                  {stageCases.length}
                </span>
              </header>
              <ul className="mission-board-column-cards">
                {stageCases.map((c) => (
                  <SurgicalCasesBoardCard key={c.id} c={c} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
