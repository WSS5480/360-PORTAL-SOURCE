"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { beginEngagementCallClient, buildBeginCallHref } from "@/lib/surgical-sales/engagements/beginEngagementCallClient";
import { ENGAGEMENT_PREPARE_START_ENGAGEMENT_LABEL } from "@/lib/surgical-sales/engagements/engagementLifecycle";
import {
  PREPARE_BACK_TO_ENGAGEMENT_LABEL,
  PREPARE_CONTINUE_PLANNING_LABEL,
  PREPARE_SAVE_PLAN_LABEL,
  PREPARE_START_ANYWAY_LABEL,
  PREPARE_START_WITHOUT_PLAN_MESSAGE,
  PREPARE_START_WITHOUT_PLAN_TITLE,
} from "@/lib/surgical-sales/engagements/prepareFlowTerminology";
import { autoMarkEngagementPreparedClient } from "@/lib/surgical-sales/engagements/preparePreCallPlanSaveClient";
import type { PrepareEngagementPlanningPanelHandle } from "./PrepareEngagementPlanningPanel";
import { userFacingError } from "@/lib/errors/userFacingError";

export function PreparePreCallPlanFooter({
  engagementId,
  engagementDetailHref,
  isAlreadyPrepared,
  planningRef,
  saving,
  onActionError,
  onPlanSaved,
  onPreparedMarked,
  startEngagementLabel = ENGAGEMENT_PREPARE_START_ENGAGEMENT_LABEL,
}: {
  engagementId: string;
  engagementDetailHref: string;
  isAlreadyPrepared: boolean;
  planningRef: React.RefObject<PrepareEngagementPlanningPanelHandle | null>;
  saving?: boolean;
  onActionError: (message: string | null) => void;
  onPlanSaved: () => void | Promise<void>;
  onPreparedMarked: () => void | Promise<void>;
  startEngagementLabel?: string;
}) {
  const router = useRouter();
  const [savingPlan, setSavingPlan] = React.useState(false);
  const [starting, setStarting] = React.useState(false);
  const [saveFlash, setSaveFlash] = React.useState(false);
  const [emptyPlanDialogOpen, setEmptyPlanDialogOpen] = React.useState(false);

  const busy = saving || savingPlan || starting;

  async function persistPlan(): Promise<boolean> {
    const panel = planningRef.current;
    if (!panel) return false;
    return panel.savePlanNow();
  }

  async function markPreparedIfEligible(): Promise<void> {
    if (isAlreadyPrepared) return;
    const panel = planningRef.current;
    if (!panel?.hasMeaningfulPlan()) return;
    const result = await autoMarkEngagementPreparedClient(engagementId);
    if (result.ok) await onPreparedMarked();
  }

  async function handleSavePlan() {
    if (busy) return;
    setSavingPlan(true);
    onActionError(null);
    try {
      const ok = await persistPlan();
      if (!ok) return;
      await markPreparedIfEligible();
      await onPlanSaved();
      setSaveFlash(true);
      window.setTimeout(() => setSaveFlash(false), 2000);
    } finally {
      setSavingPlan(false);
    }
  }

  async function startEngagementAfterSave() {
    setStarting(true);
    onActionError(null);
    try {
      const saved = await persistPlan();
      if (!saved) return;
      await markPreparedIfEligible();
      const result = await beginEngagementCallClient(engagementId);
      if (!result.ok) {
        onActionError(result.message);
        return;
      }
      router.push(buildBeginCallHref(engagementId));
    } catch (e: unknown) {
      onActionError(userFacingError(e, "Could not start engagement"));
    } finally {
      setStarting(false);
      setEmptyPlanDialogOpen(false);
    }
  }

  function handleStartClick() {
    if (busy) return;
    const panel = planningRef.current;
    if (panel?.isPlanEmpty()) {
      setEmptyPlanDialogOpen(true);
      return;
    }
    void startEngagementAfterSave();
  }

  return (
    <>
      <footer className="prepare-for-meeting-footer prepare-for-meeting-footer--precall-sticky" aria-label="Pre-call plan actions">
        <div className="pfm-precall-footer__inner">
          <Link href={engagementDetailHref} className="pfm-precall-footer__back prepare-for-meeting-back">
            {PREPARE_BACK_TO_ENGAGEMENT_LABEL}
          </Link>
          <div className="pfm-precall-footer__actions">
            <button
              type="button"
              className="prepare-for-meeting-footer-btn prepare-for-meeting-footer-btn--secondary pfm-precall-footer__save"
              disabled={busy}
              onClick={() => void handleSavePlan()}
            >
              {savingPlan ? "Saving…" : saveFlash ? "Saved" : PREPARE_SAVE_PLAN_LABEL}
            </button>
            <button
              type="button"
              className="prepare-for-meeting-footer-btn prepare-for-meeting-footer-btn--primary"
              disabled={busy}
              onClick={handleStartClick}
            >
              {starting ? "Starting…" : startEngagementLabel}
            </button>
          </div>
        </div>
      </footer>
      <div className="prepare-for-meeting-footer-spacer prepare-for-meeting-footer-spacer--precall" aria-hidden="true" />

      {emptyPlanDialogOpen ? (
        <div
          className="pfm-precall-dialog-backdrop"
          role="presentation"
          onClick={() => !starting && setEmptyPlanDialogOpen(false)}
        >
          <div
            className="pfm-precall-dialog"
            role="alertdialog"
            aria-labelledby="pfm-precall-empty-plan-title"
            aria-describedby="pfm-precall-empty-plan-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="pfm-precall-empty-plan-title" className="pfm-precall-dialog__title">
              {PREPARE_START_WITHOUT_PLAN_TITLE}
            </h2>
            <p id="pfm-precall-empty-plan-desc" className="pfm-precall-dialog__desc">
              {PREPARE_START_WITHOUT_PLAN_MESSAGE}
            </p>
            <div className="pfm-precall-dialog__actions">
              <button
                type="button"
                className="prepare-for-meeting-footer-btn prepare-for-meeting-footer-btn--secondary"
                disabled={starting}
                onClick={() => setEmptyPlanDialogOpen(false)}
              >
                {PREPARE_CONTINUE_PLANNING_LABEL}
              </button>
              <button
                type="button"
                className="prepare-for-meeting-footer-btn prepare-for-meeting-footer-btn--primary"
                disabled={starting}
                onClick={() => void startEngagementAfterSave()}
              >
                {starting ? "Starting…" : PREPARE_START_ANYWAY_LABEL}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
