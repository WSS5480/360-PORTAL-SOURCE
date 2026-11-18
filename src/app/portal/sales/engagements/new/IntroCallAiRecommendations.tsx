"use client";

import React from "react";
import type { IntroCallConversationFocusId } from "@/lib/surgical-sales/engagements/introCallConversationFocus";
import { buildIntroCallAiRecommendationsSummary } from "@/lib/surgical-sales/engagements/introCallAiRecommendationsSummary";
import type { PreparationReadiness } from "@/lib/surgical-sales/engagements/engagementWizardPrepReadiness";
import type { IntroCallAiRecommendationSectionId } from "@/lib/surgical-sales/engagements/introCallAiRecommendationSections";
import {
  INTRO_CALL_APPLY_TO_MISSION_PREP_LABEL,
  INTRO_CALL_REVIEW_PREP_LABEL,
  INTRO_CALL_SUGGESTED_DISCOVERY_PREP_TITLE,
  type IntroCallTemplateState,
} from "@/lib/surgical-sales/engagements/introCallTemplateState";
import type { EngagementWorkflowDraft } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";
import { IntroCallAiRecommendationsReviewDrawer } from "./IntroCallAiRecommendationsReviewDrawer";

export function IntroCallAiRecommendations({
  templateState,
  productLine,
  conversationFocus,
  readiness,
  savedEditsHint,
  disabled,
  onReviewOpenChange,
  workflowDraft,
  canRemoveInserted,
  onInsertIntoPlan,
  onApplySection,
  onRemoveInserted,
  onResetToGeneric,
}: {
  templateState: IntroCallTemplateState;
  productLine: string;
  conversationFocus: readonly IntroCallConversationFocusId[];
  readiness: PreparationReadiness;
  workflowDraft: EngagementWorkflowDraft;
  savedEditsHint?: boolean;
  disabled?: boolean;
  onReviewOpenChange?: (open: boolean) => void;
  canRemoveInserted?: boolean;
  onInsertIntoPlan: () => void;
  onApplySection: (sectionId: IntroCallAiRecommendationSectionId) => void;
  onRemoveInserted?: () => void;
  onResetToGeneric: () => void;
}) {
  const [reviewOpen, setReviewOpen] = React.useState(false);

  const setReviewDrawerOpen = React.useCallback(
    (open: boolean) => {
      setReviewOpen(open);
      onReviewOpenChange?.(open);
    },
    [onReviewOpenChange],
  );

  const summary = React.useMemo(
    () =>
      buildIntroCallAiRecommendationsSummary({
        templateState,
        productLine,
        conversationFocus,
        readiness,
      }),
    [templateState, productLine, conversationFocus, readiness],
  );

  const [previewRefreshing, setPreviewRefreshing] = React.useState(false);
  React.useEffect(() => {
    setPreviewRefreshing(true);
    const timer = window.setTimeout(() => setPreviewRefreshing(false), 200);
    return () => window.clearTimeout(timer);
  }, [productLine, conversationFocus]);

  const probeCountLabel = `${summary.probeCount} operational ${
    summary.probeCount === 1 ? "prompt" : "prompts"
  }`;

  return (
    <>
      <section
        className={`ew-prep-suggested-prep ew-prep-ai-recs ew-prep-ai-recs--collapsed${previewRefreshing ? " ew-prep-suggested-prep--refreshing" : ""}`}
        aria-label={INTRO_CALL_SUGGESTED_DISCOVERY_PREP_TITLE}
      >
        <header className="ew-prep-suggested-prep-head">
          <span className="ew-prep-flow-step" aria-hidden>
            C
          </span>
          <div className="ew-prep-suggested-prep-head-text">
            <h3 className="ew-prep-suggested-prep-title">{INTRO_CALL_SUGGESTED_DISCOVERY_PREP_TITLE}</h3>
            <p className="ew-prep-suggested-prep-meta">
              {summary.templateName}
              {summary.productFocusLabel !== summary.templateName
                ? ` · ${summary.productFocusLabel}`
                : null}
            </p>
          </div>
        </header>

        <div className="ew-prep-suggested-prep-body">
          <div className="ew-prep-suggested-prep-block">
            <h4 className="ew-prep-suggested-prep-block-label">Focus areas</h4>
            <ul className="ew-prep-suggested-prep-list">
              {summary.focusAreaLabels.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>
          <div className="ew-prep-suggested-prep-block">
            <h4 className="ew-prep-suggested-prep-block-label">Prep gaps</h4>
            {summary.prepGapLabels.length > 0 ? (
              <ul className="ew-prep-suggested-prep-list">
                {summary.prepGapLabels.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            ) : (
              <p className="ew-prep-suggested-prep-empty">No prep gaps flagged</p>
            )}
          </div>
          <div className="ew-prep-suggested-prep-block ew-prep-suggested-prep-block--probes">
            <h4 className="ew-prep-suggested-prep-block-label">Suggested probes</h4>
            <p className="ew-prep-suggested-prep-probes-count">{probeCountLabel}</p>
          </div>
        </div>

        <div className="ew-prep-suggested-prep-actions ew-prep-ai-recs-compact-actions">
          <button
            type="button"
            className="ew-prep-ai-recs-btn"
            disabled={disabled}
            onClick={() => setReviewDrawerOpen(true)}
          >
            {INTRO_CALL_REVIEW_PREP_LABEL}
          </button>
          <button
            type="button"
            className="ew-prep-ai-recs-btn ew-prep-ai-recs-btn--primary"
            disabled={disabled}
            aria-label={INTRO_CALL_APPLY_TO_MISSION_PREP_LABEL}
            onClick={onInsertIntoPlan}
          >
            {INTRO_CALL_APPLY_TO_MISSION_PREP_LABEL}
          </button>
        </div>
      </section>

      <IntroCallAiRecommendationsReviewDrawer
        open={reviewOpen}
        onClose={() => setReviewDrawerOpen(false)}
        summary={summary}
        templateState={templateState}
        conversationFocus={conversationFocus}
        workflowDraft={workflowDraft}
        savedEditsHint={savedEditsHint}
        disabled={disabled}
        canRemoveInserted={canRemoveInserted}
        onInsertIntoPlan={onInsertIntoPlan}
        onApplySection={onApplySection}
        onRemoveInserted={onRemoveInserted}
        onResetToGeneric={onResetToGeneric}
      />
    </>
  );
}
