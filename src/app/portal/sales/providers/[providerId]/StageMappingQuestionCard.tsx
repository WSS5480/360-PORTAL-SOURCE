"use client";

import React from "react";
import {
  RapidDiscoverySupportContactPanel,
  supportContactDraftReady,
} from "@/app/portal/sales/providers/[providerId]/RapidDiscoverySupportContactPanel";
import {
  defaultWorkflowResponsibilitiesForSignal,
  type WorkflowResponsibilityId,
} from "@/lib/surgical-sales/operationalSupportContact";
import {
  discoverySupportContactPrimaryDbKey,
  type DiscoverySupportContactSignalId,
} from "@/lib/surgical-sales/discoveryIntelligenceSupportContact";
import type { StageMappingQuestion } from "@/lib/surgical-sales/buildStageMappingSession";
import {
  stageMappingChoiceRequiresContact,
  stageMappingOffersOptionalContact,
  type StageMappingMetadataField,
} from "@/lib/surgical-sales/stageMappingAnswerTypes";
import type { DiscoveryMappingEvidenceConfidence } from "@/lib/surgical-sales/discoveryMappingEvidenceConfidence";
import { STAGE_MAPPING_UI } from "@/lib/surgical-sales/stageMappingQuestions";
import { buildDiscoveryMappingQuestionView } from "@/lib/surgical-sales/buildDiscoveryMappingQuestionView";
import {
  buildDiscoveryMappingCardIntelligence,
  type DiscoveryMappingSuggestedContactLead,
} from "@/lib/surgical-sales/buildDiscoveryMappingCardIntelligence";
import { formatStageMappingCompactSummary } from "@/lib/surgical-sales/formatStageMappingCompactSummary";
import { DISCOVERY_MAPPING_NO_EVIDENCE_SUMMARY } from "@/lib/surgical-sales/discoveryMappingEvidenceQuality";
import type { RapidDiscoverySupportContactDraft } from "@/lib/surgical-sales/rapidDiscoverySupportContact";
import { emptySupportContactDraft } from "@/lib/surgical-sales/rapidDiscoverySupportContact";
import {
  FacilityCredentialingMappingFields,
  facilityCredentialingDraftFromMetadata,
  facilityCredentialingMappingMetadataFromDraft,
  type FacilityCredentialingMappingValue,
} from "@/app/portal/sales/providers/[providerId]/FacilityCredentialingMappingFields";
import {
  SchedulingOwnershipMappingFields,
  schedulingOwnershipContactsReady,
} from "@/app/portal/sales/providers/[providerId]/SchedulingOwnershipMappingFields";
import {
  schedulingControlPathFromContact,
  type SchedulingControlPathId,
} from "@/lib/surgical-sales/schedulingOwnershipFields";
import { SCHEDULING_OWNERSHIP_UI } from "@/lib/surgical-sales/schedulingOwnershipIntelligence";

