"use client";

import type React from "react";
import { Fragment, useState } from "react";
import { observationWorkflowMobileCss } from "./observationWorkflowMobileCss";
import type { ObservationWorkflowStageId } from "./observationWorkflowStages";
import { AddCaseInsightActionButton } from "./AddCaseInsightToProviderDiscoveryModal";

export type WorkflowStageSummaryItem = {
  id: ObservationWorkflowStageId;
  title: string;
  filled: number;
  total: number;
  keys: readonly string[];
};

type StepProgress = "completed" | "active" | "pending";

export type WorkflowTextFieldConfig = {
  key: string;
  label: string;
  helper?: string;
  rows?: number;
  inputKind?: "textarea" | "text";
};

function stepProgress(filled: number, total: number): StepProgress {
  if (filled <= 0) return "pending";
  if (filled >= total && total > 0) return "completed";
  return "active";
}

function stepStatusLabel(filled: number, total: number): string {
  const progress = stepProgress(filled, total);
  if (progress === "completed") return "Completed";
  if (progress === "active") return "In progress";
  return "Not started";
}

function StepIndicator({ progress }: { progress: StepProgress }) {
  if (progress === "completed") {
    return (
      <span className="case-obs-step-indicator" aria-hidden>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12l4 4L19 7" />
        </svg>
      </span>
    );
  }
  return <span className="case-obs-step-indicator" aria-hidden />;
}

const STAGE_HINTS: Record<ObservationWorkflowStageId, string> = {
  setup: "Case logistics and setup — organization, provider, and case date before the procedure.",
  live: "Live observation — workflow, products used, reactions, and field notes during the case.",
  debrief: "Debrief — key findings, opportunity signal, and what was learned on site.",
  follow_up: "Follow-up — next actions and tasks after the visit.",
  routing: "Outcome routing — pipeline, opportunity stage, or product support handoff.",
};

