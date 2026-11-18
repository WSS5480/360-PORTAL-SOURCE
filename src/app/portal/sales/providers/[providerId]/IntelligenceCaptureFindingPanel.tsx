"use client";

import React from "react";
import type { StageMappingQuestion } from "@/lib/surgical-sales/buildStageMappingSession";
import { buildCategoryFindingsFeed } from "@/lib/surgical-sales/intelligenceCapture/buildCategoryFindingsFeed";
import {
  INTELLIGENCE_CAPTURE_FINDING_UI,
} from "@/lib/surgical-sales/intelligenceCapture/mapCategoryFinding";
import {
  intelligenceCaptureCategoryDef,
  type IntelligenceCaptureCategoryId,
} from "@/lib/surgical-sales/intelligenceCaptureCategories";
import { StageMappingQuestionCard } from "./StageMappingQuestionCard";
import type { DiscoveryMappingEvidenceConfidence } from "@/lib/surgical-sales/discoveryMappingEvidenceConfidence";
import type { DiscoveryMappingSuggestedContactLead } from "@/lib/surgical-sales/buildDiscoveryMappingCardIntelligence";
import type { RapidDiscoverySupportContactDraft } from "@/lib/surgical-sales/rapidDiscoverySupportContact";
import { SCHEDULING_FACILITY_DRAFT_KEY } from "@/lib/surgical-sales/schedulingOwnershipFields";
import { userFacingError } from "@/lib/errors/userFacingError";

type ValidationQuestionHandlers = {
  activeSignalId: string | null;
  busySignalId: string | null;
  selectedChoiceBySignal: Record<string, string>;
  metadataBySignal: Record<string, Record<string, string>>;
  notesBySignal: Record<string, string>;
  contact: Record<string, unknown>;
  contactDraftBySignal: Record<string, RapidDiscoverySupportContactDraft>;
  facilityContactDraftBySignal: Record<string, RapidDiscoverySupportContactDraft>;
  impactBySignal: Record<string, string>;
  submitErrorBySignal: Record<string, string>;
  pool: Record<string, unknown>[];
  organizationId: string | null;
  organizationName?: string | null;
  providerId: string;
  onChoiceSelect: (question: StageMappingQuestion, choice: string) => void;
  onChoiceDeselect: (question: StageMappingQuestion) => void;
  onMetadataChange: (signalId: string, key: string, value: string) => void;
  onNotesChange: (signalId: string, value: string) => void;
  onContactDraftChange: (signalId: string, draft: RapidDiscoverySupportContactDraft) => void;
  onFacilityContactDraftChange: (signalId: string, draft: RapidDiscoverySupportContactDraft) => void;
  onSubmitContact: (question: StageMappingQuestion) => void;
  onSubmitChoice: (
    question: StageMappingQuestion,
    choice: string,
    overrides?: { evidenceConfidence?: DiscoveryMappingEvidenceConfidence },
  ) => void;
  onContactIntent: (
    question: StageMappingQuestion,
    intent: "select" | "create" | "skip",
  ) => void;
  onOpenCredentialingWorkflow: () => void;
  contactOptInBySignal: Record<string, boolean>;
  forceExpandSignalId: string | null;
  forceExpandNonce: number;
  evidenceConfidenceBySignal: Record<string, DiscoveryMappingEvidenceConfidence>;
  onEvidenceConfidenceChange: (signalId: string, confidence: DiscoveryMappingEvidenceConfidence) => void;
  evidenceBySignal: Record<string, string>;
  onEvidenceTextChange: (signalId: string, value: string) => void;
  onSuggestedContactLead: (
    question: StageMappingQuestion,
    action: "select" | "create" | "dismiss",
    lead: DiscoveryMappingSuggestedContactLead,
  ) => void;
  dismissedSuggestedContactLeads: Record<string, boolean>;
  contactSearchPrefillBySignal: Record<string, string>;
  highlightSignalId: string | null;
};

