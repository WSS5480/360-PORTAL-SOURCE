"use client";

import type { EngagementWorkflowFieldConfig } from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";
import type { EngagementWorkflowDraft } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";

export function EngagementWorkflowFieldsForm({
  draft,
  onChange,
  fields,
  disabled,
  compact,
}: {
  draft: EngagementWorkflowDraft;
  onChange: (key: string, value: string) => void;
  fields: EngagementWorkflowFieldConfig[];
  disabled?: boolean;
  /** Dense mobile layout — fewer rows, native input sizing */
  compact?: boolean;
}) {
  return (
    <div className={`eng-workflow-fields${compact ? " eng-workflow-fields--compact" : ""}`}>
      {fields.map((field) => {
        const value = draft[field.key] ?? "";
        const rows = compact ? Math.min(field.rows, 2) : field.rows;
        const fullWidth = rows >= 3 && !compact;
        return (
          <label
            key={field.key}
            className={`eng-workflow-field${fullWidth ? " eng-workflow-field--full" : ""}`}
          >
            <span className="eng-workflow-field-label">{field.label}</span>
            {field.helper && !compact ? (
              <span className="eng-workflow-field-helper">{field.helper}</span>
            ) : null}
            <textarea
              rows={rows}
              value={value}
              disabled={disabled}
              data-workflow-key={field.key}
              placeholder={compact ? field.label : undefined}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          </label>
        );
      })}
    </div>
  );
}
