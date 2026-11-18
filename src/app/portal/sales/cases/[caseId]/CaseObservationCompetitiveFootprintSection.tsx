"use client";

import React from "react";
import {
  observationQuickFindingsFromCaseRow,
  observationQuickFindingsPatch,
  type CompetitorFinding,
} from "@/lib/surgical-sales/observationQuickFindings";
import { patchObservationCase } from "./caseObservationPatch";
import { userFacingError } from "@/lib/errors/userFacingError";

const COMPETITOR_OPTIONS: readonly CompetitorFinding[] = ["None", "Unknown", "Yes"];

export function CaseObservationCompetitiveFootprintSection({
  caseId,
  caseRow,
  disabled,
  onCasePatched,
  onMessage,
  variant = "default",
}: {
  caseId: string;
  caseRow: Record<string, unknown>;
  disabled?: boolean;
  onCasePatched: (savedCase: Record<string, unknown>) => void;
  onMessage: (message: string) => void;
  variant?: "default" | "onsite";
}) {
  const [competitorSeen, setCompetitorSeen] = React.useState<CompetitorFinding | null>(
    () => observationQuickFindingsFromCaseRow(caseRow).competitor_seen,
  );
  const [savingChip, setSavingChip] = React.useState(false);

  React.useEffect(() => {
    setCompetitorSeen(observationQuickFindingsFromCaseRow(caseRow).competitor_seen);
  }, [caseRow.live_observation_competitors]);

  const rawCompetitor = String(caseRow.live_observation_competitors ?? "").trim();
  const detailNotes =
    rawCompetitor && !COMPETITOR_OPTIONS.includes(rawCompetitor as CompetitorFinding) ? rawCompetitor : "";

  async function saveCompetitorChip(next: CompetitorFinding | null) {
    if (disabled) return;
    setCompetitorSeen(next);
    setSavingChip(true);
    try {
      const saved = await patchObservationCase(caseId, observationQuickFindingsPatch("competitor_seen", next));
      onCasePatched(saved);
    } catch (error: unknown) {
      setCompetitorSeen(observationQuickFindingsFromCaseRow(caseRow).competitor_seen);
      onMessage(userFacingError(error, "Could not save competitive signal"));
    } finally {
      setSavingChip(false);
    }
  }

  return (
    <section
      className={variant === "onsite" ? "case-obs-onsite-block" : "case-obs-workflow-section"}
      aria-labelledby="case-obs-competitive-title"
    >
      <h3 id="case-obs-competitive-title" className={variant === "onsite" ? "case-obs-onsite-block-title" : "case-obs-workflow-section-title"}>
        Competitive footprint
      </h3>
      {variant === "default" ? (
        <p className="case-obs-workflow-section-lead">
          Flag competitor presence on this case. Capture product names and details in live notes on Overview.
        </p>
      ) : null}
      <div className="case-obs-overview-finding-row">
        <p className="case-obs-overview-finding-label">Competitive product observed</p>
        <div className="case-obs-overview-finding-options">
          {COMPETITOR_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className="case-obs-overview-finding-option"
              data-selected={competitorSeen === option ? "true" : "false"}
              disabled={disabled || savingChip}
              onClick={() => void saveCompetitorChip(competitorSeen === option ? null : option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      {detailNotes ? (
        <p className="case-obs-overview-empty case-obs-overview-competitor-detail">{detailNotes}</p>
      ) : null}
    </section>
  );
}
