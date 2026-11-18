"use client";

import Link from "next/link";
import React from "react";
import {
  FOLLOW_UP_OPPORTUNITY_LABEL,
  FIELD_BRIEFING_EDIT_BRIEF_LABEL,
  FIELD_BRIEFING_MISSION_GOAL_LABEL,
  OPERATIONAL_CAUTION_LABEL,
  TACTICAL_NOTES_LABEL,
} from "@/lib/surgical-sales/engagements/prepareFlowTerminology";
import type { PrepareFieldBriefing } from "@/lib/surgical-sales/engagements/buildPrepareFieldBriefing";
import type { PrepareWhatMattersMostLineId } from "@/lib/surgical-sales/engagements/buildPrepareWhatMattersMost";
import type { PrepareTodayPlanFields } from "@/lib/surgical-sales/engagements/prepareWhatMattersEditable";
import { readTodayMatterValueFromPlan } from "@/lib/surgical-sales/engagements/prepareWhatMattersEditable";
import type { FieldBriefingHighlightZone } from "@/lib/surgical-sales/engagements/tacticalDebriefSaveConfirmation";
import { asksForFieldExecution, handledTacticalAsks } from "@/lib/surgical-sales/engagements/prepareTacticalAsks";
import type { PrepareTacticalAsk } from "@/lib/surgical-sales/engagements/prepareTacticalAsks";
import { saveFieldBriefClient } from "@/lib/surgical-sales/engagements/prepareTacticalAsksClient";
import {
  PrepareFieldBriefEditor,
  type FieldBriefEditorQuestion,
} from "./PrepareFieldBriefEditor";
import { FieldBriefingQuestionQueue } from "./FieldBriefingQuestionQueue";
import { userFacingError } from "@/lib/errors/userFacingError";

const REFERENCE_SUMMARY_LABEL = "Reference — Open Only If Needed";
const REFERENCE_ACCOUNT_LABEL = "Account & counts";
const REFERENCE_INTELLIGENCE_LABEL = "On-file intelligence";
const REFERENCE_ACTIVITY_LABEL = "Activity timeline";
const REFERENCE_PREP_FLAGS_LABEL = "Additional prep flags";

function lineValue(brief: PrepareFieldBriefing, id: PrepareWhatMattersMostLineId): string {
  return brief.whatMattersMost.lines.find((l) => l.id === id)?.value ?? "";
}

function hasAccountSupporting(brief: PrepareFieldBriefing): boolean {
  const a = brief.supporting.account;
  return (
    a.metrics.length > 0 ||
    Boolean(a.opportunityLabel) ||
    a.officeLines.length > 0 ||
    Boolean(a.lastTouchLabel) ||
    Boolean(a.metaLine) ||
    a.chips.length > 0
  );
}

function hasIntelligenceSupporting(brief: PrepareFieldBriefing): boolean {
  const i = brief.supporting.intelligence;
  return i.lines.length > 0 || Boolean(i.contextLine) || Boolean(i.lastInsight);
}

function hasActivitySupporting(brief: PrepareFieldBriefing): boolean {
  return brief.supporting.activity.recentTeaser.length > 0;
}

function hasExtraFlagsSupporting(brief: PrepareFieldBriefing): boolean {
  const f = brief.supporting.extraFlags;
  return f.moreRisks.length > 0 || f.moreNextActions.length > 0;
}

function displayTacticalNoteLine(text: string): string {
  return String(text ?? "").trim();
}

function editorQuestionsFromAsks(asks: PrepareTacticalAsk[]): FieldBriefEditorQuestion[] {
  return asksForFieldExecution(asks).map((ask) => ({
    key: ask.id,
    id: ask.id,
    text: ask.text,
  }));
}

