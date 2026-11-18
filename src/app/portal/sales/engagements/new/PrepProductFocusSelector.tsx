"use client";

import React from "react";
import {
  PREP_PRODUCT_FOCUS_NONE_LABEL,
  resolvePrepProductFocusView,
} from "@/lib/surgical-sales/engagements/prepProductFocus";
import {
  isPreCallPlanProductLine,
  PRE_CALL_PLAN_PRODUCT_LINES,
} from "@/lib/surgical-sales/preCallPlanTemplateTypes";

export function PrepProductFocusSelector({
  productLine,
  providerSpecialty,
  opportunityProductLine,
  disabled,
  onProductLineChange,
}: {
  productLine: string;
  providerSpecialty?: string | null;
  opportunityProductLine?: string | null;
  disabled?: boolean;
  onProductLineChange: (productLine: string) => void;
}) {
  const focus = resolvePrepProductFocusView({ productLine, providerSpecialty });
  const oppProductHint = React.useMemo(() => {
    const raw = String(opportunityProductLine ?? "").trim();
    if (!raw || focus.mode === "product_focus") return null;
    const first = raw.split(/[,;|]/)[0]?.trim();
    return first ? `Related opportunity includes ${first} — select it below only if that is your focus for this interaction.` : null;
  }, [opportunityProductLine, focus.mode]);

  return (
    <div
      className={`ew-prep-product-focus ew-prep-product-focus--${focus.mode === "product_focus" ? "selected" : "discovery"}`}
    >
      <div className="ew-prep-product-focus-field">
        <label htmlFor="ew-prep-product-focus" className="ew-prep-product-focus-label">
          Product focus
        </label>
        <p className="ew-prep-product-focus-kicker">Optional — aligns suggested discovery prep to a portfolio line</p>
        <select
          id="ew-prep-product-focus"
          className="ew-prep-product-focus-select"
          value={isPreCallPlanProductLine(productLine) ? productLine : ""}
          disabled={disabled}
          onChange={(e) => onProductLineChange(e.target.value)}
        >
          <option value="">{PREP_PRODUCT_FOCUS_NONE_LABEL}</option>
          {PRE_CALL_PLAN_PRODUCT_LINES.map((line) => (
            <option key={line} value={line}>
              {line}
            </option>
          ))}
        </select>
      </div>
      <div className="ew-prep-product-focus-preview" role="status">
        <p className="ew-prep-product-focus-preview-title">{focus.label}</p>
        <p className="ew-prep-product-focus-preview-summary">{focus.summary}</p>
        {focus.workflowFocus ? (
          <p className="ew-prep-product-focus-preview-workflow">{focus.workflowFocus}</p>
        ) : null}
      </div>
      {oppProductHint ? <p className="ew-prep-product-focus-opp-hint">{oppProductHint}</p> : null}
    </div>
  );
}
