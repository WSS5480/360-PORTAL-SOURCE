"use client";

import React from "react";
import { EngagementTacticalBriefingForm } from "@/components/sales/EngagementTacticalBriefingForm";
import { TacticalAiAssistSessionProvider } from "@/components/sales/TacticalAiAssistSession";
import { EngagementWorkflowFieldsForm } from "@/components/sales/EngagementWorkflowFieldsForm";
import { ENGAGEMENT_REFINE_PREP_SECTION_TITLE } from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import { REFINE_PREP_TACTICAL_DESCRIPTION } from "@/lib/surgical-sales/engagements/prepareFlowTerminology";
import {
  filterTacticalBriefingSections,
  tacticalBriefingSectionsForMode,
} from "@/lib/surgical-sales/engagements/engagementTacticalBriefingSections";
import { PreCallPlanTemplateSection } from "@/components/sales/PreCallPlanTemplateSection";
import {
  getPlanningStepDescription,
  getPlanningStepLabel,
  isOfficeVisitEngagement,
  resolveEngagementWorkflowMode,
  supportsPlaybookTemplates,
  workflowFieldConfigsForMode,
  type EngagementWorkflowModeOverride,
} from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";
import { OfficeVisit360PlanningSection } from "@/components/sales/OfficeVisit360PlanningSection";
import {
  buildEngagementWorkflowDraftFromRow,
  buildEngagementWorkflowPatch,
  countWorkflowFieldsFilled,
  mergeTemplateIntoWorkflowDraft,
  strategicPreCallKeysFromDraft,
  type EngagementWorkflowDraft,
} from "@/lib/surgical-sales/engagements/engagementWorkflowFields";
import type { TemplateSuggestContext } from "@/lib/surgical-sales/preCallPlanTemplateSuggest";
import type { PreCallPlanProductLine } from "@/lib/surgical-sales/preCallPlanTemplateTypes";

export function EngagementPlanningSection({
  engagement,
  disabled,
  compact,
  hideHeader,
  denseFields,
  tacticalBriefing,
  defaultProductLine,
  suggestContext,
  appliedTemplateId,
  onAppliedTemplateIdChange,
  onDraftChange,
  onAssistError,
}: {
  engagement: Record<string, unknown>;
  disabled?: boolean;
  compact?: boolean;
  hideHeader?: boolean;
  /** Compact field inputs (mobile edit) */
  denseFields?: boolean;
  /** Tactical briefing cards (engagement detail — Refine Prep) */
  tacticalBriefing?: boolean;
  defaultProductLine?: PreCallPlanProductLine | "";
  suggestContext: TemplateSuggestContext;
  appliedTemplateId: string | null;
  onAppliedTemplateIdChange: (id: string | null) => void;
  onDraftChange?: (draft: EngagementWorkflowDraft) => void;
  onAssistError?: (message: string | null) => void;
}) {
  const engagementType = String(engagement.engagement_type ?? "");
  const workflowModeOverride = (engagement.engagement_workflow_mode as EngagementWorkflowModeOverride | null) ?? null;
  const workflowMode = resolveEngagementWorkflowMode(engagementType, workflowModeOverride);
  const fieldConfigs = workflowFieldConfigsForMode(workflowMode, engagementType);

  const [draft, setDraft] = React.useState<EngagementWorkflowDraft>(() =>
    buildEngagementWorkflowDraftFromRow(engagement, engagementType, workflowModeOverride),
  );

  React.useEffect(() => {
    const next = buildEngagementWorkflowDraftFromRow(engagement, engagementType, workflowModeOverride);
    setDraft(next);
    onDraftChange?.(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when engagement row changes
  }, [engagement.updated_at, engagement.id, engagementType, workflowModeOverride]);

  const isOfficeVisit = isOfficeVisitEngagement(engagementType);
  const progress = countWorkflowFieldsFilled(draft, workflowMode, engagementType);
  const planningLabel = tacticalBriefing
    ? ENGAGEMENT_REFINE_PREP_SECTION_TITLE
    : getPlanningStepLabel(workflowMode, engagementType);
  const planningDescription = tacticalBriefing
    ? REFINE_PREP_TACTICAL_DESCRIPTION
    : getPlanningStepDescription(workflowMode, engagementType);
  const tacticalSections = tacticalBriefing
    ? filterTacticalBriefingSections(
        tacticalBriefingSectionsForMode(workflowMode, engagementType),
        workflowMode,
        engagementType,
      )
    : [];

  function updateDraft(next: EngagementWorkflowDraft) {
    setDraft(next);
    onDraftChange?.(next);
  }

  const templateDraft = strategicPreCallKeysFromDraft(draft);

  if (isOfficeVisit) {
    return (
      <OfficeVisit360PlanningSection
        engagementType={engagementType}
        engagement={engagement}
        disabled={disabled}
        hideHeader={hideHeader}
        defaultProductLine={defaultProductLine}
        suggestContext={suggestContext}
        draft={draft}
        onDraftChange={updateDraft}
        onTemplateApplied={(id) => onAppliedTemplateIdChange(id)}
      />
    );
  }

  return (
    <>
      {hideHeader ? null : (
        <header style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: compact ? 8 : 12 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: compact ? 14 : 15, fontWeight: 800 }}>{planningLabel}</h3>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--muted)" }}>{planningDescription}</p>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--brand-700)", flexShrink: 0 }}>
            {progress.filled}/{progress.total}
          </span>
        </header>
      )}
      {supportsPlaybookTemplates(workflowMode, engagementType) ? (
        <div className={tacticalBriefing ? "edm-tactical-playbook" : undefined}>
          <PreCallPlanTemplateSection
            compact={compact}
            draft={templateDraft}
            disabled={disabled}
            defaultProductLine={defaultProductLine}
            suggestContext={suggestContext}
            onDraftChange={(next, meta) => {
              updateDraft(mergeTemplateIntoWorkflowDraft(draft, next));
              if (meta?.appliedTemplateId) onAppliedTemplateIdChange(meta.appliedTemplateId);
            }}
          />
        </div>
      ) : null}
      {tacticalBriefing && tacticalSections.length > 0 ? (
        <TacticalAiAssistSessionProvider engagementId={String(engagement.id ?? "")}>
          <EngagementTacticalBriefingForm
            sections={tacticalSections}
            draft={draft}
            disabled={disabled}
            engagementId={String(engagement.id ?? "")}
            engagementType={engagementType}
            onAssistApplied={(patch) => {
              const next = { ...draft };
              for (const [key, value] of Object.entries(patch)) {
                next[key] = value ?? "";
              }
              updateDraft(next);
              onDraftChange?.(next);
            }}
            onAssistError={onAssistError ?? (() => {})}
            onChange={(key, value) => updateDraft({ ...draft, [key]: value })}
          />
        </TacticalAiAssistSessionProvider>
      ) : (
        <EngagementWorkflowFieldsForm
          draft={draft}
          fields={fieldConfigs}
          disabled={disabled}
          compact={denseFields ?? compact}
          onChange={(key, value) => updateDraft({ ...draft, [key]: value })}
        />
      )}
    </>
  );
}

export function buildEngagementPlanningPatch(
  engagement: Record<string, unknown>,
  draft: EngagementWorkflowDraft,
): Record<string, string | null> {
  const engagementType = String(engagement.engagement_type ?? "");
  const workflowModeOverride = (engagement.engagement_workflow_mode as EngagementWorkflowModeOverride | null) ?? null;
  const workflowMode = resolveEngagementWorkflowMode(engagementType, workflowModeOverride);
  return buildEngagementWorkflowPatch(draft, workflowMode, engagementType);
}
