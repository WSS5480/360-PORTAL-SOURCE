"use client";

import React from "react";
import { ContactRelationshipAssignmentField } from "@/components/sales/ContactRelationshipAssignmentField";
import type { DiscoverySupportContactSignalId } from "@/lib/surgical-sales/discoveryIntelligenceSupportContact";
import {
  assignmentFootnote,
  contactRelationshipAssignmentLabel,
  supportContactLinkedToLines,
} from "@/lib/surgical-sales/contactRelationshipAssignment";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import {
  OPERATIONAL_CONTACT_TYPES,
  TITLE_SUGGESTIONS,
  WORKFLOW_RESPONSIBILITIES,
  compatibleContactTypesForSignal,
  contactDisplayTitle,
  contactTypeLabelForContact,
  dedupeWorkflowResponsibilities,
  filterOperationalContactPool,
  workflowResponsibilityLabel,
  type OperationalContactTypeId,
  type SchedulingContactOwnershipType,
  type SchedulingControlPathId,
  type WorkflowResponsibilityId,
} from "@/lib/surgical-sales/operationalSupportContact";
import {
  syncDraftRoleId,
  draftLinksToOrganization,
  type RapidDiscoverySupportContactDraft,
} from "@/lib/surgical-sales/rapidDiscoverySupportContact";

const OPERATIONAL_UI = {
  workflowHelper: "Choose one or more roles this contact covers.",
  workflowDetailsLabel: "Show role details",
  contactTypeStep: "What type of contact is this?",
  titleStep: "What is their title?",
  workflowStep: "What do they help with?",
  titleLabel: "Title",
  workflowLabel: "Workflow responsibility",
  showProviders: "Show providers too",
  selectHintProvider: "Provider office staff and coordinators — not hospital OR schedulers.",
  selectHintFacility: "OR schedulers, central scheduling, and facility coordinators.",
  selectHintDefault: "Schedulers, office staff, and coordinators — not surgeons by default.",
  orgFieldLabel: "Organization",
  orgFieldOptional: "Organization (optional for provider workflow)",
  next: "Next",
  back: "Back",
  noMatches: "No compatible contacts — create a new one or adjust your search.",
} as const;

const WORKFLOW_ROLE_DETAILS: Record<WorkflowResponsibilityId, string> = {
  observation_scheduling_owner: "Owns observation scheduling timing and handoffs.",
  approval_contact: "Handles access approvals before vendor presence is allowed.",
  credentialing_contact: "Manages credentialing requirements and status.",
  clinical_champion: "Advocates clinically and helps open doors for adoption.",
  product_evaluator: "Evaluates product fit during workflow or case review.",
  case_coordination: "Coordinates day-of-case logistics and staffing alignment.",
  decision_influence: "Influences purchasing, trial, or pathway decisions.",
  vendor_access: "Guides vendor or facility access protocols and restrictions.",
};


function addWorkflowResponsibility(
  draft: RapidDiscoverySupportContactDraft,
  id: WorkflowResponsibilityId,
): RapidDiscoverySupportContactDraft {
  return syncDraftRoleId({
    ...draft,
    workflowResponsibilities: dedupeWorkflowResponsibilities([...draft.workflowResponsibilities, id]),
  });
}

function removeWorkflowResponsibility(
  draft: RapidDiscoverySupportContactDraft,
  id: WorkflowResponsibilityId,
): RapidDiscoverySupportContactDraft {
  return syncDraftRoleId({
    ...draft,
    workflowResponsibilities: draft.workflowResponsibilities.filter((item) => item !== id),
  });
}

