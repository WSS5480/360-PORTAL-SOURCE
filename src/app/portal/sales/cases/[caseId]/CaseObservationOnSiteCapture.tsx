"use client";

import React from "react";
import { CaseObservationCompetitiveFootprintSection } from "./CaseObservationCompetitiveFootprintSection";
import { CaseObservationOpenQuestionsSection } from "./CaseObservationOpenQuestionsSection";
import { CaseObservationQuickFindingsSection } from "./CaseObservationQuickFindingsSection";
import { CaseObservationValidationSection } from "./CaseObservationValidationSection";

/** Lightweight on-site editors — no CRM card chrome. */
export function CaseObservationOnSiteCapture({
  caseId,
  caseRow,
  disabled,
  onCasePatched,
  onMessage,
}: {
  caseId: string;
  caseRow: Record<string, unknown>;
  disabled?: boolean;
  onCasePatched: (savedCase: Record<string, unknown>) => void;
  onMessage: (message: string) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <section className="case-obs-onsite" aria-labelledby="case-obs-onsite-title">
      <button
        id="case-obs-onsite-title"
        type="button"
        className="case-obs-onsite-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>Optional manual tags</span>
        <span className="case-obs-onsite-toggle-hint">Workflow, competitor, and signal chips — only if you want them</span>
        <span className="case-obs-onsite-chevron" aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open ? (
        <div className="case-obs-onsite-body">
          <CaseObservationValidationSection
            caseId={caseId}
            caseRow={caseRow}
            disabled={disabled}
            onCasePatched={onCasePatched}
            onMessage={onMessage}
            variant="onsite"
          />
          <CaseObservationOpenQuestionsSection
            caseId={caseId}
            caseRow={caseRow}
            disabled={disabled}
            onCasePatched={onCasePatched}
            onMessage={onMessage}
            variant="onsite"
          />
          <CaseObservationCompetitiveFootprintSection
            caseId={caseId}
            caseRow={caseRow}
            disabled={disabled}
            onCasePatched={onCasePatched}
            onMessage={onMessage}
            variant="onsite"
          />
          <CaseObservationQuickFindingsSection
            caseId={caseId}
            caseRow={caseRow}
            disabled={disabled}
            excludeKeys={["competitor_seen"]}
            onCasePatched={onCasePatched}
            onMessage={onMessage}
            variant="onsite"
          />
        </div>
      ) : null}
    </section>
  );
}
