"use client";

import React from "react";
import { buildObservationFocusGuidance } from "@/lib/surgical-sales/buildObservationFocusGuidance";
import { OBSERVATION_DETAIL_SECTION_LABELS } from "@/lib/surgical-sales/observationCaseDetailVocabulary";
import { observationCaseBriefingCss } from "./observationCaseBriefingCss";

type PriorCaseRow = Record<string, unknown>;

export function ObservationCaseLookingFor({
  caseRow,
  providerContact,
  priorCases,
  activities,
}: {
  caseRow: Record<string, unknown>;
  providerContact?: Record<string, unknown> | null;
  priorCases?: PriorCaseRow[];
  activities?: Array<{ activity_type?: string; body?: string }>;
}) {
  const guidance = React.useMemo(
    () => buildObservationFocusGuidance({ caseRow, providerContact, priorCases, activities }),
    [activities, caseRow, priorCases, providerContact],
  );

  return (
    <section className="case-obs-briefing-section" aria-labelledby="case-obs-looking-for-title">
      <style dangerouslySetInnerHTML={{ __html: observationCaseBriefingCss }} />
      <header className="case-obs-briefing-head">
        <h2 id="case-obs-looking-for-title" className="case-obs-briefing-title">
          {OBSERVATION_DETAIL_SECTION_LABELS.observationFocus}
        </h2>
        <p className="case-obs-briefing-lead">{OBSERVATION_DETAIL_SECTION_LABELS.observationFocusLead}</p>
      </header>

      <ul className="case-obs-looking-for-chips" aria-label="Suggested observation focus">
        {guidance.map((item) => (
          <li key={item.label}>
            <span className="case-obs-looking-for-badge">{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
