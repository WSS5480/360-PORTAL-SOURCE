"use client";

import React from "react";
import { buildProviderObservationIntelligenceSnapshot } from "@/lib/surgical-sales/buildProviderObservationIntelligenceSnapshot";
import { OBSERVATION_DETAIL_SECTION_LABELS } from "@/lib/surgical-sales/observationCaseDetailVocabulary";
import { observationCaseBriefingCss } from "./observationCaseBriefingCss";

type PriorCaseRow = {
  id: string;
  procedure_type?: string | null;
  live_observation_competitors?: unknown;
  live_observation_product_fit?: unknown;
  live_observation_workflow?: unknown;
  live_observation_clinical_pain_points?: unknown;
  live_observation_staff_process?: unknown;
  live_observation_surgeon_reactions?: unknown;
};

export function ObservationCaseProviderIntelligenceSnapshot({
  providerContact,
  priorCases,
  onViewSourceCases,
}: {
  providerContact?: Record<string, unknown> | null;
  priorCases?: PriorCaseRow[];
  onViewSourceCases?: () => void;
}) {
  const snapshot = React.useMemo(
    () => buildProviderObservationIntelligenceSnapshot({ providerContact, priorCases }),
    [priorCases, providerContact],
  );

  if (!snapshot) return null;

  return (
    <section className="case-obs-provider-snapshot" aria-labelledby="case-obs-provider-snapshot-title">
      <style dangerouslySetInnerHTML={{ __html: observationCaseBriefingCss }} />
      <header className="case-obs-briefing-head">
        <h2 id="case-obs-provider-snapshot-title" className="case-obs-briefing-title">
          {OBSERVATION_DETAIL_SECTION_LABELS.providerIntelligenceSnapshot}
        </h2>
        <p className="case-obs-briefing-lead">
          Patterns across {snapshot.observationCount} observations with this provider.
        </p>
      </header>

      <ul className="case-obs-provider-snapshot-list">
        {snapshot.themes.map((theme) => (
          <li key={theme.id} className="case-obs-provider-snapshot-item">
            <p className="case-obs-provider-snapshot-item-title">{theme.title}</p>
            <p className="case-obs-provider-snapshot-item-summary">{theme.summary}</p>
          </li>
        ))}
      </ul>

      {onViewSourceCases ? (
        <button type="button" className="case-obs-provider-snapshot-link" onClick={onViewSourceCases}>
          View source cases
        </button>
      ) : null}
    </section>
  );
}
