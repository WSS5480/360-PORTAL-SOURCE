"use client";

import React from "react";
import type { EngagementWorkflowFieldConfig } from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";
import type { PreCallPlanTemplate } from "@/lib/surgical-sales/preCallPlanTemplateModel";
import {
  resolveEngagementWorkflowMode,
  workflowFieldConfigsForMode,
  type EngagementWorkflowModeOverride,
} from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";
import type { EngagementWorkflowDraft } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";
import { buildPreCallPlanSectionCompletion } from "@/lib/surgical-sales/engagements/preCallPlanSectionCompletion";
import {
  INTRO_CALL_PREPARE_PLAN_LEAD,
  INTRO_CALL_PREPARE_PLAN_TITLE,
  OFFICE_VISIT_360_PREPARE_PLAN_LEAD,
  OFFICE_VISIT_360_PREPARE_PLAN_TITLE,
  PREPARE_PRE_CALL_PLAN_KICKER,
} from "@/lib/surgical-sales/engagements/prepareFlowTerminology";
import { pickPreCallPlanFieldConfigs } from "./preparePreCallPlanLayout";
import { groupIntroCallPlanFields } from "./prepareIntroCallLayout";
import { OFFICE_VISIT_360_PREPARE_FIELD_CONFIGS } from "@/lib/surgical-sales/engagements/officeVisit360PrepareFields";
import { groupOfficeVisit360PlanFields } from "./prepareOfficeVisit360Layout";
import { PreparePreCallPlanCompletion } from "./PreparePreCallPlanCompletion";
import { PreparePreCallPlanFieldCard } from "./PreparePreCallPlanFieldCard";

function PreCallPlanColumn({
  fields,
  draft,
  engagementId,
  engagementType,
  selectedPlaybook,
  disabled,
  onFieldChange,
  onAssistError,
  className,
}: {
  fields: EngagementWorkflowFieldConfig[];
  draft: EngagementWorkflowDraft;
  engagementId: string;
  engagementType: string;
  selectedPlaybook: PreCallPlanTemplate | null;
  disabled?: boolean;
  onFieldChange: (key: string, value: string) => void;
  onAssistError: (message: string | null) => void;
  className: string;
}) {
  return (
    <div className={className}>
      {fields.map((field) => (
        <PreparePreCallPlanFieldCard
          key={field.key}
          field={field}
          value={draft[field.key] ?? ""}
          engagementId={engagementId}
          engagementType={engagementType}
          selectedPlaybook={selectedPlaybook}
          disabled={disabled}
          onChange={(value) => onFieldChange(field.key, value)}
          onAssistError={onAssistError}
        />
      ))}
    </div>
  );
}

