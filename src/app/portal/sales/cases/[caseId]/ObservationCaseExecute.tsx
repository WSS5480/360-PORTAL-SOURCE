"use client";



import React from "react";

import { OBSERVATION_BRIEFING_WORKFLOW_KICKER } from "@/lib/surgical-sales/observationCaseDetailVocabulary";

import { ObservationCaseCaptureNotes } from "./ObservationCaseCaptureNotes";

import { observationCaseExecuteCss } from "./observationCaseExecuteCss";

import { observationCaseBriefingCss } from "./observationCaseBriefingCss";



export function ObservationCaseExecute({

  disabled,

  onSaveNote,

}: {

  caseId?: string;

  caseRow?: Record<string, unknown>;

  identity?: unknown;

  engagement?: Record<string, unknown> | null;

  activities?: unknown[];

  providerContact?: Record<string, unknown> | null;

  providerIntelligence?: unknown;

  planning?: unknown;

  disabled?: boolean;

  onSaveNote: (body: string) => Promise<void>;

  onCaseSaved?: (savedCase: Record<string, unknown>) => void;

  onCompleteObservation?: () => void;

  onPlanProviderDebriefError?: (message: string) => void;

}) {

  return (

    <div className="case-obs-execute case-obs-execute--capture-only">

      <style

        dangerouslySetInnerHTML={{ __html: `${observationCaseExecuteCss}\n${observationCaseBriefingCss}` }}

      />



      <section

        className="case-obs-briefing-section case-obs-briefing-section--capture"

        aria-label="Capture notes"

      >

        <p className="case-obs-briefing-workflow-kicker">{OBSERVATION_BRIEFING_WORKFLOW_KICKER}</p>

        <ObservationCaseCaptureNotes

          disabled={disabled}

          onSaveNote={onSaveNote}

          layout="briefing"

          showSectionHeader={false}

        />

      </section>

    </div>

  );

}



/** @deprecated Use ObservationCaseExecute */

export const CaseObservationExecute = ObservationCaseExecute;
