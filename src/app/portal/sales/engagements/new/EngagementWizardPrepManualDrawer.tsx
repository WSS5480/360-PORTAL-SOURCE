"use client";

import React from "react";
import type { EngagementWizardPrepView } from "@/lib/surgical-sales/engagements/loadEngagementWizardPrepView";
import {
  wizardPrepPlaceholder,
  type WizardPrepFieldGuidanceContext,
} from "@/lib/surgical-sales/engagements/engagementWizardPrepFieldGuidance";
import type { EngagementWorkflowFieldKey } from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";
import type { EngagementWorkflowDraft } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";
import { resolveContextProductLine } from "@/lib/surgical-sales/preCallPlanTemplateSuggest";
import type { TemplateSuggestContext } from "@/lib/surgical-sales/preCallPlanTemplateSuggest";
import { engagementWizardPrepManualDrawerCss } from "./engagementWizardPrepManualDrawerCss";

export type PrepManualFieldSpec = {
  key: EngagementWorkflowFieldKey;
  label: string;
  hint?: string;
  rows: number;
};

export const PREP_MANUAL_STRATEGIC_FIELDS: PrepManualFieldSpec[] = [
  {
    key: "observation_goal",
    label: "Custom objective",
    hint: "Overrides the suggested goal when you need your own wording.",
    rows: 3,
  },
  {
    key: "pre_observation_probes",
    label: "Custom questions",
    hint: "Discovery or workflow questions for this interaction.",
    rows: 4,
  },
  {
    key: "pre_observation_additional_notes",
    label: "Strategic notes",
    hint: "Tools, value, close, and other planning notes.",
    rows: 4,
  },
  {
    key: "pre_observation_value_hypothesis",
    label: "Observation notes",
    hint: "Pathway, access, logistics, and observation goals.",
    rows: 4,
  },
];

export const PREP_MANUAL_OFFICE_VISIT_FIELDS: PrepManualFieldSpec[] = [
  { key: "observation_goal", label: "Custom objective", rows: 2 },
  { key: "sim_lab_focus", label: "Custom questions", rows: 3 },
  { key: "hands_on_goals", label: "Strategic notes", rows: 3 },
  {
    key: "follow_up_tasks",
    label: "Observation notes",
    hint: "Follow-up and observation logistics.",
    rows: 3,
  },
];

export const PREP_MANUAL_LIGHTWEIGHT_FIELDS: PrepManualFieldSpec[] = [
  { key: "engagement_purpose", label: "Custom objective", rows: 2 },
  { key: "next_action", label: "Custom questions", rows: 2 },
  { key: "pre_observation_additional_notes", label: "Strategic notes", rows: 3 },
  {
    key: "follow_up_tasks",
    label: "Observation notes",
    hint: "Follow-up and observation logistics.",
    rows: 3,
  },
];

export function prepManualFieldSpecs(isLightweight: boolean, isOfficeVisit: boolean): PrepManualFieldSpec[] {
  if (isLightweight) return PREP_MANUAL_LIGHTWEIGHT_FIELDS;
  if (isOfficeVisit) return PREP_MANUAL_OFFICE_VISIT_FIELDS;
  return PREP_MANUAL_STRATEGIC_FIELDS;
}

function countManualFieldsFilled(
  draft: EngagementWorkflowDraft,
  specs: PrepManualFieldSpec[],
): number {
  let n = 0;
  for (const spec of specs) {
    if (String(draft[spec.key] ?? "").trim()) n += 1;
  }
  return n;
}

export function countPrepManualFieldsFilled(
  draft: EngagementWorkflowDraft,
  isLightweight: boolean,
  isOfficeVisit = false,
): number {
  return countManualFieldsFilled(draft, prepManualFieldSpecs(isLightweight, isOfficeVisit));
}

function ManualField({
  spec,
  draft,
  disabled,
  placeholder,
  onChange,
}: {
  spec: PrepManualFieldSpec;
  draft: EngagementWorkflowDraft;
  disabled?: boolean;
  placeholder?: string;
  onChange: (key: string, value: string) => void;
}) {
  const value = String(draft[spec.key] ?? "");
  return (
    <label className="ew-prep-manual-field">
      <span className="ew-prep-manual-field-label">{spec.label}</span>
      {spec.hint ? <p className="ew-prep-manual-field-hint">{spec.hint}</p> : null}
      <textarea
        rows={spec.rows}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(spec.key, e.target.value)}
      />
    </label>
  );
}

export function PrepManualCustomizeTrigger({
  filledCount,
  totalCount,
  disabled,
  onClick,
}: {
  filledCount: number;
  totalCount: number;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="ew-prep-manual-trigger" disabled={disabled} onClick={onClick}>
      Customize prep manually
      {filledCount > 0 ? (
        <span className="ew-prep-manual-trigger-badge">
          {filledCount}/{totalCount} filled
        </span>
      ) : null}
    </button>
  );
}

export function EngagementWizardPrepManualDrawer({
  open,
  onClose,
  isLightweight,
  isOfficeVisit,
  engagementType,
  workflowDraft,
  suggestContext,
  prep,
  disabled,
  onWorkflowDraftChange,
}: {
  open: boolean;
  onClose: () => void;
  isLightweight: boolean;
  isOfficeVisit: boolean;
  engagementType: string;
  workflowDraft: EngagementWorkflowDraft;
  suggestContext: TemplateSuggestContext;
  prep: EngagementWizardPrepView | null;
  disabled?: boolean;
  onWorkflowDraftChange: (draft: EngagementWorkflowDraft) => void;
}) {
  const specs = prepManualFieldSpecs(isLightweight, isOfficeVisit);

  const guidanceCtx = React.useMemo<WizardPrepFieldGuidanceContext>(
    () => ({
      engagementType,
      productLine: resolveContextProductLine(suggestContext),
      providerSpecialty:
        prep?.provider_snapshot?.specialty ?? suggestContext.providerSpecialty ?? null,
    }),
    [engagementType, suggestContext, prep?.provider_snapshot?.specialty],
  );

  const handleChange = React.useCallback(
    (key: string, value: string) => {
      onWorkflowDraftChange({ ...workflowDraft, [key]: value });
    },
    [workflowDraft, onWorkflowDraftChange],
  );

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="ew-prep-manual-drawer-title"
      className="ew-prep-manual-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !disabled) onClose();
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: engagementWizardPrepManualDrawerCss }} />
      <div className="ew-prep-manual-drawer" onClick={(e) => e.stopPropagation()}>
        <header className="ew-prep-manual-drawer-head">
          <div>
            <h2 id="ew-prep-manual-drawer-title" className="ew-prep-manual-drawer-title">
              Customize prep manually
            </h2>
            <p className="ew-prep-manual-drawer-sub">
              Optional field edits — the guided prep plan on the main screen stays unchanged until you save
              here.
            </p>
          </div>
          <button
            type="button"
            className="ew-prep-manual-drawer-close"
            onClick={onClose}
            disabled={disabled}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="ew-prep-manual-drawer-body">
          {specs.map((spec) => (
            <ManualField
              key={spec.key}
              spec={spec}
              draft={workflowDraft}
              disabled={disabled}
              placeholder={wizardPrepPlaceholder(spec.key, guidanceCtx)}
              onChange={handleChange}
            />
          ))}
        </div>

        <footer className="ew-prep-manual-drawer-foot">
          <button type="button" className="ew-prep-manual-drawer-close" onClick={onClose} disabled={disabled}>
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
