"use client";

import React from "react";
import {
  INTRO_CALL_CONVERSATION_FOCUS_OPTIONS,
  type IntroCallConversationFocusId,
} from "@/lib/surgical-sales/engagements/introCallConversationFocus";

export function PrepConversationFocusChips({
  selected,
  disabled,
  onChange,
}: {
  selected: readonly IntroCallConversationFocusId[];
  disabled?: boolean;
  onChange: (next: IntroCallConversationFocusId[]) => void;
}) {
  const selectedSet = React.useMemo(() => new Set(selected), [selected]);

  const toggle = (id: IntroCallConversationFocusId) => {
    if (disabled) return;
    const next = selectedSet.has(id)
      ? selected.filter((f) => f !== id)
      : [...selected, id];
    onChange(next);
  };

  return (
    <fieldset className="ew-prep-conversation-focus" disabled={disabled}>
      <legend className="ew-prep-conversation-focus-legend">Operational focus areas</legend>
      <p className="ew-prep-conversation-focus-hint">
        Optional — prioritizes suggested discovery prep for these objectives. Does not change product
        focus.
      </p>
      <div
        className="ew-prep-conversation-focus-chips"
        role="group"
        aria-label="Operational focus areas"
      >
        {INTRO_CALL_CONVERSATION_FOCUS_OPTIONS.map((option) => {
          const active = selectedSet.has(option.id);
          return (
            <button
              key={option.id}
              type="button"
              className={`ew-prep-conversation-focus-chip${active ? " ew-prep-conversation-focus-chip--active" : ""}`}
              aria-pressed={active}
              title={option.summary}
              onClick={() => toggle(option.id)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
