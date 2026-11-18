"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { sc } from "@/components/sales/salesCommandUi";
import {
  OPERATIONAL_NOTE_TYPES,
  OPERATIONAL_NOTE_TYPE_LABELS,
  type CreateOperationalNoteClientInput,
  type OperationalNoteContextDefaults,
  type OperationalNoteType,
} from "@/lib/notes/operationalNote";

export function OperationalNoteComposer({
  context,
  disabled,
  busy,
  rows = 5,
  placeholder = "Add note…",
  onSave,
}: {
  context: OperationalNoteContextDefaults;
  disabled?: boolean;
  busy?: boolean;
  rows?: number;
  placeholder?: string;
  onSave: (input: CreateOperationalNoteClientInput) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [noteType, setNoteType] = useState<OperationalNoteType>(context.noteType ?? "general");
  const [workflowStage, setWorkflowStage] = useState(context.workflowStage ?? "");
  const [tagsText, setTagsText] = useState((context.tags ?? []).join(", "));

  const defaultNoteType = context.noteType ?? "general";

  const tags = useMemo(
    () =>
      tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 20),
    [tagsText],
  );

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || disabled || busy) return;
    const payload: CreateOperationalNoteClientInput = { body: trimmed };
    if (showAdvanced) {
      if (noteType !== defaultNoteType) payload.note_type = noteType;
      if (workflowStage.trim()) payload.workflow_stage = workflowStage.trim();
      if (tags.length > 0) payload.tags = tags;
    }
    await onSave(payload);
    setBody("");
    setShowAdvanced(false);
    setNoteType(defaultNoteType);
    setWorkflowStage(context.workflowStage ?? "");
    setTagsText((context.tags ?? []).join(", "));
  };

  return (
    <form onSubmit={(e) => void submit(e)} style={{ display: "grid", gap: 8 }}>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={rows}
        disabled={disabled || busy}
        placeholder={placeholder}
        style={{ ...sc.input, resize: "vertical", fontSize: 13 }}
        aria-label="Note"
      />

      <details
        open={showAdvanced}
        onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}
        style={{ fontSize: 12 }}
      >
        <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--muted)", userSelect: "none" }}>
          Classify note (optional)
        </summary>
        <div style={{ display: "grid", gap: 8, marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 11 }}>Note type</span>
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value as OperationalNoteType)}
              disabled={disabled || busy}
              style={sc.input}
            >
              {OPERATIONAL_NOTE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {OPERATIONAL_NOTE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 11 }}>Workflow stage</span>
            <input
              value={workflowStage}
              onChange={(e) => setWorkflowStage(e.target.value)}
              disabled={disabled || busy}
              placeholder="e.g. debrief, live"
              style={sc.input}
            />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 11 }}>Tags (comma-separated)</span>
            <input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              disabled={disabled || busy}
              placeholder="optional"
              style={sc.input}
            />
          </label>
        </div>
      </details>

      <button type="submit" style={sc.btnPrimary} disabled={disabled || busy || !body.trim()}>
        {busy ? "Saving…" : "Add note"}
      </button>
    </form>
  );
}
