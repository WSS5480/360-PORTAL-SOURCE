"use client";

import React from "react";
import { commercializationPathwayLabel } from "@/lib/surgical-sales/engagements/buildIntroCallCommercializationSignals";
import type { IntroCallCommercializationSignals } from "@/lib/surgical-sales/engagements/buildIntroCallCommercializationSignals";
import { PREP_CONTEXT_OBSERVATION_LEAD } from "@/lib/surgical-sales/engagements/engagementPreparationContextContent";
import type { PreparationContextView } from "@/lib/surgical-sales/engagements/engagementPreparationContextContent";
import type { EngagementPrepModeView } from "@/lib/surgical-sales/engagements/engagementPrepMode";
import { formatFutureObservationGoalsForField } from "@/lib/surgical-sales/engagements/buildIntroCallFutureObservationGoals";
import {
  discoveryQuestionsWorkflowFieldKey,
  formatDiscoveryQuestionsForField,
} from "@/lib/surgical-sales/engagements/prepareForMeetingSuggestedDiscovery";
import { openingStatementWorkflowFieldKey } from "@/lib/surgical-sales/engagements/prepareForMeetingSuggestedOpening";
import type { EngagementWorkflowDraft } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";
import type { EngagementWizardPrepView } from "@/lib/surgical-sales/engagements/loadEngagementWizardPrepView";
import { PrepEngagementModeSelector } from "./PrepEngagementModeSelector";
import { PrepProductFocusSelector } from "./PrepProductFocusSelector";

export const PREP_COMPACT_GOAL_TITLE = "Interaction goal";
export const PREP_COMPACT_QUESTIONS_TITLE = "Key questions";
export const PREP_COMPACT_SIGNALS_TITLE = "Signals to validate";
export const PREP_COMPACT_NEXT_STEP_TITLE = "Next best step";
export const PREP_COMPACT_OPTIONAL_OBSERVATION = "Observation planning";
export const PREP_COMPACT_OPTIONAL_PRODUCT = "Product fit";
export function PrepOptionalPanel({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <details
      className="ew-prep-optional"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="ew-prep-optional-summary">
        <span className="ew-prep-optional-title">{title}</span>
        {hint ? <span className="ew-prep-optional-hint">{hint}</span> : null}
      </summary>
      <div className="ew-prep-optional-body">{children}</div>
    </details>
  );
}

