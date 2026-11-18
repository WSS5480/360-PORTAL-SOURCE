"use client";

import React from "react";
import type { LogUpdateConflictResolution, LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";
import {
  LOG_UPDATE_CONFLICT_EXISTING,
  LOG_UPDATE_CONFLICT_GROUP_LABEL,
  LOG_UPDATE_CONFLICT_KEEP_BOTH,
  LOG_UPDATE_CONFLICT_NEW,
  LOG_UPDATE_CONFLICT_REPLACE,
  LOG_UPDATE_ERR_UNRESOLVED_CONFLICT,
} from "@/lib/surgical-sales/logUpdateUx";

export function DebriefUnresolvedConflictsPanel({
  fields,
  readOnly,
  onResolveConflict,
}: {
  fields: LogUpdateRoutedFieldUpdate[];
  readOnly?: boolean;
  onResolveConflict: (id: string, resolution: LogUpdateConflictResolution) => void;
}) {
  if (fields.length === 0) return null;

  return (
    <div
      className="ai-debrief-conflicts-banner"
      role="alert"
      data-testid="ai-debrief-unresolved-conflicts"
    >
      <p className="ai-debrief-conflicts-banner__title">{LOG_UPDATE_ERR_UNRESOLVED_CONFLICT}</p>
      <p className="ai-debrief-conflicts-banner__hint">
        Choose how to merge each field below before saving.
      </p>
      <ul className="ai-debrief-conflicts-banner__list">
        {fields.map((field) =>
          field.conflict ? (
            <li key={field.id} className="ai-debrief-conflict">
              <p className="ai-debrief-conflict-title">{field.label}</p>
              <p className="ai-debrief-card__conflict-line">
                <span>{LOG_UPDATE_CONFLICT_EXISTING}</span> {field.conflict.existingValue}
              </p>
              <p className="ai-debrief-card__conflict-line">
                <span>{LOG_UPDATE_CONFLICT_NEW}</span> {field.conflict.newValue}
              </p>
              <div
                className="ai-debrief-conflict-actions"
                role="group"
                aria-label={`${LOG_UPDATE_CONFLICT_GROUP_LABEL}: ${field.label}`}
              >
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => onResolveConflict(field.id, "replace")}
                >
                  {LOG_UPDATE_CONFLICT_REPLACE}
                </button>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => onResolveConflict(field.id, "append")}
                >
                  {LOG_UPDATE_CONFLICT_KEEP_BOTH}
                </button>
              </div>
            </li>
          ) : null,
        )}
      </ul>
    </div>
  );
}