function MetadataField({
  field,
  value,
  disabled,
  onChange,
}: {
  field: StageMappingMetadataField;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const id = `stage-mapping-meta-${field.key}`;
  const label =
    field.optional === false ? field.label : `${field.label} ${STAGE_MAPPING_UI.optionalSuffix}`;

  if (field.type === "textarea") {
    return (
      <label className="stage-mapping-meta-field stage-mapping-meta-field--full" htmlFor={id}>
        <span>{label}</span>
        <textarea
          id={id}
          className="stage-mapping-notes"
          rows={2}
          placeholder={field.placeholder}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className="stage-mapping-meta-field" htmlFor={id}>
        <span>{label}</span>
        <select
          id={id}
          className="stage-mapping-meta-input"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">—</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="stage-mapping-meta-field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        className="stage-mapping-meta-input"
        type={field.type === "date" ? "date" : "text"}
        placeholder={field.placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function cleanAnswerSummary(text: string | null | undefined): string | null {
  const trimmed = String(text ?? "").trim();
  if (!trimmed || trimmed === DISCOVERY_MAPPING_NO_EVIDENCE_SUMMARY) return null;
  return trimmed.replace(
    /^(?:Open|Potential Lead|Partial|Confirmed|Potential signal found|Partial understanding):\s*/i,
    "",
  );
}

export function StageMappingQuestionCard({
  question,
  contact,
  active,
  busy,
  selectedChoice,
  metadata,
  notes,
  contactDraft,
  facilityContactDraft,
  contactPool,
  organizationId,
  organizationName,
  providerId,
  lastImpactLine,
  submitError = null,
  onChoiceSelect,
  onChoiceDeselect,
  onMetadataChange,
  onNotesChange,
  onContactDraftChange,
  onFacilityContactDraftChange,
  onSubmitContact,
  onSubmitChoice,
  onContactIntent,
  evidenceConfidence,
  onEvidenceConfidenceChange,
  onOpenCredentialingWorkflow,
  contactOptIn,
  forceExpandTick = 0,
  dimmed = false,
  highlighted = false,
  dismissedSuggestedContactLead = false,
  contactSearchPrefill = null,
  onSuggestedContactLead,
}: {
  question: StageMappingQuestion;
  contact: Record<string, unknown>;
  active: boolean;
  busy: boolean;
  selectedChoice: string | null;
  metadata: Record<string, string>;
  notes: string;
  contactDraft: RapidDiscoverySupportContactDraft | null;
  facilityContactDraft?: RapidDiscoverySupportContactDraft | null;
  contactPool: Record<string, unknown>[];
  organizationId: string | null;
  organizationName?: string | null;
  providerId: string;
  lastImpactLine: string | null;
  submitError?: string | null;
  onChoiceSelect: (choice: string) => void;
  onChoiceDeselect: () => void;
  onMetadataChange: (key: string, value: string) => void;
  onNotesChange: (value: string) => void;
  onContactDraftChange: (draft: RapidDiscoverySupportContactDraft) => void;
  onFacilityContactDraftChange?: (draft: RapidDiscoverySupportContactDraft) => void;
  onSubmitContact: () => void;
  onSubmitChoice: (choice: string, overrides?: { evidenceConfidence?: DiscoveryMappingEvidenceConfidence }) => void;
  onContactIntent: (intent: "select" | "create" | "skip") => void;
  evidenceConfidence: DiscoveryMappingEvidenceConfidence | null;
  onEvidenceConfidenceChange: (confidence: DiscoveryMappingEvidenceConfidence) => void;
  evidenceText?: string;
  onEvidenceTextChange?: (value: string) => void;
  onOpenCredentialingWorkflow?: () => void;
  contactOptIn: boolean | null;
  dimmed?: boolean;
  forceExpandTick?: number;
  highlighted?: boolean;
  dismissedSuggestedContactLead?: boolean;
  contactSearchPrefill?: string | null;
  onSuggestedContactLead?: (
    action: "select" | "create" | "dismiss",
    lead: DiscoveryMappingSuggestedContactLead,
  ) => void;
}) {
  const { answerSpec } = question;
  const [editing, setEditing] = React.useState(false);

  React.useEffect(() => {
    if (forceExpandTick > 0) {
      setEditing(true);
    }
  }, [forceExpandTick]);

  const offersOptionalContact = stageMappingOffersOptionalContact(answerSpec);
  const showContactIntentPrompt =
    selectedChoice != null &&
    offersOptionalContact &&
    contactOptIn === null &&
    !stageMappingChoiceRequiresContact(answerSpec, selectedChoice);
  const showContact =
    selectedChoice != null &&
    contactOptIn === true &&
    contactDraft != null &&
    question.supportsContact;

  const showCredentialing =
    answerSpec.structuredForm === "facility_credentialing" && !showContact;
  const showSchedulingOwnership =
    answerSpec.structuredForm === "scheduling_ownership" && !showContact && selectedChoice != null;
  const [schedulingContactMode, setSchedulingContactMode] = React.useState<"select" | "create" | null>(
    null,
  );
  const showSchedulingContactIntentPrompt =
    showSchedulingOwnership && selectedChoice !== "unknown" && schedulingContactMode == null;
  const showSchedulingOwnershipFields =
    showSchedulingOwnership && selectedChoice !== "unknown" && schedulingContactMode != null;

  React.useEffect(() => {
    if (!showSchedulingOwnership || selectedChoice === "unknown") {
      setSchedulingContactMode(null);
    }
  }, [selectedChoice, showSchedulingOwnership]);

  const showMetadata =
    Boolean(answerSpec.metadataFields?.length) &&
    !showContact &&
    !showCredentialing &&
    !showSchedulingOwnership;

  const schedulingControl = (selectedChoice ?? "") as SchedulingControlPathId | "";
  const schedulingContactsReady = schedulingOwnershipContactsReady({
    schedulingControl,
    providerContactDraft: contactDraft,
    facilityContactDraft: facilityContactDraft ?? null,
  });

  const showConfirm =
    selectedChoice != null &&
    !stageMappingChoiceRequiresContact(answerSpec, selectedChoice) &&
    (!offersOptionalContact || contactOptIn === false) &&
    (answerSpec.structuredForm !== "scheduling_ownership" ||
      selectedChoice === "unknown" ||
      (showSchedulingOwnershipFields && schedulingContactsReady));

  const contactSignalId = question.supportsContact
    ? (question.signalId as DiscoverySupportContactSignalId)
    : null;

  const suggestedWorkflowIds: WorkflowResponsibilityId[] | undefined = contactSignalId
    ? defaultWorkflowResponsibilitiesForSignal(contactSignalId)
    : undefined;

  const mappingDetail = React.useMemo(
    () =>
      buildDiscoveryMappingQuestionView({
        dbKey: question.dbKey,
        contact,
        providerId,
      }),
    [contact, providerId, question.dbKey],
  );

  const cardIntelligence = React.useMemo(
    () =>
      buildDiscoveryMappingCardIntelligence({
        question,
        contact,
        providerId,
        mappingDetail,
        selectedChoice,
        metadata,
      }),
    [contact, mappingDetail, metadata, providerId, question, selectedChoice],
  );

  const compactSummary = React.useMemo(
    () =>
      formatStageMappingCompactSummary({
        question,
        contact,
        selectedChoice,
        metadata,
        mappingDetail,
        providerContactDraft: contactDraft,
        facilityContactDraft,
        contactDraft,
      }),
    [contact, contactDraft, facilityContactDraft, mappingDetail, metadata, question, selectedChoice],
  );

  const hasAnswer = cardIntelligence.hasAppliedIntelligence;
  const answerText =
    cleanAnswerSummary(cardIntelligence.currentIntelligence?.summary) ??
    cleanAnswerSummary(compactSummary) ??
    cleanAnswerSummary(cardIntelligence.understandingSummary) ??
    cleanAnswerSummary(mappingDetail?.currentState.summary);

  const effectiveEvidenceConfidence: DiscoveryMappingEvidenceConfidence =
    evidenceConfidence ??
    cardIntelligence.currentIntelligence?.evidenceConfidence ??
    "mentioned_once";

  const isValidated = effectiveEvidenceConfidence === "validated" || question.resolved;

  const suggestedChoice =
    question.signalId === "scheduling_owner" ? schedulingControlPathFromContact(contact) : "";
  const suggestedLabel =
    suggestedChoice === "shared_workflow"
      ? SCHEDULING_OWNERSHIP_UI.sharedWorkflow
      : suggestedChoice === "provider_office"
        ? SCHEDULING_OWNERSHIP_UI.providerOffice
        : suggestedChoice === "facility"
          ? SCHEDULING_OWNERSHIP_UI.facility
          : null;

  const showSuggestedContactLead =
    Boolean(cardIntelligence.suggestedContactLead) &&
    !dismissedSuggestedContactLead &&
    !showContact &&
    editing &&
    Boolean(onSuggestedContactLead);

  const handleSuggestedLeadAction = React.useCallback(
    (action: "select" | "create" | "dismiss") => {
      const lead = cardIntelligence.suggestedContactLead;
      if (!lead) return;

      if (action === "dismiss") {
        onSuggestedContactLead?.("dismiss", lead);
        return;
      }

      if (question.signalId === "scheduling_owner") {
        if (!selectedChoice) {
          onChoiceSelect(suggestedChoice || "shared_workflow");
        }
        setSchedulingContactMode(action === "create" ? "create" : "select");
      }

      onSuggestedContactLead?.(action, lead);
    },
    [
      cardIntelligence.suggestedContactLead,
      onChoiceSelect,
      onSuggestedContactLead,
      question.signalId,
      selectedChoice,
      suggestedChoice,
    ],
  );

  const handleSave = React.useCallback(
    (confidenceOverride?: DiscoveryMappingEvidenceConfidence) => {
      const choice =
        selectedChoice ??
        answerSpec.choices.find((c) => c.value === "captured")?.value ??
        answerSpec.choices.find((c) => c.value !== "unknown")?.value ??
        "unknown";
      onSubmitChoice(choice, {
        evidenceConfidence: confidenceOverride ?? effectiveEvidenceConfidence,
      });
      setEditing(false);
    },
    [answerSpec.choices, effectiveEvidenceConfidence, onSubmitChoice, selectedChoice],
  );

  const handleValidate = React.useCallback(() => {
    onEvidenceConfidenceChange("validated");
    handleSave("validated");
  }, [handleSave, onEvidenceConfidenceChange]);

  const blockerLine = mappingDetail?.conditionalWorkflow?.conditionBlocker?.trim() ?? null;

  return (
    <article
      id={`stage-mapping-q-${question.signalId}`}
      className={`stage-mapping-question stage-mapping-question--field stage-mapping-question--${answerSpec.questionType}${question.resolved ? " stage-mapping-question--resolved" : ""}${active ? " stage-mapping-question--active" : ""}${highlighted ? " stage-mapping-question--highlighted" : ""}${dimmed ? " stage-mapping-question--dimmed" : ""}`}
      data-signal-id={question.signalId}
    >
      <h3 className="stage-mapping-field-question">{question.question}</h3>

      {blockerLine ? (
        <p className="stage-mapping-blocker-inline stage-mapping-intel-blocker" role="status">
          {blockerLine}
        </p>
      ) : null}

      {!editing ? (
        <>
          {hasAnswer && answerText ? (
            <p className="stage-mapping-field-answer">{answerText}</p>
          ) : (
            <p className="stage-mapping-field-empty">{STAGE_MAPPING_UI.nothingCapturedYet}</p>
          )}

          <div className="stage-mapping-field-actions">
            {hasAnswer ? (
              <>
                <button
                  type="button"
                  className="stage-mapping-field-action"
                  disabled={busy}
                  onClick={() => setEditing(true)}
                >
                  {STAGE_MAPPING_UI.editIntelligence}
                </button>
                {!isValidated ? (
                  <button
                    type="button"
                    className="stage-mapping-field-action stage-mapping-field-action--primary"
                    disabled={busy}
                    onClick={handleValidate}
                  >
                    {STAGE_MAPPING_UI.validateIntelligence}
                  </button>
                ) : null}
              </>
            ) : (
              <button
                type="button"
                className="stage-mapping-field-action stage-mapping-field-action--primary"
                disabled={busy}
                onClick={() => setEditing(true)}
              >
                {STAGE_MAPPING_UI.addIntelligence}
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="stage-mapping-field-editor">
          {suggestedLabel && !selectedChoice ? (
            <p className="stage-mapping-suggested-inline">
              Suggested: <strong>{suggestedLabel}</strong>
            </p>
          ) : null}

          {answerSpec.questionType === "opportunity" || !answerSpec.choices.length ? (
            <textarea
              className="stage-mapping-notes"
              rows={3}
              placeholder="Enter your answer…"
              value={notes}
              disabled={busy}
              onChange={(e) => onNotesChange(e.target.value)}
            />
          ) : (
            <div
              className={`stage-mapping-choices stage-mapping-choices--primary stage-mapping-choices--${answerSpec.questionType}`}
              role="group"
              aria-label={question.question}
            >
              {answerSpec.choices.map((choice) => (
                <button
                  key={choice.value}
                  type="button"
                  className={`stage-mapping-choice stage-mapping-choice--primary stage-mapping-choice--${choice.tone}${selectedChoice === choice.value ? " stage-mapping-choice--selected" : ""}${suggestedChoice === choice.value && !selectedChoice ? " stage-mapping-choice--suggested" : ""}`}
                  disabled={busy}
                  aria-pressed={selectedChoice === choice.value}
                  onClick={() => {
                    if (selectedChoice === choice.value) {
                      onChoiceDeselect();
                      return;
                    }
                    onChoiceSelect(choice.value);
                  }}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          )}

          {showSuggestedContactLead && cardIntelligence.suggestedContactLead ? (
            <div className="stage-mapping-field-lead">
              <p className="stage-mapping-field-lead-hint">
                {cardIntelligence.suggestedContactLead.hint}
              </p>
              <div className="stage-mapping-field-lead-actions">
                <button
                  type="button"
                  className="stage-mapping-field-action stage-mapping-field-action--primary"
                  disabled={busy}
                  onClick={() => handleSuggestedLeadAction("select")}
                >
                  Select {cardIntelligence.suggestedContactLead.name}
                </button>
                <button
                  type="button"
                  className="stage-mapping-field-action"
                  disabled={busy}
                  onClick={() => handleSuggestedLeadAction("create")}
                >
                  Add as contact
                </button>
              </div>
            </div>
          ) : null}

          {showContactIntentPrompt ? (
            <div className="stage-mapping-followup stage-mapping-contact-prompt" role="group">
              <p className="stage-mapping-contact-prompt-label">Who handles this?</p>
              <div className="stage-mapping-contact-prompt-actions">
                <button
                  type="button"
                  className="stage-mapping-choice stage-mapping-choice--primary"
                  disabled={busy}
                  onClick={() => onContactIntent("select")}
                >
                  Select existing contact
                </button>
                <button
                  type="button"
                  className="stage-mapping-choice"
                  disabled={busy}
                  onClick={() => onContactIntent("create")}
                >
                  Add new contact
                </button>
                <button
                  type="button"
                  className="stage-mapping-choice"
                  disabled={busy}
                  onClick={() => {
                    const unknownChoice = answerSpec.choices.find((c) => c.value === "unknown")?.value;
                    if (unknownChoice) {
                      onEvidenceConfidenceChange("mentioned_once");
                      onChoiceSelect(unknownChoice);
                      onSubmitChoice(unknownChoice);
                    }
                  }}
                >
                  Not known yet
                </button>
                <button
                  type="button"
                  className="stage-mapping-choice"
                  disabled={busy}
                  onClick={() => onContactIntent("skip")}
                >
                  Skip for now
                </button>
              </div>
            </div>
          ) : null}

          {showSchedulingContactIntentPrompt ? (
            <div className="stage-mapping-followup stage-mapping-contact-prompt" role="group">
              <p className="stage-mapping-contact-prompt-label">Who handles scheduling?</p>
              <div className="stage-mapping-contact-prompt-actions">
                <button
                  type="button"
                  className="stage-mapping-choice stage-mapping-choice--primary"
                  disabled={busy}
                  onClick={() => setSchedulingContactMode("select")}
                >
                  Select existing contact
                </button>
                <button
                  type="button"
                  className="stage-mapping-choice"
                  disabled={busy}
                  onClick={() => setSchedulingContactMode("create")}
                >
                  Add new contact
                </button>
                <button
                  type="button"
                  className="stage-mapping-choice"
                  disabled={busy}
                  onClick={() => {
                    onEvidenceConfidenceChange("mentioned_once");
                    onChoiceSelect("unknown");
                    onSubmitChoice("unknown");
                  }}
                >
                  Not known yet
                </button>
                <button
                  type="button"
                  className="stage-mapping-choice"
                  disabled={busy}
                  onClick={() => {
                    onChoiceDeselect();
                    setSchedulingContactMode(null);
                  }}
                >
                  Skip for now
                </button>
              </div>
            </div>
          ) : null}

          {showContact && contactDraft && contactSignalId ? (
            <div className="stage-mapping-followup">
              <RapidDiscoverySupportContactPanel
                dbKey={discoverySupportContactPrimaryDbKey(contactSignalId)}
                providerId={providerId}
                organizationId={organizationId}
                organizationName={organizationName}
                existingContacts={contactPool}
                draft={contactDraft}
                onDraftChange={onContactDraftChange}
                disabled={busy}
                defaultExpanded
                initialSearch={contactSearchPrefill ?? undefined}
                title={answerSpec.contactPanelTitle ?? "Support contact"}
                hint={answerSpec.contactPanelHint ?? "Link a person without leaving this capture flow"}
                discoverySignalId={contactSignalId ?? undefined}
                suggestedWorkflowIds={suggestedWorkflowIds}
              />
              <button
                type="button"
                className="stage-mapping-contact-submit"
                disabled={busy || !supportContactDraftReady(contactDraft)}
                onClick={onSubmitContact}
              >
                {STAGE_MAPPING_UI.linkContact}
              </button>
            </div>
          ) : null}

          {showSchedulingOwnershipFields && onFacilityContactDraftChange ? (
            <div className="stage-mapping-followup">
              <SchedulingOwnershipMappingFields
                schedulingControl={schedulingControl}
                providerContactDraft={contactDraft}
                facilityContactDraft={facilityContactDraft ?? null}
                contactMode={schedulingContactMode}
                providerId={providerId}
                organizationId={organizationId}
                organizationName={organizationName}
                contactPool={contactPool}
                disabled={busy}
                onProviderContactChange={onContactDraftChange}
                onFacilityContactChange={onFacilityContactDraftChange}
                contactSearchPrefill={contactSearchPrefill}
              />
            </div>
          ) : null}

          {showCredentialing ? (
            <div className="stage-mapping-followup">
              <FacilityCredentialingMappingFields
                value={facilityCredentialingDraftFromMetadata(metadata)}
                disabled={busy}
                onOpenCredentialingWorkflow={onOpenCredentialingWorkflow}
                onChange={(mappingValue: FacilityCredentialingMappingValue) => {
                  const mapped = facilityCredentialingMappingMetadataFromDraft(mappingValue);
                  for (const [key, value] of Object.entries(mapped)) {
                    onMetadataChange(key, value);
                  }
                }}
              />
            </div>
          ) : null}

          {showMetadata && answerSpec.metadataFields ? (
            <div className="stage-mapping-meta-grid stage-mapping-meta-grid--compact">
              {answerSpec.metadataFields.map((field) => (
                <MetadataField
                  key={field.key}
                  field={field}
                  value={metadata[field.key] ?? ""}
                  disabled={busy}
                  onChange={(value) => onMetadataChange(field.key, value)}
                />
              ))}
            </div>
          ) : null}

          {submitError ? (
            <p className="stage-mapping-blocker-inline stage-mapping-submit-error" role="alert">
              {submitError}
            </p>
          ) : null}

          {(showConfirm ||
            answerSpec.questionType === "opportunity" ||
            notes.trim() ||
            selectedChoice) && (
            <div className="stage-mapping-field-actions">
              <button
                type="button"
                className="stage-mapping-field-action stage-mapping-field-action--primary"
                disabled={busy}
                onClick={() => handleSave()}
              >
                {STAGE_MAPPING_UI.saveIntelligence}
              </button>
              <button
                type="button"
                className="stage-mapping-field-action"
                disabled={busy}
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {lastImpactLine ? <p className="stage-mapping-impact">{lastImpactLine}</p> : null}
    </article>
  );
}

export function createStageMappingContactDraft(input: {
  signalId: DiscoverySupportContactSignalId;
  organizationId: string | null;
  mode: "select" | "create";
  prefillName?: string | null;
  selectedContactId?: string | null;
}): RapidDiscoverySupportContactDraft {
  const dbKey = discoverySupportContactPrimaryDbKey(input.signalId);
  const draft = emptySupportContactDraft({
    dbKey,
    organizationId: input.organizationId,
    initialMode: input.mode,
    discoverySignalId: input.signalId,
  });

  if (input.selectedContactId?.trim()) {
    return {
      ...draft,
      mode: "select",
      selectedContactId: input.selectedContactId.trim(),
    };
  }

  const prefillName = String(input.prefillName ?? "").trim();
  if (!prefillName || input.mode !== "create") return draft;

  const [firstName, ...rest] = prefillName.split(/\s+/);
  return {
    ...draft,
    mode: "create",
    firstName,
    lastName: rest.join(" "),
  };
}
