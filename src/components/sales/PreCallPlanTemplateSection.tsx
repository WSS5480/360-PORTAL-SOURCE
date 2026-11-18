"use client";

import React from "react";
import type { PreCallPlanFieldKey } from "@/lib/surgical-sales/preCallPlanFields";
import type {
  PreCallPlanProductLine,
  PreCallPlanTemplateEngagementType,
} from "@/lib/surgical-sales/preCallPlanTemplateTypes";
import type { TemplateSuggestContext } from "@/lib/surgical-sales/preCallPlanTemplateSuggest";
import {
  PreCallPlanTemplateToolbar,
  UsePreCallPlanTemplateFlow,
} from "@/components/sales/UsePreCallPlanTemplateFlow";
import { SavePreCallPlanTemplateSheet } from "@/components/sales/SavePreCallPlanTemplateSheet";

import type { EngagementWorkflowDraft } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";

export type PreCallPlanDraftChangeMeta = {
  appliedTemplateId?: string;
  officeVisit360WorkflowDraft?: EngagementWorkflowDraft;
};

export function PreCallPlanTemplateSection({
  draft,
  onDraftChange,
  disabled,
  compact,
  defaultProductLine,
  defaultEngagementType,
  suggestContext,
}: {
  draft: Record<PreCallPlanFieldKey, string>;
  onDraftChange: (next: Record<PreCallPlanFieldKey, string>, meta?: PreCallPlanDraftChangeMeta) => void;
  disabled?: boolean;
  compact?: boolean;
  defaultProductLine?: PreCallPlanProductLine | "";
  defaultEngagementType?: PreCallPlanTemplateEngagementType | "";
  suggestContext?: TemplateSuggestContext;
}) {
  const [useOpen, setUseOpen] = React.useState(false);
  const [saveOpen, setSaveOpen] = React.useState(false);

  return (
    <>
      <PreCallPlanTemplateToolbar
        compact={compact}
        disabled={disabled}
        onUseTemplate={() => setUseOpen(true)}
        onSaveTemplate={() => setSaveOpen(true)}
      />
      <UsePreCallPlanTemplateFlow
        open={useOpen}
        compact={compact}
        currentDraft={draft}
        initialProductLine={defaultProductLine || null}
        initialEngagementType={defaultEngagementType || null}
        suggestContext={suggestContext}
        onClose={() => setUseOpen(false)}
        onApply={(next, templateId) => onDraftChange(next, { appliedTemplateId: templateId })}
      />
      <SavePreCallPlanTemplateSheet
        open={saveOpen}
        draft={draft}
        defaultProductLine={defaultProductLine}
        defaultEngagementType={defaultEngagementType}
        onClose={() => setSaveOpen(false)}
      />
    </>
  );
}
