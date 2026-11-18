"use client";

import React from "react";
import {
  INTELLIGENCE_CAPTURE_FLOW_UI,
  INTELLIGENCE_CAPTURE_METHOD_DEFS,
  type IntelligenceCaptureMethodId,
} from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureMethods";
import { intelligenceCaptureCategoryDef } from "@/lib/surgical-sales/intelligenceCaptureCategories";
import type { IntelligenceCaptureCategoryId } from "@/lib/surgical-sales/intelligenceCaptureCategories";
import { isBulkIntelligenceCaptureHiddenForPilot } from "@/lib/surgical-sales/observationIntelligence/observationPilotFlags";

const METHOD_ICONS: Record<IntelligenceCaptureMethodId, string> = {
  guided_entry: "◎",
  freeform_note: "✎",
};

export function IntelligenceCaptureMethodPicker({
  categoryId,
  onBack,
  onSelectMethod,
  onReviewArea,
}: {
  categoryId: IntelligenceCaptureCategoryId;
  onBack: () => void;
  onSelectMethod: (methodId: IntelligenceCaptureMethodId) => void;
  onReviewArea?: () => void;
}) {
  const category = intelligenceCaptureCategoryDef(categoryId);

  // §7b observation pilot: hide the bulk "Note or Dictate" path for pilot orgs —
  // it keyword-routes raw text into the provider fields the pilot measures.
  const methodDefs = isBulkIntelligenceCaptureHiddenForPilot()
    ? INTELLIGENCE_CAPTURE_METHOD_DEFS.filter((method) => method.id !== "freeform_note")
    : INTELLIGENCE_CAPTURE_METHOD_DEFS;

  return (
    <section className="intel-capture-method-picker" aria-label="Choose capture method">
      <header className="intel-capture-method-picker-head">
        <button type="button" className="intel-capture-category-back" onClick={onBack}>
          ← {INTELLIGENCE_CAPTURE_FLOW_UI.backToCategories}
        </button>
        <h3 className="intel-capture-method-picker-title">{category.name}</h3>
        <p className="intel-capture-method-picker-subtitle">
          {INTELLIGENCE_CAPTURE_FLOW_UI.stepMethodSubtitle}
        </p>
        {category.exampleFindings?.length ? (
          <p className="intel-capture-method-picker-examples">
            Examples: {category.exampleFindings.slice(0, 4).join(" · ")}
          </p>
        ) : null}
        {onReviewArea ? (
          <button type="button" className="intel-capture-method-review-link" onClick={onReviewArea}>
            {INTELLIGENCE_CAPTURE_FLOW_UI.reviewArea}
          </button>
        ) : null}
      </header>

      <div className="intel-capture-method-grid">
        {methodDefs.map((method) => (
          <button
            key={method.id}
            type="button"
            className="intel-capture-method-card"
            onClick={() => onSelectMethod(method.id)}
          >
            <span className="intel-capture-method-card-icon" aria-hidden>
              {METHOD_ICONS[method.id]}
            </span>
            <span className="intel-capture-method-card-name">{method.name}</span>
            <span className="intel-capture-method-card-desc">{method.description}</span>
            <span className="intel-capture-method-card-hint">{method.hint}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
