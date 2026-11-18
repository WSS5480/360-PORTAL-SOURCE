"use client";

import React from "react";
import { OfficeVisit360PlanningForm } from "@/components/sales/OfficeVisit360PlanningForm";
import { PreCallPlanTemplatePicker } from "@/components/sales/PreCallPlanTemplatePicker";
import { preCallPlanTemplateFlowCss } from "@/components/sales/preCallPlanTemplateFlowCss";
import { officeVisit360PlanningCss } from "@/components/sales/officeVisit360PlanningCss";
import {
  OFFICE_VISIT_360_PLANNING_DESCRIPTION,
  OFFICE_VISIT_360_PLANNING_LABEL,
} from "@/lib/surgical-sales/engagements/officeVisit360Workflow";
import {
  buildEngagementWorkflowDraftFromRow,
  countWorkflowFieldsFilled,
  mergeTemplateIntoOfficeVisitDraft,
  officeVisitTemplateDraftFromWorkflow,
  type EngagementWorkflowDraft,
} from "@/lib/surgical-sales/engagements/engagementWorkflowFields";
import { resolveEngagementWorkflowMode } from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";
import type { TemplateSuggestContext } from "@/lib/surgical-sales/preCallPlanTemplateSuggest";
import type { PreCallPlanProductLine } from "@/lib/surgical-sales/preCallPlanTemplateTypes";
import { isEngagementType, type EngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";

export function OfficeVisit360PlanningSection({
  engagementType,
  engagement,
  disabled,
  hideHeader,
  defaultProductLine,
  suggestContext,
  draft: controlledDraft,
  onDraftChange,
  templatesOpen: controlledTemplatesOpen,
  onTemplatesOpenChange,
  onTemplateApplied,
  hidePlaybooks,
  guided,
}: {
  engagementType: string;
  engagement?: Record<string, unknown>;
  disabled?: boolean;
  hideHeader?: boolean;
  defaultProductLine?: PreCallPlanProductLine | "";
  suggestContext: TemplateSuggestContext;
  draft?: EngagementWorkflowDraft;
  onDraftChange?: (draft: EngagementWorkflowDraft) => void;
  templatesOpen?: boolean;
  onTemplatesOpenChange?: (open: boolean) => void;
  onTemplateApplied?: (templateId: string) => void;
  /** When true, playbooks are shown elsewhere (e.g. engagement create wizard). */
  hidePlaybooks?: boolean;
  /** Compact wizard preparation layout */
  guided?: boolean;
}) {
  const workflowModeOverride =
    (engagement?.engagement_workflow_mode as "strategic" | "lightweight" | null) ?? null;
  const workflowMode = resolveEngagementWorkflowMode(engagementType, workflowModeOverride);

  const [internalDraft, setInternalDraft] = React.useState<EngagementWorkflowDraft>(() =>
    engagement
      ? buildEngagementWorkflowDraftFromRow(engagement, engagementType, workflowModeOverride)
      : {},
  );
  const [internalTemplatesOpen, setInternalTemplatesOpen] = React.useState(false);

  const draft = controlledDraft ?? internalDraft;
  const templatesOpen = controlledTemplatesOpen ?? internalTemplatesOpen;

  React.useEffect(() => {
    if (!engagement) return;
    const next = buildEngagementWorkflowDraftFromRow(engagement, engagementType, workflowModeOverride);
    setInternalDraft(next);
    onDraftChange?.(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagement?.updated_at, engagement?.id, engagementType]);

  const progress = countWorkflowFieldsFilled(draft, workflowMode, engagementType);
  const templateDraft = officeVisitTemplateDraftFromWorkflow(draft);
  const crmType = isEngagementType(engagementType) ? engagementType : ("" as EngagementType);

  function updateDraft(next: EngagementWorkflowDraft) {
    setInternalDraft(next);
    onDraftChange?.(next);
  }

  function setTemplatesOpen(open: boolean) {
    setInternalTemplatesOpen(open);
    onTemplatesOpenChange?.(open);
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `${officeVisit360PlanningCss}\n${preCallPlanTemplateFlowCss}` }} />
      {hideHeader ? null : (
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 6,
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>{OFFICE_VISIT_360_PLANNING_LABEL}</h3>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--muted)", lineHeight: 1.35 }}>
              {OFFICE_VISIT_360_PLANNING_DESCRIPTION}
            </p>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--brand-700)", flexShrink: 0 }}>
            {progress.filled}/{progress.total}
          </span>
        </header>
      )}
      <OfficeVisit360PlanningForm
        draft={draft}
        disabled={disabled}
        guided={guided}
        onChange={(key, value) => updateDraft({ ...draft, [key]: value })}
      />
      {hidePlaybooks ? null : (
        <details
          className="office-visit-360-templates-wrap create-engagement-playbooks-collapsible"
          open={templatesOpen}
          onToggle={(e) => setTemplatesOpen(e.currentTarget.open)}
        >
          <summary className="create-engagement-fields-collapsible-summary">
            <span>Suggested Playbooks</span>
          </summary>
          <div className="create-engagement-playbooks-body">
            <PreCallPlanTemplatePicker
              embedded
              hideEngagementTypeFilter
              initialEngagementType={crmType || "office_visit_360"}
              suggestContext={suggestContext}
              currentDraft={templateDraft}
              onApply={(next, templateId) => {
                updateDraft(mergeTemplateIntoOfficeVisitDraft(draft, next));
                onTemplateApplied?.(templateId);
                setTemplatesOpen(false);
              }}
            />
          </div>
        </details>
      )}
    </>
  );
}
