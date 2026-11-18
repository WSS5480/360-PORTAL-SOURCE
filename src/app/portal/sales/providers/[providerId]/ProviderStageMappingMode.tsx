"use client";

import React from "react";
import { createPortal } from "react-dom";
import type { DiscoveryIntelligenceGroupsView } from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";
import type { DiscoveryIntelligenceGroupId } from "@/lib/surgical-sales/discoveryIntelligenceProgress";
import type { DiscoverySupportContactSignalId } from "@/lib/surgical-sales/discoveryIntelligenceSupportContact";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  buildStageMappingSession,
  type StageMappingQuestion,
} from "@/lib/surgical-sales/buildStageMappingSession";
import {
  applyStageMappingAnswer,
  applyStageMappingContactAnswer,
  stageMappingSignalAcceptsContactAnswer,
} from "@/lib/surgical-sales/applyStageMappingAnswer";
import { stageMappingOffersOptionalContact } from "@/lib/surgical-sales/stageMappingAnswerTypes";
import type { DiscoveryMappingEvidenceConfidence } from "@/lib/surgical-sales/discoveryMappingEvidenceConfidence";
import { STAGE_MAPPING_UI } from "@/lib/surgical-sales/stageMappingQuestions";
import { LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";
import type { StageMappingSignalId } from "@/lib/surgical-sales/stageMappingQuestions";
import {
  resolveStageMappingSignalAttribution,
  seedStageMappingEvidenceConfidence,
} from "@/lib/surgical-sales/stageMappingSourceAttribution";
import {
  groupStageMappingQuestionsByIntelligenceCategory,
  pickNextOpenStageMappingQuestion,
} from "@/lib/surgical-sales/stageMappingOperationalGroups";
import {
  discoveryMappingCategoryOrderForFocusStage,
  isDiscoveryMappingPrimaryCategory,
} from "@/lib/surgical-sales/discoveryMappingFocusStage";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  DISCOVERY_MAPPING_INTELLIGENCE_CATEGORY_UI,
  type DiscoveryMappingIntelligenceCategory,
} from "@/lib/surgical-sales/discoveryMappingIntelligenceCategory";
import type { DiscoveryMappingFocusStageId } from "@/lib/surgical-sales/discoveryMappingFocusStage";
import {
  buildIntelligenceCaptureCategoryDashboard,
  pickSuggestedIntelligenceCaptureCategory,
  type IntelligenceCaptureCategoryCard,
} from "@/lib/surgical-sales/buildIntelligenceCaptureCategoryDashboard";
import {
  groupStageMappingQuestionsByCaptureCategory,
  INTELLIGENCE_CAPTURE_DASHBOARD_UI,
  intelligenceCaptureCategoryDef,
  intelligenceCaptureCategoryForSignal,
  type IntelligenceCaptureCategoryId,
} from "@/lib/surgical-sales/intelligenceCaptureCategories";
import { INTELLIGENCE_CAPTURE_CATEGORY_STATUS_UI } from "@/lib/surgical-sales/intelligenceCapture/resolveIntelligenceCaptureCategoryStatus";
import {
  buildIntelligenceCaptureCategoryWorkspace,
  INTELLIGENCE_CAPTURE_WORKSPACE_UI,
} from "@/lib/surgical-sales/intelligenceCapture/buildIntelligenceCaptureCategoryWorkspace";
import { SCHEDULING_FACILITY_DRAFT_KEY } from "@/lib/surgical-sales/schedulingOwnershipFields";
import { buildDiscoveryAnswerImpact } from "@/lib/surgical-sales/discoveryLiveUpdate";
import type { RapidDiscoverySupportContactDraft } from "@/lib/surgical-sales/rapidDiscoverySupportContact";
import { providerStageMappingCss } from "./providerStageMappingCss";
import { providerQuickSignalCaptureCss } from "./providerQuickSignalCaptureCss";
import { rapidDiscoverySupportContactCss } from "./rapidDiscoverySupportContactCss";
import {
  createStageMappingContactDraft,
  StageMappingQuestionCard,
} from "./StageMappingQuestionCard";
import { IntelligenceCaptureMethodPicker } from "./IntelligenceCaptureMethodPicker";
import { IntelligenceCaptureMethodView } from "./IntelligenceCaptureMethodView";
import { IntelligenceCaptureFirstPanel } from "./IntelligenceCaptureFirstPanel";
import {
  INTELLIGENCE_CAPTURE_FIRST_UI,
  INTELLIGENCE_CAPTURE_FLOW_UI,
  intelligenceCaptureMethodDef,
  type IntelligenceCaptureMethodId,
} from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureMethods";
import type { DiscoveryMappingSuggestedContactLead } from "@/lib/surgical-sales/buildDiscoveryMappingCardIntelligence";
import { findContactPoolMatchByName } from "@/lib/surgical-sales/buildDiscoveryMappingCardIntelligence";
import { CredentialingStatusDrawer } from "./CredentialingStatusDrawer";
import {
  contactWithCredentialingMappingMetadata,
  PROVIDER_CREDENTIALING_METADATA_KEYS,
  providerCredentialingFromContact,
  providerCredentialingMappingMetadataFromCredentialing,
} from "@/lib/surgical-sales/providerCredentialing";
import { userFacingError } from "@/lib/errors/userFacingError";

