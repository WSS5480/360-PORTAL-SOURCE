"use client";



import Link from "next/link";

import type React from "react";

import { LOG_UPDATE_BUTTON_LABEL, LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";

import {

  activeCaseIdentitySignals,

  buildCaseDetailHeaderPresentation,

  type CaseIdentity,

} from "@/lib/surgical-sales/buildCaseIdentity";

import { surgicalCaseDetailShellCss } from "./surgicalCaseDetailShellCss";



export type SurgicalCaseWorkspaceTab = "overview" | "workflow" | "activity" | "resources";



const TABS: Array<{ id: SurgicalCaseWorkspaceTab; label: string }> = [

  { id: "overview", label: "Overview" },

  { id: "workflow", label: "Execute" },

  { id: "activity", label: "Activity" },

  { id: "resources", label: "Resources" },

];

const OBSERVATION_TABS: Array<{ id: SurgicalCaseWorkspaceTab; label: string }> = [
  { id: "overview", label: "Briefing" },
  { id: "workflow", label: "Field Notes" },
  { id: "activity", label: "Intelligence" },
  { id: "resources", label: "Resources" },
];



export type SurgicalCaseHeaderChip = {

  id: string;

  label: string;

  href?: string;

  brand?: boolean;

};



function formatSignalLabel(label: string): string {

  if (!label) return label;

  return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();

}



function renderCaseDetailHeaderTitle(
  title: string,
  providerHref?: string,
): React.ReactNode {
  if (providerHref) {
    return (
      <Link href={providerHref} className="case-obs-detail-provider-link case-obs-detail-title-link" data-surgical-press>
        {title}
      </Link>
    );
  }

  return title;
}



export function SurgicalCaseDetailShell({

  identity,

  workspaceTab,

  onTabChange,

  busy,

  onEditCase,

  onLogUpdate,

  onMore,

  observationLayout,

  planDebriefAction,

  observationExecutionStatus,

  observationLifecycleAction,

  headerAccentColor,

  headerChips,

  providerHref,

  banners,

  observationCaseSummary,

  observationMetadata,

  overview,

  overviewSnapshot,

  execute,

  activity,

  resources,

  bottomBar,

  overviewCompleteFlash,

}: {

  identity: CaseIdentity;

  workspaceTab: SurgicalCaseWorkspaceTab;

  onTabChange: (tab: SurgicalCaseWorkspaceTab) => void;

  busy?: boolean;

  onEditCase: () => void;

  onLogUpdate: () => void;

  onMore?: () => void;

  observationLayout?: boolean;

  planDebriefAction?: React.ReactNode;

  observationExecutionStatus?: { id: string; label: string } | null;

  observationLifecycleAction?: React.ReactNode;

  headerAccentColor?: string;

  headerChips?: SurgicalCaseHeaderChip[];

  providerHref?: string;

  banners?: React.ReactNode;

  observationReadinessBanner?: React.ReactNode;

  observationCaseSummary?: React.ReactNode;

  observationMetadata?: React.ReactNode;

  overview: React.ReactNode;

  overviewSnapshot?: React.ReactNode;

  execute: React.ReactNode;

  activity: React.ReactNode;

  resources: React.ReactNode;

  bottomBar: React.ReactNode;

  overviewCompleteFlash?: boolean;

}) {

  const activeSignals = activeCaseIdentitySignals(identity);

  const openQuestions = identity.openQuestionsCount ?? 0;

  const chips = headerChips ?? [];

  const headerPresentation = buildCaseDetailHeaderPresentation(identity);



  return (

    <div

      className={`surgical-case-detail-shell mc-workspace mc-workspace--observation-case${overviewCompleteFlash ? " surgical-case-complete-flash" : ""}${

        observationLayout ? " surgical-case-detail-shell--observation" : ""

      }`}
      data-mc-stage="observation"

    >

      <style dangerouslySetInnerHTML={{ __html: surgicalCaseDetailShellCss }} />



      <header
        className="case-obs-detail-header mc-deck"
        style={
          headerAccentColor
            ? ({ "--mc-accent": headerAccentColor } as React.CSSProperties)
            : undefined
        }
      >

        <div className="case-obs-detail-header-main">

          <Link href="/portal/sales/cases" className="case-obs-detail-back">
            {observationLayout ? "← Back to cases" : "← Surgical Cases"}
          </Link>

          <p className="case-obs-detail-kicker">{headerPresentation.kicker}</p>

          <div className="case-obs-detail-title-row">
            <h1 className="case-obs-detail-title">
              {renderCaseDetailHeaderTitle(headerPresentation.title, providerHref)}
            </h1>
            {observationLayout && observationExecutionStatus ? (
              <span
                className={`case-obs-detail-status-badge case-obs-detail-status-badge--${observationExecutionStatus.id}`}
              >
                {observationExecutionStatus.label}
              </span>
            ) : null}
          </div>

          {headerPresentation.subtitle ? (
            <p className="case-obs-detail-subtitle">{headerPresentation.subtitle}</p>
          ) : null}

          <p className="case-obs-detail-meta">{headerPresentation.metaLine}</p>

          {observationLayout ? null : (

            <>

              {activeSignals.length > 0 || openQuestions > 0 || chips.length > 0 ? (

                <div className="case-obs-detail-chips" aria-label="Case status">

                  {activeSignals.map((signal) => (

                    <span key={signal.id} className="case-obs-detail-chip case-obs-detail-chip--signal">

                      {formatSignalLabel(signal.label)}

                    </span>

                  ))}

                  {openQuestions > 0 ? (

                    <span className="case-obs-detail-chip case-obs-detail-chip--questions">

                      {openQuestions} to learn

                    </span>

                  ) : null}

                  {chips.map((chip) =>

                    chip.href ? (

                      <Link

                        key={chip.id}

                        href={chip.href}

                        className={`case-obs-detail-chip${chip.brand ? " case-obs-detail-chip--brand" : ""}`}

                      >

                        {chip.label}

                      </Link>

                    ) : (

                      <span

                        key={chip.id}

                        className={`case-obs-detail-chip${chip.brand ? " case-obs-detail-chip--brand" : ""}`}

                      >

                        {chip.label}

                      </span>

                    ),

                  )}

                </div>

              ) : null}

            </>

          )}

        </div>



        <div className="case-obs-detail-header-actions">
          {providerHref ? (
            <Link href={providerHref} className="case-obs-detail-btn" data-surgical-press>
              Open profile
            </Link>
          ) : null}
          {observationLayout ? observationLifecycleAction : planDebriefAction}
          <button type="button" className="case-obs-detail-btn" disabled={busy} onClick={onEditCase}>
            Edit Case
          </button>
          {!observationLayout && LOG_UPDATE_UI_ENABLED ? (
            <button
              type="button"
              className="case-obs-detail-btn case-obs-detail-btn--primary"
              disabled={busy}
              onClick={onLogUpdate}
            >
              {LOG_UPDATE_BUTTON_LABEL}
            </button>
          ) : null}
          {observationLayout && onMore ? (
            <button
              type="button"
              className="case-obs-detail-btn case-obs-detail-btn--more"
              disabled={busy}
              onClick={onMore}
              aria-label="More actions"
              title="More actions"
            >
              ⋯
            </button>
          ) : null}
        </div>

      </header>



      {observationLayout && observationMetadata ? observationMetadata : null}

      {observationLayout && observationCaseSummary ? observationCaseSummary : null}

      <div
        className="case-obs-detail-tabs"
        role="tablist"
        aria-label={`Case sections for ${headerPresentation.title}`}
      >
        {(observationLayout ? OBSERVATION_TABS : TABS).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={workspaceTab === tab.id}
            className="case-obs-detail-tab"
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>



      {banners ? <div className="case-obs-detail-banners">{banners}</div> : null}



      <div className="case-obs-detail-panel" role="tabpanel">

        {observationLayout && workspaceTab === "overview" ? overview : null}

        {observationLayout && workspaceTab === "workflow" ? execute : null}

        {observationLayout && workspaceTab === "activity" ? activity : null}

        {observationLayout && workspaceTab === "resources" ? resources : null}

        {!observationLayout && workspaceTab === "overview" ? (
          overviewSnapshot ? (
            <div className="case-obs-detail-overview-grid">
              <div className="case-obs-detail-overview-main">{overview}</div>
              {overviewSnapshot}
            </div>
          ) : (
            overview
          )
        ) : null}

        {!observationLayout && workspaceTab === "workflow" ? execute : null}

        {!observationLayout && workspaceTab === "activity" ? activity : null}

        {!observationLayout && workspaceTab === "resources" ? resources : null}

      </div>



      <div className="case-obs-detail-bottom-wrap">{bottomBar}</div>

    </div>

  );

}



/** @deprecated Use SurgicalCaseDetailShell */

export const CaseObservationDetailShell = SurgicalCaseDetailShell;



/** @deprecated Use SurgicalCaseWorkspaceTab */

export type CaseObservationWorkspaceTab = SurgicalCaseWorkspaceTab;