export function IntelligenceCaptureFindingPanel({
  categoryId,
  contact,
  providerId,
  validationQuestions,
  validationHandlers,
  onFindingSaved,
}: {
  categoryId: IntelligenceCaptureCategoryId;
  contact: Record<string, unknown>;
  providerId: string;
  validationQuestions: StageMappingQuestion[];
  validationHandlers: ValidationQuestionHandlers;
  onFindingSaved: (provider: Record<string, unknown>) => void | Promise<void>;
}) {
  const [finding, setFinding] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmation, setConfirmation] = React.useState<string | null>(null);
  const [followUpRequired, setFollowUpRequired] = React.useState(false);
  const [feedNonce, setFeedNonce] = React.useState(0);

  const def = intelligenceCaptureCategoryDef(categoryId);
  const findingsFeed = React.useMemo(
    () => buildCategoryFindingsFeed({ categoryId, contact }),
    [categoryId, contact, feedNonce],
  );

  const handleSave = React.useCallback(async () => {
    const text = finding.trim();
    if (!text || saving) return;
    setSaving(true);
    setError(null);
    setConfirmation(null);
    try {
      const res = await fetch(
        `/api/portal/sales/providers/${encodeURIComponent(providerId)}/intelligence-capture/finding`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId, finding: text }),
        },
      );
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        confirmationMessage?: string;
        followUpRequired?: boolean;
        provider?: Record<string, unknown>;
      };
      if (!res.ok || !j.ok) {
        throw new Error(j.error ?? "");
      }
      setFinding("");
      setConfirmation(j.confirmationMessage ?? INTELLIGENCE_CAPTURE_FINDING_UI.savedFinding);
      setFollowUpRequired(Boolean(j.followUpRequired));
      setFeedNonce((n) => n + 1);
      if (j.provider) {
        await onFindingSaved(j.provider);
      }
    } catch (err) {
      setError(userFacingError(err, "Could not save that finding."));
    } finally {
      setSaving(false);
    }
  }, [categoryId, finding, onFindingSaved, providerId, saving]);

  return (
    <div className="intel-capture-finding-panel">
      <section className="intel-capture-finding-compose" aria-label={`Capture finding for ${def.name}`}>
        <label className="intel-capture-finding-label">
          {INTELLIGENCE_CAPTURE_FINDING_UI.inputLabel}
          <textarea
            className="intel-capture-finding-input"
            value={finding}
            onChange={(e) => setFinding(e.target.value)}
            placeholder={INTELLIGENCE_CAPTURE_FINDING_UI.inputPlaceholder}
            rows={4}
            disabled={saving}
          />
        </label>
        <div className="intel-capture-finding-actions">
          <button
            type="button"
            className="intel-capture-finding-save"
            disabled={saving || !finding.trim()}
            onClick={() => void handleSave()}
          >
            {saving ? INTELLIGENCE_CAPTURE_FINDING_UI.savingFinding : INTELLIGENCE_CAPTURE_FINDING_UI.saveFinding}
          </button>
        </div>
        {confirmation ? (
          <p className="intel-capture-finding-confirmation" role="status">
            {confirmation}
            {followUpRequired ? (
              <span className="intel-capture-finding-followup">
                {" "}
                {INTELLIGENCE_CAPTURE_FINDING_UI.followUpNote}
              </span>
            ) : null}
          </p>
        ) : null}
        {error ? (
          <p className="intel-capture-finding-error" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <section className="intel-capture-finding-feed" aria-label="Recent findings">
        <h4 className="intel-capture-finding-feed-title">{INTELLIGENCE_CAPTURE_FINDING_UI.recentFindings}</h4>
        {findingsFeed.length === 0 ? (
          <p className="intel-capture-finding-feed-empty">{INTELLIGENCE_CAPTURE_FINDING_UI.noFindingsYet}</p>
        ) : (
          <ul className="intel-capture-finding-feed-list">
            {findingsFeed.map((item) => (
              <li key={item.id} className="intel-capture-finding-feed-item">
                <p className="intel-capture-finding-feed-text">{item.text}</p>
                <span className="intel-capture-finding-feed-meta">{item.capturedLabel}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {validationQuestions.length > 0 ? (
        <details className="intel-capture-validation-details">
          <summary className="intel-capture-validation-summary">
            <span className="intel-capture-validation-title">
              {INTELLIGENCE_CAPTURE_FINDING_UI.validateDetails}
            </span>
            <span className="intel-capture-validation-hint">
              {validationQuestions.length} · {INTELLIGENCE_CAPTURE_FINDING_UI.validateDetailsHint}
            </span>
          </summary>
          <div className="stage-mapping-questions stage-mapping-questions--validation">
            {validationQuestions.map((question) => (
              <StageMappingQuestionCard
                key={question.signalId}
                question={question}
                contact={validationHandlers.contact}
                active={validationHandlers.activeSignalId === question.signalId}
                busy={validationHandlers.busySignalId === question.signalId}
                selectedChoice={validationHandlers.selectedChoiceBySignal[question.signalId] ?? null}
                metadata={validationHandlers.metadataBySignal[question.signalId] ?? {}}
                notes={validationHandlers.notesBySignal[question.signalId] ?? ""}
                contactDraft={validationHandlers.contactDraftBySignal[question.signalId] ?? null}
                facilityContactDraft={
                  question.signalId === "scheduling_owner"
                    ? validationHandlers.facilityContactDraftBySignal[SCHEDULING_FACILITY_DRAFT_KEY] ?? null
                    : null
                }
                contactPool={validationHandlers.pool}
                organizationId={validationHandlers.organizationId}
                organizationName={validationHandlers.organizationName}
                providerId={validationHandlers.providerId}
                lastImpactLine={validationHandlers.impactBySignal[question.signalId] ?? null}
                submitError={validationHandlers.submitErrorBySignal[question.signalId] ?? null}
                onChoiceSelect={(choice) => validationHandlers.onChoiceSelect(question, choice)}
                onChoiceDeselect={() => validationHandlers.onChoiceDeselect(question)}
                onMetadataChange={(key, value) =>
                  validationHandlers.onMetadataChange(question.signalId, key, value)
                }
                onNotesChange={(value) => validationHandlers.onNotesChange(question.signalId, value)}
                onContactDraftChange={(draft) =>
                  validationHandlers.onContactDraftChange(question.signalId, draft)
                }
                onFacilityContactDraftChange={(draft) =>
                  validationHandlers.onFacilityContactDraftChange(SCHEDULING_FACILITY_DRAFT_KEY, draft)
                }
                onSubmitContact={() => validationHandlers.onSubmitContact(question)}
                onSubmitChoice={(choice, overrides) =>
                  validationHandlers.onSubmitChoice(question, choice, overrides)
                }
                contactOptIn={
                  question.signalId in validationHandlers.contactOptInBySignal
                    ? validationHandlers.contactOptInBySignal[question.signalId]!
                    : null
                }
                onContactIntent={(intent) => validationHandlers.onContactIntent(question, intent)}
                onOpenCredentialingWorkflow={
                  question.signalId === "facility_vendor_pathway"
                    ? validationHandlers.onOpenCredentialingWorkflow
                    : undefined
                }
                forceExpandTick={
                  validationHandlers.forceExpandSignalId === question.signalId
                    ? validationHandlers.forceExpandNonce
                    : 0
                }
                evidenceConfidence={validationHandlers.evidenceConfidenceBySignal[question.signalId] ?? null}
                onEvidenceConfidenceChange={(confidence) =>
                  validationHandlers.onEvidenceConfidenceChange(question.signalId, confidence)
                }
                evidenceText={validationHandlers.evidenceBySignal[question.signalId] ?? ""}
                onEvidenceTextChange={(value) =>
                  validationHandlers.onEvidenceTextChange(question.signalId, value)
                }
                highlighted={validationHandlers.highlightSignalId === question.signalId}
                dismissedSuggestedContactLead={Boolean(
                  validationHandlers.dismissedSuggestedContactLeads[question.signalId],
                )}
                contactSearchPrefill={
                  validationHandlers.contactSearchPrefillBySignal[question.signalId] ?? null
                }
                onSuggestedContactLead={(action, lead) =>
                  validationHandlers.onSuggestedContactLead(question, action, lead)
                }
              />
            ))}
          </div>
          <p className="intel-capture-validation-footnote">
            {INTELLIGENCE_CAPTURE_FINDING_UI.detailsFootnote}
          </p>
        </details>
      ) : null}
    </div>
  );
}
