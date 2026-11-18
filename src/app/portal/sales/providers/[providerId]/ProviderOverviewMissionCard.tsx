"use client";



import Link from "next/link";

import React from "react";

import {
  buildCaptureIntelligenceOpenContext,
  useCaptureIntelligence,
} from "@/components/sales/captureIntelligence/CaptureIntelligenceHost";

import { EngagementArchiveControl } from "@/app/portal/sales/engagements/[engagementId]/EngagementArchiveControl";

import { MissionBoardObservationDictateCompleteModal } from "@/app/portal/sales/providers/MissionBoardObservationDictateCompleteModal";
import {
  MissionBoardDebriefQuickCompleteModal,
  type MissionBoardDebriefQuickCompleteMode,
} from "@/app/portal/sales/providers/MissionBoardDebriefQuickCompleteModal";

import { MissionBoardToast } from "@/app/portal/sales/providers/MissionBoardDropFeedbackModal";

import {
  resolveObservationCasePreviewForDictateComplete,
} from "@/lib/surgical-sales/missionBoardObservationDictateComplete";

import type { ProviderObservationCasePreview } from "@/lib/surgical-sales/providerObservationCaseCollection";

import {

  buildProviderOverviewMissionCardView,

  type ProviderOverviewMissionCardView,

} from "@/lib/surgical-sales/buildProviderOverviewMissionCardView";

import type { ProviderOverviewExecutionAction } from "@/lib/surgical-sales/buildProviderOverviewExecutionCtas";

import type { ProviderOverviewObservationMissionAction } from "@/lib/surgical-sales/buildProviderOverviewObservationMissionView";

import { markMissionBoardObservationComplete } from "@/lib/surgical-sales/missionBoardObservationCaseActions";
import {
  finalizeMissionBoardIntroCallDebriefAfterCapture,
  markMissionBoardIntroCallCompleteWithoutDictation,
  MISSION_BOARD_INTRO_CALL_DICTATE_COMPLETE_SUCCESS_TOAST,
} from "@/lib/surgical-sales/missionBoardIntroCallDictateComplete";

import { buildProviderOverviewMissionBoardProviderRow } from "@/lib/surgical-sales/buildProviderOverviewActiveEngagementShortcuts";
import { markMissionBoardEvaluationSuccessful } from "@/lib/surgical-sales/missionBoardCommitmentOutcomesClient";

import { resolveOverviewFocusedModal } from "@/lib/surgical-sales/providerOverviewFocusedActionRouting";

import { providerDisplayName } from "@/lib/surgical-sales/providerDirectoryLinks";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";

