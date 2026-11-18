"use client";



import { useState } from "react";

import Link from "next/link";

import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";

import type { ProviderObservationCasePreview } from "@/lib/surgical-sales/providerObservationCaseCollection";

import { buildProviderMissionBoardCardModel } from "@/lib/surgical-sales/buildProviderMissionBoardCardModel";

import type { MissionBoardCardSecondaryAction } from "@/lib/surgical-sales/deriveMissionBoardCardActions";

import { MissionBoardObservationCaseActions } from "./MissionBoardObservationCaseActions";



export function ProvidersMissionBoardCard({

  provider,

  dragging,

  onDragStart,

  onDragEnd,

  onOpenObservationStatus,

  onFastIntroCall,

  onFastDebrief,

  onStartDebrief,

  onStartIntroCall,

  onIntroDictateComplete,

  onIntroJustComplete,

  onStartEvaluation,

  onAddCase,

  onDictateCapture,

  onMarkObservationComplete,

  onRescheduleObservation,

  onDictateCompleteObservation,

  onViewObservationQueue,

  onOpenDebriefLauncher,

  onOpenDebriefStatus,

  onDebriefQuickComplete,

  onOpenEvaluationPathModal,

  onOpenCommitmentModal,

  onMoveToOutcomes,

  onMarkEvaluationSuccessful,

  onOpenOutcomeUpdateModal,

  onOpenProductUseModal,

  observationActionBusy,

}: {

  provider: ProviderDirectoryRow;

  dragging?: boolean;

  onDragStart: (provider: ProviderDirectoryRow) => void;

  onDragEnd: () => void;

  onOpenObservationStatus: (provider: ProviderDirectoryRow) => void;

  onFastIntroCall: (provider: ProviderDirectoryRow) => void;

  onFastDebrief: (provider: ProviderDirectoryRow) => void;

  onStartDebrief: (provider: ProviderDirectoryRow) => void;

  onStartIntroCall: (provider: ProviderDirectoryRow) => void;

  onIntroDictateComplete: (
    provider: ProviderDirectoryRow,
    engagementId: string,
    engagementStatus?: string,
    engagementType?: string,
  ) => void;

  onIntroJustComplete: (
    provider: ProviderDirectoryRow,
    engagementId: string,
  ) => void;

  onStartEvaluation: (provider: ProviderDirectoryRow) => void;

  onAddCase: (provider: ProviderDirectoryRow, options?: { initialCaseType?: "observation" | "product_support" | null }) => void;

  onDictateCapture: (provider: ProviderDirectoryRow) => void;

  onMarkObservationComplete: (provider: ProviderDirectoryRow, caseId: string) => void;

  onRescheduleObservation: (

    provider: ProviderDirectoryRow,

    observationCase: ProviderObservationCasePreview,

  ) => void;

  onDictateCompleteObservation: (

    provider: ProviderDirectoryRow,

    observationCase: ProviderObservationCasePreview,

  ) => void;

  onViewObservationQueue: (provider: ProviderDirectoryRow) => void;

  onOpenDebriefLauncher: (
    provider: ProviderDirectoryRow,
    options?: { initialPanel?: "default" | "dictate" },
  ) => void;

  onOpenDebriefStatus: (provider: ProviderDirectoryRow) => void;

  onDebriefQuickComplete: (
    provider: ProviderDirectoryRow,
    engagementId: string,
    mode: "dictate_complete" | "just_complete",
  ) => void;

  onOpenEvaluationPathModal: (provider: ProviderDirectoryRow) => void;

  onOpenCommitmentModal: (provider: ProviderDirectoryRow) => void;

  onMoveToOutcomes: (provider: ProviderDirectoryRow) => void;

  onMarkEvaluationSuccessful: (provider: ProviderDirectoryRow) => void;

  onOpenOutcomeUpdateModal: (provider: ProviderDirectoryRow) => void;

  onOpenProductUseModal: (provider: ProviderDirectoryRow) => void;

  observationActionBusy?: boolean;

}) {

  const [expanded, setExpanded] = useState(false);

  const model = buildProviderMissionBoardCardModel(provider);

  const nextObservation = model.nextScheduledObservation;

  const isObserveStage = model.pathwayStageId === "observe";
  const isEvaluationStage = model.pathwayStageId === "evaluation";
  const isCommitmentStage = model.pathwayStageId === "commitment";
  const isOutcomesStage = model.pathwayStageId === "outcomes";

  const progressPct =

    model.progressCompleted != null &&

    model.progressTotal != null &&

    model.progressTotal > 0

      ? Math.min(100, Math.round((model.progressCompleted / model.progressTotal) * 100))

      : null;



  const openDictate = () => {

    onDictateCapture(provider);

  };



  function runSecondaryAction(action: MissionBoardCardSecondaryAction) {

    if (observationActionBusy) return;

    if (action.kind === "capture") {

      openDictate();

      return;

    }

    if (action.kind === "modal") {
      if (action.id === "observation_status") {
        onOpenObservationStatus(provider);
        return;
      }
      if (action.id === "debrief_status") {
        onOpenDebriefStatus(provider);
        return;
      }
      if (action.id === "choose_evaluation_path") {
        onOpenEvaluationPathModal(provider);
        return;
      }
      if (action.id === "mark_evaluation_successful") {
        onMarkEvaluationSuccessful(provider);
        return;
      }
      if (action.id === "confirm_product_commitment") {
        onOpenCommitmentModal(provider);
        return;
      }
      if (action.id === "log_product_use") {
        onOpenProductUseModal(provider);
        return;
      }
    }

    if (action.id === "intro_dictate_complete" && action.engagementId) {
      onIntroDictateComplete(
        provider,
        action.engagementId,
        action.engagementStatus,
        action.engagementType,
      );
      return;
    }

    if (action.id === "intro_just_complete" && action.engagementId) {
      onIntroJustComplete(provider, action.engagementId);
      return;
    }

    if (action.id === "debrief_dictate_complete" && action.engagementId) {
      onDebriefQuickComplete(provider, action.engagementId, "dictate_complete");
      return;
    }

    if (action.id === "debrief_just_complete" && action.engagementId) {
      onDebriefQuickComplete(provider, action.engagementId, "just_complete");
      return;
    }

  }



  const renderStandardPrimaryCta = () => {

    if (model.primaryCta.kind === "fast_intro_call") {

      return (

        <button

          type="button"

          className="provider-mission-board-card-primary-cta"

          data-surgical-press

          draggable={false}

          disabled={observationActionBusy}

          onClick={(e) => {

            e.stopPropagation();

            onFastIntroCall(provider);

          }}

        >

          {model.primaryCta.label}

        </button>

      );

    }



    if (model.primaryCta.kind === "fast_debrief") {

      return (

        <button

          type="button"

          className="provider-mission-board-card-primary-cta"

          data-surgical-press

          data-testid="mission-board-debrief-create"

          draggable={false}

          disabled={observationActionBusy}

          onClick={(e) => {

            e.stopPropagation();

            onFastDebrief(provider);

          }}

        >

          {model.primaryCta.label}

        </button>

      );

    }



    if (model.primaryCta.kind === "debrief_start") {

      return (

        <button

          type="button"

          className="provider-mission-board-card-primary-cta"

          data-surgical-press

          data-testid="mission-board-debrief-start"

          draggable={false}

          disabled={observationActionBusy}

          onClick={(e) => {

            e.stopPropagation();

            onStartDebrief(provider);

          }}

        >

          {model.primaryCta.label}

        </button>

      );

    }



    if (model.primaryCta.kind === "intro_start") {

      return (

        <button

          type="button"

          className="provider-mission-board-card-primary-cta"

          data-surgical-press

          data-testid="mission-board-intro-start"

          draggable={false}

          disabled={observationActionBusy}

          onClick={(e) => {

            e.stopPropagation();

            onStartIntroCall(provider);

          }}

        >

          {model.primaryCta.label}

        </button>

      );

    }



    if (model.primaryCta.kind === "evaluation_start") {
      return (
        <button
          type="button"
          className="provider-mission-board-card-primary-cta"
          data-surgical-press
          data-testid="mission-board-evaluation-start"
          draggable={false}
          disabled={observationActionBusy}
          onClick={(e) => {
            e.stopPropagation();
            onStartEvaluation(provider);
          }}
        >
          {model.primaryCta.label}
        </button>
      );
    }

    if (model.primaryCta.kind === "fast_observation") {

      return (

        <button

          type="button"

          className="provider-mission-board-card-primary-cta"

          data-surgical-press

          draggable={false}

          disabled={observationActionBusy}

          onClick={(e) => {

            e.stopPropagation();

            onAddCase(provider, { initialCaseType: "observation" });

          }}

        >

          {model.primaryCta.label}

        </button>

      );

    }



    if (model.primaryCta.kind === "debrief_launcher") {

      return (

        <button

          type="button"

          className="provider-mission-board-card-primary-cta"

          data-surgical-press

          data-testid="mission-board-debrief-launcher"

          draggable={false}

          disabled={observationActionBusy}

          onClick={(e) => {

            e.stopPropagation();

            onOpenDebriefLauncher(provider, {
              initialPanel: model.primaryCta.debriefLauncherPanel ?? "default",
            });

          }}

        >

          {model.primaryCta.label}

        </button>

      );

    }

    if (model.primaryCta.kind === "debrief_advance_pathway") {
      return (
        <button
          type="button"
          className="provider-mission-board-card-primary-cta"
          data-surgical-press
          data-testid="mission-board-debrief-advance-pathway-cta"
          draggable={false}
          disabled={observationActionBusy}
          onClick={(e) => {
            e.stopPropagation();
            onOpenDebriefStatus(provider);
          }}
        >
          {model.primaryCta.label}
        </button>
      );
    }

    if (model.primaryCta.kind === "evaluation_path_modal") {
      return (
        <button
          type="button"
          className="provider-mission-board-card-primary-cta"
          data-surgical-press
          data-testid="mission-board-evaluation-path-cta"
          draggable={false}
          disabled={observationActionBusy}
          onClick={(e) => {
            e.stopPropagation();
            onOpenEvaluationPathModal(provider);
          }}
        >
          {model.primaryCta.label}
        </button>
      );
    }

    if (model.primaryCta.kind === "commitment_modal") {
      return (
        <button
          type="button"
          className="provider-mission-board-card-primary-cta"
          data-surgical-press
          data-testid="mission-board-commitment-cta"
          draggable={false}
          disabled={observationActionBusy}
          onClick={(e) => {
            e.stopPropagation();
            onOpenCommitmentModal(provider);
          }}
        >
          {model.primaryCta.label}
        </button>
      );
    }

    if (model.primaryCta.kind === "move_to_outcomes") {
      return (
        <button
          type="button"
          className="provider-mission-board-card-primary-cta"
          data-surgical-press
          data-testid="mission-board-move-to-outcomes"
          draggable={false}
          disabled={observationActionBusy}
          onClick={(e) => {
            e.stopPropagation();
            onMoveToOutcomes(provider);
          }}
        >
          {model.primaryCta.label}
        </button>
      );
    }

    if (model.primaryCta.kind === "outcome_update_modal") {
      return (
        <button
          type="button"
          className="provider-mission-board-card-primary-cta"
          data-surgical-press
          data-testid="mission-board-outcome-update-cta"
          draggable={false}
          disabled={observationActionBusy}
          onClick={(e) => {
            e.stopPropagation();
            onOpenOutcomeUpdateModal(provider);
          }}
        >
          {model.primaryCta.label}
        </button>
      );
    }

    if (model.primaryCta.kind === "product_use_modal") {
      return (
        <button
          type="button"
          className="provider-mission-board-card-primary-cta"
          data-surgical-press
          draggable={false}
          disabled={observationActionBusy}
          onClick={(e) => {
            e.stopPropagation();
            onOpenProductUseModal(provider);
          }}
        >
          {model.primaryCta.label}
        </button>
      );
    }

    return (

      <Link

        href={model.primaryCta.href}

        className="provider-mission-board-card-primary-cta"

        data-surgical-press

        draggable={false}

        onClick={(e) => e.stopPropagation()}

      >

        {model.primaryCta.label}

      </Link>

    );

  };



  const renderSecondaryActions = () =>
    model.secondaryActions.length > 0 ? (
      <div className="provider-mission-board-card-quick-actions" role="group" aria-label="Quick actions">
        {model.secondaryActions.map((action) => {
          if (action.kind === "link" && action.href) {
            return (
              <Link
                key={action.id}
                href={action.href}
                className={`provider-mission-board-card-quick-action provider-mission-board-card-quick-action--${action.id}`}
                title={action.title}
                draggable={false}
                onClick={(e) => e.stopPropagation()}
              >
                {action.label}
              </Link>
            );
          }

          return (
            <button
              key={action.id}
              type="button"
              className={`provider-mission-board-card-quick-action provider-mission-board-card-quick-action--${action.id}`}
              title={action.title}
              aria-label={action.title}
              data-testid={action.id === "dictate" ? "mission-board-dictate" : undefined}
              draggable={false}
              disabled={observationActionBusy}
              onClick={(e) => {
                e.stopPropagation();
                runSecondaryAction(action);
              }}
            >
              {action.label}
            </button>
          );
        })}
      </div>
    ) : null;

  const renderObserveFooter = () => (

    <div className="provider-mission-board-card-observe-footer" data-testid="mission-board-observe-footer">

      {model.observationViewAllLabel ? (

        <button

          type="button"

          className="provider-mission-board-card-observe-link"

          data-testid="mission-board-view-observation-queue"

          disabled={observationActionBusy}

          onClick={(e) => {

            e.stopPropagation();

            onViewObservationQueue(provider);

          }}

        >

          {model.observationViewAllLabel}

        </button>

      ) : null}

      <button

        type="button"

        className="provider-mission-board-card-primary-cta provider-mission-board-card-primary-cta--add"

        data-surgical-press

        data-testid="mission-board-add-observation"

        draggable={false}

        disabled={observationActionBusy}

        onClick={(e) => {

          e.stopPropagation();

          onAddCase(provider, { initialCaseType: "observation" });

        }}

      >

        Add Observation

      </button>

      {renderSecondaryActions()}

    </div>

  );



  return (

    <li

      className={`provider-mission-board-card provider-mission-board-card--${expanded ? "expanded" : "collapsed"}${dragging ? " provider-mission-board-card--dragging" : ""}`}

      data-pathway-stage={model.pathwayStageId}

      data-provider-id={model.providerId}

      data-expanded={expanded ? "true" : "false"}

    >

      <article

        className="provider-mission-board-card-shell"

        draggable

        onDragStart={(e) => {

          e.dataTransfer.setData("text/provider-id", model.providerId);

          e.dataTransfer.effectAllowed = "move";

          onDragStart(provider);

        }}

        onDragEnd={onDragEnd}

      >

        <header className="provider-mission-board-card-head">

          <span className="provider-mission-board-card-drag-handle" aria-hidden title="Drag to advance stage">

            ⠿

          </span>

          <button

            type="button"

            className="provider-mission-board-card-head-link"

            data-surgical-press

            draggable={false}

            aria-expanded={expanded}

            aria-label={`${expanded ? "Collapse" : "Expand"} ${model.providerName} mission card`}

            onClick={(e) => {

              e.stopPropagation();

              setExpanded((current) => !current);

            }}

          >

            <span className="provider-mission-board-card-name">{model.providerName}</span>

            <span className="provider-mission-board-card-org">{model.organization}</span>

          </button>

          <div className="provider-mission-board-card-head-actions">
            <Link
              href={`/portal/sales/providers/${encodeURIComponent(provider.id)}`}
              className="provider-mission-board-card-open-profile"
              data-surgical-press
              draggable={false}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              Open
            </Link>
            <button

              type="button"

              className="provider-mission-board-card-add-case"

              data-surgical-press

              data-testid="mission-board-add-case"

              draggable={false}

              disabled={observationActionBusy}

              onClick={(e) => {

                e.stopPropagation();

                onAddCase(provider);

              }}

            >

              Add Case

            </button>
          </div>

        </header>



        {expanded ? (
          <>
        {progressPct != null ? (

          <div className="provider-mission-board-card-progress-block">

            <p className="provider-mission-board-card-progress-label">{model.progressLabel}</p>

            <div

              className="provider-mission-board-card-progress-bar"

              role="progressbar"

              aria-valuemin={0}

              aria-valuemax={model.progressTotal ?? 0}

              aria-valuenow={model.progressCompleted ?? 0}

              aria-label={model.progressLabel}

            >

              <span

                className="provider-mission-board-card-progress-fill"

                style={{ width: `${progressPct}%` }}

              />

            </div>

          </div>

        ) : (

          <p className="provider-mission-board-card-status-line">{model.progressLabel}</p>

        )}

        {isEvaluationStage ? (
          <div
            className="provider-mission-board-card-evaluation-block"
            data-testid="mission-board-evaluation-context"
          >
            {model.evaluationDebriefOutcomeSummary ? (
              <div className="provider-mission-board-card-evaluation-row">
                <span className="provider-mission-board-card-evaluation-k">Debrief outcome</span>
                <span className="provider-mission-board-card-evaluation-v">
                  {model.evaluationDebriefOutcomeSummary}
                </span>
              </div>
            ) : null}
            {model.evaluationPrimaryOpportunity ? (
              <div className="provider-mission-board-card-evaluation-row">
                <span className="provider-mission-board-card-evaluation-k">Opportunity</span>
                <span className="provider-mission-board-card-evaluation-v">
                  {model.evaluationPrimaryOpportunity}
                </span>
              </div>
            ) : null}
            {model.evaluationSelectedPath ? (
              <div className="provider-mission-board-card-evaluation-row">
                <span className="provider-mission-board-card-evaluation-k">Evaluation path</span>
                <span className="provider-mission-board-card-evaluation-v">{model.evaluationSelectedPath}</span>
              </div>
            ) : model.evaluationRecommendedPath ? (
              <div className="provider-mission-board-card-evaluation-row">
                <span className="provider-mission-board-card-evaluation-k">Recommended path</span>
                <span className="provider-mission-board-card-evaluation-v">
                  {model.evaluationRecommendedPath}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        {isCommitmentStage ? (
          <div
            className="provider-mission-board-card-evaluation-block"
            data-testid="mission-board-commitment-context"
          >
            {model.commitmentEvaluationPath ? (
              <div className="provider-mission-board-card-evaluation-row">
                <span className="provider-mission-board-card-evaluation-k">Evaluation path</span>
                <span className="provider-mission-board-card-evaluation-v">
                  {model.commitmentEvaluationPath}
                </span>
              </div>
            ) : null}
            {model.commitmentProductPath ? (
              <div className="provider-mission-board-card-evaluation-row">
                <span className="provider-mission-board-card-evaluation-k">Product / path</span>
                <span className="provider-mission-board-card-evaluation-v">
                  {model.commitmentProductPath}
                </span>
              </div>
            ) : null}
            <div className="provider-mission-board-card-evaluation-row">
              <span className="provider-mission-board-card-evaluation-k">Commitment</span>
              <span className="provider-mission-board-card-evaluation-v">
                {model.commitmentStatus ?? "Not confirmed"}
              </span>
            </div>
          </div>
        ) : null}

        {isOutcomesStage ? (
          <div
            className="provider-mission-board-card-evaluation-block"
            data-testid="mission-board-outcomes-context"
          >
            {model.outcomesCommitmentSummary ? (
              <div className="provider-mission-board-card-evaluation-row">
                <span className="provider-mission-board-card-evaluation-k">Commitment</span>
                <span className="provider-mission-board-card-evaluation-v">
                  {model.outcomesCommitmentSummary}
                </span>
              </div>
            ) : null}
            {model.outcomesProductPath ? (
              <div className="provider-mission-board-card-evaluation-row">
                <span className="provider-mission-board-card-evaluation-k">Product / path</span>
                <span className="provider-mission-board-card-evaluation-v">{model.outcomesProductPath}</span>
              </div>
            ) : null}
            {model.outcomesStartDate ? (
              <div className="provider-mission-board-card-evaluation-row">
                <span className="provider-mission-board-card-evaluation-k">Start date</span>
                <span className="provider-mission-board-card-evaluation-v">{model.outcomesStartDate}</span>
              </div>
            ) : null}
            <div className="provider-mission-board-card-evaluation-row">
              <span className="provider-mission-board-card-evaluation-k">Tracking</span>
              <span className="provider-mission-board-card-evaluation-v">
                {model.outcomesTrackingStatus ?? "Active tracking"}
              </span>
            </div>
          </div>
        ) : null}

        {isObserveStage && nextObservation ? (

          <div

            className="provider-mission-board-card-next-block provider-mission-board-card-next-block--case"

            data-testid="mission-board-next-observation"

          >

            <span className="provider-mission-board-card-next-heading">Next Observation</span>

            <div className="provider-mission-board-card-row">

              <span className="provider-mission-board-card-k">Procedure</span>

              <span className="provider-mission-board-card-next">

                {nextObservation.procedureLabel || "Procedure TBD"}

              </span>

            </div>

            {nextObservation.dateTimeLabel ? (

              <div className="provider-mission-board-card-row">

                <span className="provider-mission-board-card-k">Date/time</span>

                <span className="provider-mission-board-card-next">{nextObservation.dateTimeLabel}</span>

              </div>

            ) : null}

            <div className="provider-mission-board-card-row">

              <span className="provider-mission-board-card-k">Facility</span>

              <span className="provider-mission-board-card-next">{nextObservation.facilityLabel}</span>

            </div>

            <div className="provider-mission-board-card-row">

              <span className="provider-mission-board-card-k">Status</span>

              <span className="provider-mission-board-card-status">{nextObservation.statusLabel}</span>

            </div>

            <MissionBoardObservationCaseActions

              observationCase={nextObservation}

              actions={model.nextCaseActions}

              busy={observationActionBusy}

              onMarkComplete={(caseId) => onMarkObservationComplete(provider, caseId)}

              onDictateComplete={(caseId, observationCase) =>

                onDictateCompleteObservation(provider, observationCase)

              }

              onReschedule={(caseId, observationCase) => onRescheduleObservation(provider, observationCase)}

            />

          </div>

        ) : null}



        {isObserveStage ? (

          renderObserveFooter()

        ) : (

          <>

            {renderStandardPrimaryCta()}

            {renderSecondaryActions()}

          </>

        )}
          </>
        ) : null}

      </article>

    </li>

  );

}
