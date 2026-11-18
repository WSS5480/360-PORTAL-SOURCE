"use client";

import type { EngagementWorkflowFieldConfig } from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";
import type { PreCallPlanTemplate } from "@/lib/surgical-sales/preCallPlanTemplateModel";
import { playbookValueForOfficeVisit360Field } from "@/lib/surgical-sales/engagements/officeVisit360PrepareTemplateMapping";
import { isOfficeVisitEngagement } from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";
import { playbookValueForPlanField } from "@/lib/surgical-sales/preCallPlanStrategicTemplateMapping";
import { PreparePreCallPlanFieldMenu } from "./PreparePreCallPlanFieldMenu";

function textareaMinHeight(rows: number): number {
  return Math.max(64, rows * 22 + 12);
}

export function PreparePreCallPlanFieldCard({
  field,
  value,
  engagementId,
  selectedPlaybook,
  disabled,
  onChange,
  onAssistError,
  engagementType,
}: {
  field: EngagementWorkflowFieldConfig;
  value: string;
  engagementId: string;
  selectedPlaybook: PreCallPlanTemplate | null;
  disabled?: boolean;
  onChange: (value: string) => void;
  onAssistError: (message: string | null) => void;
  engagementType?: string;
}) {
  const inputId = `pfm-precall-field-${field.key}`;
  const playbookValue = isOfficeVisitEngagement(engagementType)
    ? playbookValueForOfficeVisit360Field(selectedPlaybook, field.key)
    : playbookValueForPlanField(selectedPlaybook, field.key);

  return (
    <article
      className="pfm-precall-field-card"
      data-field-key={field.key}
      data-filled={value.trim().length > 0 ? "true" : "false"}
    >
      <div className="pfm-precall-field-card__head">
        <div className="pfm-precall-field-card__title-row">
          <label className="pfm-precall-field-card__label" htmlFor={inputId}>
            {field.label}
          </label>
          <PreparePreCallPlanFieldMenu
            field={field}
            value={value}
            engagementId={engagementId}
            disabled={disabled}
            playbookValue={playbookValue}
            playbookName={selectedPlaybook?.name ?? null}
            onChange={onChange}
            onError={onAssistError}
          />
        </div>
        {field.helper ? <p className="pfm-precall-field-card__helper">{field.helper}</p> : null}
      </div>
      <textarea
        id={inputId}
        className="pfm-precall-field-card__input"
        rows={field.rows}
        value={value}
        disabled={disabled}
        style={{ minHeight: textareaMinHeight(field.rows) }}
        placeholder={`Add ${field.label.toLowerCase()}…`}
        onChange={(e) => onChange(e.target.value)}
      />
    </article>
  );
}
