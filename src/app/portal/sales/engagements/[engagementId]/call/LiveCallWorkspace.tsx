"use client";

import React from "react";

import { PortalMobileMenuButton } from "@/components/portal/PortalMobileMenuButton";
import {
  EngagementRepLifecycleStrip,
} from "@/components/sales/EngagementRepLifecycleStrip";

import type { PrepareForMeetingView } from "@/lib/surgical-sales/engagements/buildPrepareForMeetingView";
import { buildActiveProviderDebriefGuide } from "@/lib/surgical-sales/engagements/buildActiveProviderDebriefGuide";
import { buildLiveEngagementCheatSheet } from "@/lib/surgical-sales/engagements/buildLiveEngagementCheatSheet";
import { isProviderDebriefEngagement } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";
import { ActiveProviderDebriefWorkspace } from "./ActiveProviderDebriefWorkspace";
import { isIntroCallPathwayMission } from "@/lib/surgical-sales/engagements/introCallPathwayMission";
import {
  FIELD_BRIEFING_EDIT_BRIEF_LABEL,
  FIELD_BRIEFING_MISSION_GOAL_LABEL,
  ACTIVE_ENGAGEMENT_END_LABEL,
  ACTIVE_ENGAGEMENT_EXECUTION_KICKER,
  ACTIVE_ENGAGEMENT_OUTCOME_SECTION_LABEL,
  ACTIVE_ENGAGEMENT_PRIMARY_QUESTION_LABEL,
  ACTIVE_ENGAGEMENT_SECONDARY_QUESTIONS_LABEL,
  INTRO_CALL_ACTIVE_DEBRIEF_NEXT_HINT,
  INTRO_CALL_END_LABEL,
} from "@/lib/surgical-sales/engagements/prepareFlowTerminology";
import { beginEngagementCallClient } from "@/lib/surgical-sales/engagements/beginEngagementCallClient";
import {
  asksForFieldExecution,
  type PrepareTacticalAsk,
} from "@/lib/surgical-sales/engagements/prepareTacticalAsks";
import { saveFieldBriefClient } from "@/lib/surgical-sales/engagements/prepareTacticalAsksClient";
import type { StartMissionOutcomeId } from "@/lib/surgical-sales/engagements/startMissionConfig";

import {
  PrepareFieldBriefEditor,
  type FieldBriefEditorQuestion,
} from "../prepare/PrepareFieldBriefEditor";
import { userFacingError } from "@/lib/errors/userFacingError";

function editorQuestionsFromAsks(asks: PrepareTacticalAsk[]): FieldBriefEditorQuestion[] {
  return asksForFieldExecution(asks).map((ask) => ({
    key: ask.id,
    id: ask.id,
    text: ask.text,
  }));
}

