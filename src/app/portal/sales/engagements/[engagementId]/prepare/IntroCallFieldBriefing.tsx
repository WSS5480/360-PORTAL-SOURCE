"use client";

import React from "react";
import { PortalMobileMenuButton } from "@/components/portal/PortalMobileMenuButton";
import { BeginCallButton } from "@/components/sales/BeginCallButton";
import { PROVIDER_MISSION_BRIEF_KICKER } from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import {
  buildIntroCallFieldBriefingKnownInfo,
  introCallKnownInfoHasContent,
} from "@/lib/surgical-sales/engagements/buildIntroCallFieldBriefingKnownInfo";
import {
  resolveIntroCallMissionGoalDisplay,
} from "@/lib/surgical-sales/engagements/introCallPathwayMission";
import type { PrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";
import type { PrepareRecentActivityFeed } from "@/lib/surgical-sales/engagements/prepareForMeetingRecentActivity";
import type { PrepareTodayPlanFields } from "@/lib/surgical-sales/engagements/prepareWhatMattersEditable";
import {
  asksForFieldExecution,
  type PrepareTacticalAsk,
} from "@/lib/surgical-sales/engagements/prepareTacticalAsks";
import { saveFieldBriefClient } from "@/lib/surgical-sales/engagements/prepareTacticalAsksClient";
import {
  FIELD_BRIEFING_EDIT_BRIEF_LABEL,
  FIELD_BRIEFING_EDIT_MODE_KICKER,
  FIELD_BRIEFING_MISSION_GOAL_LABEL,
  FIELD_BRIEFING_PREPARE_MODE_KICKER,
  INTRO_CALL_BRIEFING_NEXT_ACTION_LABEL,
} from "@/lib/surgical-sales/engagements/prepareFlowTerminology";
import {
  PrepareFieldBriefEditor,
  type FieldBriefEditorQuestion,
} from "./PrepareFieldBriefEditor";
import { FieldBriefingQuestionQueue } from "./FieldBriefingQuestionQueue";
import { userFacingError } from "@/lib/errors/userFacingError";

const KNOWN_INFORMATION_LABEL = "Known information";

function editorQuestionsFromAsks(asks: PrepareTacticalAsk[]): FieldBriefEditorQuestion[] {
  return asksForFieldExecution(asks).map((ask) => ({
    key: ask.id,
    id: ask.id,
    text: ask.text,
  }));
}

export function IntroCallFieldBriefing({
  prepareOnly = false,
  engagementId,
  providerName,
  organizationName,
  engagementTypeLabel,
  datetimeLabel,
  specialty,
  locationLabel,
  knownIntelligence,
  recentActivity,
  lastEngagementTitle,
  lastEngagementDateLabel,
  planFields,
  tacticalAsks,
  onBriefingSaved,
  onBriefingError,
  onCallBegun,
}: {
  prepareOnly?: boolean;
  engagementId: string;
  providerName: string;
  organizationName: string | null;
  engagementTypeLabel: string;
  datetimeLabel?: string | null;
  specialty: string | null;
  locationLabel: string | null;
  knownIntelligence: PrepareKnownIntelligence;
  recentActivity: PrepareRecentActivityFeed;
  lastEngagementTitle: string | null;
  lastEngagementDateLabel: string | null;
  planFields: PrepareTodayPlanFields;
  tacticalAsks: PrepareTacticalAsk[];
  onBriefingSaved: () => void | Promise<void>;
  onBriefingError: (message: string | null) => void;
  onCallBegun?: () => void | Promise<void>;
}) {
  const [editMode, setEditMode] = React.useState(false);
  const [savingBrief, setSavingBrief] = React.useState(false);

  const missionGoalDisplay = React.useMemo(
    () => resolveIntroCallMissionGoalDisplay(planFields.observation_goal),
    [planFields.observation_goal],
  );

  const [draftMissionGoal, setDraftMissionGoal] = React.useState(missionGoalDisplay);
  const [draftQuestions, setDraftQuestions] = React.useState<FieldBriefEditorQuestion[]>(() =>
    editorQuestionsFromAsks(tacticalAsks),
  );

  React.useEffect(() => {
    if (!editMode) {
      setDraftMissionGoal(missionGoalDisplay);
      setDraftQuestions(editorQuestionsFromAsks(tacticalAsks));
    }
  }, [editMode, missionGoalDisplay, tacticalAsks]);

  const knownRows = React.useMemo(
    () =>
      buildIntroCallFieldBriefingKnownInfo({
        organizationName,
        locationLabel,
        specialty,
        knownIntelligence,
        recentActivity,
        lastEngagementTitle,
        lastEngagementDateLabel,
      }),
    [
      organizationName,
      locationLabel,
      specialty,
      knownIntelligence,
      recentActivity,
      lastEngagementTitle,
      lastEngagementDateLabel,
    ],
  );
  const hasKnownInfo = introCallKnownInfoHasContent(knownRows);
  const hospitalLine = [organizationName, locationLabel].filter(Boolean).join(" · ");

  function enterEditMode() {
    setDraftMissionGoal(missionGoalDisplay);
    setDraftQuestions(editorQuestionsFromAsks(tacticalAsks));
    setEditMode(true);
    onBriefingError(null);
  }

  function cancelEditMode() {
    setDraftMissionGoal(missionGoalDisplay);
    setDraftQuestions(editorQuestionsFromAsks(tacticalAsks));
    setEditMode(false);
    onBriefingError(null);
  }

  async function saveBrief() {
    const trimmedGoal = draftMissionGoal.trim();
    const questions = draftQuestions
      .map((q) => ({ id: q.id, text: q.text.trim() }))
      .filter((q) => q.text.length > 0);
    if (!trimmedGoal) {
      onBriefingError("Enter a mission goal before saving.");
      return;
    }
    if (questions.length === 0) {
      onBriefingError("Add at least one question before saving.");
      return;
    }

    setSavingBrief(true);
    onBriefingError(null);
    try {
      const result = await saveFieldBriefClient(engagementId, {
        missionGoal: trimmedGoal,
        questions,
      });
      if (!result.ok) {
        onBriefingError(result.error);
        return;
      }
      setEditMode(false);
      await onBriefingSaved();
    } catch (e: unknown) {
      onBriefingError(userFacingError(e, "We could not save your changes. Please try again."));
    } finally {
      setSavingBrief(false);
    }
  }

  return (
    <article
      className={`pfm-exec-briefing mc-body pfm-field-briefing${prepareOnly ? " pfm-field-briefing--prepare-only" : ""}${editMode ? " pfm-field-briefing--edit" : " pfm-field-briefing--mission"}`}
      aria-label="Field briefing"
    >
      {!prepareOnly ? (
      <header className="pfm-exec-briefing__hero mc-deck mc-deck--inset">
        <div className="mc-deck__inner">
          <div className="mc-deck__bar pfm-exec-briefing__hero-bar">
            <div className="mc-deck__nav">
              <PortalMobileMenuButton className="sales-cmd-mobile-menu" />
            </div>
            <div className="mc-deck__actions pfm-exec-briefing__hero-actions">
              <span className="mc-deck__type mc-badge mc-badge--stage">{engagementTypeLabel}</span>
              <span
                className={`pfm-exec-briefing__mode-pill${editMode ? " pfm-exec-briefing__mode-pill--edit" : ""}`}
              >
                {editMode ? FIELD_BRIEFING_EDIT_MODE_KICKER : FIELD_BRIEFING_PREPARE_MODE_KICKER}
              </span>
            </div>
          </div>
          <p className="mc-deck__kicker">{PROVIDER_MISSION_BRIEF_KICKER}</p>
          <h1 className="mc-deck__name pfm-exec-briefing__provider">{providerName}</h1>
          {hospitalLine ? (
            <p className="mc-deck__meta pfm-exec-briefing__site">{hospitalLine}</p>
          ) : null}
          {specialty ? (
            <p className="mc-deck__meta mc-deck__meta--muted pfm-exec-briefing__specialty">{specialty}</p>
          ) : null}
          {datetimeLabel ? (
            <div className="mc-deck__visit pfm-exec-briefing__visit-meta">
              <span className="mc-deck__when">{datetimeLabel}</span>
            </div>
          ) : null}
        </div>
      </header>
      ) : null}

      <div className="pfm-briefing-doc-head pfm-exec-briefing__doc-head">
        {!editMode ? (
          <button type="button" className="pfm-briefing-edit-trigger" onClick={enterEditMode}>
            {FIELD_BRIEFING_EDIT_BRIEF_LABEL}
          </button>
        ) : null}
      </div>

      {editMode ? (
        <div className="pfm-mission-stack pfm-mission-stack--primary pfm-briefing-section pfm-briefing-section--edit">
          <PrepareFieldBriefEditor
            missionGoal={draftMissionGoal}
            questions={draftQuestions}
            saving={savingBrief}
            onMissionGoalChange={setDraftMissionGoal}
            onQuestionsChange={setDraftQuestions}
            onSave={saveBrief}
            onCancel={cancelEditMode}
          />
        </div>
      ) : (
        <>
          <section className="pfm-exec-briefing__goal" aria-labelledby="pfm-exec-briefing-goal">
            <h2 id="pfm-exec-briefing-goal" className="pfm-exec-briefing__goal-label mc-section__title">
              {FIELD_BRIEFING_MISSION_GOAL_LABEL}
            </h2>
            <p className="pfm-exec-briefing__goal-value">{missionGoalDisplay}</p>
          </section>

          <FieldBriefingQuestionQueue
            className="pfm-exec-briefing__queue"
            asks={tacticalAsks}
            emptyHint="Add questions in Edit Briefing to build your game plan for this intro."
          />

          {!prepareOnly ? (
            <section className="pfm-exec-briefing__launch" aria-label="Execute">
              <BeginCallButton
                engagementId={engagementId}
                label={INTRO_CALL_BRIEFING_NEXT_ACTION_LABEL}
                className="pfm-exec-briefing__launch-btn mc-cta mc-cta--primary"
                navigateOnBegin
                onBegun={onCallBegun}
              />
            </section>
          ) : null}

          {!prepareOnly && hasKnownInfo ? (
            <details className="pfm-exec-briefing__known">
              <summary className="pfm-exec-briefing__known-summary">{KNOWN_INFORMATION_LABEL}</summary>
              <dl className="pfm-exec-briefing__known-grid">
                {knownRows.map((row) => (
                  <div key={row.id} className="pfm-exec-briefing__known-row">
                    <dt>{row.label}</dt>
                    <dd>{row.value?.trim() || "—"}</dd>
                  </div>
                ))}
              </dl>
            </details>
          ) : !prepareOnly ? (
            <details className="pfm-exec-briefing__known pfm-exec-briefing__known--empty">
              <summary className="pfm-exec-briefing__known-summary">{KNOWN_INFORMATION_LABEL}</summary>
              <p className="pfm-exec-briefing__known-empty">No captured intelligence yet for this site.</p>
            </details>
          ) : null}
        </>
      )}
    </article>
  );
}
