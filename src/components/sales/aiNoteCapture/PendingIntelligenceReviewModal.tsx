"use client";

import React from "react";
import { sc } from "@/components/sales/salesCommandUi";
import { AI_DEBRIEF_REVIEW_SAVE_UPDATES } from "@/lib/surgical-sales/debriefApprovalUx";
import {
  refreshLogUpdateIntelligenceReview,
  type LogUpdateParseResult,
} from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateConflictResolution } from "@/lib/surgical-sales/logUpdateProviderRouting";
import {
  buildLogUpdateProviderCommitPayload,
  hasAcceptedProposedContacts,
  reviewHasSavableSelection,
} from "@/lib/surgical-sales/logUpdateReviewCommit";
import { logUpdateHasUnresolvedConflicts } from "@/lib/surgical-sales/logUpdateProviderRouting";
import {
  REVIEW_EXTRACTED_INTELLIGENCE_TITLE,
  LOG_UPDATE_ERR_NOTHING_TO_SAVE,
  LOG_UPDATE_ERR_PHI_BEFORE_SAVE,
  LOG_UPDATE_ERR_UNRESOLVED_CONFLICT,
  LOG_UPDATE_REVIEW_SELECTION_HINT,
  LOG_UPDATE_REVIEW_SUBTITLE,
} from "@/lib/surgical-sales/logUpdateUx";
import {
  applyReviewSelectionDefaults,
  hasStructuredIntelligenceReview,
} from "@/lib/surgical-sales/logUpdateReviewPresentation";
import type { PendingIntelligenceCapture } from "@/lib/surgical-sales/pendingIntelligenceCapture";
import { persistProviderCandidateContacts } from "@/lib/surgical-sales/candidateContactIntelligence";
import {
  persistDebriefDetectedContacts,
  type DebriefProposedContactItem,
} from "@/lib/surgical-sales/debriefDetectedContact";
import { readResponseJson } from "@/lib/utils/readResponseJson";
import { detectSurgicalPhiPatternKinds } from "@/lib/surgical-sales/phiContentHeuristics";
import { aiNoteCaptureCss } from "./aiNoteCaptureCss";
import { LogUpdateSuggestedReview, logUpdateReviewScopeContext } from "./LogUpdateSuggestedReview";
import { userFacingError } from "@/lib/errors/userFacingError";

