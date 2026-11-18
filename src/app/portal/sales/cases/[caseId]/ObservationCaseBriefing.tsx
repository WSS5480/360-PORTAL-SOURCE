"use client";

import React from "react";

import type { CaseIdentity } from "@/lib/surgical-sales/buildCaseIdentity";

import { buildObservationCaseBriefingRepView } from "@/lib/surgical-sales/observationCaseBriefingPresentation";

import {
  canViewObservationFindings,
  resolveObservationLifecycleStatus,
} from "@/lib/surgical-sales/observationCaseLifecycle";

import { OBSERVATION_DETAIL_SECTION_LABELS } from "@/lib/surgical-sales/observationCaseDetailVocabulary";
import type { UniversalFactsReadModelPayload } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";

import { observationFieldExecutionCss } from "./observationFieldExecutionCss";

import { ObservationCaseNoteCapture } from "./ObservationCaseNoteCapture";
import { ObservationFormPanel } from "./ObservationFormPanel";

function BriefList({
  items,
  variant,
  ariaLabel,
}: {
  items: string[];
  variant: "focus" | "known" | "missing";
  ariaLabel: string;
}) {
  return (
    <ul className={`case-obs-case-brief-list case-obs-case-brief-list--${variant}`} aria-label={ariaLabel}>
      {items.map((item) => (
        <li key={item} className="case-obs-case-brief-list-item">
          <span className="case-obs-case-brief-icon" aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function ObservationCaseBriefing({
  caseRow,
  providerContact,
  priorCases,
  activities,
  disabled,
  onSaveNote,
  onBeginCapture,
  onViewFindings,
  dictationRequest,
  universalFactsReadModel,
  onMarkComplete,
  showMarkCompleteNudge = false,
  observationForms = [],
  onUploadObservationForm,
  onDownloadObservationForm,
}: {
  identity?: CaseIdentity;
  caseRow: Record<string, unknown>;
  providerContact?: Record<string, unknown> | null;
  priorCases?: Array<Record<string, unknown>>;
  activities?: Array<{ activity_type?: string; body?: string }>;
  disabled?: boolean;
  onSaveNote: (
    body: string,
    meta?: { captureMode?: "voice" | "quick" },
  ) => Promise<void | import("@/lib/surgical-sales/observationCaptureFeedback").ObservationCaptureFeedbackResult>;
  onBeginCapture?: () => void | Promise<void>;
  onViewFindings?: () => void;
  dictationRequest?: number;
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
  onMarkComplete?: () => void | Promise<void>;
  showMarkCompleteNudge?: boolean;
  observationForms?: Array<{ id: string; file_name: string; created_at: string }>;
  onUploadObservationForm?: () => void;
  onDownloadObservationForm?: (docId: string) => void;
}) {
  const briefing = React.useMemo(
    () =>
      buildObservationCaseBriefingRepView({
        caseRow,
        providerContact,
        priorCases,
        activities,
        universalFactsReadModel,
      }),
    [activities, caseRow, priorCases, providerContact, universalFactsReadModel],
  );

  const executionStatus = React.useMemo(
    () => resolveObservationLifecycleStatus({ caseRow, activities }),
    [activities, caseRow],
  );

  const showCapture =
    executionStatus === "in_progress" || executionStatus === "rescheduled";

  const showViewFindings = canViewObservationFindings(executionStatus);

  const { sectionTitles } = briefing;

  return (
    <div className="case-obs-execution case-obs-briefing-tab">
      <style dangerouslySetInnerHTML={{ __html: observationFieldExecutionCss }} />

      <section className="case-obs-case-brief" aria-labelledby="case-obs-case-brief-title">
        <h2 id="case-obs-case-brief-title" className="case-obs-case-brief-title">
          Case Brief
        </h2>

        <div className="case-obs-case-brief-body">
          <section
            className="case-obs-case-brief-primary"
            aria-labelledby="case-obs-brief-focus-title"
            data-testid="case-brief-focus-today"
          >
            <h3 id="case-obs-brief-focus-title" className="case-obs-case-brief-primary-label">
              {sectionTitles.focus}
            </h3>
            <BriefList
              items={briefing.focusToday}
              variant="focus"
              ariaLabel={sectionTitles.focus}
            />
          </section>

          <section
            className="case-obs-case-brief-why"
            aria-labelledby="case-obs-brief-why-title"
            data-testid="case-brief-why-this-matters"
          >
            <h3 id="case-obs-brief-why-title" className="case-obs-case-brief-label">
              {sectionTitles.why}
            </h3>
            <p className="case-obs-case-brief-why-text">{briefing.whyThisMatters}</p>
          </section>

          <div className="case-obs-case-brief-supporting">
            <div className="case-obs-case-brief-panel" data-testid="case-brief-known-so-far">
              <h3 className="case-obs-case-brief-label">{sectionTitles.known}</h3>
              <BriefList
                items={briefing.knownSoFar}
                variant="known"
                ariaLabel={sectionTitles.known}
              />
            </div>

            <div className="case-obs-case-brief-panel" data-testid="case-brief-still-need">
              <h3 className="case-obs-case-brief-label">{sectionTitles.stillNeed}</h3>
              <BriefList
                items={briefing.stillNeedToLearn}
                variant="missing"
                ariaLabel={sectionTitles.stillNeed}
              />
            </div>
          </div>
        </div>
      </section>

      {showCapture ? (
        <section className="case-obs-briefing-capture" aria-labelledby="case-obs-capture-title">
          <h2 id="case-obs-capture-title" className="case-obs-briefing-capture-title">
            Capture what happened
          </h2>
          <ObservationCaseNoteCapture
            disabled={disabled}
            onSaveNote={onSaveNote}
            onBeginCapture={onBeginCapture}
            dictationRequest={dictationRequest}
            quickNoteId="case-obs-briefing-quick"
            layout="briefing"
            includeStyles={false}
            onMarkComplete={onMarkComplete}
            showMarkCompleteNudge={showMarkCompleteNudge}
          />
        </section>
      ) : null}

      {showViewFindings ? (
        <button
          type="button"
          className="case-obs-execution-primary case-obs-execution-primary--briefing"
          disabled={disabled}
          onClick={onViewFindings}
        >
          {OBSERVATION_DETAIL_SECTION_LABELS.viewFindings}
        </button>
      ) : null}

      {onUploadObservationForm && onDownloadObservationForm ? (
        <ObservationFormPanel
          forms={observationForms}
          disabled={disabled}
          onUpload={onUploadObservationForm}
          onDownload={onDownloadObservationForm}
        />
      ) : null}
    </div>
  );
}
