"use client";

import type React from "react";
import { sc } from "@/components/sales/salesCommandUi";
import {
  PRE_CALL_PLAN_FIELD_CONFIGS,
  type PreCallPlanContext,
  type PreCallPlanFieldKey,
} from "@/lib/surgical-sales/preCallPlanFields";

export function PreCallPlanFieldsForm({
  draft,
  onChange,
  context,
  disabled,
  fieldKeys,
}: {
  draft: Record<PreCallPlanFieldKey, string>;
  onChange: (key: PreCallPlanFieldKey, value: string) => void;
  context: PreCallPlanContext;
  disabled?: boolean;
  fieldKeys?: readonly PreCallPlanFieldKey[];
}) {
  const fields = fieldKeys
    ? fieldKeys
        .map((key) => PRE_CALL_PLAN_FIELD_CONFIGS.find((f) => f.key === key))
        .filter((f): f is (typeof PRE_CALL_PLAN_FIELD_CONFIGS)[number] => Boolean(f))
    : PRE_CALL_PLAN_FIELD_CONFIGS;

  return (
    <div className="case-pre-call-plan-fields">
      {fields.map((field) => {
        const value = draft[field.key] ?? "";
        const showContextHint =
          field.contextualDefault &&
          !String(draft[field.key] ?? "").trim() &&
          ((field.key === "pre_call_hospital_name" && context.hospitalDefault) ||
            (field.key === "pre_call_surgeon_name" && context.surgeonDefault));

        const fullWidth = field.rows >= 4;
        return (
          <label
            key={field.key}
            className={`case-pre-call-plan-field${fullWidth ? " case-pre-call-plan-field--full" : ""}`}
          >
            <span className="case-pre-call-plan-label">{field.label}</span>
            {field.helper ? <span className="case-pre-call-plan-helper">{field.helper}</span> : null}
            {showContextHint ? (
              <span className="case-pre-call-plan-helper" style={{ color: "var(--brand-700)" }}>
                Defaults to:{" "}
                {field.key === "pre_call_hospital_name"
                  ? context.hospitalDefault
                  : context.surgeonDefault}
              </span>
            ) : null}
            <textarea
              rows={field.rows}
              value={value}
              disabled={disabled}
              placeholder={
                field.key === "pre_call_hospital_name"
                  ? context.hospitalDefault || undefined
                  : field.key === "pre_call_surgeon_name"
                    ? context.surgeonDefault || undefined
                    : undefined
              }
              onChange={(e) => onChange(field.key, e.target.value)}
              style={{ ...sc.input, resize: "vertical", fontFamily: "inherit", fontSize: 13 }}
            />
          </label>
        );
      })}
    </div>
  );
}