function WorkflowResponsibilityPicker({
  draft,
  disabled,
  onDraftChange,
  suggestedIds,
}: {
  draft: RapidDiscoverySupportContactDraft;
  disabled?: boolean;
  onDraftChange: (draft: RapidDiscoverySupportContactDraft) => void;
  suggestedIds?: WorkflowResponsibilityId[];
}) {
  const suggested = new Set(suggestedIds ?? []);
  const selectedIds = dedupeWorkflowResponsibilities(draft.workflowResponsibilities);
  const selectedSet = new Set(selectedIds);
  const available = [...WORKFLOW_RESPONSIBILITIES]
    .filter((item) => !selectedSet.has(item.id))
    .sort((a, b) => {
      const aSuggested = suggested.has(a.id);
      const bSuggested = suggested.has(b.id);
      if (aSuggested !== bSuggested) return aSuggested ? -1 : 1;
      return a.label.localeCompare(b.label);
    });

  return (
    <fieldset className="rd-support-workflow">
      <legend className="rd-support-section-label">{OPERATIONAL_UI.workflowLabel}</legend>
      <p className="rd-support-helper">{OPERATIONAL_UI.workflowHelper}</p>

      <div className="rd-support-workflow-zones">
        <div className="rd-support-workflow-zone">
          <p className="rd-support-workflow-zone-label">Selected responsibilities</p>
          {selectedIds.length > 0 ? (
            <div className="rd-support-role-selected" role="list" aria-label="Selected responsibilities">
              {selectedIds.map((id) => (
                <span key={id} className="rd-support-role-selected-chip" role="listitem">
                  <span>{workflowResponsibilityLabel(id)}</span>
                  <button
                    type="button"
                    className="rd-support-role-selected-remove"
                    disabled={disabled}
                    aria-label={`Remove ${workflowResponsibilityLabel(id)}`}
                    onClick={() => onDraftChange(removeWorkflowResponsibility(draft, id))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="rd-support-workflow-empty">No responsibilities selected yet.</p>
          )}
        </div>

        <div className="rd-support-workflow-divider" aria-hidden />

        <div className="rd-support-workflow-zone">
          <p className="rd-support-workflow-zone-label">Available responsibilities</p>
          {available.length > 0 ? (
            <div className="rd-support-role-grid" role="group" aria-label="Available responsibilities">
              {available.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`rd-support-role-chip${suggested.has(item.id) ? " rd-support-role-chip--suggested" : ""}`}
                  disabled={disabled}
                  onClick={() => onDraftChange(addWorkflowResponsibility(draft, item.id))}
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rd-support-workflow-empty">All responsibilities selected.</p>
          )}
        </div>
      </div>

      <details className="rd-support-role-details">
        <summary>{OPERATIONAL_UI.workflowDetailsLabel}</summary>
        <ul className="rd-support-role-details-list">
          {WORKFLOW_RESPONSIBILITIES.map((item) => (
            <li key={item.id}>
              <strong>{item.label}:</strong> {WORKFLOW_ROLE_DETAILS[item.id]}
            </li>
          ))}
        </ul>
      </details>
    </fieldset>
  );
}

function SupportContactReviewSummary({
  draft,
  providerLabel,
  organizationName,
  selectedContact,
}: {
  draft: RapidDiscoverySupportContactDraft;
  providerLabel: string;
  organizationName?: string | null;
  selectedContact?: Record<string, unknown> | null;
}) {
  const contactTypeLabel =
    OPERATIONAL_CONTACT_TYPES.find((t) => t.id === draft.contactTypeId)?.label ?? "Contact";
  const contactName =
    draft.mode === "select" && selectedContact
      ? contactDisplayName(selectedContact as Parameters<typeof contactDisplayName>[0])
      : [draft.firstName, draft.lastName].filter(Boolean).join(" ").trim() || "—";
  const linkedTo = supportContactLinkedToLines({
    assignment: draft.ownershipType,
    providerLabel,
    organizationName,
  });

  return (
    <section className="rd-support-review" aria-label="Review support contact">
      <h3 className="rd-support-review-title">Review</h3>
      <dl className="rd-support-review-list">
        <div>
          <dt>Contact type</dt>
          <dd>{contactTypeLabel}</dd>
        </div>
        <div>
          <dt>Contact</dt>
          <dd>{contactName}</dd>
        </div>
        <div>
          <dt>Title</dt>
          <dd>{draft.jobTitle.trim() || contactDisplayTitle(selectedContact ?? {}) || "—"}</dd>
        </div>
        <div>
          <dt>Affiliation</dt>
          <dd>{contactRelationshipAssignmentLabel(draft.ownershipType)}</dd>
        </div>
        <div>
          <dt>Linked to</dt>
          <dd>
            {linkedTo.length > 0 ? (
              <ul className="rd-support-review-linked">
                {linkedTo.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt>Workflow responsibilities</dt>
          <dd>
            {draft.workflowResponsibilities.length > 0
              ? draft.workflowResponsibilities.map(workflowResponsibilityLabel).join(", ")
              : "—"}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function ContactTypePicker({
  draft,
  disabled,
  allowedTypes,
  onDraftChange,
}: {
  draft: RapidDiscoverySupportContactDraft;
  disabled?: boolean;
  allowedTypes: OperationalContactTypeId[];
  onDraftChange: (draft: RapidDiscoverySupportContactDraft) => void;
}) {
  const allowed = new Set(allowedTypes);

  return (
    <fieldset className="rd-support-type-grid-wrap">
      <legend className="rd-support-section-label">{OPERATIONAL_UI.contactTypeStep}</legend>
      <div className="rd-support-type-grid">
        {OPERATIONAL_CONTACT_TYPES.filter((t) => allowed.has(t.id)).map((type) => (
          <button
            key={type.id}
            type="button"
            className={`rd-support-type-btn${draft.contactTypeId === type.id ? " rd-support-type-btn--active" : ""}`}
            disabled={disabled}
            onClick={() =>
              onDraftChange(
                syncDraftRoleId({
                  ...draft,
                  contactTypeId: type.id,
                  jobTitle: draft.jobTitle || TITLE_SUGGESTIONS[type.id][0] || "",
                }),
              )
            }
          >
            {type.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function RapidDiscoverySupportContactPanel({
  dbKey,
  providerId,
  organizationId,
  organizationName,
  existingContacts,
  draft,
  onDraftChange,
  disabled,
  defaultExpanded = false,
  title = "Support contact",
  hint = "Link a person — updates scheduling and pathway requirements",
  discoverySignalId,
  suggestedWorkflowIds,
  schedulingPath,
  schedulingSlot,
  ownershipType,
  initialSearch,
  providerLabel,
  layout = "accordion",
}: {
  dbKey: string;
  providerId: string;
  organizationId: string | null;
  organizationName?: string | null;
  existingContacts: Record<string, unknown>[];
  draft: RapidDiscoverySupportContactDraft;
  onDraftChange: (draft: RapidDiscoverySupportContactDraft) => void;
  disabled?: boolean;
  defaultExpanded?: boolean;
  title?: string;
  hint?: string;
  discoverySignalId?: DiscoverySupportContactSignalId;
  suggestedWorkflowIds?: WorkflowResponsibilityId[];
  schedulingPath?: SchedulingControlPathId | "";
  schedulingSlot?: "provider" | "facility";
  ownershipType?: SchedulingContactOwnershipType;
  initialSearch?: string;
  providerLabel?: string;
  layout?: "accordion" | "drawer";
}) {
  const isDrawerLayout = layout === "drawer";
  const [expanded, setExpanded] = React.useState(defaultExpanded || isDrawerLayout);
  const [search, setSearch] = React.useState(initialSearch ?? "");

  React.useEffect(() => {
    if (initialSearch?.trim()) {
      setSearch(initialSearch.trim());
    }
  }, [initialSearch]);


  const allowedContactTypes = React.useMemo(
    () =>
      discoverySignalId
        ? compatibleContactTypesForSignal(
            discoverySignalId,
            draft.showProviders,
            schedulingPath,
          )
        : OPERATIONAL_CONTACT_TYPES.map((t) => t.id),
    [discoverySignalId, draft.showProviders, schedulingPath],
  );

  const filtered = React.useMemo(
    () =>
      filterOperationalContactPool({
        contacts: existingContacts,
        signalId: discoverySignalId,
        showProviders: draft.showProviders,
        excludeContactId: providerId,
        search,
        schedulingPath,
        schedulingSlot,
        organizationId,
      }),
    [
      discoverySignalId,
      draft.showProviders,
      existingContacts,
      providerId,
      search,
      schedulingPath,
      schedulingSlot,
      organizationId,
    ],
  );

  const selectHint =
    schedulingSlot === "provider"
      ? OPERATIONAL_UI.selectHintProvider
      : schedulingSlot === "facility"
        ? OPERATIONAL_UI.selectHintFacility
        : OPERATIONAL_UI.selectHintDefault;

  const footnote = assignmentFootnote(draft.ownershipType, organizationName);
  const resolvedProviderLabel = providerLabel?.trim() || "Provider";

  const titleSuggestions = TITLE_SUGGESTIONS[draft.contactTypeId] ?? [];

  const selectedContact = React.useMemo(() => {
    if (!draft.selectedContactId) return null;
    return existingContacts.find((c) => String(c.id) === draft.selectedContactId) ?? null;
  }, [draft.selectedContactId, existingContacts]);

  return (
    <div
      className={`rd-support rd-support--operational${isDrawerLayout ? " rd-support--drawer" : ""}`}
    >
      {isDrawerLayout ? null : (
        <button
          type="button"
          className="rd-support-toggle"
          aria-expanded={expanded}
          disabled={disabled}
          onClick={() => setExpanded((v) => !v)}
        >
          <span className="rd-support-toggle-label">{title}</span>
          <span className="rd-support-toggle-hint">{hint}</span>
          <span className="rd-support-toggle-chevron" aria-hidden>
            {expanded ? "−" : "+"}
          </span>
        </button>
      )}

      {expanded ? (
        <div className={`rd-support-body${isDrawerLayout ? " rd-support-body--drawer" : ""}`}>
          <div className="rd-support-mode">
            <button
              type="button"
              className={`rd-support-mode-btn${draft.mode === "select" ? " rd-support-mode-btn--active" : ""}`}
              disabled={disabled}
              onClick={() => onDraftChange({ ...draft, mode: "select", createStep: 1 })}
            >
              Select existing
            </button>
            <button
              type="button"
              className={`rd-support-mode-btn${draft.mode === "create" ? " rd-support-mode-btn--active" : ""}`}
              disabled={disabled}
              onClick={() => onDraftChange({ ...draft, mode: "create", createStep: 1 })}
            >
              Create new
            </button>
          </div>

          <ContactRelationshipAssignmentField
            variant="chips"
            value={draft.ownershipType}
            organizationId={organizationId}
            organizationName={organizationName}
            disabled={disabled}
            onChange={(ownershipType) => onDraftChange({ ...draft, ownershipType })}
          />

          {draft.mode === "select" ? (
            <>
              <p className="rd-support-helper">{selectHint}</p>
              <input
                type="search"
                className="rd-support-input"
                placeholder="Search contacts…"
                value={search}
                disabled={disabled}
                onChange={(e) => setSearch(e.target.value)}
              />
              <label className="rd-support-show-providers">
                <input
                  type="checkbox"
                  checked={draft.showProviders}
                  disabled={disabled}
                  onChange={(e) => onDraftChange({ ...draft, showProviders: e.target.checked })}
                />
                <span>{OPERATIONAL_UI.showProviders}</span>
              </label>
              <ul className="rd-support-pick-list">
                {filtered.map((c) => {
                  const id = String(c.id);
                  const selected = draft.selectedContactId === id;
                  const displayTitle = contactDisplayTitle(c);
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        className={`rd-support-pick${selected ? " rd-support-pick--selected" : ""}`}
                        disabled={disabled}
                        onClick={() =>
                          onDraftChange(
                            syncDraftRoleId({
                              ...draft,
                              selectedContactId: id,
                              jobTitle: displayTitle,
                            }),
                          )
                        }
                      >
                        <span className="rd-support-pick-name">
                          {contactDisplayName(c as Parameters<typeof contactDisplayName>[0])}
                        </span>
                        <span className="rd-support-pick-meta">
                          {displayTitle ? `Title: ${displayTitle}` : "Title not set"}
                          {" · "}
                          {contactTypeLabelForContact(c)}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {filtered.length === 0 ? (
                  <li className="rd-support-empty">{OPERATIONAL_UI.noMatches}</li>
                ) : null}
              </ul>

              {selectedContact ? (
                <div className="rd-support-selected-summary">
                  <p>
                    <strong>Title:</strong> {draft.jobTitle.trim() || contactDisplayTitle(selectedContact) || "—"}
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="rd-support-steps" aria-hidden>
                {[1, 2, 3, 4].map((step) => (
                  <span
                    key={step}
                    className={`rd-support-step${draft.createStep === step ? " rd-support-step--active" : ""}${draft.createStep > step ? " rd-support-step--done" : ""}`}
                  >
                    {step}
                  </span>
                ))}
              </div>

              {draft.createStep === 1 ? (
                <ContactTypePicker
                  draft={draft}
                  disabled={disabled}
                  allowedTypes={allowedContactTypes}
                  onDraftChange={onDraftChange}
                />
              ) : null}

              {draft.createStep === 2 ? (
                <div className="rd-support-create-grid">
                  <label className="rd-support-field rd-support-field--full">
                    <span>{OPERATIONAL_UI.titleLabel}</span>
                    <input
                      className="rd-support-input"
                      list={`rd-title-suggestions-${dbKey}`}
                      value={draft.jobTitle}
                      disabled={disabled}
                      placeholder="e.g. OR Coordinator"
                      onChange={(e) => onDraftChange({ ...draft, jobTitle: e.target.value })}
                    />
                    <datalist id={`rd-title-suggestions-${dbKey}`}>
                      {titleSuggestions.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </label>
                  <label className="rd-support-field">
                    <span>First name</span>
                    <input
                      className="rd-support-input"
                      value={draft.firstName}
                      disabled={disabled}
                      onChange={(e) => onDraftChange({ ...draft, firstName: e.target.value })}
                    />
                  </label>
                  <label className="rd-support-field">
                    <span>Last name</span>
                    <input
                      className="rd-support-input"
                      value={draft.lastName}
                      disabled={disabled}
                      onChange={(e) => onDraftChange({ ...draft, lastName: e.target.value })}
                    />
                  </label>
                  <label className="rd-support-field">
                    <span>Email</span>
                    <input
                      className="rd-support-input"
                      type="email"
                      value={draft.email}
                      disabled={disabled}
                      onChange={(e) => onDraftChange({ ...draft, email: e.target.value })}
                    />
                  </label>
                  <label className="rd-support-field">
                    <span>Phone</span>
                    <input
                      className="rd-support-input"
                      value={draft.phone}
                      disabled={disabled}
                      onChange={(e) => onDraftChange({ ...draft, phone: e.target.value })}
                    />
                  </label>
                  <label className="rd-support-field rd-support-field--full">
                    <span>
                      {draftLinksToOrganization(draft)
                        ? OPERATIONAL_UI.orgFieldLabel
                        : OPERATIONAL_UI.orgFieldOptional}
                    </span>
                    <input
                      className="rd-support-input"
                      value={draftLinksToOrganization(draft) ? organizationName ?? "" : ""}
                      disabled
                      readOnly
                      placeholder={
                        draftLinksToOrganization(draft) ? undefined : "Not required for provider workflow"
                      }
                    />
                  </label>
                </div>
              ) : null}

              {draft.createStep === 3 ? (
                <>
                  <WorkflowResponsibilityPicker
                    draft={draft}
                    disabled={disabled}
                    onDraftChange={onDraftChange}
                    suggestedIds={suggestedWorkflowIds}
                  />
                  <label className="rd-support-field rd-support-field--full">
                    <span>Notes (optional)</span>
                    <textarea
                      className="rd-support-input rd-support-textarea"
                      rows={2}
                      value={draft.notes}
                      disabled={disabled}
                      onChange={(e) => onDraftChange({ ...draft, notes: e.target.value })}
                      placeholder="How they help with this touch…"
                    />
                  </label>
                </>
              ) : null}

              {draft.createStep === 4 ? (
                <SupportContactReviewSummary
                  draft={draft}
                  providerLabel={resolvedProviderLabel}
                  organizationName={organizationName}
                />
              ) : null}

              <div className="rd-support-create-nav">
                {draft.createStep > 1 ? (
                  <button
                    type="button"
                    className="rd-support-nav-btn"
                    disabled={disabled}
                    onClick={() =>
                      onDraftChange({
                        ...draft,
                        createStep: (draft.createStep - 1) as 1 | 2 | 3 | 4,
                      })
                    }
                  >
                    {OPERATIONAL_UI.back}
                  </button>
                ) : (
                  <span />
                )}
                {draft.createStep < 4 ? (
                  <button
                    type="button"
                    className="rd-support-nav-btn rd-support-nav-btn--primary"
                    disabled={
                      disabled ||
                      (draft.createStep === 1 && !draft.contactTypeId) ||
                      (draft.createStep === 3 && draft.workflowResponsibilities.length === 0)
                    }
                    onClick={() =>
                      onDraftChange({
                        ...draft,
                        createStep: (draft.createStep + 1) as 1 | 2 | 3 | 4,
                      })
                    }
                  >
                    {OPERATIONAL_UI.next}
                  </button>
                ) : null}
              </div>
            </>
          )}

          {draft.mode === "select" ? (
            <>
              <WorkflowResponsibilityPicker
                draft={draft}
                disabled={disabled}
                onDraftChange={onDraftChange}
                suggestedIds={suggestedWorkflowIds}
              />
              <SupportContactReviewSummary
                draft={draft}
                providerLabel={resolvedProviderLabel}
                organizationName={organizationName}
                selectedContact={selectedContact}
              />
            </>
          ) : null}

          <p className="rd-support-footnote">{footnote}</p>
        </div>
      ) : null}
    </div>
  );
}

export function supportContactDraftReady(draft: RapidDiscoverySupportContactDraft): boolean {
  if (draft.workflowResponsibilities.length === 0) return false;
  if (draft.mode === "select") return Boolean(draft.selectedContactId);
  if (draft.createStep < 4) return false;
  return Boolean(
    draft.contactTypeId &&
      (draft.firstName.trim() || draft.lastName.trim() || draft.email.trim() || draft.phone.trim()),
  );
}
