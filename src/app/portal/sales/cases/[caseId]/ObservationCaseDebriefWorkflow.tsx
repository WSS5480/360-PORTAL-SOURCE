"use client";

import React from "react";
import type { CaseIdentity } from "@/lib/surgical-sales/buildCaseIdentity";
import { buildObservationMissionBriefLayout } from "@/lib/surgical-sales/buildObservationMissionBriefLayout";
import type { ObservationMissionBriefingPillarId } from "@/lib/surgical-sales/buildObservationMissionBriefing";
import { OBSERVATION_MISSION_BRIEFING_SECTION_LABELS } from "@/lib/surgical-sales/observationCaseDetailVocabulary";
import type { ProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { ObservationCaseOpportunityRadar } from "./ObservationCaseOpportunityRadar";
import { ObservationCaseDebriefReadiness } from "./ObservationCaseDebriefReadiness";
import { ObservationBriefingSectionEditor } from "./ObservationBriefingSectionEditor";

export function ObservationCaseDebriefWorkflow({
  caseId,
  caseRow,
  identity,
  engagement,
  activities,
  providerContact,
  providerIntelligence,
  planning,
  disabled,
  onCaseSaved,
  onPlanDebrief,
}: {
  caseId?: string;
  caseRow: Record<string, unknown>;
  identity: CaseIdentity;
  engagement?: Record<string, unknown> | null;
  activities?: Array<{ activity_type?: string }>;
  providerContact?: Record<string, unknown> | null;
  providerIntelligence?: ProviderIntelligenceSnapshot | null;
  planning?: ProviderPlanningCompletion | null;
  disabled?: boolean;
  onCaseSaved?: (savedCase: Record<string, unknown>) => void;
  onPlanDebrief?: () => void;
}) {
  const [editorOpen, setEditorOpen] = React.useState(false);

  const layout = React.useMemo(
    () =>
      buildObservationMissionBriefLayout({
        caseRow,
        identity,
        engagement,
        activities,
        providerContact,
        providerIntelligence,
        planning,
        procedureLabel: identity.procedureType,
      }),
    [activities, caseRow, engagement, identity, planning, providerContact, providerIntelligence],
  );

  const hypotheses = layout.opportunityHypotheses;
  const canEdit = Boolean(caseId && !disabled);

  return (
    <div className="case-obs-debrief-workflow">
      <section className="case-obs-detail-card" aria-labelledby="case-obs-debrief-hypotheses-title">
        <div className="case-obs-debrief-hypotheses-head">
          <h2 id="case-obs-debrief-hypotheses-title" className="case-obs-detail-card-title">
            Product Fit Hypotheses
          </h2>
          {canEdit ? (
            <button
              type="button"
              className="case-obs-mission-edit-btn"
              onClick={() => setEditorOpen(true)}
            >
              Edit hypotheses
            </button>
          ) : null}
        </div>
        <p className="case-obs-debrief-hypotheses-lead">
          Validate these during debrief — capture product fit evidence before advancing the provider.
        </p>
        {hypotheses.length > 0 ? (
          <ul className="case-obs-detail-list case-obs-detail-list--briefing">
            {hypotheses.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="case-obs-overview-empty">
            {OBSERVATION_MISSION_BRIEFING_SECTION_LABELS.opportunities} will build from discovery
            intelligence and field notes.
          </p>
        )}
      </section>

      <ObservationCaseOpportunityRadar
        caseRow={caseRow}
        identity={identity}
        engagement={engagement}
        providerContact={providerContact}
        providerIntelligence={providerIntelligence}
        planning={planning}
        activities={activities}
        canEdit={canEdit}
        onEdit={() => setEditorOpen(true)}
      />

      <ObservationCaseDebriefReadiness
        caseRow={caseRow}
        disabled={disabled}
        debriefUnlocked={identity.readyForDebrief}
        onPlanDebrief={onPlanDebrief}
      />

      {editorOpen && caseId ? (
        <ObservationBriefingSectionEditor
          caseId={caseId}
          pillarId={"opportunities" satisfies ObservationMissionBriefingPillarId}
          caseRow={caseRow}
          engagement={engagement}
          providerContact={providerContact}
          providerIntelligence={providerIntelligence}
          planning={planning}
          procedureLabel={identity.procedureType}
          disabled={disabled}
          onClose={() => setEditorOpen(false)}
          onSaved={(savedCase) => {
            onCaseSaved?.(savedCase);
            setEditorOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