export function PrepareFieldBriefing({
  prepareOnly = false,
  brief,
  engagementId,
  engagementType,
  planFields,
  tacticalAsks,
  highlightZones = [],
  onTodayMatterSaved,
  onTodayMatterError,
}: {
  prepareOnly?: boolean;
  brief: PrepareFieldBriefing;
  engagementId: string;
  engagementType: string;
  planFields: PrepareTodayPlanFields;
  tacticalAsks: PrepareTacticalAsk[];
  highlightZones?: FieldBriefingHighlightZone[];
  onTodayMatterSaved: () => void | Promise<void>;
  onTodayMatterError: (message: string | null) => void;
}) {
  const zoneSet = React.useMemo(() => new Set(highlightZones), [highlightZones]);
  const [pulseActive, setPulseActive] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const [savingBrief, setSavingBrief] = React.useState(false);

  const missionGoalFallback = lineValue(brief, "discovery_goal");
  const missionGoalDisplay = React.useMemo(
    () =>
      readTodayMatterValueFromPlan(
        "discovery_goal",
        planFields,
        missionGoalFallback,
        engagementType,
      ),
    [planFields, missionGoalFallback, engagementType],
  );

  const [draftMissionGoal, setDraftMissionGoal] = React.useState(missionGoalDisplay);
  const [draftQuestions, setDraftQuestions] = React.useState<FieldBriefEditorQuestion[]>(() =>
    editorQuestionsFromAsks(tacticalAsks),
  );

  React.useEffect(() => {
    if (highlightZones.length === 0) {
      setPulseActive(false);
      return;
    }
    setPulseActive(true);
    const t = window.setTimeout(() => setPulseActive(false), 2800);
    return () => window.clearTimeout(t);
  }, [highlightZones]);

  React.useEffect(() => {
    if (!editMode) {
      setDraftMissionGoal(missionGoalDisplay);
      setDraftQuestions(editorQuestionsFromAsks(tacticalAsks));
    }
  }, [editMode, missionGoalDisplay, tacticalAsks]);

  const pulse = (zone: FieldBriefingHighlightZone) =>
    pulseActive && zoneSet.has(zone) ? " pfm-mission-zone--ai-highlight" : "";

  const watchRisk = lineValue(brief, "relationship_risk");
  const nextWin = lineValue(brief, "next_step_opportunity");

  const activeAsks = React.useMemo(() => asksForFieldExecution(tacticalAsks), [tacticalAsks]);
  const handledAsks = React.useMemo(() => handledTacticalAsks(tacticalAsks), [tacticalAsks]);
  const showHandledAsks = !prepareOnly && handledAsks.length > 0;

  const riskItems = React.useMemo(() => {
    const seen = new Set<string>();
    const items: string[] = [];
    const add = (raw: string) => {
      const t = displayTacticalNoteLine(raw);
      if (!t || seen.has(t)) return;
      seen.add(t);
      items.push(t);
    };
    add(watchRisk);
    for (const r of brief.risks.items) add(r);
    for (const r of brief.risks.moreItems) add(r);
    for (const r of brief.supporting.extraFlags.moreRisks) add(r);
    return items;
  }, [
    brief.risks.items,
    brief.risks.moreItems,
    brief.supporting.extraFlags.moreRisks,
    watchRisk,
  ]);

  const nextActions = React.useMemo(() => {
    const seen = new Set<string>();
    const items: string[] = [];
    const add = (raw: string) => {
      const t = displayTacticalNoteLine(raw);
      if (!t || seen.has(t)) return;
      seen.add(t);
      items.push(t);
    };
    add(nextWin);
    for (const a of brief.next.actions) add(a);
    for (const a of brief.supporting.extraFlags.moreNextActions) add(a);
    return items;
  }, [brief.next.actions, brief.supporting.extraFlags.moreNextActions, nextWin]);

  const showReference =
    hasAccountSupporting(brief) ||
    hasIntelligenceSupporting(brief) ||
    hasActivitySupporting(brief) ||
    hasExtraFlagsSupporting(brief);

  function enterEditMode() {
    setDraftMissionGoal(missionGoalDisplay);
    setDraftQuestions(editorQuestionsFromAsks(tacticalAsks));
    setEditMode(true);
    onTodayMatterError(null);
  }

  function cancelEditMode() {
    setDraftMissionGoal(missionGoalDisplay);
    setDraftQuestions(editorQuestionsFromAsks(tacticalAsks));
    setEditMode(false);
    onTodayMatterError(null);
  }

  async function saveBrief() {
    const trimmedGoal = draftMissionGoal.trim();
    const questions = draftQuestions
      .map((q) => ({ id: q.id, text: q.text.trim() }))
      .filter((q) => q.text.length > 0);
    if (!trimmedGoal) {
      onTodayMatterError("Enter a mission goal before saving.");
      return;
    }
    if (questions.length === 0) {
      onTodayMatterError("Add at least one question before saving.");
      return;
    }

    setSavingBrief(true);
    onTodayMatterError(null);
    try {
      const result = await saveFieldBriefClient(engagementId, {
        missionGoal: trimmedGoal,
        questions,
      });
      if (!result.ok) {
        onTodayMatterError(result.error);
        return;
      }
      setEditMode(false);
      await onTodayMatterSaved();
    } catch (e: unknown) {
      onTodayMatterError(userFacingError(e, "We could not save your changes. Please try again."));
    } finally {
      setSavingBrief(false);
    }
  }

  return (
    <div
      className={`pfm-mission pfm-field-briefing pfm-briefing-doc mc-body pfm-console-brief${prepareOnly ? " pfm-field-briefing--prepare-only pfm-mission--prepare" : " pfm-mission--execution"}${editMode ? " pfm-field-briefing--edit" : " pfm-field-briefing--mission"}`}
    >
      <div className="pfm-briefing-doc-head">
        {!editMode ? (
          <button
            type="button"
            className="pfm-briefing-edit-trigger"
            onClick={enterEditMode}
          >
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
          <div className="pfm-mission-stack pfm-mission-stack--primary pfm-briefing-section pfm-briefing-section--objective">
            <div className={`pfm-mission-zone-wrap${pulse("today")}`}>
              <section
                className="pfm-brief-mission-goal"
                aria-labelledby="pfm-brief-mission-goal"
              >
                <h2 id="pfm-brief-mission-goal" className="pfm-brief-mission-goal-label">
                  {FIELD_BRIEFING_MISSION_GOAL_LABEL}
                </h2>
                <p className="pfm-brief-mission-goal-value">
                  {missionGoalDisplay.trim() || "—"}
                </p>
              </section>
            </div>
          </div>

          <div className="pfm-mission-stack pfm-mission-stack--secondary pfm-briefing-section pfm-briefing-section--questions">
            <FieldBriefingQuestionQueue
              className={pulse("asks")}
              asks={tacticalAsks}
              emptyHint={brief.learn.emptyHint ?? ""}
            />
            {showHandledAsks ? (
              <details className="pfm-brief-handled">
                <summary className="pfm-brief-handled-summary">
                  Handled ({handledAsks.length})
                </summary>
                <ul className="pfm-brief-handled-list">
                  {handledAsks.map((ask) => (
                    <li key={ask.id}>{ask.text}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        </>
      )}

      {!prepareOnly ? (
      <div
        className="pfm-mission-stack pfm-mission-stack--tertiary pfm-briefing-section pfm-briefing-section--notes"
        aria-label={TACTICAL_NOTES_LABEL}
      >
        <section
          className={`pfm-mission-tertiary-block pfm-mission-tertiary-block--caution${pulse("risks")}`}
          aria-labelledby="pfm-mission-risks"
        >
          <h2 id="pfm-mission-risks" className="pfm-mission-tertiary-title">
            {OPERATIONAL_CAUTION_LABEL}
          </h2>
          {riskItems.length > 0 ? (
            <ul className="pfm-mission-tertiary-list">
              {riskItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="pfm-mission-tertiary-empty">{brief.risks.emptyHint}</p>
          )}
        </section>

        <section
          className={`pfm-mission-tertiary-block pfm-mission-tertiary-block--followup${pulse("next")}`}
          aria-labelledby="pfm-mission-next"
        >
          <h2 id="pfm-mission-next" className="pfm-mission-tertiary-title">
            {FOLLOW_UP_OPPORTUNITY_LABEL}
          </h2>
          {nextActions.length > 0 ? (
            <ul className="pfm-mission-tertiary-list">
              {nextActions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          ) : (
            <p className="pfm-mission-tertiary-empty">Lock a dated follow-up before you leave the site.</p>
          )}
        </section>
      </div>
      ) : null}

      {!prepareOnly && showReference ? (
        <details
          className={`pfm-mission-reference pfm-mission-reference--secondary pfm-briefing-supplement${pulse("reference")}`}
          open={pulseActive && zoneSet.has("reference") ? true : undefined}
        >
          <summary className="pfm-mission-reference-summary">{REFERENCE_SUMMARY_LABEL}</summary>
          <div className="pfm-mission-reference-body">
            {hasAccountSupporting(brief) ? (
              <details className="pfm-support-drawer">
                <summary className="pfm-support-drawer-summary">
                  <span className="pfm-support-drawer-title">{REFERENCE_ACCOUNT_LABEL}</span>
                  {brief.supporting.account.summaryLabel ? (
                    <span className="pfm-support-drawer-meta">{brief.supporting.account.summaryLabel}</span>
                  ) : null}
                </summary>
                <div className="pfm-support-drawer-body">
                  {brief.supporting.account.metaLine ? (
                    <p className="pfm-scan-detail-line">{brief.supporting.account.metaLine}</p>
                  ) : null}
                  {brief.supporting.account.chips.length > 0 ? (
                    <div className="pfm-brief-chips">
                      {brief.supporting.account.chips.map((c) => (
                        <span key={c} className="pfm-brief-chip">
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {brief.supporting.account.metrics.length > 0 ? (
                    <div className="pfm-brief-metrics pfm-brief-metrics--compact">
                      {brief.supporting.account.metrics.map((m) => (
                        <div key={m.label} className="pfm-brief-metric">
                          {m.href ? (
                            <Link href={m.href} className="pfm-brief-metric-value">
                              {m.value}
                            </Link>
                          ) : (
                            <span className="pfm-brief-metric-value">{m.value}</span>
                          )}
                          <span className="pfm-brief-metric-label">{m.label}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {brief.supporting.account.opportunityLabel ? (
                    <p className="pfm-scan-detail-line">
                      Opportunity:{" "}
                      {brief.supporting.account.opportunityHref ? (
                        <Link href={brief.supporting.account.opportunityHref}>
                          {brief.supporting.account.opportunityLabel}
                        </Link>
                      ) : (
                        brief.supporting.account.opportunityLabel
                      )}
                    </p>
                  ) : null}
                  {brief.supporting.account.officeLines.length > 0 ? (
                    <ul className="pfm-brief-dl">
                      {brief.supporting.account.officeLines.map((line) => (
                        <li key={line.label}>
                          <span className="pfm-brief-dl-k">{line.label}</span>
                          <span className="pfm-brief-dl-v">{line.value}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {brief.supporting.account.lastTouchLabel ? (
                    <p className="pfm-scan-detail-line">
                      Last touch:{" "}
                      {brief.supporting.account.lastTouchHref ? (
                        <Link href={brief.supporting.account.lastTouchHref}>
                          {brief.supporting.account.lastTouchLabel}
                        </Link>
                      ) : (
                        brief.supporting.account.lastTouchLabel
                      )}
                    </p>
                  ) : null}
                </div>
              </details>
            ) : null}

            {hasIntelligenceSupporting(brief) ? (
              <details className="pfm-support-drawer">
                <summary className="pfm-support-drawer-summary">
                  <span className="pfm-support-drawer-title">{REFERENCE_INTELLIGENCE_LABEL}</span>
                  {brief.supporting.intelligence.summaryLabel ? (
                    <span className="pfm-support-drawer-meta">{brief.supporting.intelligence.summaryLabel}</span>
                  ) : null}
                </summary>
                <div className="pfm-support-drawer-body">
                  {brief.supporting.intelligence.contextLine ? (
                    <p className="pfm-scan-detail-line pfm-scan-detail-line--muted">
                      {brief.supporting.intelligence.contextLine}
                    </p>
                  ) : null}
                  {brief.supporting.intelligence.lines.length > 0 ? (
                    <ul className="pfm-brief-intel">
                      {brief.supporting.intelligence.lines.map((row) => (
                        <li key={row.label}>
                          <span className="pfm-brief-intel-k">{row.label}</span>
                          <span className="pfm-brief-intel-v">{row.value}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {brief.supporting.intelligence.lastInsight ? (
                    <p className="pfm-scan-detail-line">
                      Latest:{" "}
                      {brief.supporting.intelligence.lastInsightHref ? (
                        <Link href={brief.supporting.intelligence.lastInsightHref}>
                          {brief.supporting.intelligence.lastInsight}
                        </Link>
                      ) : (
                        brief.supporting.intelligence.lastInsight
                      )}
                    </p>
                  ) : null}
                </div>
              </details>
            ) : null}

            {hasActivitySupporting(brief) ? (
              <details className="pfm-support-drawer">
                <summary className="pfm-support-drawer-summary">
                  <span className="pfm-support-drawer-title">{REFERENCE_ACTIVITY_LABEL}</span>
                  {brief.supporting.activity.summaryLabel ? (
                    <span className="pfm-support-drawer-meta">{brief.supporting.activity.summaryLabel}</span>
                  ) : null}
                </summary>
                <div className="pfm-support-drawer-body">
                  <ul className="pfm-brief-recent">
                    {brief.supporting.activity.recentTeaser.map((row) => (
                      <li key={row.id}>
                        {row.href ? (
                          <Link href={row.href}>
                            <span className="pfm-brief-recent-title">{row.title}</span>
                            <span className="pfm-brief-recent-date">{row.atLabel}</span>
                          </Link>
                        ) : (
                          <>
                            <span className="pfm-brief-recent-title">{row.title}</span>
                            <span className="pfm-brief-recent-date">{row.atLabel}</span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                  <Link href={brief.supporting.activity.timelineHref} className="pfm-support-drawer-link">
                    Full timeline
                  </Link>
                </div>
              </details>
            ) : null}

            {hasExtraFlagsSupporting(brief) ? (
              <details className="pfm-support-drawer">
                <summary className="pfm-support-drawer-summary">
                  <span className="pfm-support-drawer-title">{REFERENCE_PREP_FLAGS_LABEL}</span>
                  {brief.supporting.extraFlags.summaryLabel ? (
                    <span className="pfm-support-drawer-meta">{brief.supporting.extraFlags.summaryLabel}</span>
                  ) : null}
                </summary>
                <div className="pfm-support-drawer-body">
                  {brief.supporting.extraFlags.moreRisks.length > 0 ? (
                    <div className="pfm-reference-flags-group">
                      <p className="pfm-reference-flags-kicker">Additional cautions</p>
                      <ul className="pfm-mission-tertiary-list">
                        {brief.supporting.extraFlags.moreRisks.map((item) => (
                          <li key={item}>{displayTacticalNoteLine(item)}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {brief.supporting.extraFlags.moreNextActions.length > 0 ? (
                    <div className="pfm-reference-flags-group">
                      <p className="pfm-reference-flags-kicker">Additional follow-ups</p>
                      <ul className="pfm-mission-tertiary-list">
                        {brief.supporting.extraFlags.moreNextActions.map((action) => (
                          <li key={action}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </details>
            ) : null}

          </div>
        </details>
      ) : null}
    </div>
  );
}