export function PendingIntelligenceReviewModal({
  open,
  providerId,
  providerLabel,
  organizationId,
  captures,
  onClose,
  onCompleted,
}: {
  open: boolean;
  providerId: string;
  providerLabel?: string | null;
  organizationId?: string | null;
  captures: PendingIntelligenceCapture[];
  onClose: () => void;
  onCompleted?: () => void | Promise<void>;
}) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [reviewParse, setReviewParse] = React.useState<LogUpdateParseResult | null>(null);
  const [proposedContacts, setProposedContacts] = React.useState<DebriefProposedContactItem[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const logUpdateExistingFieldsRef = React.useRef<Record<string, string>>({});

  const activeCapture = captures[activeIndex] ?? null;

  React.useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
    setError(null);
    setBusy(false);
  }, [open, captures]);

  React.useEffect(() => {
    if (!open || !activeCapture) {
      setReviewParse(null);
      setProposedContacts([]);
      return;
    }
    setProposedContacts(activeCapture.proposed_contacts);
    let cancelled = false;

    void (async () => {
      let parse = applyReviewSelectionDefaults(activeCapture.parse_result);
      const captureId =
        activeCapture.universal_fact_capture_id?.trim() ||
        parse.debriefUniversalFactsRuns?.[0]?.capture_id?.trim() ||
        "";

      if (!parse.debriefUniversalFactsRuns?.length && captureId) {
        try {
          const res = await fetch(
            `/api/portal/sales/universal-facts/${encodeURIComponent(captureId)}`,
          );
          const payload = await readResponseJson<{
            ok?: boolean;
            run?: NonNullable<LogUpdateParseResult["debriefUniversalFactsRuns"]>[number];
          }>(res);
          if (res.ok && payload.ok && payload.run) {
            parse = { ...parse, debriefUniversalFactsRuns: [payload.run] };
          }
        } catch {
          // Fall back to DIP-only review when hydration fails.
        }
      }

      if (!cancelled) {
        setReviewParse(parse);
      }
    })();

    void (async () => {
      logUpdateExistingFieldsRef.current = {};
      const fieldsRes = await fetch(
        `/api/portal/sales/providers/${encodeURIComponent(providerId)}/log-update`,
      );
      const payload = await readResponseJson<{ ok?: boolean; fields?: Record<string, string> }>(
        fieldsRes,
      );
      if (fieldsRes.ok && payload.ok && payload.fields) {
        logUpdateExistingFieldsRef.current = payload.fields;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeCapture, open, providerId]);

  if (!open || !activeCapture || !reviewParse) return null;

  async function completeCapture(captureId: string) {
    await fetch(
      `/api/portal/sales/providers/${encodeURIComponent(providerId)}/pending-intelligence-capture/complete`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capture_id: captureId }),
      },
    );
  }

  async function handleSave() {
    if (!reviewParse || !activeCapture) return;
    if (logUpdateHasUnresolvedConflicts(reviewParse.fieldUpdates)) {
      setError(LOG_UPDATE_ERR_UNRESOLVED_CONFLICT);
      return;
    }

    const acceptedContacts = hasAcceptedProposedContacts(proposedContacts);
    const reviewToSave: LogUpdateParseResult = {
      ...reviewParse,
      saveAsNoteAccepted: false,
    };
    const built = buildLogUpdateProviderCommitPayload(reviewToSave, {
      hasAcceptedContacts: acceptedContacts,
    });
    if ("error" in built) {
      setError(built.error);
      return;
    }
    if (built.fieldPatches.length === 0 && !acceptedContacts) {
      setError(LOG_UPDATE_ERR_NOTHING_TO_SAVE);
      return;
    }

    const phiKinds = detectSurgicalPhiPatternKinds(reviewToSave.sourceText);
    if (phiKinds.length > 0) {
      setError(LOG_UPDATE_ERR_PHI_BEFORE_SAVE);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (built.fieldPatches.length > 0) {
        const res = await fetch(
          `/api/portal/sales/providers/${encodeURIComponent(providerId)}/log-update`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...built,
              captureContext: {
                source_type: "ai_capture" as const,
                source_label: "Intelligence review",
                declared_source_type: "field_note" as const,
              },
            }),
          },
        );
        const payload = await readResponseJson<{ ok?: boolean; error?: string }>(res);
        if (!res.ok || !payload.ok) {
          throw new Error(typeof payload.error === "string" ? payload.error : "Save failed");
        }
      }

      if (acceptedContacts) {
        const contactResult = await persistDebriefDetectedContacts({
          providerId,
          organizationId: organizationId ?? null,
          contacts: proposedContacts,
          sourceLabel: "Intelligence review",
        });
        const contactsForCandidates = proposedContacts.map((contact) => {
          const saved = contactResult.saved.find(
            (row) => row.displayName.toLowerCase() === contact.displayName.toLowerCase(),
          );
          return saved ? { ...contact, linkedContactId: saved.contactId } : contact;
        });
        await persistProviderCandidateContacts({
          providerId,
          contacts: contactsForCandidates,
        }).catch(() => undefined);
      }

      await completeCapture(activeCapture.id);

      if (activeIndex < captures.length - 1) {
        setActiveIndex((index) => index + 1);
      } else {
        await onCompleted?.();
        onClose();
      }
    } catch (e: unknown) {
      setError(userFacingError(e, "We could not save your changes. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  function toggleReviewUpdate(id: string, accepted: boolean) {
    setReviewParse((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        fieldUpdates: prev.fieldUpdates.map((update) =>
          update.id === id ? { ...update, accepted } : update,
        ),
        suggestedUpdates: prev.suggestedUpdates.map((update) =>
          update.id === id ? { ...update, accepted } : update,
        ),
      };
      return refreshLogUpdateIntelligenceReview(next, logUpdateExistingFieldsRef.current);
    });
  }

  function resolveConflict(id: string, resolution: LogUpdateConflictResolution) {
    setReviewParse((prev) => {
      if (!prev?.usesProviderIntelligence) return prev;
      return {
        ...prev,
        fieldUpdates: prev.fieldUpdates.map((update) => {
          if (update.id !== id || !update.conflict) return update;
          return { ...update, accepted: true, conflict: { ...update.conflict, resolution } };
        }),
      };
    });
  }

  function replaceLogUpdateReview(
    nextOrUpdater:
      | LogUpdateParseResult
      | ((prev: LogUpdateParseResult) => LogUpdateParseResult),
  ) {
    setReviewParse((prev) => {
      if (!prev) return prev;
      const next =
        typeof nextOrUpdater === "function" ? nextOrUpdater(prev) : nextOrUpdater;
      return refreshLogUpdateIntelligenceReview(next, logUpdateExistingFieldsRef.current);
    });
  }

  const structuredIntelligenceReview = Boolean(
    reviewParse.usesProviderIntelligence && hasStructuredIntelligenceReview(reviewParse),
  );
  const canSaveReview = reviewHasSavableSelection({
    review: reviewParse,
    proposedContacts,
  });

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: aiNoteCaptureCss }} />
      <div
        className="ai-note-capture-sheet ai-note-capture-sheet--review-intelligence"
        role="presentation"
        onClick={(e) => e.target === e.currentTarget && !busy && onClose()}
      >
        <div
          className="ai-note-capture-panel ai-note-capture-panel--review-intelligence"
          role="dialog"
          aria-modal
          aria-labelledby="pending-intelligence-review-title"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="ai-note-capture-panel-header">
            <div className="ai-note-capture-panel-heading">
              <h2 id="pending-intelligence-review-title" className="ai-note-capture-panel-title">
                {REVIEW_EXTRACTED_INTELLIGENCE_TITLE}
              </h2>
              <p className="ai-note-capture-panel-subtitle">
                {captures.length > 1
                  ? `Reviewing ${activeIndex + 1} of ${captures.length} pending captures. ${LOG_UPDATE_REVIEW_SUBTITLE}`
                  : LOG_UPDATE_REVIEW_SUBTITLE}
              </p>
            </div>
            <button
              type="button"
              className="ai-note-capture-panel-close"
              onClick={onClose}
              disabled={busy}
              aria-label="Close"
            >
              Close
            </button>
          </header>

          <div className="ai-note-capture-panel-body ai-note-capture-panel-body--review-intelligence">
            <LogUpdateSuggestedReview
              review={reviewParse}
              propagationTargets={[]}
              discoveryContext={activeCapture.discovery_context}
              providerContact={null}
              proposedContacts={proposedContacts}
              organizationId={organizationId ?? null}
              engagementOutcomeId={null}
              sourceReference={`pending:${activeCapture.id}`}
              onContactsChange={setProposedContacts}
              providerId={providerId}
              scopeDisplayContext={logUpdateReviewScopeContext({
                providerId,
                providerLabel,
                organizationId,
              })}
              onReviewChange={replaceLogUpdateReview}
              onToggleUpdate={toggleReviewUpdate}
              onResolveConflict={resolveConflict}
            />
            {error ? (
              <p style={{ ...sc.alertError, marginTop: 10, fontSize: 12 }}>{error}</p>
            ) : null}
          </div>

          <footer className="ai-note-capture-footer ai-note-capture-footer--review-intelligence">
            <div
              className={`ai-note-capture-footer-review${
                structuredIntelligenceReview ? " ai-note-capture-footer-review--streamlined" : ""
              }`}
            >
              <p className="log-update-review-footer-hint">{LOG_UPDATE_REVIEW_SELECTION_HINT}</p>
              <button
                type="button"
                style={sc.btnPrimary}
                className="ai-note-capture-footer-save"
                onClick={() => void handleSave()}
                disabled={busy || !canSaveReview}
              >
                {AI_DEBRIEF_REVIEW_SAVE_UPDATES}
              </button>
              <div className="ai-note-capture-footer-review-secondary">
                <button type="button" style={sc.btnSecondary} onClick={onClose} disabled={busy}>
                  Cancel
                </button>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
