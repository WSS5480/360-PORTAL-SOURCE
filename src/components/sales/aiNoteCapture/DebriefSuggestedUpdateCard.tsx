"use client";

import React from "react";
import type { LogUpdateConflictResolution } from "@/lib/surgical-sales/logUpdateProviderRouting";
import type { RepFriendlySuggestedUpdate } from "@/lib/surgical-sales/debriefRepFriendlyReview";
import {
  DEBRIEF_UPDATE_CARD_CONFIDENCE,
  DEBRIEF_UPDATE_CARD_EVIDENCE,
  DEBRIEF_UPDATE_CARD_LEARNED,
  DEBRIEF_UPDATE_CARD_UPDATE,
} from "@/lib/surgical-sales/debriefRepFriendlyReview";
import type { DebriefReviewItemDisposition } from "@/lib/surgical-sales/debriefReviewItemState";
import {
  AI_DEBRIEF_CONFLICT_KEEP_EXISTING,
  AI_DEBRIEF_CONFLICT_MERGE,
  AI_DEBRIEF_REVIEW_ACCEPT,
  AI_DEBRIEF_REVIEW_ACCEPTED,
  AI_DEBRIEF_REVIEW_EDIT,
  AI_DEBRIEF_REVIEW_EDITED,
  AI_DEBRIEF_REVIEW_IGNORED,
  AI_DEBRIEF_REVIEW_SKIP,
  AI_DEBRIEF_REVIEW_UNDO,
} from "@/lib/surgical-sales/debriefApprovalUx";
import {
  LOG_UPDATE_CONFLICT_EXISTING,
  LOG_UPDATE_CONFLICT_GROUP_LABEL,
  LOG_UPDATE_CONFLICT_NEW,
  LOG_UPDATE_CONFLICT_REPLACE,
} from "@/lib/surgical-sales/logUpdateUx";
import { sanitizeDebriefUserCopy } from "@/lib/surgical-sales/debriefReviewSurface";
import type { DebriefIntelligenceUpdateItem } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";

