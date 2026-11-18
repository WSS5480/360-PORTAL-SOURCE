"use client";

import React from "react";
import type { StageMappingQuestion } from "@/lib/surgical-sales/buildStageMappingSession";
import {
  buildIntelligenceCaptureCategoryWorkspace,
  categoryWorkspaceValidationQuestions,
  INTELLIGENCE_CAPTURE_WORKSPACE_UI,
} from "@/lib/surgical-sales/intelligenceCapture/buildIntelligenceCaptureCategoryWorkspace";
import { INTELLIGENCE_CAPTURE_DASHBOARD_UI } from "@/lib/surgical-sales/intelligenceCaptureCategories";
import type { IntelligenceCaptureCategoryId } from "@/lib/surgical-sales/intelligenceCaptureCategories";
import type { IntelligenceCaptureCategorySlice } from "@/lib/surgical-sales/intelligenceCaptureCategories";
import { INTELLIGENCE_CAPTURE_FINDING_UI } from "@/lib/surgical-sales/intelligenceCapture/mapCategoryFinding";
import { StageMappingQuestionCard } from "./StageMappingQuestionCard";
import type { DiscoveryMappingEvidenceConfidence } from "@/lib/surgical-sales/discoveryMappingEvidenceConfidence";
import type { DiscoveryMappingSuggestedContactLead } from "@/lib/surgical-sales/buildDiscoveryMappingCardIntelligence";
import type { RapidDiscoverySupportContactDraft } from "@/lib/surgical-sales/rapidDiscoverySupportContact";
import { SCHEDULING_FACILITY_DRAFT_KEY } from "@/lib/surgical-sales/schedulingOwnershipFields";
import { userFacingError } from "@/lib/errors/userFacingError";

