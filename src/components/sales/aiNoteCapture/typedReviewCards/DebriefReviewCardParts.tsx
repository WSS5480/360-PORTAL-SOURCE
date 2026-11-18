"use client";

import React from "react";
import {
  AI_DEBRIEF_REVIEW_ACCEPTED,
  AI_DEBRIEF_REVIEW_IGNORED,
} from "@/lib/surgical-sales/debriefApprovalUx";
import {
  DEBRIEF_REVIEW_CATEGORY_LABELS,
  type DebriefReviewCardAction,
  type DebriefReviewCardCategory,
} from "@/lib/surgical-sales/debriefActionableReviewCardTypes";
import type { DebriefReviewItemDisposition } from "@/lib/surgical-sales/debriefReviewItemState";

export function DebriefTypedReviewCardShell({
  cardId,
  category,
  children,
  footer,
}: {
  cardId: string;
  category: DebriefReviewCardCategory;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <article
      className={`ai-typed-review-card ai-typed-review-card--${category.replace(/_/g, "-")}`}
      data-testid={`ai-debrief-actionable-${cardId}`}
      data-category={category}
    >
      <p className="ai-typed-review-card__type">{DEBRIEF_REVIEW_CATEGORY_LABELS[category]}</p>
      <div className="ai-typed-review-card__body">{children}</div>
      {footer ? <div className="ai-typed-review-card__footer">{footer}</div> : null}
    </article>
  );
}

export function DebriefReviewCardFieldRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="ai-typed-review-card__row">
      <dt className="ai-typed-review-card__row-label">{label}</dt>
      <dd className="ai-typed-review-card__row-value">{value}</dd>
    </div>
  );
}

export function DebriefReviewCardFields({ children }: { children: React.ReactNode }) {
  return <dl className="ai-typed-review-card__fields">{children}</dl>;
}

export function DebriefReviewCardEvidence({ quotes }: { quotes: string[] }) {
  return (
    <section className="ai-typed-review-card__section">
      <h5 className="ai-typed-review-card__section-title">Evidence</h5>
      {quotes.length > 0 ? (
        <ul className="ai-typed-review-card__evidence-list">
          {quotes.map((quote) => (
            <li key={quote} className="ai-typed-review-card__evidence-item">
              {quote}
            </li>
          ))}
        </ul>
      ) : (
        <p className="ai-typed-review-card__evidence-empty">No quote captured</p>
      )}
    </section>
  );
}

export function DebriefReviewCardConfidenceBadge({ confidence }: { confidence: string }) {
  const tier = confidence.toLowerCase();
  const tierClass =
    tier === "high"
      ? "ai-typed-review-card__confidence--high"
      : tier === "medium"
        ? "ai-typed-review-card__confidence--medium"
        : "ai-typed-review-card__confidence--low";
  return <span className={`ai-typed-review-card__confidence ${tierClass}`}>{confidence}</span>;
}

export function DebriefReviewCardActions({
  actions,
  disposition,
  readOnly,
  onAction,
  undo,
}: {
  actions: DebriefReviewCardAction[];
  disposition: DebriefReviewItemDisposition;
  readOnly?: boolean;
  onAction: (action: DebriefReviewCardAction) => void;
  undo?: React.ReactNode;
}) {
  const resolved = disposition === "accepted" || disposition === "ignored";

  return (
    <section className="ai-typed-review-card__section ai-typed-review-card__section--actions">
      <h5 className="ai-typed-review-card__section-title">Actions</h5>
      {resolved ? (
        <p className="ai-typed-review-card__status">
          {disposition === "accepted" ? AI_DEBRIEF_REVIEW_ACCEPTED : AI_DEBRIEF_REVIEW_IGNORED}
        </p>
      ) : (
        <div className="ai-typed-review-card__action-buttons">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              className={
                action.primary
                  ? "ai-debrief-btn--primary"
                  : action.type === "ignore"
                    ? "ai-debrief-btn--ghost"
                    : undefined
              }
              disabled={readOnly}
              onClick={() => onAction(action)}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
      {undo}
    </section>
  );
}
