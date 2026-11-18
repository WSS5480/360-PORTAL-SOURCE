"use client";

import Link from "next/link";
import React from "react";
import { EngagementArchiveControl } from "@/app/portal/sales/engagements/[engagementId]/EngagementArchiveControl";
import type { ProviderOverviewMissionStatusModel } from "@/lib/surgical-sales/buildProviderOverviewMissionStatus";
import {
  buildProviderOverviewExecutionCtas,
  type ProviderOverviewExecutionAction,
} from "@/lib/surgical-sales/buildProviderOverviewExecutionCtas";
import type { ObservationStatusChoice } from "@/lib/surgical-sales/observationStatus";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { ProviderUpcomingMissionQuickEditSheet } from "./ProviderUpcomingMissionQuickEditSheet";

export function ProviderOverviewNextActionCard({
  missionStatus,
  observationStatus,
  observationStatusLabel,
  contact,
  providerId,
  newEngagementHref,
  noteHref,
  intelligenceHref,
  engagements,
  cases,
  onOpenObservationApproval,
  onLogFieldIntel,
  onEngagementsRefresh,
  providerOverviewHref,
}: {
  missionStatus: ProviderOverviewMissionStatusModel;
  observationStatus: ObservationStatusChoice;
  observationStatusLabel: string;
  contact: Record<string, unknown>;
  providerId: string;
  newEngagementHref: string;
  noteHref: string;
  intelligenceHref: string;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  onOpenObservationApproval?: () => void;
  onLogFieldIntel: () => void;
  onEngagementsRefresh?: () => void | Promise<void>;
  providerOverviewHref: string;
}) {
  const [quickEditOpen, setQuickEditOpen] = React.useState(false);
  const [quickEditError, setQuickEditError] = React.useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  const panel = missionStatus.missionPanel;

  const executionCtas = React.useMemo(
    () =>
      buildProviderOverviewExecutionCtas({
        contact,
        providerId,
        newEngagementHref,
        noteHref,
        intelligenceHref,
        engagements,
        cases,
      }),
    [contact, providerId, newEngagementHref, noteHref, intelligenceHref, engagements, cases],
  );

  const handleAction = (action: ProviderOverviewExecutionAction) => {
    if (action.customAction === "openObservationApproval") {
      onOpenObservationApproval?.();
      return;
    }
    if (action.customAction === "logFieldIntel") {
      onLogFieldIntel();
      return;
    }
    if (action.customAction === "editMissionSchedule") {
      setQuickEditError(null);
      setQuickEditOpen(true);
    }
  };

  const scheduledMission = missionStatus.mode === "scheduled_mission" ? missionStatus : null;
  const engagementMission =
    missionStatus.mode === "scheduled_mission" || missionStatus.mode === "debrief_mission"
      ? missionStatus
      : null;
  const missionQuickEdit = engagementMission?.quickEdit ?? null;
  const missionEngagementId = engagementMission?.engagementId ?? null;

  const primary = executionCtas.primary;

  return (
    <>
      <section className="pov-cc-mission-control mc-ops-card" data-testid="pov-next-action-card">
        <div className="pov-cc-mission-control__head">
          <div>
            <p className="pov-cc-mission-control__kicker">Field execution</p>
            <h2 className="pov-cc-mission-control__title">Next moves</h2>
          </div>
          <span className="pov-cc-mission-control__status-dot" aria-hidden />
        </div>

        {engagementMission ? (
          <article
            className="pov-cc-mission-control__panel pov-cc-mission-control__panel--primary"
            data-testid="pov-upcoming-mission"
          >
            <div className="pov-cc-mission-control__panel-head">
              <p className="pov-cc-mission-control__label">Next engagement</p>
              {scheduledMission ? (
                <button
                  type="button"
                  className="pov-cc-mission-control__edit-btn"
                  data-testid="pov-mission-quick-edit"
                  onClick={() => {
                    setQuickEditError(null);
                    setQuickEditOpen(true);
                  }}
                >
                  Edit
                </button>
              ) : null}
            </div>
            <p className="pov-cc-mission-control__value">{engagementMission.engagementTypeLabel}</p>
            <p className="pov-cc-mission-control__detail">
              {engagementMission.whenLabel} · {engagementMission.engagementStatusLabel}
            </p>
            {scheduledMission?.quickEdit.locationLabel ? (
              <p className="pov-cc-mission-control__detail">{scheduledMission.quickEdit.locationLabel}</p>
            ) : null}
          </article>
        ) : null}

        <div className="pov-cc-mission-control__focus">
          <article className="pov-cc-mission-control__panel">
            <p className="pov-cc-mission-control__label">Mission objective</p>
            <p className="pov-cc-mission-control__value" data-testid="pov-mission-objective">
              {panel.missionObjective}
            </p>
          </article>

          <article className="pov-cc-mission-control__panel pov-cc-mission-control__panel--status">
            <p className="pov-cc-mission-control__label">Observation permission</p>
            <p
              className={`pov-cc-mission-control__value pov-cc-mission-control__observation pov-cc-mission-control__observation--${observationStatus}`}
              data-testid="pov-observation-status"
            >
              {observationStatusLabel}
            </p>
          </article>
        </div>

        <div className="pov-cc-mission-control__recommended">
          <p className="pov-cc-mission-control__label">Primary suggested action</p>
          <p className="pov-cc-mission-control__recommended-action" data-testid="pov-mission-recommended">
            {primary.label}
          </p>
          {executionCtas.guidanceLine ? (
            <p className="pov-cc-mission-control__detail">{executionCtas.guidanceLine}</p>
          ) : null}
          <div className="pov-cc-mission-control__cta-wrap">
            {primary.href ? (
              <Link
                href={primary.href}
                className="pov-cc-mission-control__cta mc-cta mc-cta--primary"
                data-testid="pov-rail-primary-cta"
              >
                {primary.label}
              </Link>
            ) : (
              <button
                type="button"
                className="pov-cc-mission-control__cta mc-cta mc-cta--primary"
                data-testid="pov-rail-primary-cta"
                onClick={() => handleAction(primary)}
              >
                {primary.label}
              </button>
            )}
          </div>
        </div>

        {quickEditError ? (
          <p className="pov-cc-mission-control__detail" style={{ color: "var(--danger)" }}>
            {quickEditError}
          </p>
        ) : null}

        {missionStatus.mode === "scheduled_mission" ? (
          <p className="pov-cc-mission-control__meta-item" data-testid="pov-mission-next">
            Next step: {missionStatus.nextStepLine}
          </p>
        ) : null}

        <div className="pov-cc-mission-control__secondary-block">
          <p className="pov-cc-mission-control__label">Quick actions</p>
          <div className="pov-cc-mission-control__secondary" data-testid="pov-exec-actions">
            {executionCtas.quickActions.map((action) =>
              action.href ? (
                <Link
                  key={action.id}
                  href={action.href}
                  className="pov-cc-mission-control__secondary-btn"
                  data-testid={`pov-quick-action-${action.id}`}
                >
                  {action.label}
                </Link>
              ) : (
                <button
                  key={action.id}
                  type="button"
                  className="pov-cc-mission-control__secondary-btn"
                  data-testid={`pov-quick-action-${action.id}`}
                  onClick={() => handleAction(action)}
                >
                  {action.label}
                </button>
              ),
            )}
            <Link
              href={intelligenceHref}
              className="pov-cc-mission-control__secondary-btn"
              data-testid="pov-quick-action-view_intelligence"
            >
              View intelligence
            </Link>
          </div>
        </div>
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
    </>
  );
}
