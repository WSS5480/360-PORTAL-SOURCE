"use client";

import React from "react";
import type { IntroCallConversationFocusId } from "@/lib/surgical-sales/engagements/introCallConversationFocus";
import {
  buildTemplatePreviewSections,
  type IntroCallTemplateState,
} from "@/lib/surgical-sales/engagements/introCallTemplateState";

export function IntroCallTemplateStatusBadge({
  label,
  variant,
}: {
  label: string;
  variant: IntroCallTemplateState["statusBadge"];
}) {
  return (
    <span className={`ew-prep-template-badge ew-prep-template-badge--${variant}`}>{label}</span>
  );
}

export function IntroCallTemplatePreview({
  templateState,
  conversationFocus = [],
  savedEditsHint,
  embedded = false,
  inDrawer = false,
}: {
  templateState: IntroCallTemplateState;
  conversationFocus?: readonly IntroCallConversationFocusId[];
  savedEditsHint?: boolean;
  /** Inside collapsed suggestions drawer — no duplicate title/badge chrome */
  embedded?: boolean;
  /** Full template in AI recommendations review drawer */
  inDrawer?: boolean;
}) {
  const sections = buildTemplatePreviewSections(
    templateState.generatedSuggestions,
    conversationFocus,
  );

  const chromeless = embedded || inDrawer;
  const Wrapper = chromeless ? "div" : "section";
  const wrapperLabel = chromeless ? undefined : "Suggested template preview";

  return (
    <Wrapper
      className={`ew-prep-template-preview${embedded ? " ew-prep-template-preview--embedded" : ""}${inDrawer ? " ew-prep-template-preview--drawer" : ""}`}
      aria-label={wrapperLabel}
    >
      {inDrawer ? (
        <p className="ew-prep-template-preview-sub ew-prep-template-preview-sub--drawer">
          Suggested content only — your Call Plan is unchanged until you apply to mission prep.
        </p>
      ) : embedded ? (
        <p className="ew-prep-template-preview-sub ew-prep-template-preview-sub--embedded">
          Updates when you change product focus or conversation chips. Call Plan above is not changed
          until you insert.
        </p>
      ) : (
        <header className="ew-prep-template-preview-head">
          <div className="ew-prep-template-preview-head-text">
            <h3 className="ew-prep-template-preview-title">Suggested template preview</h3>
            <p className="ew-prep-template-preview-sub">
              Updates when you change product focus. Call Plan above is not changed until you insert.
            </p>
          </div>
          <IntroCallTemplateStatusBadge
            label={templateState.statusLabel}
            variant={templateState.statusBadge}
          />
        </header>
      )}

      {templateState.previewDiffersFromApplied ? (
        <p className="ew-prep-template-preview-notice" role="status">
          Preview reflects {templateState.selectedProductFocus === "generic" ? "generic discovery" : templateState.selectedProductFocus}.
          Previously inserted suggestions are still{" "}
          {templateState.appliedTemplateId === "generic"
            ? "generic discovery"
            : templateState.appliedTemplateId}.
          Apply to Mission Prep to update saved fields.
        </p>
      ) : null}

      {savedEditsHint ? (
        <p className="ew-prep-template-preview-notice ew-prep-template-preview-notice--edits">
          Saved plan may differ from this preview until you insert or clear inserted suggestions.
        </p>
      ) : null}

      <div className="ew-prep-template-preview-sections">
        {sections.map((section) => (
          <div key={section.key} className="ew-prep-template-preview-block">
            <span className="ew-prep-template-preview-label">{section.label}</span>
            <p className="ew-prep-template-preview-value">{section.value}</p>
          </div>
        ))}
      </div>
    </Wrapper>
  );
}
