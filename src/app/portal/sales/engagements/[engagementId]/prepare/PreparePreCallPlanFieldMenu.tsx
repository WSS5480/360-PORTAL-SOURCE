"use client";

import React from "react";
import type { EngagementWorkflowFieldConfig } from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";
import type { PreCallPlanFieldKey } from "@/lib/surgical-sales/preCallPlanFields";
import { improvePreCallPlanFieldWordingClient } from "@/lib/surgical-sales/engagements/preparePreCallPlanFieldAssistClient";
import { userFacingError } from "@/lib/errors/userFacingError";

export function PreparePreCallPlanFieldMenu({
  field,
  value,
  engagementId,
  disabled,
  playbookValue,
  playbookName,
  onChange,
  onError,
}: {
  field: EngagementWorkflowFieldConfig;
  value: string;
  engagementId: string;
  disabled?: boolean;
  playbookValue: string | null;
  playbookName: string | null;
  onChange: (value: string) => void;
  onError: (message: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [improving, setImproving] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const fieldKey = field.key as PreCallPlanFieldKey;

  React.useEffect(() => {
    if (!open) return;
    function onDocPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const hasText = Boolean(value.trim());
  const canFillPlaybook = Boolean(playbookValue?.trim() && playbookName);
  const menuDisabled = disabled || improving;

  async function handleImproveWording() {
    if (!hasText || menuDisabled) return;
    setOpen(false);
    setImproving(true);
    onError(null);
    try {
      const { text } = await improvePreCallPlanFieldWordingClient(engagementId, {
        fieldKey,
        fieldLabel: field.label,
        fieldHelper: field.helper,
        currentText: value,
      });
      onChange(text);
    } catch (e: unknown) {
      onError(userFacingError(e, "Could not improve wording"));
    } finally {
      setImproving(false);
    }
  }

  function handleFillFromPlaybook() {
    if (!canFillPlaybook || menuDisabled || !playbookValue) return;
    setOpen(false);
    const next = playbookValue.trim();
    if (!next) return;
    if (value.trim() && value.trim() !== next) {
      const ok = window.confirm(
        `Replace your ${field.label.toLowerCase()} with content from "${playbookName}"?`,
      );
      if (!ok) return;
    }
    onChange(next);
    onError(null);
  }

  function handleClear() {
    if (menuDisabled || !hasText) return;
    setOpen(false);
    onChange("");
    onError(null);
  }

  return (
    <div
      ref={rootRef}
      className={`pfm-precall-field-card__menu-wrap${open ? " pfm-precall-field-card__menu-wrap--open" : ""}`}
    >
      <button
        type="button"
        className="pfm-precall-field-card__menu-trigger"
        aria-label={`${field.label} actions`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={menuDisabled}
        onClick={() => setOpen((v) => !v)}
      >
        {improving ? "…" : "⋯"}
      </button>
      {open ? (
        <div className="pfm-precall-field-card__menu" role="menu">
          <button
            type="button"
            role="menuitem"
            className="pfm-precall-field-card__menu-item"
            disabled={!hasText || improving}
            onClick={() => void handleImproveWording()}
          >
            Improve wording
          </button>
          <button
            type="button"
            role="menuitem"
            className="pfm-precall-field-card__menu-item"
            disabled={!canFillPlaybook}
            title={
              canFillPlaybook
                ? `From ${playbookName}`
                : "Select a playbook above to use this action"
            }
            onClick={handleFillFromPlaybook}
          >
            Fill from playbook
          </button>
          <button
            type="button"
            role="menuitem"
            className="pfm-precall-field-card__menu-item pfm-precall-field-card__menu-item--muted"
            disabled={!hasText}
            onClick={handleClear}
          >
            Clear field
          </button>
        </div>
      ) : null}
    </div>
  );
}
