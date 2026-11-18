"use client";

import React from "react";
import { buildObservationFieldChecklist } from "@/lib/surgical-sales/buildObservationFieldChecklist";
import { observationCaseChecklistCss } from "./observationCaseChecklistCss";

export function ObservationCaseChecklist({
  caseRow,
  compact = false,
  hideProgress = false,
}: {
  caseRow: Record<string, unknown>;
  compact?: boolean;
  hideProgress?: boolean;
}) {
  const view = React.useMemo(() => buildObservationFieldChecklist({ caseRow }), [caseRow]);

  return (
    <section
      className={`case-obs-field-checklist${compact ? " case-obs-field-checklist--compact" : ""}`}
      aria-label={view.title}
    >
      <style dangerouslySetInnerHTML={{ __html: observationCaseChecklistCss }} />
      <h2 className="case-obs-field-checklist-title">{view.title}</h2>
      {!compact && !hideProgress ? (
        <p className="case-obs-field-checklist-progress">
          {view.checkedCount} of {view.totalCount} captured
        </p>
      ) : null}
      <ul className="case-obs-field-checklist-list">
        {view.items.map((item) => (
          <li
            key={item.id}
            className={`case-obs-field-checklist-item${item.checked ? " case-obs-field-checklist-item--checked" : ""}`}
          >
            <span className="case-obs-field-checklist-marker" aria-hidden>
              {item.checked ? "✓" : ""}
            </span>
            <span className="case-obs-field-checklist-label">{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
