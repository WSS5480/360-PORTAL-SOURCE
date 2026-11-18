"use client";

import React from "react";
import { preCallPlanTemplateFlowCss } from "@/components/sales/preCallPlanTemplateFlowCss";
import { PreCallPlanTemplatePicker } from "@/components/sales/PreCallPlanTemplatePicker";
import type { PreCallPlanFieldKey } from "@/lib/surgical-sales/preCallPlanFields";
import type {
  PreCallPlanProductLine,
  PreCallPlanTemplateEngagementType,
} from "@/lib/surgical-sales/preCallPlanTemplateTypes";
import type { TemplateSuggestContext } from "@/lib/surgical-sales/preCallPlanTemplateSuggest";
import {
  PLAYBOOK_APPLY_LABEL,
  PLAYBOOK_SAVE_LABEL,
} from "@/lib/surgical-sales/engagements/prepareFlowTerminology";

export function UsePreCallPlanTemplateFlow({
  open,
  onClose,
  onApply,
  currentDraft,
  initialProductLine,
  initialEngagementType,
  suggestContext,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (nextDraft: Record<PreCallPlanFieldKey, string>, templateId: string) => void;
  currentDraft: Record<PreCallPlanFieldKey, string>;
  initialProductLine?: PreCallPlanProductLine | null;
  initialEngagementType?: PreCallPlanTemplateEngagementType | null;
  suggestContext?: TemplateSuggestContext;
  compact?: boolean;
}) {
  if (!open) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: preCallPlanTemplateFlowCss }} />
      <div
        className="pcp-template-backdrop"
        role="presentation"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        <div
          className="pcp-template-sheet pcp-template-sheet--modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pcp-template-title"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="pcp-template-head">
            <div>
              <h2 id="pcp-template-title">Suggested Playbooks</h2>
              <p>Optional: use a suggested playbook to prefill preparation. You can edit every field after applying.</p>
            </div>
            <button type="button" className="pcp-template-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </header>
          <PreCallPlanTemplatePicker
            currentDraft={currentDraft}
            initialProductLine={initialProductLine ?? ""}
            initialEngagementType={initialEngagementType ?? ""}
            suggestContext={suggestContext}
            onApply={(next, templateId) => {
              onApply(next, templateId);
              onClose();
            }}
          />
        </div>
      </div>
    </>
  );
}

export function PreCallPlanTemplateToolbar({
  onUseTemplate,
  onSaveTemplate,
  disabled,
  compact,
}: {
  onUseTemplate: () => void;
  onSaveTemplate: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: preCallPlanTemplateFlowCss }} />
      <div className="pcp-template-actions-row" style={compact ? { marginBottom: 8 } : undefined}>
        <button type="button" disabled={disabled} onClick={onUseTemplate}>
          {compact ? PLAYBOOK_APPLY_LABEL : "Use template"}
        </button>
        <button type="button" disabled={disabled} onClick={onSaveTemplate}>
          {compact ? PLAYBOOK_SAVE_LABEL : "Save as template"}
        </button>
      </div>
    </>
  );
}
