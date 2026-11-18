"use client";

import React from "react";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import type { LogUpdateConflictResolution, LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";
import type { DebriefReviewSummary } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewSummary";
import {
  groupClinicalInsightOutcomes,
  type IntelligenceBriefOutcome,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import { INTELLIGENCE_BRIEF_SECTION } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBriefCopy";
import {
  isProductInterestOutcome,
  isProductUsageOutcome,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewDisplayRefinement";
import { DebriefOutcomeRow } from "./DebriefOutcomeRow";
import { DebriefReviewSummaryPanel } from "./DebriefReviewSummaryPanel";

function OutcomeSection({
  heading,
  sectionId,
  sectionClassName,
  outcomes,
  selectedOutcomeIds,
  readOnly,
  proposedContacts,
  organizationId,
  onContactsChange,
  onSelectedChange,
  linkedFieldUpdatesForOutcome,
  onResolveConflict,
}: {
  heading: string;
  sectionId: string;
  sectionClassName?: string;
  outcomes: IntelligenceBriefOutcome[];
  selectedOutcomeIds: ReadonlySet<string>;
  readOnly?: boolean;
  proposedContacts: DebriefProposedContactItem[];
  organizationId: string | null;
  onContactsChange?: (contacts: DebriefProposedContactItem[]) => void;
  onSelectedChange: (outcomeId: string, selected: boolean) => void;
  linkedFieldUpdatesForOutcome?: (outcome: IntelligenceBriefOutcome) => LogUpdateRoutedFieldUpdate[];
  onResolveConflict?: (id: string, resolution: LogUpdateConflictResolution) => void;
}) {
  if (outcomes.length === 0) return null;

  return (
    <section
      className={`ai-intelligence-brief__section${sectionClassName ? ` ${sectionClassName}` : ""}`}
      data-testid={`ai-intelligence-brief-section-${sectionId}`}
    >
      <div className="ai-intelligence-brief__section-head">
        <h3 className="ai-intelligence-brief__heading">{heading}</h3>
        <span className="ai-intelligence-brief__section-count">{outcomes.length}</span>
      </div>
      <ul className="ai-intelligence-brief__list">
        {outcomes.map((outcome) => {
          const contact = outcome.contactId
            ? proposedContacts.find((c) => c.id === outcome.contactId) ?? null
            : null;
          return (
            <DebriefOutcomeRow
              key={outcome.id}
              outcome={outcome}
              selected={selectedOutcomeIds.has(outcome.id)}
              readOnly={readOnly}
              contact={contact}
              organizationId={organizationId}
              proposedContacts={proposedContacts}
              onContactsChange={onContactsChange}
              onSelectedChange={(selected) => onSelectedChange(outcome.id, selected)}
              linkedFieldUpdates={linkedFieldUpdatesForOutcome?.(outcome) ?? []}
              onResolveConflict={onResolveConflict}
            />
          );
        })}
      </ul>
    </section>
  );
}

export function DebriefIntelligenceBriefReview({
  summary,
  outcomes,
  selectedOutcomeIds,
  readOnly,
  proposedContacts,
  organizationId,
  onContactsChange,
  onSelectedChange,
  linkedFieldUpdatesForOutcome,
  onResolveConflict,
  showSummary = true,
  excludeOutcomeIds,
}: {
  summary: DebriefReviewSummary;
  outcomes: IntelligenceBriefOutcome[];
  selectedOutcomeIds: ReadonlySet<string>;
  readOnly?: boolean;
  proposedContacts: DebriefProposedContactItem[];
  organizationId: string | null;
  onContactsChange?: (contacts: DebriefProposedContactItem[]) => void;
  onSelectedChange: (outcomeId: string, selected: boolean) => void;
  linkedFieldUpdatesForOutcome?: (outcome: IntelligenceBriefOutcome) => LogUpdateRoutedFieldUpdate[];
  onResolveConflict?: (id: string, resolution: LogUpdateConflictResolution) => void;
  showSummary?: boolean;
  /** Outcomes already rendered elsewhere (e.g. decision rows) — not repeated here. */
  excludeOutcomeIds?: ReadonlySet<string>;
}) {
  const contacts = outcomes.filter(
    (outcome) => outcome.kind === "contact" && !excludeOutcomeIds?.has(outcome.id),
  );
  const observation = outcomes.filter((outcome) => outcome.kind === "observation_access");
  const clinicalGroups = groupClinicalInsightOutcomes(outcomes);
  const productsInUse = outcomes.filter(isProductUsageOutcome);
  const productInterest = outcomes.filter(isProductInterestOutcome);
  const workflow = outcomes.filter((outcome) => outcome.kind === "workflow_insight");
  const followUps = outcomes.filter(
    (outcome) => outcome.kind === "follow_up" && !excludeOutcomeIds?.has(outcome.id),
  );

  const sharedSectionProps = {
    selectedOutcomeIds,
    readOnly,
    proposedContacts,
    organizationId,
    onContactsChange,
    onSelectedChange,
    linkedFieldUpdatesForOutcome,
    onResolveConflict,
  };

  return (
    <div className="ai-intelligence-brief ai-intelligence-brief--mission" data-testid="ai-intelligence-brief">
      {showSummary ? <DebriefReviewSummaryPanel summary={summary} /> : null}
      <OutcomeSection
        heading={INTELLIGENCE_BRIEF_SECTION.observationAccess}
        sectionId="observation-access"
        sectionClassName="ai-intelligence-brief__section--observation ai-intelligence-brief__section--dominant"
        outcomes={observation}
        {...sharedSectionProps}
      />
      <OutcomeSection
        heading={INTELLIGENCE_BRIEF_SECTION.contacts}
        sectionId="contacts"
        sectionClassName="ai-intelligence-brief__section--contacts"
        outcomes={contacts}
        {...sharedSectionProps}
      />
      {clinicalGroups.map((group) => (
        <OutcomeSection
          key={group.groupId}
          heading={group.groupLabel}
          sectionId={`clinical-${group.groupId}`}
          sectionClassName="ai-intelligence-brief__section--clinical"
          outcomes={group.outcomes}
          {...sharedSectionProps}
        />
      ))}
      <OutcomeSection
        heading={INTELLIGENCE_BRIEF_SECTION.productsInUse}
        sectionId="products-in-use"
        sectionClassName="ai-intelligence-brief__section--product"
        outcomes={productsInUse}
        {...sharedSectionProps}
      />
      <OutcomeSection
        heading={INTELLIGENCE_BRIEF_SECTION.productIntelligence}
        sectionId="product-intelligence"
        sectionClassName="ai-intelligence-brief__section--product"
        outcomes={productInterest}
        {...sharedSectionProps}
      />
      <OutcomeSection
        heading={INTELLIGENCE_BRIEF_SECTION.workflowInsights}
        sectionId="workflow-insights"
        sectionClassName="ai-intelligence-brief__section--workflow"
        outcomes={workflow}
        {...sharedSectionProps}
      />
      <OutcomeSection
        heading={INTELLIGENCE_BRIEF_SECTION.followUpActions}
        sectionId="follow-up-actions"
        sectionClassName="ai-intelligence-brief__section--follow-up"
        outcomes={followUps}
        {...sharedSectionProps}
      />
    </div>
  );
}
