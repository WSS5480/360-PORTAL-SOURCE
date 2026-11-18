"use client";

import React from "react";
import {
  FIELD_BRIEFING_ADD_QUESTION_LABEL,
  FIELD_BRIEFING_CANCEL_EDIT_LABEL,
  FIELD_BRIEFING_MISSION_GOAL_LABEL,
  FIELD_BRIEFING_QUESTION_QUEUE_LABEL,
  FIELD_BRIEFING_PRIMARY_QUESTION_BADGE,
  FIELD_BRIEFING_SAVE_BRIEF_LABEL,
  FIELD_BRIEFING_SET_PRIMARY_LABEL,
} from "@/lib/surgical-sales/engagements/prepareFlowTerminology";
import { newTacticalAskId } from "@/lib/surgical-sales/engagements/prepareTacticalAsks";
import { PrepareTodayMatterSheet } from "./PrepareTodayMatterSheet";

export type FieldBriefEditorQuestion = {
  key: string;
  id: string | null;
  text: string;
};

function reorderList<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return items;
  next.splice(toIndex, 0, moved);
  return next;
}

export function PrepareFieldBriefEditor({
  missionGoal,
  questions,
  saving,
  onMissionGoalChange,
  onQuestionsChange,
  onSave,
  onCancel,
}: {
  missionGoal: string;
  questions: FieldBriefEditorQuestion[];
  saving: boolean;
  onMissionGoalChange: (value: string) => void;
  onQuestionsChange: (questions: FieldBriefEditorQuestion[]) => void;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const editingQuestion = editingKey ? questions.find((q) => q.key === editingKey) : null;

  function updateQuestion(key: string, patch: Partial<FieldBriefEditorQuestion>) {
    onQuestionsChange(questions.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  }

  function removeQuestion(key: string) {
    onQuestionsChange(questions.filter((q) => q.key !== key));
  }

  function addQuestion() {
    const key = newTacticalAskId();
    onQuestionsChange([...questions, { key, id: null, text: "" }]);
    setEditingKey(key);
  }

  function setPrimary(index: number) {
    if (index <= 0 || index >= questions.length) return;
    onQuestionsChange(reorderList(questions, index, 0));
  }

  return (
    <div className="pfm-brief-edit" aria-label="Edit brief">
      <div className="pfm-brief-edit-toolbar">
        <button
          type="button"
          className="pfm-brief-edit-btn pfm-brief-edit-btn--primary"
          disabled={saving}
          onClick={() => void onSave()}
        >
          {saving ? "Saving…" : FIELD_BRIEFING_SAVE_BRIEF_LABEL}
        </button>
        <button
          type="button"
          className="pfm-brief-edit-btn pfm-brief-edit-btn--secondary"
          disabled={saving}
          onClick={onCancel}
        >
          {FIELD_BRIEFING_CANCEL_EDIT_LABEL}
        </button>
      </div>

      <section className="pfm-brief-edit-section" aria-labelledby="pfm-brief-edit-goal">
        <h2 id="pfm-brief-edit-goal" className="pfm-brief-edit-section-title">
          {FIELD_BRIEFING_MISSION_GOAL_LABEL}
        </h2>
        <label className="pfm-brief-edit-goal-field">
          <span className="sr-only">{FIELD_BRIEFING_MISSION_GOAL_LABEL}</span>
          <textarea
            className="pfm-brief-edit-goal-input"
            rows={3}
            disabled={saving}
            value={missionGoal}
            placeholder="What must be true when you leave this touch…"
            onChange={(e) => onMissionGoalChange(e.target.value)}
          />
        </label>
      </section>

      <section className="pfm-brief-edit-section" aria-labelledby="pfm-brief-edit-queue">
        <h2 id="pfm-brief-edit-queue" className="pfm-brief-edit-section-title">
          {FIELD_BRIEFING_QUESTION_QUEUE_LABEL}
        </h2>
        {questions.length > 0 ? (
          <ol className="pfm-brief-edit-queue" role="list">
            {questions.map((question, index) => (
              <li
                key={question.key}
                className={`pfm-brief-edit-queue-item${index === 0 ? " pfm-brief-edit-queue-item--primary" : ""}${dragIndex === index ? " pfm-brief-edit-queue-item--dragging" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = Number(e.dataTransfer.getData("text/brief-q-index"));
                  if (!Number.isFinite(from)) return;
                  onQuestionsChange(reorderList(questions, from, index));
                  setDragIndex(null);
                }}
              >
                <button
                  type="button"
                  className="pfm-brief-edit-drag"
                  aria-label={`Reorder question ${index + 1}`}
                  draggable={!saving}
                  disabled={saving}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/brief-q-index", String(index));
                    e.dataTransfer.effectAllowed = "move";
                    setDragIndex(index);
                  }}
                  onDragEnd={() => setDragIndex(null)}
                >
                  <span aria-hidden>⠿</span>
                </button>
                <div className="pfm-brief-edit-queue-main">
                  {index === 0 ? (
                    <span className="pfm-brief-edit-primary-badge">{FIELD_BRIEFING_PRIMARY_QUESTION_BADGE}</span>
                  ) : null}
                  <p className="pfm-brief-edit-queue-text">
                    {question.text.trim() || (
                      <span className="pfm-brief-edit-queue-placeholder">New question…</span>
                    )}
                  </p>
                </div>
                <div className="pfm-brief-edit-queue-actions">
                  {index > 0 ? (
                    <button
                      type="button"
                      className="pfm-brief-edit-set-primary"
                      disabled={saving}
                      onClick={() => setPrimary(index)}
                    >
                      {FIELD_BRIEFING_SET_PRIMARY_LABEL}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="pfm-brief-edit-icon-btn"
                    aria-label={`Edit question ${index + 1}`}
                    disabled={saving}
                    onClick={() => setEditingKey(question.key)}
                  >
                    <span aria-hidden>✎</span>
                  </button>
                  <button
                    type="button"
                    className="pfm-brief-edit-icon-btn pfm-brief-edit-icon-btn--danger"
                    aria-label={`Delete question ${index + 1}`}
                    disabled={saving}
                    onClick={() => removeQuestion(question.key)}
                  >
                    <span aria-hidden>×</span>
                  </button>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="pfm-brief-edit-queue-empty">Add at least one question for this touch.</p>
        )}
        <button
          type="button"
          className="pfm-brief-edit-add"
          disabled={saving}
          onClick={addQuestion}
        >
          {FIELD_BRIEFING_ADD_QUESTION_LABEL}
        </button>
      </section>

      <PrepareTodayMatterSheet
        open={Boolean(editingQuestion)}
        title="Edit question"
        label="Question"
        initialValue={editingQuestion?.text ?? ""}
        busy={saving}
        onClose={() => setEditingKey(null)}
        onSave={(text) => {
          if (!editingKey) return;
          updateQuestion(editingKey, { text: text.trim() });
          setEditingKey(null);
        }}
      />
    </div>
  );
}