function PrepCompactSection({
  title,
  actionLabel,
  onAction,
  disabled,
  hidden,
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
  hidden?: boolean;
  children: React.ReactNode;
}) {
  if (hidden) return null;
  return (
    <section className="ew-prep-compact-section" aria-label={title}>
      <div className="ew-prep-compact-section-head">
        <h3 className="ew-prep-compact-section-title">{title}</h3>
        {actionLabel && onAction ? (
          <button type="button" className="ew-prep-compact-action" disabled={disabled} onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
      <div className="ew-prep-compact-section-body">{children}</div>
    </section>
  );
}

type SignalRow = { key: string; text: string; pathway?: string };

function buildSignalRows(
  commercialization: IntroCallCommercializationSignals | null | undefined,
  talkingPoints: string[],
): SignalRow[] {
  if (commercialization?.signals?.length) {
    return commercialization.signals.map((s) => ({
      key: s.key,
      text: s.text,
      pathway: s.pathway,
    }));
  }
  return talkingPoints.slice(0, 4).map((text, i) => ({
    key: `talk-${i}`,
    text,
    pathway: "observable",
  }));
}

export function IntroCallCompactPrepPlan({
  prep,
  prepLoading,
  disabled,
  isOfficeVisit,
  engagementType,
  workflowDraft,
  onWorkflowDraftChange,
  engagementPrepMode,
  prepMode,
  onPrepModeChange,
  productLine,
  onProductLineChange,
  providerSpecialty,
  opportunityProductLine,
  canApplySuggestedPlan,
  onApplySuggestedPlan,
  prepContext,
  productFitContent,
  manualCustomizeSlot,
}: {
  prep: EngagementWizardPrepView;
  prepLoading: boolean;
  disabled?: boolean;
  isOfficeVisit: boolean;
  engagementType: string;
  workflowDraft: EngagementWorkflowDraft;
  onWorkflowDraftChange: (draft: EngagementWorkflowDraft) => void;
  engagementPrepMode: EngagementPrepModeView | null;
  prepMode: string;
  onPrepModeChange?: (mode: string) => void;
  productLine: string;
  onProductLineChange?: (line: string) => void;
  providerSpecialty?: string | null;
  opportunityProductLine?: string | null;
  canApplySuggestedPlan?: boolean;
  onApplySuggestedPlan?: () => void;
  prepContext: PreparationContextView | null;
  productFitContent?: React.ReactNode;
  manualCustomizeSlot?: React.ReactNode;
}) {
  const prepUi = engagementPrepMode?.ui;
  const goal = prep.suggested_goal;
  const discovery = prep.suggested_discovery;
  const discoveryQuestions = (discovery?.questions ?? []).slice(0, 5);
  const talkingPoints = prep.suggested_talking_points.points.slice(0, 4);
  const opening = prep.suggested_opening;
  const observationGoals =
    prepUi?.show_observation_goals ? (prep.future_observation_goals?.items ?? []).slice(0, 5) : [];
  const commercialization = prep.commercialization_signals;
  const signalRows = buildSignalRows(
    prepUi?.show_workflow_signals ? commercialization : null,
    prepUi?.show_talking_points !== false ? talkingPoints : [],
  );

  const nextBestStep =
    (prepUi?.show_success_outcomes && prepContext?.success_outcomes[0]) ||
    opening?.statement?.trim() ||
    talkingPoints[0] ||
    null;

  const applyGoal = React.useCallback(() => {
    if (!goal?.goal) return;
    onWorkflowDraftChange({ ...workflowDraft, observation_goal: goal.goal });
  }, [goal, workflowDraft, onWorkflowDraftChange]);

  const applyDiscovery = React.useCallback(() => {
    if (discoveryQuestions.length === 0) return;
    const key = discoveryQuestionsWorkflowFieldKey(isOfficeVisit);
    onWorkflowDraftChange({
      ...workflowDraft,
      [key]: formatDiscoveryQuestionsForField(discovery?.questions ?? []),
    });
  }, [discovery, discoveryQuestions.length, isOfficeVisit, workflowDraft, onWorkflowDraftChange]);

  const applyOpening = React.useCallback(() => {
    const statement = opening?.statement?.trim();
    if (!statement) return;
    const key = openingStatementWorkflowFieldKey(engagementType, false);
    onWorkflowDraftChange({ ...workflowDraft, [key]: statement });
  }, [opening, engagementType, workflowDraft, onWorkflowDraftChange]);

  const applyObservationGoals = React.useCallback(() => {
    if (observationGoals.length === 0) return;
    const block = formatFutureObservationGoalsForField(observationGoals);
    const existing = String(workflowDraft.pre_observation_additional_notes ?? "").trim();
    const merged = existing
      ? `${existing}\n\nFuture observation goals:\n${block}`
      : `Future observation goals:\n${block}`;
    onWorkflowDraftChange({ ...workflowDraft, pre_observation_additional_notes: merged });
  }, [observationGoals, workflowDraft, onWorkflowDraftChange]);

  const showGoal = prepUi?.show_objective !== false && Boolean(goal?.goal);
  const showQuestions = prepUi?.show_discovery_questions !== false && discoveryQuestions.length > 0;
  const showSignals = signalRows.length > 0;
  const showNext = Boolean(nextBestStep) || Boolean(opening?.statement);

  const hasObservationOptional = observationGoals.length > 0;
  const hasProductOptional =
    Boolean(onPrepModeChange) ||
    Boolean(onProductLineChange && prepUi?.show_product_focus_selector) ||
    Boolean(productFitContent);

  if (prepLoading) {
    return <p className="ew-prep-compact-status">Building your prep plan…</p>;
  }

  return (
    <div
      className={`ew-prep-compact ew-prep-compact--${engagementPrepMode?.mode ?? "default"}`}
      aria-label="Preparation plan"
    >
      <div className="ew-prep-compact-head">
        {engagementPrepMode ? (
          <span className="ew-prep-compact-mode-chip" title={engagementPrepMode.summary}>
            {engagementPrepMode.label}
          </span>
        ) : null}
        {canApplySuggestedPlan && onApplySuggestedPlan ? (
          <button
            type="button"
            className="ew-prep-compact-apply-all"
            disabled={disabled}
            onClick={onApplySuggestedPlan}
          >
            Apply all
          </button>
        ) : null}
      </div>

      <div className="ew-prep-compact-core">
        <PrepCompactSection
          title={PREP_COMPACT_GOAL_TITLE}
          actionLabel={showGoal ? "Use goal" : undefined}
          onAction={applyGoal}
          disabled={disabled}
          hidden={!showGoal}
        >
          <p className="ew-prep-compact-goal">{goal?.goal}</p>
          {goal?.why ? <p className="ew-prep-compact-why">{goal.why}</p> : null}
        </PrepCompactSection>

        <PrepCompactSection
          title={PREP_COMPACT_QUESTIONS_TITLE}
          actionLabel={showQuestions ? "Use questions" : undefined}
          onAction={applyDiscovery}
          disabled={disabled}
          hidden={!showQuestions}
        >
          <ol className="ew-prep-compact-list ew-prep-compact-list--numbered">
            {discoveryQuestions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </PrepCompactSection>

        <PrepCompactSection title={PREP_COMPACT_SIGNALS_TITLE} hidden={!showSignals}>
          <ul className="ew-prep-compact-list ew-prep-compact-signals">
            {signalRows.map((row) => (
              <li key={row.key} className="ew-prep-compact-signal">
                {row.pathway ? (
                  <span className={`ew-prep-compact-signal-tag ew-prep-compact-signal-tag--${row.pathway}`}>
                    {commercializationPathwayLabel(
                      row.pathway as "observable" | "evaluatable" | "adoptable",
                    )}
                  </span>
                ) : null}
                <span className="ew-prep-compact-signal-text">{row.text}</span>
              </li>
            ))}
          </ul>
        </PrepCompactSection>

        <PrepCompactSection
          title={PREP_COMPACT_NEXT_STEP_TITLE}
          actionLabel={opening?.statement ? "Use opening" : undefined}
          onAction={opening?.statement ? applyOpening : undefined}
          disabled={disabled}
          hidden={!showNext}
        >
          {opening?.statement ? (
            <p className="ew-prep-compact-next">&ldquo;{opening.statement}&rdquo;</p>
          ) : (
            <p className="ew-prep-compact-next">{nextBestStep}</p>
          )}
          {opening?.alternate ? (
            <p className="ew-prep-compact-next-alt">
              <span className="ew-prep-compact-next-alt-label">Alternate:</span> {opening.alternate}
            </p>
          ) : null}
        </PrepCompactSection>
      </div>

      {hasObservationOptional ? (
        <PrepOptionalPanel title={PREP_COMPACT_OPTIONAL_OBSERVATION} hint="Pathway & logistics">
          <PrepCompactSection
            title="Observation goals"
            actionLabel="Save to notes"
            onAction={applyObservationGoals}
            disabled={disabled}
          >
            <p className="ew-prep-compact-muted">
              {prepContext
                ? (PREP_CONTEXT_OBSERVATION_LEAD[prepContext.state] ?? PREP_CONTEXT_OBSERVATION_LEAD.discovery)
                : null}
            </p>
            <ul className="ew-prep-compact-list">
              {observationGoals.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </PrepCompactSection>
        </PrepOptionalPanel>
      ) : null}

      {hasProductOptional ? (
        <PrepOptionalPanel title={PREP_COMPACT_OPTIONAL_PRODUCT} hint="Mode, product & templates">
          {onPrepModeChange ? (
            <PrepEngagementModeSelector
              prepMode={prepMode}
              disabled={disabled}
              onPrepModeChange={onPrepModeChange}
            />
          ) : null}
          {onProductLineChange && prepUi?.show_product_focus_selector ? (
            <PrepProductFocusSelector
              productLine={productLine}
              providerSpecialty={providerSpecialty}
              opportunityProductLine={opportunityProductLine}
              disabled={disabled}
              onProductLineChange={onProductLineChange}
            />
          ) : null}
          {productFitContent}
        </PrepOptionalPanel>
      ) : null}

      {manualCustomizeSlot ? <div className="ew-prep-manual-slot">{manualCustomizeSlot}</div> : null}
    </div>
  );
}

/** Compact 4-section layout for non–intro-call strategic prep. */
export function StrategicCompactPrepPlan({
  prep,
  disabled,
  isOfficeVisit,
  engagementType,
  workflowDraft,
  onWorkflowDraftChange,
  manualCustomizeSlot,
}: {
  prep: EngagementWizardPrepView;
  disabled?: boolean;
  isOfficeVisit: boolean;
  engagementType: string;
  workflowDraft: EngagementWorkflowDraft;
  onWorkflowDraftChange: (draft: EngagementWorkflowDraft) => void;
  manualCustomizeSlot?: React.ReactNode;
}) {
  const goal = prep.suggested_goal;
  const discoveryQuestions = (prep.suggested_discovery?.questions ?? []).slice(0, 5);
  const talkingPoints = prep.suggested_talking_points.points.slice(0, 4);
  const opening = prep.suggested_opening;
  const signalRows = buildSignalRows(null, talkingPoints);
  const nextBestStep = opening?.statement?.trim() || talkingPoints[0] || goal?.goal || null;

  const applyGoal = React.useCallback(() => {
    if (!goal?.goal) return;
    onWorkflowDraftChange({ ...workflowDraft, observation_goal: goal.goal });
  }, [goal, workflowDraft, onWorkflowDraftChange]);

  const applyDiscovery = React.useCallback(() => {
    if (discoveryQuestions.length === 0) return;
    const key = discoveryQuestionsWorkflowFieldKey(isOfficeVisit);
    onWorkflowDraftChange({
      ...workflowDraft,
      [key]: formatDiscoveryQuestionsForField(prep.suggested_discovery?.questions ?? []),
    });
  }, [discoveryQuestions.length, isOfficeVisit, prep.suggested_discovery?.questions, workflowDraft, onWorkflowDraftChange]);

  const applyOpening = React.useCallback(() => {
    const statement = opening?.statement?.trim();
    if (!statement) return;
    const key = openingStatementWorkflowFieldKey(engagementType, false);
    onWorkflowDraftChange({ ...workflowDraft, [key]: statement });
  }, [opening, engagementType, workflowDraft, onWorkflowDraftChange]);

  return (
    <div className="ew-prep-compact" aria-label="Preparation plan">
      <div className="ew-prep-compact-core">
        <PrepCompactSection
          title={PREP_COMPACT_GOAL_TITLE}
          actionLabel={goal?.goal ? "Use goal" : undefined}
          onAction={applyGoal}
          disabled={disabled}
          hidden={!goal?.goal}
        >
          <p className="ew-prep-compact-goal">{goal?.goal}</p>
        </PrepCompactSection>

        <PrepCompactSection
          title={PREP_COMPACT_QUESTIONS_TITLE}
          actionLabel={discoveryQuestions.length > 0 ? "Use questions" : undefined}
          onAction={applyDiscovery}
          disabled={disabled}
          hidden={discoveryQuestions.length === 0}
        >
          <ol className="ew-prep-compact-list ew-prep-compact-list--numbered">
            {discoveryQuestions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </PrepCompactSection>

        <PrepCompactSection title={PREP_COMPACT_SIGNALS_TITLE} hidden={signalRows.length === 0}>
          <ul className="ew-prep-compact-list">
            {signalRows.map((row) => (
              <li key={row.key}>{row.text}</li>
            ))}
          </ul>
        </PrepCompactSection>

        <PrepCompactSection
          title={PREP_COMPACT_NEXT_STEP_TITLE}
          actionLabel={opening?.statement ? "Use opening" : undefined}
          onAction={applyOpening}
          disabled={disabled}
          hidden={!nextBestStep}
        >
          <p className="ew-prep-compact-next">
            {opening?.statement ? `“${opening.statement}”` : nextBestStep}
          </p>
        </PrepCompactSection>
      </div>

      {manualCustomizeSlot ? <div className="ew-prep-manual-slot">{manualCustomizeSlot}</div> : null}
    </div>
  );
}
