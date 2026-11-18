"use client";

import React from "react";
import { ENGAGEMENT_EDIT_ENGAGEMENT_LABEL } from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import {
  engagementTypeOptionsForEdit,
  formatEngagementEditTypeLabel,
  type EngagementEditDraft,
  type EngagementEditOrganizationOption,
} from "@/lib/surgical-sales/engagements/engagementEditDraft";
import {
  ENGAGEMENT_STATUSES,
  ENGAGEMENT_STATUS_LABELS,
  formatEngagementType,
} from "@/lib/surgical-sales/engagements/engagementTypes";
import {
  isPreCallPlanProductLine,
  PRE_CALL_PLAN_PRODUCT_LINES,
} from "@/lib/surgical-sales/preCallPlanTemplateTypes";
import { PREP_PRODUCT_FOCUS_NONE_LABEL } from "@/lib/surgical-sales/engagements/prepProductFocus";

export type EngagementEditDetailsFocusField =
  | "type"
  | "status"
  | "date"
  | "time"
  | "location"
  | "organization"
  | "notes"
  | "product_focus";

export function EngagementEditDetailsSheet({
  open,
  engagement,
  organizations,
  busy,
  loading = false,
  loadError = null,
  pathwayMission = false,
  organizationName,
  initialDraft,
  initialFocus,
  onClose,
  onSave,
}: {
  open: boolean;
  engagement: Record<string, unknown>;
  organizations: EngagementEditOrganizationOption[];
  busy?: boolean;
  loading?: boolean;
  loadError?: string | null;
  pathwayMission?: boolean;
  organizationName?: string | null;
  initialDraft: EngagementEditDraft;
  initialFocus?: EngagementEditDetailsFocusField;
  onClose: () => void;
  onSave: (draft: EngagementEditDraft) => void | Promise<void>;
}) {
  const [draft, setDraft] = React.useState(initialDraft);

  const typeRef = React.useRef<HTMLSelectElement>(null);
  const statusRef = React.useRef<HTMLSelectElement>(null);
  const dateRef = React.useRef<HTMLInputElement>(null);
  const timeRef = React.useRef<HTMLInputElement>(null);
  const locationRef = React.useRef<HTMLInputElement>(null);
  const orgRef = React.useRef<HTMLSelectElement>(null);
  const notesRef = React.useRef<HTMLTextAreaElement>(null);
  const productRef = React.useRef<HTMLSelectElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setDraft(initialDraft);
  }, [initialDraft, open]);

  React.useEffect(() => {
    if (!open || !initialFocus || loading) return;
    const target =
      initialFocus === "date"
        ? dateRef.current
        : initialFocus === "time"
          ? timeRef.current
          : initialFocus === "location"
            ? locationRef.current
            : initialFocus === "organization"
              ? orgRef.current
              : initialFocus === "notes"
                ? notesRef.current
                : initialFocus === "product_focus"
                  ? productRef.current
                  : initialFocus === "status"
                    ? statusRef.current
                    : typeRef.current;
    target?.focus();
  }, [initialFocus, loading, open]);

  if (!open) return null;

  const typeOptions = engagementTypeOptionsForEdit(draft.engagementType);
  const notesHadDebrief = Boolean(
    String(engagement.notes ?? "").trim() &&
      /---\s*tactical\s+debrief\s+---/i.test(String(engagement.notes ?? "")),
  );
  const formDisabled = busy || loading;

  async function handleSave() {
    await onSave(draft);
  }

  function patchDraft<K extends keyof EngagementEditDraft>(key: K, value: EngagementEditDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div
      className="engagement-outcome-sheet-backdrop"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="engagement-outcome-sheet engagement-outcome-sheet--edit"
        role="dialog"
        aria-modal="true"
        aria-labelledby="engagement-edit-details-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="engagement-outcome-sheet-head">
          <h2 id="engagement-edit-details-title">{ENGAGEMENT_EDIT_ENGAGEMENT_LABEL}</h2>
          <button type="button" className="engagement-outcome-sheet-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <p className="engagement-outcome-sheet-hint">
          Update scheduling, organization, and execution details. Changes apply whether or not field briefing prep has
          started.
        </p>

        {loadError ? (
          <p className="engagement-outcome-sheet-error" role="alert">
            {loadError}
          </p>
        ) : null}

        {loading ? (
          <p className="engagement-outcome-sheet-loading">Loading engagement…</p>
        ) : (
          <>
            <label className="engagement-detail-mobile-field">
              <span>Engagement type</span>
              <select
                ref={typeRef}
                value={draft.engagementType}
                disabled={formDisabled}
                onChange={(e) => patchDraft("engagementType", e.target.value)}
              >
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {formatEngagementEditTypeLabel(type)}
                  </option>
                ))}
              </select>
            </label>

            <label className="engagement-detail-mobile-field">
              <span>Status</span>
              <select
                ref={statusRef}
                value={draft.status}
                disabled={formDisabled}
                onChange={(e) => patchDraft("status", e.target.value)}
              >
                {ENGAGEMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {ENGAGEMENT_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>

            <label className="engagement-detail-mobile-field">
              <span>Date</span>
              <input
                ref={dateRef}
                type="date"
                value={draft.engagementDate}
                disabled={formDisabled}
                onChange={(e) => patchDraft("engagementDate", e.target.value)}
              />
            </label>

            <label className="engagement-detail-mobile-field">
              <span>Time</span>
              <input
                ref={timeRef}
                type="time"
                value={draft.engagementTime}
                disabled={formDisabled}
                onChange={(e) => patchDraft("engagementTime", e.target.value)}
              />
            </label>

            <label className="engagement-detail-mobile-field">
              <span>Organization</span>
              <select
                ref={orgRef}
                value={draft.organizationId}
                disabled={formDisabled || organizations.length === 0}
                onChange={(e) => patchDraft("organizationId", e.target.value)}
              >
                {organizations.length === 0 ? (
                  <option value={draft.organizationId}>
                    {organizationName || "No organizations linked"}
                  </option>
                ) : (
                  <>
                    <option value="">No organization</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </label>

            <label className="engagement-detail-mobile-field">
              <span>Location</span>
              <input
                ref={locationRef}
                type="text"
                value={draft.locationLabel}
                disabled={formDisabled}
                placeholder={organizationName ?? "Hospital or site"}
                onChange={(e) => patchDraft("locationLabel", e.target.value)}
              />
            </label>

            <label className="engagement-detail-mobile-field">
              <span>Product focus</span>
              <select
                ref={productRef}
                value={isPreCallPlanProductLine(draft.productFocus) ? draft.productFocus : ""}
                disabled={formDisabled}
                onChange={(e) => patchDraft("productFocus", e.target.value)}
              >
                <option value="">{PREP_PRODUCT_FOCUS_NONE_LABEL}</option>
                {PRE_CALL_PLAN_PRODUCT_LINES.map((line) => (
                  <option key={line} value={line}>
                    {line}
                  </option>
                ))}
              </select>
            </label>

            <label className="engagement-detail-mobile-field">
              <span>Notes</span>
              <textarea
                ref={notesRef}
                value={draft.notes}
                rows={4}
                disabled={formDisabled}
                placeholder="Rep notes for this touch…"
                onChange={(e) => patchDraft("notes", e.target.value)}
              />
              {notesHadDebrief ? (
                <span className="engagement-detail-mobile-field-hint">
                  This engagement has a captured debrief — edits here update the debrief narrative.
                </span>
              ) : null}
            </label>

            <label className="engagement-detail-mobile-field">
              <span>Goal</span>
              <textarea
                value={draft.objective}
                rows={3}
                disabled={formDisabled}
                placeholder={
                  pathwayMission
                    ? `Goal for this ${formatEngagementType(draft.engagementType)}…`
                    : "What you want to accomplish on this touch…"
                }
                onChange={(e) => patchDraft("objective", e.target.value)}
              />
            </label>
          </>
        )}

        <footer className="engagement-outcome-sheet-actions">
          <button type="button" onClick={onClose} disabled={formDisabled}>
            Cancel
          </button>
          <button
            type="button"
            className="primary"
            disabled={formDisabled || loading || Boolean(loadError)}
            onClick={() => void handleSave()}
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </footer>
      </div>
    </div>
  );
}
