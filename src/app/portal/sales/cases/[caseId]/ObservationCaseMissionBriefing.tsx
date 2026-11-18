"use client";



import React from "react";

import type { CaseIdentity } from "@/lib/surgical-sales/buildCaseIdentity";

import {

  buildObservationMissionBriefLayout,

  type ObservationMissionBriefLayout,

} from "@/lib/surgical-sales/buildObservationMissionBriefLayout";

import type { ObservationMissionBriefingPillarId } from "@/lib/surgical-sales/buildObservationMissionBriefing";

import { buildObservationPotentialOpportunitySummary } from "@/lib/surgical-sales/buildObservationPotentialOpportunitySummary";

import {
  OBSERVATION_DETAIL_SECTION_LABELS,
  OBSERVATION_MISSION_BRIEFING_SECTION_LABELS,
  OBSERVATION_MISSION_BRIEFING_TITLE,
} from "@/lib/surgical-sales/observationCaseDetailVocabulary";

import type { ProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";

import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

import { ObservationBriefingSectionEditor } from "./ObservationBriefingSectionEditor";

import { observationCaseMissionBriefingCss } from "./observationCaseMissionBriefingCss";



function MissionEditButton({

  label,

  disabled,

  onClick,

}: {

  label: string;

  disabled?: boolean;

  onClick: () => void;

}) {

  return (

    <button type="button" className="case-obs-mission-edit-btn" disabled={disabled} onClick={onClick}>

      {label}

    </button>

  );

}



function BriefBlock({

  title,

  canEdit,

  editLabel,

  onEdit,

  variant = "default",

  children,

}: {

  title: string;

  canEdit?: boolean;

  editLabel?: string;

  onEdit?: () => void;

  variant?: "default" | "mission" | "opportunity";

  children: React.ReactNode;

}) {

  const blockClass =

    variant === "mission"

      ? "case-obs-mission-block case-obs-mission-block--hero"

      : variant === "opportunity"

        ? "case-obs-mission-block case-obs-mission-block--opportunity"

        : "case-obs-mission-block";



  return (

    <section className={blockClass} aria-label={title}>

      <div className="case-obs-mission-block-head">

        <h2 className="case-obs-mission-block-title">{title}</h2>

        {canEdit && editLabel && onEdit ? (

          <div className="case-obs-mission-block-actions">

            <MissionEditButton label={editLabel} onClick={onEdit} />

          </div>

        ) : null}

      </div>

      {children}

    </section>

  );

}



export function ObservationCaseMissionBriefing({

  caseId,

  caseRow,

  identity,

  engagement,

  activities,

  providerContact,

  providerIntelligence,

  planning,

  compact = false,

  mode = "full",

  disabled,

  editorPillar,

  onEditorPillarChange,

  onCaseSaved,

}: {

  caseId?: string;

  caseRow: Record<string, unknown>;

  identity: CaseIdentity;

  engagement?: Record<string, unknown> | null;

  activities?: Array<{ activity_type?: string }>;

  providerContact?: Record<string, unknown> | null;

  providerIntelligence?: ProviderIntelligenceSnapshot | null;

  planning?: ProviderPlanningCompletion | null;

  compact?: boolean;

  /** Prepare-phase mission card — provider context and mission statement only. */
  mode?: "full" | "prepare";

  disabled?: boolean;

  editorPillar?: ObservationMissionBriefingPillarId | null;

  onEditorPillarChange?: (pillarId: ObservationMissionBriefingPillarId | null) => void;

  onCaseSaved?: (savedCase: Record<string, unknown>) => void;

}) {

  const [localEditorPillar, setLocalEditorPillar] = React.useState<ObservationMissionBriefingPillarId | null>(null);

  const activeEditorPillar = editorPillar !== undefined ? editorPillar : localEditorPillar;

  const setEditorPillar = onEditorPillarChange ?? setLocalEditorPillar;



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



  const potentialOpportunity = React.useMemo(

    () =>

      buildObservationPotentialOpportunitySummary({

        caseRow,

        engagement,

        providerContact,

        providerIntelligence,

        planning,

        procedureLabel: identity.procedureType,

      }),

    [caseRow, engagement, identity.procedureType, planning, providerContact, providerIntelligence],

  );



  const canEdit = Boolean(caseId && !disabled);

  const openEditor = (pillarId: ObservationMissionBriefingPillarId) => {

    if (!canEdit) return;

    setEditorPillar(pillarId);

  };



  const missionPillar = layout.pillarsById.why_here;

  const targetsPillar = layout.pillarsById.watch_signals;

  const missionText =

    layout.missionObjective ||

    missionPillar?.items[0] ||

    missionPillar?.emptyHint ||

    "Assess product fit during this procedure.";

  const watchItems = targetsPillar?.items ?? layout.focusAreas;
  const isPrepareMode = mode === "prepare";
  const sectionTitle = isPrepareMode
    ? OBSERVATION_DETAIL_SECTION_LABELS.observationMission
    : OBSERVATION_MISSION_BRIEFING_TITLE;

  return (

    <>

      <section

        className={`case-obs-mission-brief mc-surface mc-surface--raised${compact ? " case-obs-mission-brief--compact" : ""}`}

        aria-labelledby="case-obs-mission-brief-title"

      >

        <style dangerouslySetInnerHTML={{ __html: observationCaseMissionBriefingCss }} />



        <header className="case-obs-mission-brief-banner mc-deck">

          <div className="case-obs-mission-brief-banner-top">

            <div>

              <p id="case-obs-mission-brief-title" className="case-obs-mission-brief-kicker mc-deck__kicker">
                {sectionTitle}
              </p>

              {!isPrepareMode ? (
                <p className="case-obs-mission-brief-context">
                  {layout.providerName ? `${layout.providerName}` : "Provider observation"}
                  {layout.procedureLabel ? ` · ${layout.procedureLabel}` : ""}
                </p>
              ) : null}
            </div>

            {!isPrepareMode ? (
              <div className="case-obs-mission-brief-meta">
                {layout.productFocus ? (
                  <span className="case-obs-mission-brief-tag case-obs-mission-brief-tag--product">
                    {layout.productFocus}
                  </span>
                ) : null}
                {identity.dateLine ? (
                  <span className="case-obs-mission-brief-tag">{identity.dateLine}</span>
                ) : null}
              </div>
            ) : null}

          </div>

        </header>



        <div className="case-obs-mission-brief-body">
          {isPrepareMode ? (
            <dl className="case-obs-mission-prepare-meta">
              <div className="case-obs-mission-prepare-meta-row">
                <dt>Provider</dt>
                <dd>{layout.providerName || "—"}</dd>
              </div>
              <div className="case-obs-mission-prepare-meta-row">
                <dt>Procedure</dt>
                <dd>{layout.procedureLabel || "—"}</dd>
              </div>
              <div className="case-obs-mission-prepare-meta-row">
                <dt>Date</dt>
                <dd>{identity.dateLine || "—"}</dd>
              </div>
            </dl>
          ) : null}

          <BriefBlock
            title={
              isPrepareMode
                ? "Mission statement"
                : OBSERVATION_MISSION_BRIEFING_SECTION_LABELS.whyHere
            }
            canEdit={canEdit}
            editLabel="Edit mission"
            onEdit={() => openEditor("why_here")}
            variant="mission"
          >
            <p className="case-obs-mission-objective">{missionText}</p>
          </BriefBlock>

          {!isPrepareMode ? (
            <>
              <BriefBlock
                title={OBSERVATION_MISSION_BRIEFING_SECTION_LABELS.watchSignals}
                canEdit={canEdit}
                editLabel="Edit watch list"
                onEdit={() => openEditor("watch_signals")}
              >
                {watchItems.length > 0 ? (
                  <ul className="case-obs-mission-plan-list">
                    {watchItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="case-obs-mission-plan-empty">
                    {targetsPillar?.emptyHint ??
                      "Watch for products, competitors, workflow issues, and frustrations."}
                  </p>
                )}
              </BriefBlock>

              <BriefBlock
                title={OBSERVATION_MISSION_BRIEFING_SECTION_LABELS.opportunities}
                variant="opportunity"
              >
                <p className="case-obs-mission-opportunity-summary">{potentialOpportunity}</p>
              </BriefBlock>
            </>
          ) : null}
        </div>

      </section>



      {activeEditorPillar && caseId ? (

        <ObservationBriefingSectionEditor

          caseId={caseId}

          pillarId={activeEditorPillar}

          caseRow={caseRow}

          engagement={engagement}

          providerContact={providerContact}

          providerIntelligence={providerIntelligence}

          planning={planning}

          procedureLabel={identity.procedureType}

          disabled={disabled}

          onClose={() => setEditorPillar(null)}

          onSaved={(savedCase) => onCaseSaved?.(savedCase)}

        />

      ) : null}

    </>

  );

}



/** @deprecated Internal layout type export for tests */

export type { ObservationMissionBriefLayout };