type ValidationHandlers = {
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

function WorkspaceSection({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className="intel-cat-workspace-section">
      <div className="intel-cat-workspace-section-head">
        <h4 className="intel-cat-workspace-section-title">{title}</h4>
        <span className="intel-cat-workspace-section-count">{count}</span>
      </div>
      {count === 0 ? <p className="intel-cat-workspace-empty">{empty}</p> : children}
    </section>
  );
}

export function IntelligenceCaptureCategoryWorkspace({
  categoryId,
  slice,
  contact,
  providerId,
  onBack,
  validationHandlers,
  onFindingSaved,
}: {
  categoryId: IntelligenceCaptureCategoryId;
  slice: IntelligenceCaptureCategorySlice;
  contact: Record<string, unknown>;
  providerId: string;
  onBack: () => void;
  validationHandlers: ValidationHandlers;
  onFindingSaved: (provider: Record<string, unknown>) => void | Promise<void>;
}) {
  const [finding, setFinding] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmation, setConfirmation] = React.useState<string | null>(null);
  const [followUpRequired, setFollowUpRequired] = React.useState(false);
  const [workspaceNonce, setWorkspaceNonce] = React.useState(0);
  const [activeValidationSignalId, setActiveValidationSignalId] = React.useState<string | null>(null);

  const workspace = React.useMemo(
    () =>
      buildIntelligenceCaptureCategoryWorkspace({
        categoryId,
        contact,
        slice,
      }),
    [categoryId, contact, slice, workspaceNonce],
  );

  const validationQuestions = React.useMemo(() => categoryWorkspaceValidationQuestions(slice), [slice]);
  const activeValidationQuestion = validationQuestions.find(
    (q) => q.signalId === activeValidationSignalId,
  ) ?? null;

  const handleSaveFinding = React.useCallback(async () => {
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
      setWorkspaceNonce((n) => n + 1);
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
    <div className="intel-cat-workspace" aria-label={workspace.name}>
      <header className="intel-cat-workspace-header">
        <button type="button" className="intel-capture-category-back" onClick={onBack}>
          ← {INTELLIGENCE_CAPTURE_DASHBOARD_UI.backToCategories}
        </button>
        <h3 className="intel-cat-workspace-title">{workspace.name}</h3>
        <p className="intel-cat-workspace-desc">{workspace.description}</p>
      </header>

      <section
        className={`intel-cat-workspace-progress intel-cat-workspace-progress--${workspace.progress.statusCssModifier}`}
        aria-label={workspace.progress.label}
      >
        <div className="intel-cat-workspace-progress-head">
          <span className="intel-cat-workspace-progress-label">{workspace.progress.label}</span>
          <span
            className={`intel-cat-workspace-progress-status intel-cat-workspace-progress-status--${workspace.progress.statusCssModifier}`}
          >
            {workspace.progress.statusLabel}
          </span>
        </div>
        <div className="intel-cat-workspace-progress-stats">
          <span>{workspace.progress.findingsLabel}</span>
          <span>{workspace.progress.openItemsLabel}</span>
          <span>
            <strong>{workspace.progress.confirmed}</strong>{" "}
            {INTELLIGENCE_CAPTURE_WORKSPACE_UI.confirmed.toLowerCase()}
          </span>
        </div>
      </section>

      <section className="intel-capture-finding-compose intel-cat-workspace-compose" aria-label="Capture finding">
        <label className="intel-capture-finding-label">
          {INTELLIGENCE_CAPTURE_FINDING_UI.inputLabel}
          <textarea
            className="intel-capture-finding-input"
            value={finding}
            onChange={(e) => setFinding(e.target.value)}
            placeholder={INTELLIGENCE_CAPTURE_FINDING_UI.inputPlaceholder}
            rows={3}
            disabled={saving}
          />
        </label>
        <div className="intel-capture-finding-actions">
          <button
            type="button"
            className="intel-capture-finding-save"
            disabled={saving || !finding.trim()}
            onClick={() => void handleSaveFinding()}
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

      <div className="intel-cat-workspace-grid">
        <WorkspaceSection
          title={INTELLIGENCE_CAPTURE_WORKSPACE_UI.confirmedFindings}
          count={workspace.confirmedFindings.length}
          empty={INTELLIGENCE_CAPTURE_WORKSPACE_UI.noConfirmedFindings}
        >
          <ul className="intel-cat-workspace-list">
            {workspace.confirmedFindings.map((item) => (
              <li key={item.id} className="intel-cat-workspace-list-item intel-cat-workspace-list-item--confirmed">
                <p className="intel-cat-workspace-list-text">{item.summary}</p>
                <span className="intel-cat-workspace-list-meta">{item.capturedLabel}</span>
              </li>
            ))}
          </ul>
        </WorkspaceSection>

        <WorkspaceSection
          title={INTELLIGENCE_CAPTURE_WORKSPACE_UI.openQuestionsTitle}
          count={workspace.openQuestions.length}
          empty={INTELLIGENCE_CAPTURE_WORKSPACE_UI.noOpenQuestions}
        >
          <ul className="intel-cat-workspace-open-list">
            {workspace.openQuestions.map((item) => (
              <li key={item.signalId}>
                <button
                  type="button"
                  className={`intel-cat-workspace-open-item${
                    activeValidationSignalId === item.signalId
                      ? " intel-cat-workspace-open-item--active"
                      : ""
                  }`}
                  onClick={() =>
                    setActiveValidationSignalId((current) =>
                      current === item.signalId ? null : item.signalId,
                    )
                  }
                >
                  <span className="intel-cat-workspace-open-question">{item.question}</span>
                  <span className="intel-cat-workspace-open-status">{item.statusLabel}</span>
                </button>
              </li>
            ))}
          </ul>
        </WorkspaceSection>

        <WorkspaceSection
          title={INTELLIGENCE_CAPTURE_WORKSPACE_UI.relatedContacts}
          count={workspace.relatedContacts.length}
          empty={INTELLIGENCE_CAPTURE_WORKSPACE_UI.noRelatedContacts}
        >
          <ul className="intel-cat-workspace-list">
            {workspace.relatedContacts.map((item) => (
              <li key={item.id} className="intel-cat-workspace-list-item">
                <p className="intel-cat-workspace-list-text">{item.name}</p>
                {item.context ? (
                  <span className="intel-cat-workspace-list-meta">{item.context}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </WorkspaceSection>

        <WorkspaceSection
          title={INTELLIGENCE_CAPTURE_WORKSPACE_UI.supportingEvidence}
          count={workspace.supportingEvidence.length}
          empty={INTELLIGENCE_CAPTURE_WORKSPACE_UI.noSupportingEvidence}
        >
          <ul className="intel-cat-workspace-list">
            {workspace.supportingEvidence.map((item) => (
              <li key={item.id} className="intel-cat-workspace-list-item">
                <p className="intel-cat-workspace-list-text intel-cat-workspace-quote">"{item.quote}"</p>
                {item.interpretation ? (
                  <span className="intel-cat-workspace-list-meta">{item.interpretation}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </WorkspaceSection>

        <WorkspaceSection
          title={INTELLIGENCE_CAPTURE_WORKSPACE_UI.recentUpdates}
          count={workspace.recentUpdates.length}
          empty={INTELLIGENCE_CAPTURE_WORKSPACE_UI.noRecentUpdates}
        >
          <ul className="intel-cat-workspace-list">
            {workspace.recentUpdates.map((item) => (
              <li key={item.id} className="intel-cat-workspace-list-item">
                <p className="intel-cat-workspace-list-text">{item.summary}</p>
                <span className="intel-cat-workspace-list-meta">
                  {item.capturedLabel}
                  {item.sourceLabel ? ` · ${item.sourceLabel}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </WorkspaceSection>
      </div>

      {activeValidationQuestion ? (
        <section className="intel-cat-workspace-validation" aria-label="Add details">
          <div className="intel-cat-workspace-validation-head">
            <h4 className="intel-cat-workspace-validation-title">
              {INTELLIGENCE_CAPTURE_WORKSPACE_UI.validateOne}
            </h4>
            <button
              type="button"
              className="intel-cat-workspace-validation-close"
              onClick={() => setActiveValidationSignalId(null)}
            >
              Close
            </button>
          </div>
          <StageMappingQuestionCard
            question={activeValidationQuestion}
            contact={validationHandlers.contact}
            active={validationHandlers.activeSignalId === activeValidationQuestion.signalId}
            busy={validationHandlers.busySignalId === activeValidationQuestion.signalId}
            selectedChoice={
              validationHandlers.selectedChoiceBySignal[activeValidationQuestion.signalId] ?? null
            }
            metadata={validationHandlers.metadataBySignal[activeValidationQuestion.signalId] ?? {}}
            notes={validationHandlers.notesBySignal[activeValidationQuestion.signalId] ?? ""}
            contactDraft={
              validationHandlers.contactDraftBySignal[activeValidationQuestion.signalId] ?? null
            }
            facilityContactDraft={
              activeValidationQuestion.signalId === "scheduling_owner"
                ? validationHandlers.facilityContactDraftBySignal[SCHEDULING_FACILITY_DRAFT_KEY] ?? null
                : null
            }
            contactPool={validationHandlers.pool}
            organizationId={validationHandlers.organizationId}
            organizationName={validationHandlers.organizationName}
            providerId={validationHandlers.providerId}
            lastImpactLine={validationHandlers.impactBySignal[activeValidationQuestion.signalId] ?? null}
            submitError={validationHandlers.submitErrorBySignal[activeValidationQuestion.signalId] ?? null}
            onChoiceSelect={(choice) =>
              validationHandlers.onChoiceSelect(activeValidationQuestion, choice)
            }
            onChoiceDeselect={() => validationHandlers.onChoiceDeselect(activeValidationQuestion)}
            onMetadataChange={(key, value) =>
              validationHandlers.onMetadataChange(activeValidationQuestion.signalId, key, value)
            }
            onNotesChange={(value) =>
              validationHandlers.onNotesChange(activeValidationQuestion.signalId, value)
            }
            onContactDraftChange={(draft) =>
              validationHandlers.onContactDraftChange(activeValidationQuestion.signalId, draft)
            }
            onFacilityContactDraftChange={(draft) =>
              validationHandlers.onFacilityContactDraftChange(SCHEDULING_FACILITY_DRAFT_KEY, draft)
            }
            onSubmitContact={() => validationHandlers.onSubmitContact(activeValidationQuestion)}
            onSubmitChoice={(choice, overrides) =>
              validationHandlers.onSubmitChoice(activeValidationQuestion, choice, overrides)
            }
            contactOptIn={
              activeValidationQuestion.signalId in validationHandlers.contactOptInBySignal
                ? validationHandlers.contactOptInBySignal[activeValidationQuestion.signalId]!
                : null
            }
            onContactIntent={(intent) =>
              validationHandlers.onContactIntent(activeValidationQuestion, intent)
            }
            onOpenCredentialingWorkflow={
              activeValidationQuestion.signalId === "facility_vendor_pathway"
                ? validationHandlers.onOpenCredentialingWorkflow
                : undefined
            }
            forceExpandTick={
              validationHandlers.forceExpandSignalId === activeValidationQuestion.signalId
                ? validationHandlers.forceExpandNonce
                : 0
            }
            evidenceConfidence={
              validationHandlers.evidenceConfidenceBySignal[activeValidationQuestion.signalId] ?? null
            }
            onEvidenceConfidenceChange={(confidence) =>
              validationHandlers.onEvidenceConfidenceChange(activeValidationQuestion.signalId, confidence)
            }
            evidenceText={validationHandlers.evidenceBySignal[activeValidationQuestion.signalId] ?? ""}
            onEvidenceTextChange={(value) =>
              validationHandlers.onEvidenceTextChange(activeValidationQuestion.signalId, value)
            }
            highlighted={validationHandlers.highlightSignalId === activeValidationQuestion.signalId}
            dismissedSuggestedContactLead={Boolean(
              validationHandlers.dismissedSuggestedContactLeads[activeValidationQuestion.signalId],
            )}
            contactSearchPrefill={
              validationHandlers.contactSearchPrefillBySignal[activeValidationQuestion.signalId] ?? null
            }
            onSuggestedContactLead={(action, lead) =>
              validationHandlers.onSuggestedContactLead(activeValidationQuestion, action, lead)
            }
          />
        </section>
      ) : null}
    </div>
  );
}