function StageMappingQuestionList({
  questions,
  dimmed,
  activeSignalId,
  busySignalId,
  selectedChoiceBySignal,
  metadataBySignal,
  notesBySignal,
  contact,
  contactDraftBySignal,
  facilityContactDraftBySignal,
  impactBySignal,
  submitErrorBySignal,
  pool,
  organizationId,
  organizationName,
  providerId,
  onChoiceSelect,
  onChoiceDeselect,
  onMetadataChange,
  onNotesChange,
  onContactDraftChange,
  onFacilityContactDraftChange,
  onSubmitContact,
  onSubmitChoice,
  onContactIntent,
  onOpenCredentialingWorkflow,
  contactOptInBySignal,
  forceExpandSignalId,
  forceExpandNonce,
  evidenceConfidenceBySignal,
  onEvidenceConfidenceChange,
  evidenceBySignal,
  onEvidenceTextChange,
  onSuggestedContactLead,
  dismissedSuggestedContactLeads,
  contactSearchPrefillBySignal,
  highlightSignalId,
}: {
  questions: StageMappingQuestion[];
  dimmed?: boolean;
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
}) {
  return (
    <>
      {questions.map((question) => (
        <StageMappingQuestionCard
          key={question.signalId}
          question={question}
          contact={contact}
          active={activeSignalId === question.signalId}
          busy={busySignalId === question.signalId}
          selectedChoice={selectedChoiceBySignal[question.signalId] ?? null}
          metadata={metadataBySignal[question.signalId] ?? {}}
          notes={notesBySignal[question.signalId] ?? ""}
          contactDraft={contactDraftBySignal[question.signalId] ?? null}
          facilityContactDraft={
            question.signalId === "scheduling_owner"
              ? facilityContactDraftBySignal[SCHEDULING_FACILITY_DRAFT_KEY] ?? null
              : null
          }
          contactPool={pool}
          organizationId={organizationId}
          organizationName={organizationName}
          providerId={providerId}
          lastImpactLine={impactBySignal[question.signalId] ?? null}
          submitError={submitErrorBySignal[question.signalId] ?? null}
          dimmed={dimmed}
          onChoiceSelect={(choice) => onChoiceSelect(question, choice)}
          onChoiceDeselect={() => onChoiceDeselect(question)}
          onMetadataChange={(key, value) => onMetadataChange(question.signalId, key, value)}
          onNotesChange={(value) => onNotesChange(question.signalId, value)}
          onContactDraftChange={(draft) => onContactDraftChange(question.signalId, draft)}
          onFacilityContactDraftChange={(draft) =>
            onFacilityContactDraftChange(SCHEDULING_FACILITY_DRAFT_KEY, draft)
          }
          onSubmitContact={() => onSubmitContact(question)}
          onSubmitChoice={(choice, overrides) => onSubmitChoice(question, choice, overrides)}
          contactOptIn={
            question.signalId in contactOptInBySignal
              ? contactOptInBySignal[question.signalId]!
              : null
          }
          onContactIntent={(intent) => onContactIntent(question, intent)}
          onOpenCredentialingWorkflow={
            question.signalId === "facility_vendor_pathway" ? onOpenCredentialingWorkflow : undefined
          }
          forceExpandTick={forceExpandSignalId === question.signalId ? forceExpandNonce : 0}
          evidenceConfidence={evidenceConfidenceBySignal[question.signalId] ?? null}
          onEvidenceConfidenceChange={(confidence) =>
            onEvidenceConfidenceChange(question.signalId, confidence)
          }
          evidenceText={evidenceBySignal[question.signalId] ?? ""}
          onEvidenceTextChange={(value) => onEvidenceTextChange(question.signalId, value)}
          highlighted={highlightSignalId === question.signalId}
          dismissedSuggestedContactLead={Boolean(dismissedSuggestedContactLeads[question.signalId])}
          contactSearchPrefill={contactSearchPrefillBySignal[question.signalId] ?? null}
          onSuggestedContactLead={(action, lead) => onSuggestedContactLead(question, action, lead)}
        />
      ))}
    </>
  );
}

function StageMappingIntelligenceCategorySection({
  category,
  openQuestions,
  laterStageQuestions,
  confirmedQuestions,
  isPrimary,
  defaultCollapsed,
  activeSignalId,
  busySignalId,
  selectedChoiceBySignal,
  metadataBySignal,
  notesBySignal,
  contact,
  contactDraftBySignal,
  facilityContactDraftBySignal,
  impactBySignal,
  submitErrorBySignal,
  pool,
  organizationId,
  organizationName,
  providerId,
  onChoiceSelect,
  onChoiceDeselect,
  onMetadataChange,
  onNotesChange,
  onContactDraftChange,
  onFacilityContactDraftChange,
  onSubmitContact,
  onSubmitChoice,
  onContactIntent,
  onOpenCredentialingWorkflow,
  contactOptInBySignal,
  forceExpandSignalId,
  forceExpandNonce,
  evidenceConfidenceBySignal,
  onEvidenceConfidenceChange,
  evidenceBySignal,
  onEvidenceTextChange,
  onSuggestedContactLead,
  dismissedSuggestedContactLeads,
  contactSearchPrefillBySignal,
  highlightSignalId,
}: {
  category: DiscoveryMappingIntelligenceCategory;
  openQuestions: StageMappingQuestion[];
  laterStageQuestions: StageMappingQuestion[];
  confirmedQuestions: StageMappingQuestion[];
  isPrimary: boolean;
  defaultCollapsed: boolean;
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
}) {
  const categoryUi = DISCOVERY_MAPPING_INTELLIGENCE_CATEGORY_UI[category];
  const openCount = openQuestions.length + laterStageQuestions.length;
  const hasContent = openCount > 0 || confirmedQuestions.length > 0;
  if (!hasContent) return null;

  const listProps = {
    activeSignalId,
    busySignalId,
    selectedChoiceBySignal,
    metadataBySignal,
    notesBySignal,
    contact,
    contactDraftBySignal,
    facilityContactDraftBySignal,
    impactBySignal,
    submitErrorBySignal,
    pool,
    organizationId,
    organizationName,
    providerId,
    onChoiceSelect,
    onChoiceDeselect,
    onMetadataChange,
    onNotesChange,
    onContactDraftChange,
    onFacilityContactDraftChange,
    onSubmitContact,
    onSubmitChoice,
    onContactIntent,
    onOpenCredentialingWorkflow,
    contactOptInBySignal,
    forceExpandSignalId,
    forceExpandNonce,
    evidenceConfidenceBySignal,
    onEvidenceConfidenceChange,
    evidenceBySignal,
    onEvidenceTextChange,
    onSuggestedContactLead,
    dismissedSuggestedContactLeads,
    contactSearchPrefillBySignal,
    highlightSignalId,
  };

  const sectionBody = (
    <>
      <div className="stage-mapping-questions">
        <StageMappingQuestionList questions={openQuestions} {...listProps} />
      </div>
      {laterStageQuestions.length > 0 ? (
        <details className="stage-mapping-later-details">
          <summary className="stage-mapping-later-toggle">
            <span className="stage-mapping-later-toggle-label">Later in this category</span>
            <span className="stage-mapping-later-toggle-meta">
              {laterStageQuestions.length} open · {STAGE_MAPPING_UI.laterStageToggleHint}
            </span>
          </summary>
          <div className="stage-mapping-questions stage-mapping-questions--deferred">
            <StageMappingQuestionList questions={laterStageQuestions} dimmed {...listProps} />
          </div>
        </details>
      ) : null}
      {confirmedQuestions.length > 0 ? (
        <details className="stage-mapping-later-details stage-mapping-category-confirmed">
          <summary className="stage-mapping-section-head stage-mapping-section-head--collapsible">
            <div className="stage-mapping-section-head-main">
              <h4 className="stage-mapping-category-confirmed-title">
                {STAGE_MAPPING_UI.confirmedIntelligence}
              </h4>
              <p className="stage-mapping-section-defer-note">
                {STAGE_MAPPING_UI.confirmedIntelligenceNote}
              </p>
            </div>
            <span className="stage-mapping-section-meta">{confirmedQuestions.length} confirmed</span>
          </summary>
          <div className="stage-mapping-questions stage-mapping-questions--deferred">
            <StageMappingQuestionList questions={confirmedQuestions} dimmed {...listProps} />
          </div>
        </details>
      ) : null}
    </>
  );

  if (defaultCollapsed && !isPrimary) {
    return (
      <details className={`stage-mapping-category stage-mapping-category--collapsed stage-mapping-category--${category}`} open={false}>
        <summary className="stage-mapping-category-head stage-mapping-category-head--collapsible">
          <div className="stage-mapping-category-head-main">
            <h3 className="stage-mapping-category-title">{categoryUi.title}</h3>
            <p className="stage-mapping-category-subtitle">
              {categoryUi.subtitle} — available after primary focus is mapped
            </p>
          </div>
          <span className="stage-mapping-category-meta">
            {openCount} open · {confirmedQuestions.length} confirmed
          </span>
        </summary>
        <div className={`stage-mapping-category-body stage-mapping-category--${category}`}>
          {sectionBody}
        </div>
      </details>
    );
  }

  return (
    <section
      className={`stage-mapping-category stage-mapping-category--${category}${
        isPrimary ? " stage-mapping-category--primary" : ""
      }`}
    >
      <div className="stage-mapping-category-head">
        <div className="stage-mapping-category-head-main">
          <h3 className="stage-mapping-category-title">{categoryUi.title}</h3>
          <p className="stage-mapping-category-subtitle">
            {categoryUi.subtitle} — {categoryUi.purpose}
          </p>
          {isPrimary ? (
            <p className="stage-mapping-category-examples">{categoryUi.examples.join(" · ")}</p>
          ) : null}
        </div>
        <span className="stage-mapping-category-meta">
          {openCount} open · {confirmedQuestions.length} confirmed
        </span>
      </div>
      {sectionBody}
    </section>
  );
}

