"use client";

import React from "react";
import {
  INTRO_CALL_PLAN_CARD_SECTIONS,
  type IntroCallPlanCardFieldSpec,
} from "@/lib/surgical-sales/engagements/introCallPlanCardSections";
import {
  wizardPrepPlaceholder,
  type WizardPrepFieldGuidanceContext,
} from "@/lib/surgical-sales/engagements/engagementWizardPrepFieldGuidance";
import type { PreCallPlanFieldKey } from "@/lib/surgical-sales/preCallPlanFields";
import { PrepAutoGrowTextarea } from "./PrepAutoGrowTextarea";

function PlanCardField({
  spec,
  value,
  disabled,
  placeholder,
  onChange,
}: {
  spec: IntroCallPlanCardFieldSpec;
  value: string;
  disabled?: boolean;
  placeholder?: string;
  onChange: (key: PreCallPlanFieldKey, value: string) => void;
}) {
  return (
    <label className="ew-prep-call-plan-card-field">
      {spec.sublabel ? (
        <span className="ew-prep-call-plan-card-sublabel">{spec.sublabel}</span>
      ) : null}
      {spec.helper ? <span className="ew-prep-call-plan-card-field-hint">{spec.helper}</span> : null}
      <PrepAutoGrowTextarea
        rows={spec.rows}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(spec.key, e.target.value)}
      />
    </label>
  );
}

export function IntroCallPlanCardsForm({
  draft,
  onChange,
  guidanceContext,
  disabled,
}: {
  draft: Record<PreCallPlanFieldKey, string>;
  onChange: (key: PreCallPlanFieldKey, value: string) => void;
  guidanceContext: WizardPrepFieldGuidanceContext;
  disabled?: boolean;
}) {
  return (
    <div className="ew-prep-call-plan-cards">
      {INTRO_CALL_PLAN_CARD_SECTIONS.map((section) => (
        <article key={section.id} className="ew-prep-call-plan-card">
          <header className="ew-prep-call-plan-card-head">
            <h4 className="ew-prep-call-plan-card-title">{section.label}</h4>
            {section.helper ? (
              <p className="ew-prep-call-plan-card-helper">{section.helper}</p>
            ) : null}
          </header>
          <div
            className={`ew-prep-call-plan-card-body${section.fields.length > 1 ? " ew-prep-call-plan-card-body--split" : ""}`}
          >
            {section.fields.map((field) => (
              <PlanCardField
                key={field.key}
                spec={field}
                value={draft[field.key] ?? ""}
                disabled={disabled}
                placeholder={wizardPrepPlaceholder(field.key, guidanceContext)}
                onChange={onChange}
              />
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
