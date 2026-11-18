"use client";

import React from "react";
import { createPortal } from "react-dom";
import type { IntroCallConversationFocusId } from "@/lib/surgical-sales/engagements/introCallConversationFocus";
import type { IntroCallAiRecommendationsSummary } from "@/lib/surgical-sales/engagements/introCallAiRecommendationsSummary";
import type { IntroCallAiRecommendationSectionId } from "@/lib/surgical-sales/engagements/introCallAiRecommendationSections";
import {
  INTRO_CALL_AI_RECOMMENDATIONS_HINT,
  INTRO_CALL_APPLY_TO_MISSION_PREP_LABEL,
  INTRO_CALL_REMOVE_INSERTED_LABEL,
  INTRO_CALL_SUGGESTED_DISCOVERY_PREP_TITLE,
  type IntroCallTemplateState,
} from "@/lib/surgical-sales/engagements/introCallTemplateState";
import type { EngagementWorkflowDraft } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";
import { IntroCallAiRecommendationSections } from "./IntroCallAiRecommendationSections";
import { useNarrowWizardLayout } from "./useNarrowWizardLayout";

export function IntroCallAiRecommendationsReviewDrawer({
  open,
  onClose,
  summary,
  templateState,
  conversationFocus,
  workflowDraft,
  savedEditsHint,
  disabled,
  canRemoveInserted,
  onInsertIntoPlan,
  onApplySection,
  onRemoveInserted,
  onResetToGeneric,
}: {
  open: boolean;
  onClose: () => void;
  summary: IntroCallAiRecommendationsSummary;
  templateState: IntroCallTemplateState;
  conversationFocus: readonly IntroCallConversationFocusId[];
  workflowDraft: EngagementWorkflowDraft;
  savedEditsHint?: boolean;
  disabled?: boolean;
  canRemoveInserted?: boolean;
  onInsertIntoPlan: () => void;
  onApplySection: (sectionId: IntroCallAiRecommendationSectionId) => void;
  onRemoveInserted?: () => void;
  onResetToGeneric: () => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  const isNarrow = useNarrowWizardLayout(768);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !disabled) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, disabled]);

  const handleInsert = React.useCallback(() => {
    onClose();
    onInsertIntoPlan();
  }, [onClose, onInsertIntoPlan]);

  if (!open || !mounted) return null;

  const overlayClass = isNarrow
    ? "ew-prep-ai-recs-review-overlay"
    : "ew-prep-ai-recs-review-overlay ew-prep-ai-recs-review-overlay--modal";

  return createPortal(
    <div
      role="dialog"
      aria-modal
      aria-labelledby="ew-prep-ai-recs-review-title"
      className={overlayClass}
      onClick={(e) => {
        if (e.target === e.currentTarget && !disabled) onClose();
      }}
    >
      <div className="ew-prep-ai-recs-review-drawer" onClick={(e) => e.stopPropagation()}>
        <header className="ew-prep-ai-recs-review-head">
          <div>
            <h2 id="ew-prep-ai-recs-review-title" className="ew-prep-ai-recs-review-title">
              {INTRO_CALL_SUGGESTED_DISCOVERY_PREP_TITLE}
            </h2>
            <p className="ew-prep-ai-recs-review-sub">
              {summary.templateName} · {summary.productFocusLabel} · {summary.probeCount} operational{" "}
              {summary.probeCount === 1 ? "prompt" : "prompts"}
            </p>
            <p className="ew-prep-ai-recs-review-focus-summary">
              Focus: {summary.focusAreaLabels.join(", ")}
              {summary.prepGapLabels.length > 0
                ? ` · Gaps: ${summary.prepGapLabels.join(", ")}`
                : null}
            </p>
            <p className="ew-prep-ai-recs-review-hint ew-prep-ai-recs-review-hint--drawer">
              {INTRO_CALL_AI_RECOMMENDATIONS_HINT}
            </p>
          </div>
          <button
            type="button"
            className="ew-prep-ai-recs-review-close"
            onClick={onClose}
            disabled={disabled}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="ew-prep-ai-recs-review-body">
          <IntroCallAiRecommendationSections
            templateState={templateState}
            conversationFocus={conversationFocus}
            workflowDraft={workflowDraft}
            savedEditsHint={savedEditsHint}
            disabled={disabled}
            onApplySection={onApplySection}
          />
        </div>

        <footer className="ew-prep-ai-recs-review-foot">
          <div className="ew-prep-ai-recs-review-foot-row">
            <button
              type="button"
              className="ew-prep-ai-recs-review-action ew-prep-ai-recs-review-action--primary"
              disabled={disabled}
              onClick={handleInsert}
            >
              {INTRO_CALL_APPLY_TO_MISSION_PREP_LABEL}
            </button>
          </div>
          <div className="ew-prep-ai-recs-review-foot-row">
            {canRemoveInserted && onRemoveInserted ? (
              <button
                type="button"
                className="ew-prep-ai-recs-review-action"
                disabled={disabled}
                onClick={onRemoveInserted}
              >
                {INTRO_CALL_REMOVE_INSERTED_LABEL}
              </button>
            ) : null}
            <button
              type="button"
              className="ew-prep-ai-recs-review-action"
              disabled={disabled}
              onClick={onResetToGeneric}
            >
              Reset to generic discovery
            </button>
            <button
              type="button"
              className="ew-prep-ai-recs-review-action"
              disabled={disabled}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
