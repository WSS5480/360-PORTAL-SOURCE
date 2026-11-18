"use client";

import React from "react";
import type { IntroCallConversationFocusId } from "@/lib/surgical-sales/engagements/introCallConversationFocus";
import {
  buildIntroCallAiRecommendationSections,
  sectionInsertActionLabel,
  type IntroCallAiRecommendationSectionId,
} from "@/lib/surgical-sales/engagements/introCallAiRecommendationSections";
import {
  INTRO_CALL_AI_RECOMMENDATIONS_HINT,
  type IntroCallTemplateState,
} from "@/lib/surgical-sales/engagements/introCallTemplateState";
import type { EngagementWorkflowDraft } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";

export function IntroCallAiRecommendationSections({
  templateState,
  conversationFocus,
  workflowDraft,
  savedEditsHint,
  disabled,
  onApplySection,
}: {
  templateState: IntroCallTemplateState;
  conversationFocus: readonly IntroCallConversationFocusId[];
  workflowDraft: EngagementWorkflowDraft;
  savedEditsHint?: boolean;
  disabled?: boolean;
  onApplySection: (sectionId: IntroCallAiRecommendationSectionId) => void;
}) {
  const sections = React.useMemo(
    () =>
      buildIntroCallAiRecommendationSections(
        templateState.generatedSuggestions,
        conversationFocus,
      ),
    [templateState.generatedSuggestions, conversationFocus],
  );

  return (
    <div className="ew-prep-ai-recs-sections">
      <p className="ew-prep-ai-recs-sections-notice">{INTRO_CALL_AI_RECOMMENDATIONS_HINT}</p>

      {templateState.previewDiffersFromApplied ? (
        <p className="ew-prep-ai-recs-sections-notice" role="status">
          Preview reflects{" "}
          {templateState.selectedProductFocus === "generic"
            ? "generic discovery"
            : templateState.selectedProductFocus}
          . Use Apply to Mission Prep or per-section apply when you are ready.
        </p>
      ) : null}

      {savedEditsHint ? (
        <p className="ew-prep-ai-recs-sections-notice ew-prep-ai-recs-sections-notice--edits">
          Call Plan may differ from this prep until you apply or replace a section.
        </p>
      ) : null}

      <ul className="ew-prep-ai-recs-sections-list">
        {sections.map((section) => {
          const actionLabel = sectionInsertActionLabel(workflowDraft, section.id);
          return (
            <li key={section.id} className="ew-prep-ai-recs-section-card">
              <div className="ew-prep-ai-recs-section-card-head">
                <h3 className="ew-prep-ai-recs-section-card-title">{section.label}</h3>
                <button
                  type="button"
                  className={`ew-prep-ai-recs-section-card-action${actionLabel === "Insert" ? " ew-prep-ai-recs-section-card-action--primary" : ""}`}
                  disabled={disabled || !section.previewText}
                  onClick={() => onApplySection(section.id)}
                >
                  {actionLabel}
                </button>
              </div>
              <p className="ew-prep-ai-recs-section-card-text">{section.previewText}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
