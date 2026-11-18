"use client";

import React from "react";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateOpenAiMapping } from "@/lib/surgical-sales/logUpdateOpenAiMapping";
import type { LogUpdateConflictResolution } from "@/lib/surgical-sales/logUpdateProviderRouting";
import {
  buildDebriefApprovalView,
  type DebriefApprovalView,
} from "@/lib/surgical-sales/buildDebriefApprovalView";
import {
  DEBRIEF_APPROVAL_SECTION,
  DEBRIEF_APPROVAL_SELECTION_HINT,
} from "@/lib/surgical-sales/debriefApprovalUx";
import {
  buildLogUpdateReviewSaveSummary,
  recommendedUpdateDetail,
  formatReviewSaveScopeDisplay,
  type ReviewScopeDisplayContext,
} from "@/lib/surgical-sales/logUpdateReviewPresentation";
import { LOG_UPDATE_CONFLICT_EXISTING, LOG_UPDATE_CONFLICT_GROUP_LABEL, LOG_UPDATE_CONFLICT_KEEP_BOTH, LOG_UPDATE_CONFLICT_NEW, LOG_UPDATE_CONFLICT_REPLACE } from "@/lib/surgical-sales/logUpdateUx";

function SaveUpdateRow({
  item,
  aiMapping,
  scopeContext,
  onToggleUpdate,
  onResolveConflict,
}: {
  item: DebriefApprovalView["saveItems"][number];
  aiMapping: LogUpdateParseResult["aiMapping"];
  scopeContext?: ReviewScopeDisplayContext;
  onToggleUpdate: (id: string, accepted: boolean) => void;
  onResolveConflict: (id: string, resolution: LogUpdateConflictResolution) => void;
}) {
  const field = item.field;
  const scopeDisplay = formatReviewSaveScopeDisplay(field, scopeContext);
  const detail = recommendedUpdateDetail(field, aiMapping as LogUpdateOpenAiMapping | null);

  return (
    <li className="deb-approval-save-item">
      <label className="deb-approval-save-check">
        <input
          type="checkbox"
          checked={field.accepted}
          onChange={(e) => onToggleUpdate(field.id, e.target.checked)}
        />
        <span className="deb-approval-save-body">
          <span className="deb-approval-save-title">{field.label || "Field update"}</span>
          <span className="deb-approval-save-scope">[{scopeDisplay.primaryLabel}]</span>
          {detail ? <span className="deb-approval-save-detail">{detail}</span> : null}
        </span>
      </label>
      {field.accepted && field.conflict && !field.conflict.resolution ? (
        <div className="deb-approval-conflict" role="group" aria-label={LOG_UPDATE_CONFLICT_GROUP_LABEL}>
          <p>
            <span className="deb-approval-conflict-k">{LOG_UPDATE_CONFLICT_EXISTING}</span>{" "}
            {field.conflict.existingValue}
          </p>
          <p>
            <span className="deb-approval-conflict-k">{LOG_UPDATE_CONFLICT_NEW}</span> {field.conflict.newValue}
          </p>
          <div className="deb-approval-conflict-actions">
            <button type="button" onClick={() => onResolveConflict(field.id, "replace")}>
              {LOG_UPDATE_CONFLICT_REPLACE}
            </button>
            <button type="button" onClick={() => onResolveConflict(field.id, "append")}>
              {LOG_UPDATE_CONFLICT_KEEP_BOTH}
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function DebriefApprovalReview({
  view: viewProp,
  review,
  readOnly = false,
  scopeDisplayContext,
  onToggleUpdate,
  onResolveConflict,
}: {
  view?: DebriefApprovalView;
  review?: LogUpdateParseResult;
  readOnly?: boolean;
  scopeDisplayContext?: ReviewScopeDisplayContext;
  onToggleUpdate?: (id: string, accepted: boolean) => void;
  onResolveConflict?: (id: string, resolution: LogUpdateConflictResolution) => void;
}) {
  const view = viewProp ?? (review ? buildDebriefApprovalView(review) : { signalsDetected: [], suggestedUpdates: [], stillMissing: [], saveItems: [] });
  const saveSummary = review ? buildLogUpdateReviewSaveSummary(review) : null;

  return (
    <div className="deb-approval" aria-label="Review debrief intelligence">
      <p className="deb-approval-hint">{DEBRIEF_APPROVAL_SELECTION_HINT}</p>

      {view.signalsDetected.length > 0 ? (
        <section className="deb-approval-sec" aria-labelledby="deb-signals">
          <h3 id="deb-signals" className="deb-approval-sec-title">
            {DEBRIEF_APPROVAL_SECTION.signalsDetected}
          </h3>
          <ul className="deb-approval-signals">
            {view.signalsDetected.map((s) => (
              <li key={s.id}>{s.text}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {view.suggestedUpdates.length > 0 ? (
        <section className="deb-approval-sec" aria-labelledby="deb-suggested">
          <h3 id="deb-suggested" className="deb-approval-sec-title">
            {DEBRIEF_APPROVAL_SECTION.suggestedUpdates}
          </h3>
          <ul className="deb-approval-status-list">
            {view.suggestedUpdates.map((row) => (
              <li key={row.id} className={`deb-approval-status deb-approval-status--${row.status}`}>
                <span className="deb-approval-status-label">{row.label}</span>
                <span className="deb-approval-status-eq">=</span>
                <span className="deb-approval-status-value">{row.statusDisplay}</span>
                {row.pathwayRequirement ? (
                  <span className="deb-approval-status-pathway">{row.pathwayRequirement}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {view.stillMissing.length > 0 ? (
        <section className="deb-approval-sec" aria-labelledby="deb-missing">
          <h3 id="deb-missing" className="deb-approval-sec-title">
            {DEBRIEF_APPROVAL_SECTION.stillMissing}
          </h3>
          <ul className="deb-approval-missing">
            {view.stillMissing.map((row) => (
              <li key={row.id}>{row.text}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {!readOnly ? (
        <section className="deb-approval-sec deb-approval-sec--save" aria-labelledby="deb-save">
          <h3 id="deb-save" className="deb-approval-sec-title">
            {DEBRIEF_APPROVAL_SECTION.saveUpdates}
          </h3>
          {view.saveItems.length > 0 && onToggleUpdate && onResolveConflict ? (
            <ul className="deb-approval-save-list">
              {view.saveItems.map((item) => (
                <SaveUpdateRow
                  key={item.field.id}
                  item={item}
                  aiMapping={review?.aiMapping ?? null}
                  scopeContext={scopeDisplayContext}
                  onToggleUpdate={onToggleUpdate}
                  onResolveConflict={onResolveConflict}
                />
              ))}
            </ul>
          ) : (
            <p className="deb-approval-empty">No profile field updates — your debrief note will still save.</p>
          )}
        </section>
      ) : null}

      {saveSummary ? (
        <p className="deb-approval-save-summary" aria-live="polite">
          {saveSummary}
        </p>
      ) : null}
    </div>
  );
}