import type { SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";

import {

  type ProviderOverviewMissionQuickEdit,

  type ProviderOverviewMissionStatusModel,

  resolveProviderOverviewActiveEngagementPresentation,

} from "@/lib/surgical-sales/buildProviderOverviewMissionStatus";

import { ProviderUpcomingMissionQuickEditSheet } from "./ProviderUpcomingMissionQuickEditSheet";
import { userFacingError } from "@/lib/errors/userFacingError";



function permissionToneClass(permission: string): string {

  const token = permission.toLowerCase();

  if (token.includes("confirmed") || token === "scheduled" || token === "completed") {

    return "pov-mission-card__permission--positive";

  }

  if (token.includes("interested")) return "pov-mission-card__permission--warm";

  if (token.includes("declined")) return "pov-mission-card__permission--muted";

  return "pov-mission-card__permission--open";

}



function ObservationMissionCommandCard({

  card,

  fallbackPrimary,

  observationActionBusy,

  onObservationAction,

}: {

  card: ProviderOverviewMissionCardView;

  fallbackPrimary?: ProviderOverviewExecutionAction;

  observationActionBusy: boolean;

  onObservationAction: (action: ProviderOverviewObservationMissionAction) => void;

}) {

  const mission = card.observationMission;

  if (!mission) return null;



  const renderAction = (action: ProviderOverviewObservationMissionAction) => {

    const className =

      action.id === "open_next" || action.id === "add_observation"

        ? "pov-obs-mission__action pov-obs-mission__action--primary mc-cta mc-cta--primary"

        : "pov-obs-mission__action pov-obs-mission__action--secondary";



    if (action.href) {

      return (

        <Link

          key={action.id}

          href={action.href}

          className={className}

          data-testid={`pov-obs-action-${action.id}`}

        >

          {action.label}

        </Link>

      );

    }



    return (

      <button

        key={action.id}

        type="button"

        className={className}

        data-testid={`pov-obs-action-${action.id}`}

        disabled={observationActionBusy}

        onClick={() => onObservationAction(action)}

      >

        {action.label}

      </button>

    );

  };



  return (

    <div className="pov-obs-mission" data-testid="pov-observation-mission">

      <header className="pov-obs-mission__head">

        <h2 className="pov-obs-mission__title">{card.missionTitle}</h2>

        <p className="pov-obs-mission__progress" data-testid="pov-observation-progress">

          {mission.headerProgress}

        </p>

      </header>



      <p className="pov-obs-mission__objective" data-testid="pov-mission-objective">

        {mission.missionObjective}

      </p>



      {mission.hasScheduledCases && mission.nextObservation ? (

        <article className="pov-obs-mission__focus" data-testid="pov-next-observation">

          <p className="pov-obs-mission__focus-label">Next Observation</p>

          <p className="pov-obs-mission__procedure">{mission.nextObservation.procedureLabel}</p>

          {mission.nextObservation.metaLine ? (

            <p className="pov-obs-mission__meta">{mission.nextObservation.metaLine}</p>

          ) : null}

          <p className="pov-obs-mission__status">

            Status: {mission.nextObservation.statusLabel}

          </p>

        </article>

      ) : (

        <div className="pov-obs-mission__empty" data-testid="pov-observation-empty">

          <p>{fallbackPrimary ? "Observation series complete" : mission.emptyMessage}</p>

        </div>

      )}



      <div className="pov-obs-mission__actions" data-testid="pov-observation-actions">

        {fallbackPrimary?.href && !mission.hasScheduledCases ? (

          <Link

            href={fallbackPrimary.href}

            className="pov-obs-mission__action pov-obs-mission__action--primary mc-cta mc-cta--primary"

            data-testid="pov-rail-primary-cta"

          >

            {fallbackPrimary.label}

          </Link>

        ) : (

          mission.actions.map(renderAction)

        )}

      </div>



      {mission.viewAllHref && mission.viewAllLabel ? (

        <Link

          href={mission.viewAllHref}

          className="pov-obs-mission__view-all"

          data-testid="pov-view-observation-queue"

        >

          {mission.viewAllLabel}

        </Link>

      ) : null}

    </div>

  );

}



export function ProviderOverviewMissionCard({

  missionStatus,

  stageId,

  contact,

  providerId,

  newEngagementHref,

  noteHref,

  intelligenceHref,

  engagements,

  cases,

  onOpenObservationApproval,

  onExecuteFocusedAction,

  onEngagementsRefresh,

  providerOverviewHref,

}: {

  missionStatus: ProviderOverviewMissionStatusModel;

  stageId: SalesPathwayStageId;

  contact: Record<string, unknown>;

  providerId: string;

  newEngagementHref: string;

  noteHref: string;

  intelligenceHref: string;

  engagements?: ProviderEngagementSummary[];

  cases?: Array<Record<string, unknown>>;

  onOpenObservationApproval?: () => void;

  onExecuteFocusedAction: (action: ProviderOverviewExecutionAction) => void;

  onEngagementsRefresh?: () => void | Promise<void>;

  providerOverviewHref: string;

}) {

  const [quickEditOpen, setQuickEditOpen] = React.useState(false);

  const [quickEditError, setQuickEditError] = React.useState<string | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  const [observationActionBusy, setObservationActionBusy] = React.useState(false);

  const [dictateCompleteModal, setDictateCompleteModal] =
    React.useState<ProviderObservationCasePreview | null>(null);

  const [debriefQuickCompleteModal, setDebriefQuickCompleteModal] = React.useState<{
    engagementId: string;
    mode: MissionBoardDebriefQuickCompleteMode;
  } | null>(null);

  const [missionToast, setMissionToast] = React.useState<{
    title: string;
    detail?: string | null;
  } | null>(null);

  const capture = useCaptureIntelligence();

  const card: ProviderOverviewMissionCardView = React.useMemo(
    () =>
      buildProviderOverviewMissionCardView({

        contact,

        providerId,

        stageId,

        newEngagementHref,

        noteHref,

        intelligenceHref,

        engagements,

        cases,

      }),

    [

      contact,

      providerId,

      stageId,

      newEngagementHref,

      noteHref,

      intelligenceHref,

      engagements,

      cases,

    ],

  );



  const providerName = providerDisplayName(contact as ProviderDirectoryRow);

  const missionBoardProviderRow = React.useMemo(
    () =>
      buildProviderOverviewMissionBoardProviderRow({
        providerId,
        contact,
        engagements,
        organizationName:
          String(contact.primary_organization_name ?? contact.organization_name ?? "").trim() ||
          null,
        organizationId:
          String(contact.organization_id ?? contact.account_id ?? "").trim() || null,
      }),
    [contact, engagements, providerId],
  );

  const openFieldNoteCapture = React.useCallback(() => {
    capture.open(
      buildCaptureIntelligenceOpenContext("mission_board", {
        providerId,
        providerLabel: providerName,
        organizationId:
          String(contact.organization_id ?? contact.account_id ?? "").trim() || undefined,
        organizationLabel:
          String(contact.primary_organization_name ?? contact.organization_name ?? "").trim() ||
          undefined,
        declaredSourceType: "field_note",
      }),
      {
        onSaved: async (result) => {
          setMissionToast({
            title: result?.title ?? "Provider updated",
            detail: result?.detail ?? null,
          });
          await onEngagementsRefresh?.();
        },
      },
    );
  }, [capture, contact, onEngagementsRefresh, providerId, providerName]);

  const handleIntroDictateComplete = React.useCallback(
    async (engagementId: string) => {
      if (observationActionBusy) return;
      setObservationActionBusy(true);
      try {
        capture.open(
          buildCaptureIntelligenceOpenContext("mission_board", {
            providerId,
            providerLabel: providerName,
            organizationId: String(contact.organization_id ?? contact.account_id ?? "").trim() || undefined,
            organizationLabel:
              String(contact.primary_organization_name ?? contact.organization_name ?? "").trim() || undefined,
            engagementId,
            engagementType: "intro_call",
            engagementTypeLabel: "Intro Call",
            scopeLocked: true,
            declaredSourceType: "debrief",
            composeTitle: "Dictate & Complete",
            composeSubtitle:
              "Capture intro call notes, review suggested intelligence, or quick capture — then mark the call complete.",
            reviewSaveCta: "Finish Intro Call",
          }),
          {
            onSaved: async (result) => {
              try {
                await finalizeMissionBoardIntroCallDebriefAfterCapture({
                  providerId,
                  engagementId,
                  narrative: result?.sourceText,
                });
              } catch (err) {
                setMissionToast({
                  title: userFacingError(err, "Could not finalize intro call debrief."),
                  detail: null,
                });
                await onEngagementsRefresh?.();
                return;
              }
              setMissionToast({
                title: result?.title ?? MISSION_BOARD_INTRO_CALL_DICTATE_COMPLETE_SUCCESS_TOAST,
                detail: result?.detail ?? null,
              });
              await onEngagementsRefresh?.();
            },
          },
        );
      } finally {
        setObservationActionBusy(false);
      }
    },
    [capture, contact, observationActionBusy, onEngagementsRefresh, providerId, providerName],
  );

  const handleIntroJustComplete = React.useCallback(
    async (engagementId: string) => {
      if (observationActionBusy) return;
      setObservationActionBusy(true);
      try {
        await markMissionBoardIntroCallCompleteWithoutDictation({
          providerId,
          engagementId,
        });
        setMissionToast({
          title: "Intro call completed.",
          detail: null,
        });
        await onEngagementsRefresh?.();
      } catch (err) {
        setMissionToast({
          title: userFacingError(err, "Could not complete intro call."),
          detail: null,
        });
      } finally {
        setObservationActionBusy(false);
      }
    },
    [observationActionBusy, onEngagementsRefresh, providerId],
  );

  const runMissionBoardShortcut = (action: ProviderOverviewExecutionAction): boolean => {
    const shortcutId = action.missionBoardShortcutId;
    if (!shortcutId) return false;

    if (shortcutId === "dictate") {
      openFieldNoteCapture();
      return true;
    }

    if (shortcutId === "observation_status") {
      onOpenObservationApproval?.();
      return true;
    }

    if (shortcutId === "debrief_status") {
      onExecuteFocusedAction({
        id: "schedule_provider_debrief",
        label: action.label,
        customAction: "openDebriefStatus",
      });
      return true;
    }

    if (shortcutId === "intro_dictate_complete" && action.engagementId) {
      void handleIntroDictateComplete(action.engagementId);
      return true;
    }

    if (shortcutId === "intro_just_complete" && action.engagementId) {
      void handleIntroJustComplete(action.engagementId);
      return true;
    }

    if (shortcutId === "debrief_dictate_complete" && action.engagementId) {
      setDebriefQuickCompleteModal({ engagementId: action.engagementId, mode: "dictate_complete" });
      return true;
    }

    if (shortcutId === "debrief_just_complete" && action.engagementId) {
      setDebriefQuickCompleteModal({ engagementId: action.engagementId, mode: "just_complete" });
      return true;
    }

    if (shortcutId === "mark_evaluation_successful") {
      if (observationActionBusy) return true;
      setObservationActionBusy(true);
      void (async () => {
        try {
          const result = await markMissionBoardEvaluationSuccessful(providerId);
          setMissionToast({
            title: result.ok
              ? result.alreadyMarked
                ? "Evaluation already marked successful — provider moves to Commitment."
                : "Evaluation marked successful — provider moves to Commitment."
              : result.message,
            detail: null,
          });
          if (result.ok) await onEngagementsRefresh?.();
        } finally {
          setObservationActionBusy(false);
        }
      })();
      return true;
    }

    return false;
  };

  const handleAction = (action: ProviderOverviewExecutionAction) => {
    if (runMissionBoardShortcut(action)) return;

    if (action.id === "intro_dictate_complete" && action.engagementId) {
      void handleIntroDictateComplete(action.engagementId);
      return;
    }

    if (resolveOverviewFocusedModal(action)) {
      onExecuteFocusedAction(action);
      return;
    }

    if (action.customAction === "editMissionSchedule") {
      setQuickEditError(null);
      setQuickEditOpen(true);
    }
  };

  const handleObservationMissionAction = React.useCallback(

    async (action: ProviderOverviewObservationMissionAction) => {

      if (observationActionBusy) return;



      if (action.id === "mark_complete" && action.caseId) {

        setObservationActionBusy(true);

        try {

          await markMissionBoardObservationComplete(action.caseId);

          await onEngagementsRefresh?.();

        } finally {

          setObservationActionBusy(false);

        }

        return;

      }



      if (action.id === "dictate_complete") {
        if (!action.caseId) {
          setMissionToast({
            title: "Select an observation case first",
            detail: card.observationMission?.viewAllLabel ?? null,
          });
          return;
        }

        const preview = resolveObservationCasePreviewForDictateComplete({
          caseId: action.caseId,
          scheduledCases: card.observationCases?.scheduledCases,
        });

        if (!preview) {
          setMissionToast({
            title: "Select an observation case first",
            detail:
              card.observationMission?.viewAllLabel ??
              "Open the observation queue and choose a case.",
          });
          return;
        }

        setDictateCompleteModal(preview);
      }

    },

    [

      card.observationCases?.scheduledCases,

      card.observationMission?.viewAllLabel,

      observationActionBusy,

      onEngagementsRefresh,

    ],

  );



  const scheduledMission = missionStatus.mode === "scheduled_mission" ? missionStatus : null;

  const engagementMission =

    missionStatus.mode === "scheduled_mission" || missionStatus.mode === "debrief_mission"

      ? missionStatus

      : null;

  const activeEngagement = engagementMission

    ? resolveProviderOverviewActiveEngagementPresentation(engagementMission)

    : null;

  const missionQuickEdit: ProviderOverviewMissionQuickEdit | null = engagementMission?.quickEdit ?? null;

  const missionEngagementId = engagementMission?.engagementId ?? null;



  const primary = card.primary;

  const secondary = card.secondary;

  const useObservationCommandLayout = stageId === "observe" && Boolean(card.observationMission);

  const showDebriefFallback =

    useObservationCommandLayout &&

    !card.observationMission?.hasScheduledCases &&

    primary.id === "schedule_provider_debrief";



  const renderPathwayFacts = (options?: { includeTitle?: boolean }) => (

    <>

      {options?.includeTitle ? (

        <header className="pov-mission-card__head">

          <h2 className="pov-mission-card__title">{card.missionTitle}</h2>

        </header>

      ) : null}

      <dl className="pov-mission-card__facts">

        <div className="pov-mission-card__fact">

          <dt>Objective</dt>

          <dd data-testid="pov-mission-objective">{card.objective}</dd>

        </div>

        <div className="pov-mission-card__fact">

          <dt>Observation permission</dt>

          <dd

            className={`pov-mission-card__permission ${permissionToneClass(card.observationPermission)}`}

            data-testid="pov-observation-status"

          >

            {card.observationPermission}

          </dd>

        </div>

        <div className="pov-mission-card__fact pov-mission-card__fact--wide">

          <dt>Recommended next move</dt>

          <dd data-testid="pov-mission-recommended">{card.recommendedNextMove}</dd>

        </div>

      </dl>

    </>

  );



  const renderPrimaryAction = (

    action: ProviderOverviewExecutionAction,

    options?: { testId?: string; variant?: "primary" | "secondary" },

  ) => {

    const variant = options?.variant ?? "primary";

    const className =

      variant === "secondary"

        ? "pov-mission-card__cta pov-mission-card__cta--secondary mc-cta mc-cta--secondary"

        : "pov-mission-card__cta mc-cta mc-cta--primary";

    const testId = options?.testId ?? "pov-rail-primary-cta";



    if (action.href) {

      return (

        <Link href={action.href} className={className} data-testid={testId}>

          {action.label}

        </Link>

      );

    }



    return (

      <button

        type="button"

        className={className}

        data-testid={testId}

        onClick={() => handleAction(action)}

      >

        {action.label}

      </button>

    );

  };



  return (

    <>

      <section

        className={`pov-mission-card mc-ops-card${activeEngagement ? ` pov-mission-card--active-touch pov-mission-card--${activeEngagement.tone}` : ""}${useObservationCommandLayout ? " pov-mission-card--observation-command" : ""}`}

        data-testid="pov-mission-card"

      >

        {activeEngagement ? (

          <article className="pov-mission-card__active" data-testid="pov-active-engagement">

            <div className="pov-mission-card__active-head">

              <span className={`pov-mission-card__active-badge pov-mission-card__active-badge--${activeEngagement.tone}`}>

                {activeEngagement.badgeLabel}

              </span>

              {scheduledMission ? (

                <button

                  type="button"

                  className="pov-mission-card__edit-link"

                  data-testid="pov-mission-quick-edit"

                  onClick={() => {

                    setQuickEditError(null);

                    setQuickEditOpen(true);

                  }}

                >

                  Edit schedule

                </button>

              ) : null}

            </div>

            <h2 className="pov-mission-card__active-title">{activeEngagement.headline}</h2>

            <p className="pov-mission-card__active-meta">{activeEngagement.metaLine}</p>

            <p className="pov-mission-card__active-next">{activeEngagement.nextStepLine}</p>

            {activeEngagement.primaryCta.href ? (

              <Link

                href={activeEngagement.primaryCta.href}

                className="pov-mission-card__active-cta mc-cta mc-cta--primary"

                data-testid="pov-active-engagement-cta"

              >

                {activeEngagement.primaryCta.label}

              </Link>

            ) : null}

            {activeEngagement && card.activeEngagementShortcuts.length > 0 ? (
              <div
                className="pov-mission-card__active-shortcuts"
                data-testid="pov-active-engagement-shortcuts"
              >
                <div
                  className="pov-mission-card__quick-grid"
                  role="group"
                  aria-label="Engagement shortcuts"
                >
                  {card.activeEngagementShortcuts.map((action) =>
                    action.href ? (
                      <Link
                        key={action.missionBoardShortcutId ?? action.id}
                        href={action.href}
                        className="pov-mission-card__quick-btn"
                        data-testid={`pov-active-shortcut-${action.missionBoardShortcutId ?? action.id}`}
                      >
                        {action.label}
                      </Link>
                    ) : (
                      <button
                        key={action.missionBoardShortcutId ?? action.id}
                        type="button"
                        className="pov-mission-card__quick-btn"
                        data-testid={`pov-active-shortcut-${action.missionBoardShortcutId ?? action.id}`}
                        disabled={observationActionBusy}
                        onClick={() => handleAction(action)}
                      >
                        {action.label}
                      </button>
                    ),
                  )}
                </div>
              </div>
            ) : null}

          </article>

        ) : null}



        {useObservationCommandLayout ? (

          <ObservationMissionCommandCard

            card={card}

            fallbackPrimary={showDebriefFallback ? primary : undefined}

            observationActionBusy={observationActionBusy}

            onObservationAction={(action) => void handleObservationMissionAction(action)}

          />

        ) : activeEngagement ? (

          <div className="pov-mission-card__pathway-context" data-testid="pov-mission-pathway-context">

            <p className="pov-mission-card__pathway-context-label">{card.missionTitle}</p>

            {renderPathwayFacts()}

          </div>

        ) : (

          renderPathwayFacts({ includeTitle: true })

        )}



        {!useObservationCommandLayout && !activeEngagement ? (

          <div

            className={`pov-mission-card__primary${secondary ? " pov-mission-card__primary--dual" : ""}`}

          >

            {renderPrimaryAction(primary)}

            {secondary ? renderPrimaryAction(secondary, { testId: "pov-rail-secondary-cta", variant: "secondary" }) : null}

          </div>

        ) : null}



        {quickEditError ? (

          <p className="pov-mission-card__error">{quickEditError}</p>

        ) : null}



        {!useObservationCommandLayout ? (

          <div className="pov-mission-card__quick">

            <p className="pov-mission-card__quick-label">Quick actions</p>

            <div className="pov-mission-card__quick-grid" data-testid="pov-exec-actions">

              {card.quickActions.map((action) =>

                action.href ? (

                  <Link

                    key={action.id}

                    href={action.href}

                    className="pov-mission-card__quick-btn"

                    data-testid={`pov-quick-action-${action.id}`}

                  >

                    {action.label}

                  </Link>

                ) : (

                  <button

                    key={action.id}

                    type="button"

                    className="pov-mission-card__quick-btn"

                    data-testid={`pov-quick-action-${action.id}`}

                    onClick={() => handleAction(action)}

                  >

                    {action.label}

                  </button>

                ),

              )}

            </div>

          </div>

        ) : null}

      </section>



      {missionQuickEdit ? (

        <>

          <ProviderUpcomingMissionQuickEditSheet

            open={quickEditOpen}

            quickEdit={missionQuickEdit}

            redirectHref={providerOverviewHref}

            onClose={() => setQuickEditOpen(false)}

            onSaved={onEngagementsRefresh}

            onError={setQuickEditError}

          />

          {deleteConfirmOpen && missionEngagementId ? (

            <EngagementArchiveControl

              engagementId={missionEngagementId}

              archived={false}

              redirectHref={providerOverviewHref}

              autoOpen

              hideTrigger

              onDismiss={() => setDeleteConfirmOpen(false)}

              onArchived={async () => {

                setDeleteConfirmOpen(false);

                if (onEngagementsRefresh) await onEngagementsRefresh();

              }}

              onError={setQuickEditError}

            />

          ) : null}

        </>

      ) : null}

      {dictateCompleteModal ? (
        <MissionBoardObservationDictateCompleteModal
          providerName={providerName}
          observation={dictateCompleteModal}
          busy={observationActionBusy}
          onClose={() => {
            if (!observationActionBusy) setDictateCompleteModal(null);
          }}
          onCompleted={async (result) => {
            setObservationActionBusy(true);
            try {
              setDictateCompleteModal(null);
              setMissionToast({ title: result.title, detail: result.detail ?? null });
              await onEngagementsRefresh?.();
            } finally {
              setObservationActionBusy(false);
            }
          }}
        />
      ) : null}

      {debriefQuickCompleteModal ? (
        <MissionBoardDebriefQuickCompleteModal
          provider={missionBoardProviderRow}
          engagementId={debriefQuickCompleteModal.engagementId}
          mode={debriefQuickCompleteModal.mode}
          busy={observationActionBusy}
          onClose={() => {
            if (!observationActionBusy) setDebriefQuickCompleteModal(null);
          }}
          onCompleted={async (message) => {
            setDebriefQuickCompleteModal(null);
            setMissionToast({ title: message ?? "Debrief complete", detail: null });
            await onEngagementsRefresh?.();
          }}
        />
      ) : null}

      {missionToast ? (
        <MissionBoardToast
          message={missionToast.title}
          detail={missionToast.detail}
          onDismiss={() => setMissionToast(null)}
        />
      ) : null}

    </>

  );

}