function SectionedPlanLayout({
  fields,
  draft,
  engagementId,
  engagementType,
  selectedPlaybook,
  disabled,
  sectionIdPrefix,
  groupFields,
  onFieldChange,
  onAssistError,
}: {
  fields: EngagementWorkflowFieldConfig[];
  draft: EngagementWorkflowDraft;
  engagementId: string;
  engagementType: string;
  selectedPlaybook: PreCallPlanTemplate | null;
  disabled?: boolean;
  sectionIdPrefix: string;
  groupFields: (
    fields: EngagementWorkflowFieldConfig[],
  ) => Array<{ section: { id: string; label: string; hint: string }; fields: EngagementWorkflowFieldConfig[] }>;
  onFieldChange: (key: string, value: string) => void;
  onAssistError: (message: string | null) => void;
}) {
  const sections = groupFields(fields);

  return (
    <div className="pfm-precall-plan-grid pfm-precall-plan-grid--stack pfm-precall-plan-grid--intro-sections">
      {sections.map(({ section, fields: sectionFields }) => (
        <section
          key={section.id}
          className="pfm-precall-plan-section"
          aria-labelledby={`${sectionIdPrefix}-section-${section.id}`}
        >
          <header className="pfm-precall-plan-section__head">
            <div className="pfm-precall-plan-section__title-wrap">
              <h3 id={`${sectionIdPrefix}-section-${section.id}`} className="pfm-precall-plan-section__title">
                {section.label}
              </h3>
              <p className="pfm-precall-plan-section__hint">{section.hint}</p>
            </div>
          </header>
          <div className="pfm-precall-plan-section__fields">
            {sectionFields.map((field) => (
              <PreparePreCallPlanFieldCard
                key={field.key}
                field={field}
                value={draft[field.key] ?? ""}
                engagementId={engagementId}
                engagementType={engagementType}
                selectedPlaybook={selectedPlaybook}
                disabled={disabled}
                onChange={(value) => onFieldChange(field.key, value)}
                onAssistError={onAssistError}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function PreparePreCallPlanForm({
  engagement,
  engagementId,
  draft,
  selectedPlaybook,
  disabled,
  saving,
  isIntroCall = false,
  isOfficeVisit360 = false,
  onFieldChange,
  onAssistError,
}: {
  engagement: Record<string, unknown>;
  engagementId: string;
  draft: EngagementWorkflowDraft;
  selectedPlaybook: PreCallPlanTemplate | null;
  disabled?: boolean;
  saving?: boolean;
  isIntroCall?: boolean;
  isOfficeVisit360?: boolean;
  onFieldChange: (key: string, value: string) => void;
  onAssistError: (message: string | null) => void;
}) {
  const engagementType = String(engagement.engagement_type ?? "");
  const workflowModeOverride = (engagement.engagement_workflow_mode as EngagementWorkflowModeOverride | null) ?? null;
  const workflowMode = resolveEngagementWorkflowMode(engagementType, workflowModeOverride);
  const allFields = workflowFieldConfigsForMode(workflowMode, engagementType);
  const { left, right, mobileOrder } = pickPreCallPlanFieldConfigs(allFields);

  const planFields = isOfficeVisit360
    ? OFFICE_VISIT_360_PREPARE_FIELD_CONFIGS
    : mobileOrder.length > 0
      ? mobileOrder
      : allFields;
  const completion = React.useMemo(
    () => buildPreCallPlanSectionCompletion(draft, planFields),
    [draft, planFields],
  );

  function updateField(key: string, value: string) {
    onFieldChange(key, value);
  }

  const useSectionedLayout = isIntroCall || isOfficeVisit360;
  const useTwoColumn = !useSectionedLayout && left.length > 0 && right.length > 0;

  return (
    <section className="pfm-precall-plan-panel" aria-labelledby="pfm-precall-plan-title">
      <header className="pfm-precall-plan-panel__head">
        <div className="pfm-precall-plan-panel__intro">
          <p className="pfm-precall-plan-panel__kicker">
            {isIntroCall ? "Build your call" : isOfficeVisit360 ? "Plan the visit" : "Execution plan"}
          </p>
          <h2 id="pfm-precall-plan-title" className="pfm-precall-plan-panel__title">
            {isIntroCall
              ? INTRO_CALL_PREPARE_PLAN_TITLE
              : isOfficeVisit360
                ? OFFICE_VISIT_360_PREPARE_PLAN_TITLE
                : PREPARE_PRE_CALL_PLAN_KICKER}
          </h2>
          {isIntroCall ? (
            <p className="pfm-precall-plan-panel__lead">{INTRO_CALL_PREPARE_PLAN_LEAD}</p>
          ) : isOfficeVisit360 ? (
            <p className="pfm-precall-plan-panel__lead">{OFFICE_VISIT_360_PREPARE_PLAN_LEAD}</p>
          ) : null}
        </div>
        <PreparePreCallPlanCompletion
          completion={completion}
          saving={saving}
          showProgressRing={useSectionedLayout}
        />
      </header>

      {isIntroCall ? (
        <SectionedPlanLayout
          fields={planFields}
          draft={draft}
          engagementId={engagementId}
          engagementType={engagementType}
          selectedPlaybook={selectedPlaybook}
          disabled={disabled}
          sectionIdPrefix="icp"
          groupFields={groupIntroCallPlanFields}
          onFieldChange={updateField}
          onAssistError={onAssistError}
        />
      ) : isOfficeVisit360 ? (
        <SectionedPlanLayout
          fields={planFields}
          draft={draft}
          engagementId={engagementId}
          engagementType={engagementType}
          selectedPlaybook={selectedPlaybook}
          disabled={disabled}
          sectionIdPrefix="ov360"
          groupFields={groupOfficeVisit360PlanFields}
          onFieldChange={updateField}
          onAssistError={onAssistError}
        />
      ) : useTwoColumn ? (
        <div className="pfm-precall-plan-grid pfm-precall-plan-grid--two-col">
          <PreCallPlanColumn
            fields={left}
            draft={draft}
            engagementId={engagementId}
            engagementType={engagementType}
            selectedPlaybook={selectedPlaybook}
            disabled={disabled}
            onFieldChange={updateField}
            onAssistError={onAssistError}
            className="pfm-precall-plan-col pfm-precall-plan-col--left"
          />
          <PreCallPlanColumn
            fields={right}
            draft={draft}
            engagementId={engagementId}
            engagementType={engagementType}
            selectedPlaybook={selectedPlaybook}
            disabled={disabled}
            onFieldChange={updateField}
            onAssistError={onAssistError}
            className="pfm-precall-plan-col pfm-precall-plan-col--right"
          />
        </div>
      ) : (
        <div className="pfm-precall-plan-grid pfm-precall-plan-grid--stack">
          <PreCallPlanColumn
            fields={planFields}
            draft={draft}
            engagementId={engagementId}
            engagementType={engagementType}
            selectedPlaybook={selectedPlaybook}
            disabled={disabled}
            onFieldChange={updateField}
            onAssistError={onAssistError}
            className="pfm-precall-plan-col pfm-precall-plan-col--stack"
          />
        </div>
      )}
    </section>
  );
}