function IntelligenceCaptureCategoryDashboard({
  cards,
  suggestedCategoryId,
  onSelectCategory,
}: {
  cards: IntelligenceCaptureCategoryCard[];
  suggestedCategoryId: IntelligenceCaptureCategoryId | null;
  onSelectCategory: (categoryId: IntelligenceCaptureCategoryId) => void;
}) {
  return (
    <section className="intel-capture-dashboard" aria-label="Intelligence categories">
      <div className="intel-capture-dashboard-grid">
        {cards.map((card) => {
          const statusUi = INTELLIGENCE_CAPTURE_CATEGORY_STATUS_UI[card.status];
          return (
            <button
              key={card.id}
              type="button"
              className={`intel-capture-category-card intel-capture-category-card--${statusUi.cssModifier}${
                suggestedCategoryId === card.id ? " intel-capture-category-card--suggested" : ""
              }`}
              onClick={() => onSelectCategory(card.id)}
            >
              <div className="intel-capture-category-card-inner">
                <div className="intel-capture-category-card-head">
                  <div className="intel-capture-category-card-title-row">
                    <h3 className="intel-capture-category-card-title">{card.name}</h3>
                    <span
                      className={`intel-capture-category-card-status intel-capture-category-card-status--${statusUi.cssModifier}`}
                    >
                      {statusUi.label}
                    </span>
                  </div>
                </div>
                <p className="intel-capture-category-card-desc">{card.description}</p>
                <div className="intel-capture-category-card-stats">
                  <span className="intel-capture-category-card-stat">{card.findingsLabel}</span>
                  <span
                    className={`intel-capture-category-card-stat${
                      card.openCount > 0 ? " intel-capture-category-card-stat--open" : ""
                    }`}
                  >
                    {card.openItemsLabel}
                  </span>
                  <span className="intel-capture-category-card-stat">{card.lastUpdatedLabel}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function StageMappingObservationPlanningPanel({
  items,
  observationCaseHref,
}: {
  items: string[];
  observationCaseHref: string | null;
}) {
  if (!items.length) return null;

  return (
    <section className="stage-mapping-focus-planning" aria-label="Observation planning">
      <h3 className="stage-mapping-focus-planning-title">Observation planning</h3>
      <p className="stage-mapping-focus-planning-note">
        Prepare what to learn in the OR before the case — product fit signals stay draft until
        after observation.
      </p>
      <ul className="stage-mapping-focus-planning-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {observationCaseHref ? (
        <a className="stage-mapping-focus-planning-link" href={observationCaseHref}>
          Open observation case briefing
        </a>
      ) : (
        <p className="stage-mapping-focus-planning-note stage-mapping-focus-planning-note--muted">
          Schedule or open an observation case to capture objectives and learning questions.
        </p>
      )}
    </section>
  );
}

function StageMappingIntelligenceCategories({
  categoryGroups,
  focusStage,
  activeSignalId,
  busySignalId,
  selectedChoiceBySignal,
  metadataBySignal,
  notesBySignal,
  contact,
  contactDraftBySignal,
  facilityContactDraftBySignal,
  impactBySignal,
  submitErrorBySignal,
  pool,
  organizationId,
  organizationName,
  providerId,
  onChoiceSelect,
  onChoiceDeselect,
  onMetadataChange,
  onNotesChange,
  onContactDraftChange,
  onFacilityContactDraftChange,
  onSubmitContact,
  onSubmitChoice,
  onContactIntent,
  onOpenCredentialingWorkflow,
  contactOptInBySignal,
  forceExpandSignalId,
  forceExpandNonce,
  evidenceConfidenceBySignal,
  onEvidenceConfidenceChange,
  evidenceBySignal,
  onEvidenceTextChange,
  onSuggestedContactLead,
  dismissedSuggestedContactLeads,
  contactSearchPrefillBySignal,
  highlightSignalId,
}: {
  categoryGroups: ReturnType<typeof groupStageMappingQuestionsByIntelligenceCategory>;
  focusStage: DiscoveryMappingFocusStageId;
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
}) {
  const sharedProps = {
    activeSignalId,
    busySignalId,
    selectedChoiceBySignal,
    metadataBySignal,
    notesBySignal,
    contact,
    contactDraftBySignal,
    facilityContactDraftBySignal,
    impactBySignal,
    submitErrorBySignal,
    pool,
    organizationId,
    organizationName,
    providerId,
    onChoiceSelect,
    onChoiceDeselect,
    onMetadataChange,
    onNotesChange,
    onContactDraftChange,
    onFacilityContactDraftChange,
    onSubmitContact,
    onSubmitChoice,
    onContactIntent,
    onOpenCredentialingWorkflow,
    contactOptInBySignal,
    forceExpandSignalId,
    forceExpandNonce,
    evidenceConfidenceBySignal,
    onEvidenceConfidenceChange,
    evidenceBySignal,
    onEvidenceTextChange,
    onSuggestedContactLead,
    dismissedSuggestedContactLeads,
    contactSearchPrefillBySignal,
    highlightSignalId,
  };

  const categoryOrder = discoveryMappingCategoryOrderForFocusStage(focusStage);

  return (
    <>
      {categoryOrder.map((category) => {
        const slice = categoryGroups[category];
        const isPrimary = isDiscoveryMappingPrimaryCategory(focusStage, category);
        return (
          <StageMappingIntelligenceCategorySection
            key={category}
            category={category}
            openQuestions={slice.open}
            laterStageQuestions={slice.laterStage}
            confirmedQuestions={slice.confirmed}
            isPrimary={isPrimary}
            defaultCollapsed={!isPrimary}
            {...sharedProps}
          />
        );
      })}
    </>
  );
}

export function ProviderStageMappingMode({
  open,
  view,
  contact,
  planning,
  providerId,
  organizationId = null,
  organizationName,
  relatedContacts = [],
  contactPool = [],
  engagements = [],
  cases = [],
  initialGroupId = null,
  initialSignalId = null,
  onClose,
  onProviderUpdated,
  onLogFieldIntel,
}: {
  open: boolean;
  view: DiscoveryIntelligenceGroupsView;
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  providerId: string;
  organizationId?: string | null;
  organizationName?: string | null;
  relatedContacts?: Record<string, unknown>[];
  contactPool?: Record<string, unknown>[];
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  initialGroupId?: DiscoveryIntelligenceGroupId | null;
  initialSignalId?: string | null;
  onClose: () => void;
  onProviderUpdated?: (provider: Record<string, unknown>) => void | Promise<void>;
  onLogFieldIntel: () => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [busySignalId, setBusySignalId] = React.useState<string | null>(null);
  const [resolvedThisSession, setResolvedThisSession] = React.useState(0);
  const [notesBySignal, setNotesBySignal] = React.useState<Record<string, string>>({});
  const [metadataBySignal, setMetadataBySignal] = React.useState<Record<string, Record<string, string>>>({});
  const [selectedChoiceBySignal, setSelectedChoiceBySignal] = React.useState<Record<string, string>>({});
  const [contactDraftBySignal, setContactDraftBySignal] = React.useState<
    Record<string, RapidDiscoverySupportContactDraft>
  >({});
  const [contactOptInBySignal, setContactOptInBySignal] = React.useState<Record<string, boolean>>({});
  const [evidenceConfidenceBySignal, setEvidenceConfidenceBySignal] = React.useState<
    Record<string, DiscoveryMappingEvidenceConfidence>
  >({});
  const [evidenceBySignal, setEvidenceBySignal] = React.useState<Record<string, string>>({});
  const [facilityContactDraftBySignal, setFacilityContactDraftBySignal] = React.useState<
    Record<string, RapidDiscoverySupportContactDraft>
  >({});
  const [impactBySignal, setImpactBySignal] = React.useState<Record<string, string>>({});
  const [submitErrorBySignal, setSubmitErrorBySignal] = React.useState<Record<string, string>>({});
  const [activeSignalId, setActiveSignalId] = React.useState<string | null>(null);
  const [credentialingDrawerOpen, setCredentialingDrawerOpen] = React.useState(false);
  const [localContact, setLocalContact] = React.useState<Record<string, unknown> | null>(null);
  const [forceExpandSignalId, setForceExpandSignalId] = React.useState<string | null>(null);
  const [forceExpandNonce, setForceExpandNonce] = React.useState(0);
  const [dismissedSuggestedContactLeads, setDismissedSuggestedContactLeads] = React.useState<
    Record<string, boolean>
  >({});
  const [contactSearchPrefillBySignal, setContactSearchPrefillBySignal] = React.useState<
    Record<string, string>
  >({});
  const [highlightSignalId, setHighlightSignalId] = React.useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] =
    React.useState<IntelligenceCaptureCategoryId | null>(null);
  const [activeCaptureMethod, setActiveCaptureMethod] =
    React.useState<IntelligenceCaptureMethodId | null>(null);
  const [categoryReviewMode, setCategoryReviewMode] = React.useState(false);
  const pendingScrollRef = React.useRef(false);
  const bodyRef = React.useRef<HTMLDivElement>(null);

  const effectiveContact = localContact ?? contact;

  const pool = React.useMemo(() => {
    const seen = new Set<string>();
    const merged: Record<string, unknown>[] = [];
    for (const c of [...relatedContacts, ...contactPool]) {
      const id = String(c.id ?? "");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      merged.push(c);
    }
    return merged;
  }, [contactPool, relatedContacts]);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    setResolvedThisSession(0);
    setNotesBySignal({});
    setMetadataBySignal({});
    setSelectedChoiceBySignal({});
    setContactDraftBySignal({});
    setContactOptInBySignal({});
    setEvidenceConfidenceBySignal({});
    setEvidenceBySignal({});
    setFacilityContactDraftBySignal({});
    setImpactBySignal({});
    setSubmitErrorBySignal({});
    setActiveSignalId(null);
    setLocalContact(null);
    setCredentialingDrawerOpen(false);
    setForceExpandSignalId(null);
    setForceExpandNonce(0);
    setDismissedSuggestedContactLeads({});
    setContactSearchPrefillBySignal({});
    setHighlightSignalId(null);
    setActiveCategoryId(null);
    setActiveCaptureMethod(null);
    setCategoryReviewMode(false);
  }, [open, initialGroupId, initialSignalId]);

  React.useEffect(() => {
    if (!open) return;
    const cred = providerCredentialingFromContact(contact);
    const seeded = providerCredentialingMappingMetadataFromCredentialing(cred);
    setMetadataBySignal((prev) => {
      const existing = prev.facility_vendor_pathway;
      if (existing?.platform_name?.trim() || existing?.credentialing_contact?.trim()) {
        return prev;
      }
      return { ...prev, facility_vendor_pathway: { ...seeded, ...existing } };
    });
  }, [open, contact]);

  const session = React.useMemo(
    () =>
      buildStageMappingSession(view, {
        contact: effectiveContact,
        engagements,
        cases,
      }),
    [view, effectiveContact, engagements, cases],
  );

  React.useEffect(() => {
    if (!open) return;
    setEvidenceConfidenceBySignal(
      seedStageMappingEvidenceConfidence({
        contact,
        signalIds: session.operationalQuestions.map((q) => q.signalId as StageMappingSignalId),
        resolvedBySignal: Object.fromEntries(
          session.operationalQuestions.map((q) => [q.signalId, q.resolved]),
        ) as Partial<Record<StageMappingSignalId, boolean>>,
      }),
    );
  }, [open, contact, session.operationalQuestions]);
  const allQuestions = React.useMemo(
    () => session.operationalQuestions,
    [session.operationalQuestions],
  );
  const captureCategoryGroups = React.useMemo(
    () =>
      groupStageMappingQuestionsByCaptureCategory(
        allQuestions,
        view.pathwayStageId,
        effectiveContact,
      ),
    [allQuestions, effectiveContact, view.pathwayStageId],
  );
  const captureCategoryCards = React.useMemo(
    () =>
      buildIntelligenceCaptureCategoryDashboard({
        questions: allQuestions,
        contact: effectiveContact,
        pathwayStageId: view.pathwayStageId,
      }),
    [allQuestions, effectiveContact, view.pathwayStageId],
  );
  const suggestedCaptureCategory = React.useMemo(
    () => pickSuggestedIntelligenceCaptureCategory(captureCategoryCards),
    [captureCategoryCards],
  );
  const nextOpen = React.useMemo(
    () => pickNextOpenStageMappingQuestion(allQuestions, session.focusStage),
    [allQuestions, session.focusStage],
  );

  const activeObservationCaseHref = React.useMemo(() => {
    const activeCase = cases.find((row) => {
      if (String(row.case_type ?? "").toLowerCase() !== "observation") return false;
      const status = String(row.status ?? "").toLowerCase();
      return !["completed", "done", "closed", "cancelled", "canceled"].includes(status);
    });
    const caseId = String(activeCase?.id ?? activeCase?.case_id ?? "").trim();
    return caseId ? `/portal/sales/cases/${caseId}` : null;
  }, [cases]);

  const focusFirstActionable = React.useCallback((signalId: string) => {
    const root = document.getElementById(`stage-mapping-q-${signalId}`);
    if (!root) return;
    const target = root.querySelector<HTMLElement>(
      "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
    );
    target?.focus();
  }, []);

  const scrollToSignal = React.useCallback((signalId: string, block: ScrollLogicalPosition = "start") => {
    setActiveSignalId(signalId);
    setForceExpandSignalId(signalId);
    setForceExpandNonce((n) => n + 1);
    requestAnimationFrame(() => {
      document.getElementById(`stage-mapping-q-${signalId}`)?.scrollIntoView({
        behavior: "smooth",
        block,
      });
      requestAnimationFrame(() => focusFirstActionable(signalId));
    });
  }, [focusFirstActionable]);

  const scrollMappingBodyToTop = React.useCallback(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  React.useEffect(() => {
    if (!open) return;

    if (initialSignalId) {
      const categoryId = intelligenceCaptureCategoryForSignal(
        initialSignalId as StageMappingSignalId,
      );
      if (categoryId) {
        setActiveCategoryId(categoryId);
        setActiveCaptureMethod("guided_entry");
        setCategoryReviewMode(false);
      }
      setHighlightSignalId(initialSignalId);
      scrollToSignal(initialSignalId, "start");
      const timer = window.setTimeout(() => setHighlightSignalId(null), 3200);
      return () => window.clearTimeout(timer);
    }

    if (initialGroupId) {
      const section = session.sections.find((s) => s.id === initialGroupId);
      const target =
        section?.questions.find((q) => !q.resolved) ?? section?.questions[0] ?? null;
      if (target) {
        const categoryId = intelligenceCaptureCategoryForSignal(
          target.signalId as StageMappingSignalId,
        );
        if (categoryId) {
          setActiveCategoryId(categoryId);
          setActiveCaptureMethod("guided_entry");
          setCategoryReviewMode(false);
        }
        scrollToSignal(target.signalId, "start");
        return;
      }
    }

    requestAnimationFrame(() => scrollMappingBodyToTop());
  }, [
    open,
    initialGroupId,
    initialSignalId,
    scrollMappingBodyToTop,
    scrollToSignal,
    session.sections,
  ]);

  React.useEffect(() => {
    if (!open || activeCategoryId) return;
    requestAnimationFrame(() => scrollMappingBodyToTop());
  }, [open, activeCategoryId, scrollMappingBodyToTop]);

  React.useEffect(() => {
    if (!open || !activeCategoryId) return;
    if (!activeCaptureMethod && !categoryReviewMode) return;
    if (activeCaptureMethod && activeCaptureMethod !== "guided_entry") return;

    if (initialSignalId) return;

    const slice = captureCategoryGroups[activeCategoryId];
    const target =
      slice.open[0] ?? slice.laterStage[0] ?? slice.confirmed[0] ?? nextOpen ?? null;
    if (target && target.signalId) {
      setActiveSignalId(target.signalId);
      requestAnimationFrame(() => scrollToSignal(target.signalId, "start"));
      return;
    }

    if (nextOpen && intelligenceCaptureCategoryForSignal(nextOpen.signalId as StageMappingSignalId) === activeCategoryId) {
      setActiveSignalId(nextOpen.signalId);
      requestAnimationFrame(() => scrollToSignal(nextOpen.signalId, "start"));
    }
  }, [
    open,
    activeCategoryId,
    activeCaptureMethod,
    categoryReviewMode,
    captureCategoryGroups,
    initialSignalId,
    nextOpen,
    scrollToSignal,
  ]);

  React.useEffect(() => {
    if (!pendingScrollRef.current || !nextOpen) return;
    pendingScrollRef.current = false;
    scrollToSignal(nextOpen.signalId);
  }, [nextOpen, scrollToSignal]);

  const recordImpact = React.useCallback(
    async (
      question: StageMappingQuestion,
      provider: Record<string, unknown>,
      valueLabel: string,
      beforeContact: Record<string, unknown>,
    ) => {
      const impact = buildDiscoveryAnswerImpact({
        dbKey: question.dbKey,
        value: valueLabel,
        beforeContact,
        afterContact: provider,
        planning,
      });
      if (impact) {
        setImpactBySignal((prev) => ({
          ...prev,
          [question.signalId]: impact.feedbackLine,
        }));
      }
      if (!question.resolved) {
        setResolvedThisSession((n) => n + 1);
      }
      pendingScrollRef.current = true;
      await onProviderUpdated?.(provider);
    },
    [onProviderUpdated, planning],
  );

  const handleSubmitChoice = React.useCallback(
    async (
      question: StageMappingQuestion,
      choice: string,
      overrides?: { evidenceConfidence?: DiscoveryMappingEvidenceConfidence },
    ) => {
      setBusySignalId(question.signalId);
      const beforeContact = effectiveContact;
      const notes = notesBySignal[question.signalId] ?? "";
      const evidenceText = evidenceBySignal[question.signalId] ?? "";
      const metadata = {
        ...(metadataBySignal[question.signalId] ?? {}),
        ...(question.signalId === "facility_vendor_pathway"
          ? { [PROVIDER_CREDENTIALING_METADATA_KEYS.pathwayChoice]: choice }
          : {}),
      };
      const label =
        question.answerSpec.choices.find((c) => c.value === choice)?.label ?? choice;
      const evidenceConfidence =
        overrides?.evidenceConfidence ??
        evidenceConfidenceBySignal[question.signalId] ??
        "mentioned_once";
      if (overrides?.evidenceConfidence) {
        setEvidenceConfidenceBySignal((prev) => ({
          ...prev,
          [question.signalId]: overrides.evidenceConfidence!,
        }));
      }

      try {
        setSubmitErrorBySignal((prev) => {
          const next = { ...prev };
          delete next[question.signalId];
          return next;
        });
        const provider = await applyStageMappingAnswer({
          providerId,
          signalId: question.signalId,
          dbKey: question.dbKey,
          contact: beforeContact,
          answer: { choice, notes, metadata, evidenceConfidence, evidenceText },
          providerContactDraft:
            question.signalId === "scheduling_owner"
              ? contactDraftBySignal[question.signalId] ?? null
              : undefined,
          facilityContactDraft:
            question.signalId === "scheduling_owner"
              ? facilityContactDraftBySignal[SCHEDULING_FACILITY_DRAFT_KEY] ?? null
              : undefined,
        });
        setSelectedChoiceBySignal((prev) => ({ ...prev, [question.signalId]: choice }));
        setContactOptInBySignal((prev) => {
          const next = { ...prev };
          delete next[question.signalId];
          return next;
        });
        setContactDraftBySignal((prev) => {
          const next = { ...prev };
          delete next[question.signalId];
          return next;
        });
        if (question.signalId === "scheduling_owner") {
          setFacilityContactDraftBySignal((prev) => {
            const next = { ...prev };
            delete next[SCHEDULING_FACILITY_DRAFT_KEY];
            return next;
          });
        }
        setLocalContact(provider);
        await recordImpact(question, provider, notes || label, beforeContact);
      } catch (err) {
        pendingScrollRef.current = false;
        setSubmitErrorBySignal((prev) => ({
          ...prev,
          [question.signalId]:
            userFacingError(err, "Could not save that answer."),
        }));
      } finally {
        setBusySignalId(null);
      }
    },
    [
      effectiveContact,
      contactDraftBySignal,
      facilityContactDraftBySignal,
      metadataBySignal,
      notesBySignal,
      evidenceConfidenceBySignal,
      evidenceBySignal,
      providerId,
      recordImpact,
    ],
  );

  const handleChoiceSelect = React.useCallback(
    (question: StageMappingQuestion, choice: string) => {
      setSelectedChoiceBySignal((prev) => ({ ...prev, [question.signalId]: choice }));
      setEvidenceConfidenceBySignal((prev) => ({
        ...prev,
        [question.signalId]:
          prev[question.signalId] ??
          (choice === "unknown" ? "mentioned_once" : "discussed"),
      }));
      setActiveSignalId(question.signalId);

      if (question.signalId === "facility_vendor_pathway") {
        setMetadataBySignal((prev) => ({
          ...prev,
          [question.signalId]: {
            ...(prev[question.signalId] ?? {}),
            [PROVIDER_CREDENTIALING_METADATA_KEYS.pathwayChoice]: choice,
          },
        }));
      }

      if (question.signalId === "scheduling_owner") {
        setContactDraftBySignal((prev) => {
          const next = { ...prev };
          delete next[question.signalId];
          return next;
        });
        setFacilityContactDraftBySignal({});
        return;
      }

      setContactOptInBySignal((prev) => {
        const next = { ...prev };
        delete next[question.signalId];
        return next;
      });
      setContactDraftBySignal((prev) => {
        const next = { ...prev };
        delete next[question.signalId];
        return next;
      });
    },
    [],
  );

  const handleContactIntent = React.useCallback(
    (question: StageMappingQuestion, intent: "select" | "create" | "skip") => {
      if (intent === "skip") {
        setContactOptInBySignal((prev) => ({ ...prev, [question.signalId]: false }));
        setContactDraftBySignal((prev) => {
          const next = { ...prev };
          delete next[question.signalId];
          return next;
        });
        return;
      }

      setContactOptInBySignal((prev) => ({ ...prev, [question.signalId]: true }));

      if (
        stageMappingOffersOptionalContact(question.answerSpec) &&
        stageMappingSignalAcceptsContactAnswer(question.signalId)
      ) {
        setContactDraftBySignal((prev) => ({
          ...prev,
          [question.signalId]: createStageMappingContactDraft({
            signalId: question.signalId as DiscoverySupportContactSignalId,
            organizationId,
            mode: intent,
          }),
        }));
      }
    },
    [organizationId],
  );

  const handleSuggestedContactLead = React.useCallback(
    (
      question: StageMappingQuestion,
      action: "select" | "create" | "dismiss",
      lead: DiscoveryMappingSuggestedContactLead,
    ) => {
      if (action === "dismiss") {
        setDismissedSuggestedContactLeads((prev) => ({ ...prev, [question.signalId]: true }));
        return;
      }

      setContactSearchPrefillBySignal((prev) => ({ ...prev, [question.signalId]: lead.name }));

      if (question.signalId === "scheduling_owner") {
        return;
      }

      const poolMatch = findContactPoolMatchByName(pool, lead.name);
      setContactOptInBySignal((prev) => ({ ...prev, [question.signalId]: true }));

      if (
        stageMappingOffersOptionalContact(question.answerSpec) &&
        stageMappingSignalAcceptsContactAnswer(question.signalId)
      ) {
        setContactDraftBySignal((prev) => ({
          ...prev,
          [question.signalId]: createStageMappingContactDraft({
            signalId: question.signalId as DiscoverySupportContactSignalId,
            organizationId,
            mode: action === "create" ? "create" : "select",
            prefillName: action === "create" ? lead.name : null,
            selectedContactId: poolMatch ? String(poolMatch.id ?? "") : null,
          }),
        }));
      }
    },
    [organizationId, pool],
  );

  const handleChoiceDeselect = React.useCallback((question: StageMappingQuestion) => {
    setSelectedChoiceBySignal((prev) => {
      const next = { ...prev };
      delete next[question.signalId];
      return next;
    });
    setContactDraftBySignal((prev) => {
      const next = { ...prev };
      delete next[question.signalId];
      return next;
    });
    setContactOptInBySignal((prev) => {
      const next = { ...prev };
      delete next[question.signalId];
      return next;
    });
    setFacilityContactDraftBySignal((prev) => {
      const next = { ...prev };
      delete next[SCHEDULING_FACILITY_DRAFT_KEY];
      return next;
    });
  }, []);

  const handleSubmitContact = React.useCallback(
    async (question: StageMappingQuestion) => {
      const choice = selectedChoiceBySignal[question.signalId];
      const draft = contactDraftBySignal[question.signalId];
      if (!choice || !draft || !stageMappingSignalAcceptsContactAnswer(question.signalId)) return;

      setBusySignalId(question.signalId);
      const beforeContact = effectiveContact;
      const metadata = metadataBySignal[question.signalId];

      try {
        setSubmitErrorBySignal((prev) => {
          const next = { ...prev };
          delete next[question.signalId];
          return next;
        });
        const provider = await applyStageMappingContactAnswer({
          providerId,
          signalId: question.signalId,
          dbKey: question.dbKey,
          draft,
          choice,
          metadata,
        });
        const label =
          question.answerSpec.choices.find((c) => c.value === choice)?.label ?? "Contact linked";
        setContactOptInBySignal((prev) => {
          const next = { ...prev };
          delete next[question.signalId];
          return next;
        });
        setContactDraftBySignal((prev) => {
          const next = { ...prev };
          delete next[question.signalId];
          return next;
        });
        setLocalContact(provider);
        await recordImpact(question, provider, label, beforeContact);
      } catch (err) {
        pendingScrollRef.current = false;
        setSubmitErrorBySignal((prev) => ({
          ...prev,
          [question.signalId]:
            userFacingError(err, "Could not save that answer."),
        }));
      } finally {
        setBusySignalId(null);
      }
    },
    [effectiveContact, contactDraftBySignal, metadataBySignal, providerId, recordImpact, selectedChoiceBySignal],
  );

  const credentialingDrawerContact = React.useMemo(
    () =>
      contactWithCredentialingMappingMetadata(
        effectiveContact,
        metadataBySignal.facility_vendor_pathway,
      ),
    [effectiveContact, metadataBySignal.facility_vendor_pathway],
  );

  const handleProviderUpdated = React.useCallback(
    async (provider: Record<string, unknown>) => {
      setLocalContact(provider);
      await onProviderUpdated?.(provider);
    },
    [onProviderUpdated],
  );

  const activeCategoryWorkspace = React.useMemo(() => {
    if (!activeCategoryId) return null;
    return buildIntelligenceCaptureCategoryWorkspace({
      categoryId: activeCategoryId,
      contact: effectiveContact,
      slice: captureCategoryGroups[activeCategoryId],
    });
  }, [activeCategoryId, captureCategoryGroups, effectiveContact]);

  if (!mounted || !open) return null;

  const panelTitle = !activeCategoryId
    ? INTELLIGENCE_CAPTURE_DASHBOARD_UI.title
    : categoryReviewMode
      ? `${intelligenceCaptureCategoryDef(activeCategoryId).name} · Review`
      : activeCaptureMethod
        ? `${intelligenceCaptureCategoryDef(activeCategoryId).name} · ${intelligenceCaptureMethodDef(activeCaptureMethod).name}`
        : INTELLIGENCE_CAPTURE_FLOW_UI.stepMethodTitle;

  const sharedQuestionHandlers = {
    activeSignalId,
    busySignalId,
    selectedChoiceBySignal,
    metadataBySignal,
    notesBySignal,
    contactDraftBySignal,
    facilityContactDraftBySignal,
    impactBySignal,
    submitErrorBySignal,
    contact: effectiveContact,
    pool,
    organizationId,
    organizationName,
    providerId,
    onChoiceSelect: handleChoiceSelect,
    onChoiceDeselect: handleChoiceDeselect,
    onMetadataChange: (signalId: string, key: string, value: string) =>
      setMetadataBySignal((prev) => ({
        ...prev,
        [signalId]: { ...(prev[signalId] ?? {}), [key]: value },
      })),
    onNotesChange: (signalId: string, value: string) =>
      setNotesBySignal((prev) => ({ ...prev, [signalId]: value })),
    onContactDraftChange: (signalId: string, draft: RapidDiscoverySupportContactDraft) =>
      setContactDraftBySignal((prev) => ({ ...prev, [signalId]: draft })),
    onFacilityContactDraftChange: (signalId: string, draft: RapidDiscoverySupportContactDraft) =>
      setFacilityContactDraftBySignal((prev) => ({ ...prev, [signalId]: draft })),
    onSubmitContact: handleSubmitContact,
    onSubmitChoice: handleSubmitChoice,
    contactOptInBySignal,
    onContactIntent: handleContactIntent,
    onOpenCredentialingWorkflow: () => setCredentialingDrawerOpen(true),
    forceExpandSignalId,
    forceExpandNonce,
    evidenceConfidenceBySignal,
    onEvidenceConfidenceChange: (signalId: string, confidence: DiscoveryMappingEvidenceConfidence) =>
      setEvidenceConfidenceBySignal((prev) => ({ ...prev, [signalId]: confidence })),
    evidenceBySignal,
    onEvidenceTextChange: (signalId: string, value: string) =>
      setEvidenceBySignal((prev) => ({ ...prev, [signalId]: value })),
    onSuggestedContactLead: handleSuggestedContactLead,
    dismissedSuggestedContactLeads,
    contactSearchPrefillBySignal,
    highlightSignalId,
  };

  return createPortal(
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `${providerStageMappingCss}\n${rapidDiscoverySupportContactCss}\n${providerQuickSignalCaptureCss}`,
        }}
      />
      <div className="stage-mapping-backdrop" onClick={onClose} aria-hidden />
      <div
        className="stage-mapping-panel"
        role="dialog"
        aria-modal="true"
        aria-label={panelTitle}
      >
        <header className="stage-mapping-header">
          <div className="stage-mapping-header-main">
            <p className="stage-mapping-kicker">{INTELLIGENCE_CAPTURE_DASHBOARD_UI.kicker}</p>
            <h2 className="stage-mapping-title">{panelTitle}</h2>
            <div className="stage-mapping-stats">
              {activeCategoryId &&
              activeCategoryWorkspace &&
              (categoryReviewMode || activeCaptureMethod) ? (
                <>
                  <span className="stage-mapping-stat stage-mapping-stat--resolved">
                    <strong>{activeCategoryWorkspace.progress.findingsCaptured}</strong>{" "}
                    {INTELLIGENCE_CAPTURE_WORKSPACE_UI.findingsCaptured.toLowerCase()}
                  </span>
                  <span className="stage-mapping-stat stage-mapping-stat--operational">
                    <strong>{activeCategoryWorkspace.progress.openQuestions}</strong>{" "}
                    {INTELLIGENCE_CAPTURE_WORKSPACE_UI.openQuestions.toLowerCase()}
                  </span>
                  <span className="stage-mapping-stat stage-mapping-stat--resolved">
                    <strong>{activeCategoryWorkspace.progress.confirmed}</strong>{" "}
                    {INTELLIGENCE_CAPTURE_WORKSPACE_UI.confirmed.toLowerCase()}
                  </span>
                </>
              ) : (
                <>
                  <span className="stage-mapping-stat stage-mapping-stat--operational">
                    <strong>{session.openUncertainties}</strong> to explore
                  </span>
                  <span className="stage-mapping-stat stage-mapping-stat--resolved">
                    <strong>
                      {session.intelligenceCategoryCounts.opportunityConfirmed +
                        session.intelligenceCategoryCounts.operationalConfirmed +
                        session.intelligenceCategoryCounts.salesConfirmed}
                    </strong>{" "}
                    {INTELLIGENCE_CAPTURE_DASHBOARD_UI.findingsLabel}
                  </span>
                  <span className="stage-mapping-stat">
                    {session.stageLabel}
                  </span>
                </>
              )}
              {resolvedThisSession > 0 ? (
                <span className="stage-mapping-stat stage-mapping-stat--resolved">
                  <strong>{resolvedThisSession}</strong> {STAGE_MAPPING_UI.resolvedSession}
                </span>
              ) : null}
            </div>
          </div>
          <div className="stage-mapping-header-actions">
            <button type="button" className="stage-mapping-header-btn" onClick={onClose}>
              {STAGE_MAPPING_UI.finishLater}
            </button>
            <button
              type="button"
              className="stage-mapping-header-btn stage-mapping-header-btn--close"
              aria-label="Close intelligence capture"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </header>

        <div className="stage-mapping-body" ref={bodyRef}>
          {!activeCategoryId ? (
            <>
              <section className="stage-mapping-focus-banner" aria-label="Current pathway stage">
                <p className="stage-mapping-focus-kicker">{session.stageLabel}</p>
                <h3 className="stage-mapping-focus-headline">{INTELLIGENCE_CAPTURE_FIRST_UI.title}</h3>
                <p className="stage-mapping-guidance">{INTELLIGENCE_CAPTURE_FIRST_UI.subtitle}</p>
              </section>
              <IntelligenceCaptureFirstPanel
                providerId={providerId}
                categoryCards={captureCategoryCards}
                onFindingSaved={handleProviderUpdated}
              />
              <section
                className="intel-capture-browse-areas"
                aria-label={INTELLIGENCE_CAPTURE_FIRST_UI.browseAreasTitle}
              >
                <h3 className="intel-capture-browse-areas-title">
                  {INTELLIGENCE_CAPTURE_FIRST_UI.browseAreasTitle}
                </h3>
                <p className="intel-capture-browse-areas-subtitle">
                  {INTELLIGENCE_CAPTURE_FIRST_UI.browseAreasSubtitle}
                </p>
              </section>
              <IntelligenceCaptureCategoryDashboard
                cards={captureCategoryCards}
                suggestedCategoryId={suggestedCaptureCategory?.id ?? null}
                onSelectCategory={(categoryId) => {
                  setActiveCategoryId(categoryId);
                  setActiveCaptureMethod(null);
                  setCategoryReviewMode(false);
                  requestAnimationFrame(() => scrollMappingBodyToTop());
                }}
              />
            </>
          ) : !activeCaptureMethod && !categoryReviewMode ? (
            <IntelligenceCaptureMethodPicker
              categoryId={activeCategoryId}
              onBack={() => {
                setActiveCategoryId(null);
                setActiveSignalId(null);
                requestAnimationFrame(() => scrollMappingBodyToTop());
              }}
              onSelectMethod={(methodId) => {
                setActiveCaptureMethod(methodId);
                setCategoryReviewMode(false);
                requestAnimationFrame(() => scrollMappingBodyToTop());
              }}
              onReviewArea={() => {
                setCategoryReviewMode(true);
                requestAnimationFrame(() => scrollMappingBodyToTop());
              }}
            />
          ) : (
            <IntelligenceCaptureMethodView
              categoryId={activeCategoryId}
              methodId={activeCaptureMethod}
              slice={captureCategoryGroups[activeCategoryId]}
              contact={effectiveContact}
              providerId={providerId}
              reviewMode={categoryReviewMode}
              onBack={() => {
                if (categoryReviewMode) {
                  setCategoryReviewMode(false);
                } else {
                  setActiveCaptureMethod(null);
                }
                setActiveSignalId(null);
                requestAnimationFrame(() => scrollMappingBodyToTop());
              }}
              onFindingSaved={handleProviderUpdated}
              validationHandlers={sharedQuestionHandlers}
            />
          )}
        </div>

        <footer className="stage-mapping-footer">
          <div className="stage-mapping-footer-actions">
            <button
              type="button"
              className="stage-mapping-footer-btn stage-mapping-footer-btn--primary"
              disabled={Boolean(busySignalId)}
              onClick={() => {
                if (!activeCategoryId) {
                  if (suggestedCaptureCategory) {
                    setActiveCategoryId(suggestedCaptureCategory.id);
                    return;
                  }
                  onClose();
                  return;
                }
                if (categoryReviewMode || activeCaptureMethod) {
                  if (categoryReviewMode) {
                    setCategoryReviewMode(false);
                  } else {
                    setActiveCaptureMethod(null);
                  }
                  requestAnimationFrame(() => scrollMappingBodyToTop());
                  return;
                }
                setActiveCategoryId(null);
                requestAnimationFrame(() => scrollMappingBodyToTop());
              }}
            >
              {!activeCategoryId
                ? suggestedCaptureCategory
                  ? `Open ${suggestedCaptureCategory.name}`
                  : "Done for now"
                : categoryReviewMode || activeCaptureMethod
                  ? INTELLIGENCE_CAPTURE_FLOW_UI.backToMethods
                  : INTELLIGENCE_CAPTURE_FLOW_UI.backToCategories}
            </button>
            {LOG_UPDATE_UI_ENABLED ? (
              <button type="button" className="stage-mapping-footer-btn" onClick={onLogFieldIntel}>
                {STAGE_MAPPING_UI.logFieldIntel}
              </button>
            ) : null}
          </div>
          <button type="button" className="stage-mapping-footer-btn" onClick={onClose}>
            {STAGE_MAPPING_UI.saveProgress}
          </button>
        </footer>
        {!activeCategoryId && session.openUncertainties === 0 ? (
          <p className="stage-mapping-inline-complete" role="status">
            {STAGE_MAPPING_UI.sessionCompleteNote}
          </p>
        ) : null}
      </div>

      <CredentialingStatusDrawer
        open={credentialingDrawerOpen}
        providerId={providerId}
        contact={credentialingDrawerContact}
        onClose={() => setCredentialingDrawerOpen(false)}
        onSaved={handleProviderUpdated}
      />
    </>,
    document.body,
  );
}