export function DebriefSuggestedUpdateCard({
  update,
  disposition,
  readOnly,
  intelligenceItem,
  isEditing,
  editDraft,
  onEditDraftChange,
  onAccept,
  onSkip,
  onUndo,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onResolveConflict,
}: {
  update: RepFriendlySuggestedUpdate;
  disposition: DebriefReviewItemDisposition;
  readOnly?: boolean;
  intelligenceItem?: DebriefIntelligenceUpdateItem | null;
  isEditing?: boolean;
  editDraft?: string;
  onEditDraftChange?: (value: string) => void;
  onAccept: () => void;
  onSkip: () => void;
  onUndo?: () => void;
  onStartEdit?: () => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  onResolveConflict?: (resolution: LogUpdateConflictResolution) => void;
}) {
  const field = intelligenceItem?.field;
  const hasConflict = Boolean(field?.conflict && !field.conflict.resolution);

  return (
    <article className="ai-debrief-update-card" data-testid={`ai-debrief-update-${update.id}`}>
      <dl className="ai-debrief-update-card__fields">
        <div className="ai-debrief-update-card__field">
          <dt>{DEBRIEF_UPDATE_CARD_LEARNED}</dt>
          <dd>
            {isEditing ? (
              <textarea
                className="ai-debrief-edit"
                value={editDraft ?? ""}
                rows={3}
                disabled={readOnly}
                onChange={(e) => onEditDraftChange?.(e.target.value)}
                aria-label="Edit learned summary"
              />
            ) : (
              <span className="ai-debrief-update-card__learned">{update.learned}</span>
            )}
          </dd>
        </div>
        <div className="ai-debrief-update-card__field">
          <dt>{DEBRIEF_UPDATE_CARD_EVIDENCE}</dt>
          <dd className="ai-debrief-update-card__quote">
            {(update.evidenceQuotes?.length ?? 0) > 1 ? (
              <ul className="ai-debrief-update-card__quote-list">
                {update.evidenceQuotes!.map((quote, index) => (
                  <li key={`evidence-${index}`}>{quote}</li>
                ))}
              </ul>
            ) : (
              update.evidenceQuote
            )}
          </dd>
        </div>
        <div className="ai-debrief-update-card__field">
          <dt>{DEBRIEF_UPDATE_CARD_CONFIDENCE}</dt>
          <dd>
            <span
              className={`ai-debrief-update-card__confidence ai-debrief-update-card__confidence--${(update.intelligenceMaturityLabel ?? intelligenceItem?.intelligenceMaturityLabel ?? update.confidence).toLowerCase()}`}
            >
              {update.intelligenceMaturityLabel ??
                intelligenceItem?.intelligenceMaturityLabel ??
                update.confidence}
            </span>
          </dd>
        </div>
        <div className="ai-debrief-update-card__field">
          <dt>{DEBRIEF_UPDATE_CARD_UPDATE}</dt>
          <dd>{update.whatWillUpdate?.trim() || update.updateLine}</dd>
        </div>
      </dl>

      {isEditing ? (
        <div className="ai-debrief-card__actions">
          <button
            type="button"
            className="ai-debrief-card__btn ai-debrief-card__btn--primary"
            disabled={readOnly || !editDraft?.trim()}
            onClick={onSaveEdit}
          >
            Save
          </button>
          <button type="button" className="ai-debrief-card__btn" disabled={readOnly} onClick={onCancelEdit}>
            Cancel
          </button>
        </div>
      ) : null}

      {hasConflict && field?.conflict && onResolveConflict ? (
        <div className="ai-debrief-card__conflict" role="group" aria-label={LOG_UPDATE_CONFLICT_GROUP_LABEL}>
          <p className="ai-debrief-card__conflict-line">
            <span>{LOG_UPDATE_CONFLICT_EXISTING}</span>{" "}
            {sanitizeDebriefUserCopy(field.conflict.existingValue, 100)}
          </p>
          <p className="ai-debrief-card__conflict-line">
            <span>{LOG_UPDATE_CONFLICT_NEW}</span> {sanitizeDebriefUserCopy(field.conflict.newValue, 100)}
          </p>
          <p className="ai-debrief-card__conflict-prompt">How should we save this on the provider profile?</p>
          <div className="ai-debrief-card__conflict-actions">
            <button type="button" disabled={readOnly} onClick={() => onResolveConflict("replace")}>
              {LOG_UPDATE_CONFLICT_REPLACE}
            </button>
            <button type="button" disabled={readOnly} onClick={() => onResolveConflict("append")}>
              {AI_DEBRIEF_CONFLICT_MERGE}
            </button>
            <button type="button" disabled={readOnly} onClick={onSkip}>
              {AI_DEBRIEF_CONFLICT_KEEP_EXISTING}
            </button>
          </div>
        </div>
      ) : null}

      {!isEditing && disposition === "needs_review" ? (
        <div className="ai-debrief-card__actions">
          <button
            type="button"
            className="ai-debrief-card__btn ai-debrief-card__btn--primary"
            disabled={readOnly}
            onClick={onAccept}
            data-testid={`ai-debrief-accept-${update.id}`}
          >
            {AI_DEBRIEF_REVIEW_ACCEPT}
          </button>
          <button
            type="button"
            className="ai-debrief-card__btn"
            disabled={readOnly}
            onClick={onSkip}
            data-testid={`ai-debrief-skip-${update.id}`}
          >
            {AI_DEBRIEF_REVIEW_SKIP}
          </button>
          {intelligenceItem && onStartEdit ? (
            <button
              type="button"
              className="ai-debrief-card__btn ai-debrief-card__btn--ghost"
              disabled={readOnly}
              onClick={onStartEdit}
            >
              {AI_DEBRIEF_REVIEW_EDIT}
            </button>
          ) : null}
        </div>
      ) : null}

      {!isEditing && (disposition === "accepted" || disposition === "edited") ? (
        <div className="ai-debrief-card__actions">
          <span className="ai-debrief-insight-item__state">
            {disposition === "edited" ? AI_DEBRIEF_REVIEW_EDITED : AI_DEBRIEF_REVIEW_ACCEPTED}
          </span>
          <button type="button" className="ai-debrief-card__btn" disabled={readOnly} onClick={onSkip}>
            {AI_DEBRIEF_REVIEW_SKIP}
          </button>
          {intelligenceItem && onStartEdit ? (
            <button
              type="button"
              className="ai-debrief-card__btn ai-debrief-card__btn--ghost"
              disabled={readOnly}
              onClick={onStartEdit}
            >
              {AI_DEBRIEF_REVIEW_EDIT}
            </button>
          ) : null}
        </div>
      ) : null}

      {!isEditing && disposition === "ignored" && onUndo ? (
        <div className="ai-debrief-card__actions">
          <span className="ai-debrief-insight-item__state">{AI_DEBRIEF_REVIEW_IGNORED}</span>
          <button type="button" className="ai-debrief-card__btn ai-debrief-card__btn--ghost" disabled={readOnly} onClick={onUndo}>
            {AI_DEBRIEF_REVIEW_UNDO}
          </button>
          <button
            type="button"
            className="ai-debrief-card__btn ai-debrief-card__btn--primary"
            disabled={readOnly}
            onClick={onAccept}
          >
            {AI_DEBRIEF_REVIEW_ACCEPT}
          </button>
        </div>
      ) : null}
    </article>
  );
}