export function LiveCallWorkspace({
  engagementId,
  data,
  onReload,
  onError,
  onEndEngagement,
  endingEngagement = false,
}: {
  engagementId: string;
  data: PrepareForMeetingView;
  onReload: () => void | Promise<void>;
  onError: (message: string | null) => void;
  onEndEngagement: (outcomeId: StartMissionOutcomeId | null, liveNotes: string) => void | Promise<void>;
  endingEngagement?: boolean;
}) {
  const debriefGuide = React.useMemo(() => {
    if (!isProviderDebriefEngagement(data.upcoming_engagement.engagement_type)) return null;
    return buildActiveProviderDebriefGuide(data);
  }, [data]);

  const sheet = React.useMemo(() => buildLiveEngagementCheatSheet(data), [data]);
  const isIntroCallDebriefFirst = isIntroCallPathwayMission(data.upcoming_engagement.engagement_type);
  const [selectedOutcomeId, setSelectedOutcomeId] = React.useState<StartMissionOutcomeId | null>(
    sheet.outcomeId ?? sheet.suggestedOutcomeId,
  );
  const [editMode, setEditMode] = React.useState(false);
  const [savingBrief, setSavingBrief] = React.useState(false);
  const [draftMissionGoal, setDraftMissionGoal] = React.useState(sheet.missionGoal);
  const [draftQuestions, setDraftQuestions] = React.useState<FieldBriefEditorQuestion[]>(() =>
    editorQuestionsFromAsks(data.tactical_asks),
  );
  const sessionReadyRef = React.useRef(false);

  React.useEffect(() => {
    if (sheet.outcomeId) setSelectedOutcomeId(sheet.outcomeId);
    else if (sheet.suggestedOutcomeId) setSelectedOutcomeId(sheet.suggestedOutcomeId);
  }, [sheet.outcomeId, sheet.suggestedOutcomeId]);

  React.useEffect(() => {
    if (!editMode) {
      setDraftMissionGoal(sheet.missionGoal);
      setDraftQuestions(editorQuestionsFromAsks(data.tactical_asks));
    }
  }, [editMode, sheet.missionGoal, data.tactical_asks]);

  React.useEffect(() => {
    if (sessionReadyRef.current || data.live_session) {
      sessionReadyRef.current = true;
      return;
    }
    if (data.upcoming_engagement.status !== "in_progress") return;

    let cancelled = false;

    void (async () => {
      const result = await beginEngagementCallClient(engagementId);
      if (cancelled) return;
      sessionReadyRef.current = true;
      if (!result.ok) {
        onError(result.message);
        return;
      }
      await onReload();
    })();

    return () => {
      cancelled = true;
    };
  }, [data.live_session, data.upcoming_engagement.status, engagementId, onError, onReload]);

  const visitClosed = sheet.outcomeRecorded && data.upcoming_engagement.status === "completed";
  const endActionLabel = isIntroCallDebriefFirst ? INTRO_CALL_END_LABEL : ACTIVE_ENGAGEMENT_END_LABEL;
  const briefingLocked = visitClosed || endingEngagement;

  function enterEditMode() {
    setDraftMissionGoal(sheet.missionGoal);
    setDraftQuestions(editorQuestionsFromAsks(data.tactical_asks));
    setEditMode(true);
    onError(null);
  }

  function cancelEditMode() {
    setDraftMissionGoal(sheet.missionGoal);
    setDraftQuestions(editorQuestionsFromAsks(data.tactical_asks));
    setEditMode(false);
    onError(null);
  }

  async function saveBrief() {
    const trimmedGoal = draftMissionGoal.trim();
    const questions = draftQuestions
      .map((q) => ({ id: q.id, text: q.text.trim() }))
      .filter((q) => q.text.length > 0);
    if (!trimmedGoal) {
      onError("Enter a mission goal before saving.");
      return;
    }
    if (questions.length === 0) {
      onError("Add at least one question before saving.");
      return;
    }

    setSavingBrief(true);
    onError(null);
    try {
      const result = await saveFieldBriefClient(engagementId, {
        missionGoal: trimmedGoal,
        questions,
      });
      if (!result.ok) {
        onError(result.error);
        return;
      }
      setEditMode(false);
      await onReload();
    } catch (e: unknown) {
      onError(userFacingError(e, "We could not save your changes. Please try again."));
    } finally {
      setSavingBrief(false);
    }
  }

  if (debriefGuide) {
    return (
      <ActiveProviderDebriefWorkspace
        engagementId={engagementId}
        guide={debriefGuide}
        data={data}
        providerHref={data.provider_href}
        onReload={onReload}
        onError={onError}
        onEndEngagement={onEndEngagement}
        endingEngagement={endingEngagement}
      />
    );
  }

  return (
    <article className="live-call-workspace" aria-label="Active engagement workspace">
      <header className="live-call-workspace__header">
        <div className="live-call-workspace__bar">
          <PortalMobileMenuButton className="sales-cmd-mobile-menu" />
          <span className="live-call-workspace__kicker">{ACTIVE_ENGAGEMENT_EXECUTION_KICKER}</span>
          {!briefingLocked && !editMode ? (
            <button
              type="button"
              className="live-call-workspace__edit-brief"
              onClick={enterEditMode}
            >
              {FIELD_BRIEFING_EDIT_BRIEF_LABEL}
            </button>
          ) : null}
        </div>
        <h1 className="live-call-workspace__provider">{sheet.providerName}</h1>
        <span className="live-call-workspace__type">{sheet.engagementTypeLabel}</span>
      </header>

      <EngagementRepLifecycleStrip
        phase="active"
        nextActionLabel={visitClosed ? null : endActionLabel}
      />

      {editMode ? (
        <section
          className="live-call-workspace__card live-call-workspace__card--brief-edit"
          aria-label="Edit briefing"
        >
          <PrepareFieldBriefEditor
            missionGoal={draftMissionGoal}
            questions={draftQuestions}
            saving={savingBrief}
            onMissionGoalChange={setDraftMissionGoal}
            onQuestionsChange={setDraftQuestions}
            onSave={saveBrief}
            onCancel={cancelEditMode}
          />
        </section>
      ) : (
        <>
          <section
            className="live-call-workspace__card live-call-workspace__card--goal"
            aria-labelledby="live-call-goal"
          >
            <h2 id="live-call-goal" className="live-call-workspace__label">
              {FIELD_BRIEFING_MISSION_GOAL_LABEL}
            </h2>
            <p className="live-call-workspace__goal">{sheet.missionGoal}</p>
          </section>

          <section
            className="live-call-workspace__card live-call-workspace__card--primary"
            aria-labelledby="live-call-primary"
          >
            <h2 id="live-call-primary" className="live-call-workspace__label">
              {ACTIVE_ENGAGEMENT_PRIMARY_QUESTION_LABEL}
            </h2>
            <p className="live-call-workspace__primary">{sheet.primaryQuestion}</p>
          </section>

          <details className="live-call-workspace__secondary">
            <summary className="live-call-workspace__secondary-summary">
              {ACTIVE_ENGAGEMENT_SECONDARY_QUESTIONS_LABEL}
              <span className="live-call-workspace__secondary-count">
                {sheet.secondaryQuestions.length}
              </span>
            </summary>
            {sheet.secondaryQuestions.length > 0 ? (
              <ol className="live-call-workspace__secondary-list">
                {sheet.secondaryQuestions.map((question) => (
                  <li key={question} className="live-call-workspace__secondary-item">
                    {question}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="live-call-workspace__secondary-empty">
                No secondary questions on this briefing.
              </p>
            )}
          </details>
        </>
      )}

      <section
        className="live-call-workspace__card live-call-workspace__card--decision"
        aria-labelledby="live-call-decision"
      >
        {isIntroCallDebriefFirst ? (
          <div className="live-call-workspace__decision-panel live-call-workspace__decision-panel--intro">
            <p className="live-call-workspace__intro-debrief-hint">{INTRO_CALL_ACTIVE_DEBRIEF_NEXT_HINT}</p>
            <button
              type="button"
              className="live-call-workspace__end-engagement"
              disabled={endingEngagement || editMode}
              onClick={() => {
                void onEndEngagement(null, "");
              }}
            >
              {endingEngagement ? "Ending…" : INTRO_CALL_END_LABEL}
            </button>
          </div>
        ) : (
          <>
            <h2 id="live-call-decision" className="live-call-workspace__decision-title">
              {ACTIVE_ENGAGEMENT_OUTCOME_SECTION_LABEL}
            </h2>

            {visitClosed && sheet.outcomeLabel ? (
              <p className="live-call-workspace__outcome-recorded">Recorded: {sheet.outcomeLabel}</p>
            ) : (
              <div className="live-call-workspace__decision-panel">
                <div
                  className="live-call-workspace__outcome-options"
                  role="radiogroup"
                  aria-labelledby="live-call-decision"
                >
                  {sheet.outcomes.map((outcome) => (
                    <label
                      key={outcome.id}
                      className={`live-call-workspace__outcome-option live-call-workspace__outcome-option--${outcome.tone}${selectedOutcomeId === outcome.id ? " live-call-workspace__outcome-option--selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="live-call-outcome"
                        className="live-call-workspace__outcome-radio"
                        value={outcome.id}
                        checked={selectedOutcomeId === outcome.id}
                        disabled={endingEngagement || editMode}
                        onChange={() => setSelectedOutcomeId(outcome.id)}
                      />
                      <span className="live-call-workspace__outcome-option-label">{outcome.label}</span>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  className="live-call-workspace__end-engagement"
                  disabled={!selectedOutcomeId || endingEngagement || editMode}
                  onClick={() => {
                    if (!selectedOutcomeId) return;
                    void onEndEngagement(selectedOutcomeId, "");
                  }}
                >
                  {endingEngagement ? "Ending…" : ACTIVE_ENGAGEMENT_END_LABEL}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </article>
  );
}