export function WorkflowFieldSubitems({
  fields,
  values,
  onChange,
  disabled,
  inputStyle,
}: {
  fields: WorkflowTextFieldConfig[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
  inputStyle?: React.CSSProperties;
}) {
  const [openKey, setOpenKey] = useState<string | null>(fields[0]?.key ?? null);

  return (
    <div className="case-obs-subitems">
      {fields.map((field) => {
        const isOpen = openKey === field.key;
        const isOptional = Boolean(field.helper?.toLowerCase().includes("optional"));
        const hasValue = Boolean(String(values[field.key] ?? "").trim());
        return (
          <Fragment key={field.key}>
            <button
              type="button"
              className="case-obs-subitem"
              aria-expanded={isOpen}
              onClick={() => setOpenKey((current) => (current === field.key ? null : field.key))}
            >
              <div className="case-obs-subitem-text">
                <div className="case-obs-subitem-title">{field.label}</div>
                {field.helper ? <div className="case-obs-subitem-helper">{field.helper}</div> : null}
              </div>
              <span className={`case-obs-subitem-badge${isOptional ? " case-obs-subitem-badge--optional" : ""}`}>
                {isOptional ? "Optional" : hasValue ? "Done" : "Confirm"}
              </span>
              <span className="case-obs-subitem-chevron" aria-hidden>
                {isOpen ? "▴" : "▾"}
              </span>
            </button>
            {isOpen ? (
              <div className="case-obs-subitem-editor">
                {field.inputKind === "text" ? (
                  <input
                    value={values[field.key] ?? ""}
                    onChange={(event) => onChange(field.key, event.target.value)}
                    disabled={disabled}
                    inputMode="numeric"
                    placeholder="0-100"
                    style={inputStyle}
                  />
                ) : (
                  <textarea
                    value={values[field.key] ?? ""}
                    onChange={(event) => onChange(field.key, event.target.value)}
                    rows={field.rows ?? 4}
                    disabled={disabled}
                    style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
                  />
                )}
              </div>
            ) : null}
          </Fragment>
        );
      })}
    </div>
  );
}

export function ObservationWorkflowMobilePanel({
  stages,
  activeStage,
  onStageToggle,
  statusForKeys,
  autosaveError,
  renderStageBody,
  primarySuggestionTitle,
  onPrimarySuggestion,
  onAddCaseInsight,
  addCaseInsightDisabled,
}: {
  stages: WorkflowStageSummaryItem[];
  activeStage: ObservationWorkflowStageId | null;
  onStageToggle: (stageId: ObservationWorkflowStageId) => void;
  statusForKeys: (keys: readonly string[]) => { label: string; style: React.CSSProperties };
  autosaveError: string | null;
  renderStageBody: (stageId: ObservationWorkflowStageId) => React.ReactNode;
  primarySuggestionTitle?: string | null;
  onPrimarySuggestion?: () => void;
  onAddCaseInsight?: () => void;
  addCaseInsightDisabled?: boolean;
}) {
  const completeCount = stages.filter((stage) => stepProgress(stage.filled, stage.total) === "completed").length;

  return (
    <div className="case-obs-workflow">
      <style dangerouslySetInnerHTML={{ __html: observationWorkflowMobileCss }} />
      <div className="case-obs-workflow-head">
        <span className="case-obs-workflow-kicker">Case workflow</span>
        <span className="case-obs-workflow-summary">
          {completeCount} of {stages.length} complete
        </span>
      </div>
      {onAddCaseInsight ? (
        <AddCaseInsightActionButton
          onClick={onAddCaseInsight}
          disabled={addCaseInsightDisabled}
          style={{ width: "100%" }}
        />
      ) : null}
      <div className="case-obs-stepper">
        {stages.map((stage, index) => {
          const progress = stepProgress(stage.filled, stage.total);
          const isExpanded = activeStage === stage.id;
          const autosave = statusForKeys(stage.keys);
          return (
            <article
              key={stage.id}
              id={`workflow-stage-${stage.id}`}
              className="case-obs-step"
              data-progress={progress}
              data-expanded={isExpanded ? "true" : "false"}
            >
              {index < stages.length - 1 ? <span className="case-obs-step-rail" aria-hidden /> : null}
              <button
                type="button"
                className="case-obs-step-header"
                aria-expanded={isExpanded}
                onClick={() => onStageToggle(stage.id)}
              >
                <StepIndicator progress={progress} />
                <div className="case-obs-step-main">
                  <div className="case-obs-step-title">{stage.title}</div>
                  <div className="case-obs-step-meta">
                    <span>{stepStatusLabel(stage.filled, stage.total)}</span>
                    <span aria-hidden>·</span>
                    <span>
                      {stage.filled}/{stage.total}
                    </span>
                  </div>
                </div>
                <span className="case-obs-step-chevron" aria-hidden>
                  {isExpanded ? "▴" : "▾"}
                </span>
              </button>
              {isExpanded ? (
                <div className="case-obs-step-body">
                  <div className="case-obs-step-intro">
                    <p className="case-obs-step-hint">{STAGE_HINTS[stage.id]}</p>
                    <span className="case-obs-autosave-chip" style={autosave.style}>
                      {autosave.label}
                    </span>
                  </div>
                  {autosaveError ? (
                    <div
                      role="alert"
                      style={{
                        margin: 0,
                        padding: "8px 10px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--danger)",
                        background: "color-mix(in srgb, var(--danger) 8%, #fff)",
                        border: "1px solid color-mix(in srgb, var(--danger) 25%, var(--border))",
                      }}
                    >
                      {autosaveError}
                    </div>
                  ) : null}
                  {renderStageBody(stage.id)}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      {primarySuggestionTitle && onPrimarySuggestion ? (
        <button type="button" className="case-obs-suggested" onClick={onPrimarySuggestion}>
          <span>{primarySuggestionTitle}</span>
          <span className="case-obs-suggested-chevron" aria-hidden>
            ›
          </span>
        </button>
      ) : null}
    </div>
  );
}
