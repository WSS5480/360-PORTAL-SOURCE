"use client";

import React from "react";
import { IntroCallPlanCardsForm } from "./IntroCallPlanCardsForm";
import {
  PreparationReadinessSnapshot,
} from "@/app/portal/sales/engagements/new/PreparationReadinessFeedback";
import type { EngagementWizardPrepView } from "@/lib/surgical-sales/engagements/loadEngagementWizardPrepView";
import {
  applyConversationFocusToTemplatePreview,
  parseIntroCallConversationFocus,
  serializeIntroCallConversationFocus,
  type IntroCallConversationFocusId,
} from "@/lib/surgical-sales/engagements/introCallConversationFocus";
import { INTRO_CALL_PREP_SECTION_TITLE } from "@/lib/surgical-sales/engagements/introCallOfficialPreCallTemplates";
import type { IntroCallProductFocus } from "@/lib/surgical-sales/engagements/introCallOfficialPreCallTemplates";
import {
  applyIntroCallAiRecommendationSectionToDraft,
  introCallAiRecommendationSectionHasContent,
  mergeIntroCallAppliedSnapshotForSection,
  shouldPromptBeforeIntroCallSectionReplace,
  type IntroCallAiRecommendationSectionId,
} from "@/lib/surgical-sales/engagements/introCallAiRecommendationSections";
import { applyIntroCallTemplateToDraft } from "@/lib/surgical-sales/engagements/introCallTemplateApply";
import {
  strategicPreCallKeysFromDraft,
  type EngagementWorkflowDraft,
} from "@/lib/surgical-sales/engagements/engagementWorkflowFields";
import { assessEngagementWizardPrepReadiness } from "@/lib/surgical-sales/engagements/engagementWizardPrepReadiness";
import { formatEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import type { WizardPrepFieldGuidanceContext } from "@/lib/surgical-sales/engagements/engagementWizardPrepFieldGuidance";
import type { PreCallPlanFieldKey } from "@/lib/surgical-sales/preCallPlanFields";
import type { TemplateSuggestContext } from "@/lib/surgical-sales/preCallPlanTemplateSuggest";
import {
  buildIntroCallTemplateState,
  INTRO_CALL_INSERT_INTO_PLAN_CONFIRM_MESSAGE,
  INTRO_CALL_INSERT_INTO_PLAN_CONFIRM_TITLE,
  INTRO_CALL_INSERT_INTO_PLAN_LABEL,
  removeAppliedTemplateFromDraft,
  snapshotFromTemplate,
  type IntroCallTemplateSnapshot,
} from "@/lib/surgical-sales/engagements/introCallTemplateState";
import { IntroCallAiRecommendations } from "./IntroCallAiRecommendations";
import { PrepConversationFocusChips } from "./PrepConversationFocusChips";
import { PrepProductFocusSelector } from "./PrepProductFocusSelector";

export function IntroCallPrepContextBanner({
  providerLabel,
  organizationLabel,
}: {
  providerLabel: string;
  organizationLabel: string;
}) {
  const segments = [
    formatEngagementType("intro_call"),
    providerLabel.trim(),
    organizationLabel.trim(),
  ].filter(Boolean);

  return (
    <p className="ew-prep-intro-context-line" aria-label="Engagement context">
      {segments.map((text, i) => (
        <React.Fragment key={`${text}-${i}`}>
          {i > 0 ? <span className="ew-prep-intro-context-sep" aria-hidden> · </span> : null}
          <span>{text}</span>
        </React.Fragment>
      ))}
    </p>
  );
}

function TemplateConfirmDialog({
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="ew-prep-template-dialog-backdrop" role="presentation">
      <div
        className="ew-prep-template-dialog"
        role="alertdialog"
        aria-labelledby="ew-prep-template-dialog-title"
        aria-describedby="ew-prep-template-dialog-desc"
      >
        <h3 id="ew-prep-template-dialog-title" className="ew-prep-template-dialog-title">
          {title}
        </h3>
        <p id="ew-prep-template-dialog-desc" className="ew-prep-template-dialog-desc">
          {message}
        </p>
        <div className="ew-prep-template-dialog-actions">
          <button type="button" className="ew-prep-template-dialog-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="ew-prep-template-dialog-btn ew-prep-template-dialog-btn--primary"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function IntroCallPreCallPlanPanel({
  prep: _prep,
  prepRefreshing = false,
  disabled,
  workflowDraft,
  onWorkflowDraftChange,
  productLine,
  onProductLineChange,
  providerLabel,
  organizationLabel,
  providerSpecialty,
  opportunityProductLine,
  conversationFocusRaw,
  onConversationFocusChange,
  suggestContext,
  productFitContent,
  manualCustomizeSlot,
}: {
  prep: EngagementWizardPrepView;
  prepRefreshing?: boolean;
  disabled?: boolean;
  workflowDraft: EngagementWorkflowDraft;
  onWorkflowDraftChange: (draft: EngagementWorkflowDraft) => void;
  productLine: string;
  onProductLineChange?: (line: string) => void;
  providerLabel: string;
  organizationLabel: string;
  providerSpecialty?: string | null;
  opportunityProductLine?: string | null;
  conversationFocusRaw?: string;
  onConversationFocusChange?: (serialized: string) => void;
  suggestContext: TemplateSuggestContext;
  productFitContent?: React.ReactNode;
  manualCustomizeSlot?: React.ReactNode;
}) {
  const conversationFocus = React.useMemo(
    () => parseIntroCallConversationFocus(conversationFocusRaw ?? ""),
    [conversationFocusRaw],
  );

  const readiness = React.useMemo(
    () =>
      assessEngagementWizardPrepReadiness({
        isStrategic: true,
        engagementType: "intro_call",
        workflowDraft,
        basicsProductLine: productLine,
        suggestContext,
        opportunityProductLine,
      }),
    [workflowDraft, productLine, suggestContext, opportunityProductLine],
  );

  const [appliedTemplateId, setAppliedTemplateId] = React.useState<IntroCallProductFocus | null>(
    null,
  );
  const [appliedSnapshot, setAppliedSnapshot] = React.useState<IntroCallTemplateSnapshot | null>(
    null,
  );
  const [applyDialogOpen, setApplyDialogOpen] = React.useState(false);
  const [sectionApplyDialogOpen, setSectionApplyDialogOpen] = React.useState(false);
  const [pendingSectionId, setPendingSectionId] =
    React.useState<IntroCallAiRecommendationSectionId | null>(null);

  const templateState = React.useMemo(
    () =>
      buildIntroCallTemplateState({
        productLine,
        providerSpecialty,
        draft: workflowDraft,
        appliedTemplateId,
        appliedSnapshot,
      }),
    [productLine, providerSpecialty, workflowDraft, appliedTemplateId, appliedSnapshot],
  );

  const preCallDraft = React.useMemo(() => strategicPreCallKeysFromDraft(workflowDraft), [workflowDraft]);

  const planGuidanceContext = React.useMemo(
    (): WizardPrepFieldGuidanceContext => ({
      engagementType: "intro_call",
      productLine: productLine as WizardPrepFieldGuidanceContext["productLine"],
      providerSpecialty: providerSpecialty ?? null,
    }),
    [productLine, providerSpecialty],
  );

  const handleFieldChange = React.useCallback(
    (key: PreCallPlanFieldKey, value: string) => {
      onWorkflowDraftChange({ ...workflowDraft, [key]: value });
    },
    [workflowDraft, onWorkflowDraftChange],
  );

  const handleProductLineChange = React.useCallback(
    (nextLine: string) => {
      if (!onProductLineChange || nextLine === productLine) return;
      onProductLineChange(nextLine);
    },
    [onProductLineChange, productLine],
  );

  const handleConversationFocusChange = React.useCallback(
    (next: IntroCallConversationFocusId[]) => {
      onConversationFocusChange?.(serializeIntroCallConversationFocus(next));
    },
    [onConversationFocusChange],
  );

  const templateForApply = React.useMemo(
    () =>
      applyConversationFocusToTemplatePreview(
        templateState.generatedSuggestions,
        conversationFocus,
      ),
    [templateState.generatedSuggestions, conversationFocus],
  );

  const executeApplyTemplate = React.useCallback(() => {
    const snapshot = snapshotFromTemplate(templateForApply);
    const next = applyIntroCallTemplateToDraft(workflowDraft, templateForApply, { replace: true });
    onWorkflowDraftChange(next);
    setAppliedTemplateId(templateState.selectedProductFocus);
    setAppliedSnapshot(snapshot);
    setApplyDialogOpen(false);
  }, [templateForApply, templateState.selectedProductFocus, workflowDraft, onWorkflowDraftChange]);

  const executeApplySection = React.useCallback(
    (sectionId: IntroCallAiRecommendationSectionId) => {
      const replace = introCallAiRecommendationSectionHasContent(workflowDraft, sectionId);
      const next = applyIntroCallAiRecommendationSectionToDraft(
        workflowDraft,
        templateForApply,
        sectionId,
        { replace },
      );
      onWorkflowDraftChange(next);
      setAppliedSnapshot((prev) =>
        mergeIntroCallAppliedSnapshotForSection(prev, templateForApply, sectionId),
      );
      setAppliedTemplateId((prev) => prev ?? templateState.selectedProductFocus);
      setSectionApplyDialogOpen(false);
      setPendingSectionId(null);
    },
    [templateForApply, templateState.selectedProductFocus, workflowDraft, onWorkflowDraftChange],
  );

  const handleApplySection = React.useCallback(
    (sectionId: IntroCallAiRecommendationSectionId) => {
      if (shouldPromptBeforeIntroCallSectionReplace(workflowDraft, sectionId)) {
        setPendingSectionId(sectionId);
        setSectionApplyDialogOpen(true);
        return;
      }
      executeApplySection(sectionId);
    },
    [workflowDraft, executeApplySection],
  );

  const handleRemoveInserted = React.useCallback(() => {
    const next = removeAppliedTemplateFromDraft(workflowDraft, appliedSnapshot);
    onWorkflowDraftChange(next);
    setAppliedTemplateId(null);
    setAppliedSnapshot(null);
  }, [workflowDraft, appliedSnapshot, onWorkflowDraftChange]);

  const handleResetToGeneric = React.useCallback(() => {
    onProductLineChange?.("");
  }, [onProductLineChange]);

  const savedEditsHint =
    templateState.hasManualEdits ||
    (appliedTemplateId !== null && templateState.previewDiffersFromApplied);

  return (
    <section
      className={`ew-prep-intro-official ew-prep-intro-official--mission${prepRefreshing ? " ew-prep-intro-official--refreshing" : ""}`}
      aria-label={INTRO_CALL_PREP_SECTION_TITLE}
      aria-busy={prepRefreshing || undefined}
    >
      <PreparationReadinessSnapshot readiness={readiness} />

      <div className="ew-prep-intro-tier ew-prep-intro-tier--plan ew-prep-call-plan ew-prep-intro-tier--plan-primary">
        <header className="ew-prep-call-plan-head">
          <div>
            <h3 className="ew-prep-call-plan-title">Call Plan</h3>
            <p className="ew-prep-call-plan-sub">
              Your primary workspace — what saves with the engagement. Suggested discovery prep below
              only updates these fields when you apply.
            </p>
          </div>
        </header>
        <IntroCallPlanCardsForm
          draft={preCallDraft}
          onChange={handleFieldChange}
          guidanceContext={planGuidanceContext}
          disabled={disabled}
        />
      </div>

      <div className="ew-prep-intro-tier ew-prep-intro-tier--context ew-prep-intro-tier--context-compact">
        <h3 className="ew-prep-intro-tier-label">Engagement context</h3>
        <IntroCallPrepContextBanner
          providerLabel={providerLabel}
          organizationLabel={organizationLabel}
        />
      </div>

      <div className="ew-prep-prep-flow" aria-label="Engagement preparation setup">
        {onProductLineChange ? (
          <div className="ew-prep-prep-flow-step ew-prep-prep-flow-step--product">
            <span className="ew-prep-flow-step" aria-hidden>
              A
            </span>
            <PrepProductFocusSelector
              productLine={productLine}
              providerSpecialty={providerSpecialty}
              opportunityProductLine={opportunityProductLine}
              disabled={disabled}
              onProductLineChange={handleProductLineChange}
            />
          </div>
        ) : null}

        <div className="ew-prep-prep-flow-step ew-prep-prep-flow-step--focus">
          <span className="ew-prep-flow-step" aria-hidden>
            B
          </span>
          <PrepConversationFocusChips
            selected={conversationFocus}
            disabled={disabled}
            onChange={handleConversationFocusChange}
          />
        </div>

        <div className="ew-prep-prep-flow-step ew-prep-prep-flow-step--suggested">
          <IntroCallAiRecommendations
            templateState={templateState}
            productLine={productLine}
            conversationFocus={conversationFocus}
            readiness={readiness}
            workflowDraft={workflowDraft}
            savedEditsHint={savedEditsHint}
            disabled={disabled}
            canRemoveInserted={templateState.canRemoveTemplate}
            onInsertIntoPlan={() => setApplyDialogOpen(true)}
            onApplySection={handleApplySection}
            onRemoveInserted={handleRemoveInserted}
            onResetToGeneric={handleResetToGeneric}
          />
        </div>

        {productFitContent || manualCustomizeSlot ? (
          <div className="ew-prep-prep-flow-step ew-prep-prep-flow-step--manual">
            <span className="ew-prep-flow-step" aria-hidden>
              D
            </span>
            <div className="ew-prep-prep-flow-manual">
              <h3 className="ew-prep-prep-flow-manual-label">Manual customization</h3>
              {manualCustomizeSlot ? (
                <div className="ew-prep-manual-slot ew-prep-manual-slot--intro">{manualCustomizeSlot}</div>
              ) : null}
              {productFitContent ? (
                <details className="ew-prep-optional ew-prep-optional--intro">
                  <summary className="ew-prep-optional-summary">
                    <span className="ew-prep-optional-title">Playbook templates</span>
                    <span className="ew-prep-optional-hint">Optional</span>
                  </summary>
                  <div className="ew-prep-optional-body">{productFitContent}</div>
                </details>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {applyDialogOpen ? (
        <TemplateConfirmDialog
          title={INTRO_CALL_INSERT_INTO_PLAN_CONFIRM_TITLE}
          message={INTRO_CALL_INSERT_INTO_PLAN_CONFIRM_MESSAGE}
          confirmLabel={INTRO_CALL_INSERT_INTO_PLAN_LABEL}
          onCancel={() => setApplyDialogOpen(false)}
          onConfirm={executeApplyTemplate}
        />
      ) : null}

      {sectionApplyDialogOpen && pendingSectionId ? (
        <TemplateConfirmDialog
          title="Replace section?"
          message="This section already has content. Replace it with the suggested prep? Your other fields stay as they are, and you can edit or clear applied prep anytime."
          confirmLabel="Replace section"
          onCancel={() => {
            setSectionApplyDialogOpen(false);
            setPendingSectionId(null);
          }}
          onConfirm={() => executeApplySection(pendingSectionId)}
        />
      ) : null}
    </section>
  );
}
