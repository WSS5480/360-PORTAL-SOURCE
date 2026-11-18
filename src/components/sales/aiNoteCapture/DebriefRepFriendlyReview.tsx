"use client";



import React from "react";

import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";

import type { LogUpdateConflictResolution } from "@/lib/surgical-sales/logUpdateProviderRouting";

import {
  acceptIntelligenceReviewItems,

  editIntelligenceReviewItem,

  ignoreIntelligenceReviewItems,

} from "@/lib/surgical-sales/debriefReviewItemState";

import type { LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";

import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";

import type { DebriefIntelligenceExtractionContext } from "@/lib/surgical-sales/debriefIntelligenceExtractionContext";

import type { ReviewScopeDisplayContext } from "@/lib/surgical-sales/logUpdateReviewPresentation";

import {

  AI_DEBRIEF_REVIEW_UPDATES_TITLE,
  resolveDebriefReviewUpdatesTitle,

  TACTICAL_DEBRIEF_REVIEW_TITLE,

} from "@/lib/surgical-sales/debriefApprovalUx";

import { buildDebriefReviewContextLine } from "@/lib/surgical-sales/debriefReviewSurface";

import type { DebriefActionableReviewCard } from "@/lib/surgical-sales/debriefActionableReviewCardTypes";

import { isContactCandidateReviewCard } from "@/lib/surgical-sales/debriefActionableReviewCardTypes";

import { buildDebriefReviewDecisionContext } from "@/lib/surgical-sales/debriefIntelligencePipeline/buildDebriefReviewDecisionContext";

import {
  buildIntelligenceBriefOutcomes,
  type IntelligenceBriefOutcome,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";

import { filterDecisionRequiredOutcomes } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewDecisionOutcomes";

import { buildDebriefReviewSummary } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewSummary";

import { deriveConfirmedWorkflowStates } from "@/lib/surgical-sales/debriefWorkflowStateAuthority";

import { composeDebriefReviewDisplay } from "@/lib/surgical-sales/universalExtractor/composeDebriefReviewDisplay";
import { INTELLIGENCE_BRIEF_EMPTY } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBriefCopy";
import { isGenericClinicalFactText } from "@/lib/surgical-sales/debriefClinicalFactExtraction";

import {

  fieldUpdateIdsExcludingUnresolvedConflicts,

  listDebriefFieldsNeedingConflictResolution,

} from "@/lib/surgical-sales/debriefFieldConflictResolution";

import { supplementDebriefPersistFieldAcceptance } from "@/lib/surgical-sales/simulateDebriefReviewOutcomeAcceptance";

import type { IntelligencePropagationTarget } from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureScope";

import { IntelligencePropagationPanel } from "@/components/sales/intelligenceCapture/IntelligencePropagationPanel";

import { LOG_UPDATE_PROPAGATION_HEADING } from "@/lib/surgical-sales/logUpdateUx";

import { DebriefIntelligenceBriefReview } from "./DebriefIntelligenceBriefReview";

import { DebriefReviewDecisionsSection } from "./DebriefReviewDecisionsSection";

import { DebriefReviewSummaryPanel } from "./DebriefReviewSummaryPanel";

import { LogUpdateRawDebriefNote } from "./LogUpdateRawDebriefNote";



export function DebriefRepFriendlyReview({

  review,

  providerId = null,

  discoveryContext,

  providerContact,

  proposedContacts,

  organizationId = null,

  sourceReference,

  scopeDisplayContext,

  engagementTypeLabel = null,

  engagementOutcomeId = null,

  propagationTargets = [],

  debriefSavedSubtext,

  suppressExecutiveSummary = false,

  onReviewChange,

  onContactsChange,

  onResolveConflict,

  readOnly = false,

  reviewUpdatesTitle = AI_DEBRIEF_REVIEW_UPDATES_TITLE,

}: {

  review: LogUpdateParseResult;

  providerId?: string | null;

  discoveryContext?: DebriefIntelligenceExtractionContext | null;

  providerContact?: Record<string, unknown> | null;

  proposedContacts: DebriefProposedContactItem[];

  organizationId?: string | null;

  sourceReference?: string;

  scopeDisplayContext?: ReviewScopeDisplayContext;

  engagementTypeLabel?: string | null;

  /** Outcome the rep selected at engagement completion — workflow authority. */
  engagementOutcomeId?: string | null;

  propagationTargets?: IntelligencePropagationTarget[];

  debriefSavedSubtext?: string;

  suppressExecutiveSummary?: boolean;

  onReviewChange: (

    nextOrUpdater: LogUpdateParseResult | ((prev: LogUpdateParseResult) => LogUpdateParseResult),

  ) => void;

  onContactsChange: (contacts: DebriefProposedContactItem[]) => void;

  onResolveConflict: (id: string, resolution: LogUpdateConflictResolution) => void;

  readOnly?: boolean;

  reviewUpdatesTitle?: string;

}) {

  const composedReview = React.useMemo(
    () =>
      composeDebriefReviewDisplay({
        dictation: review.sourceText,
        logUpdate: review,
        debriefRuns: review.debriefUniversalFactsRuns,
        discoveryContext,
        providerContact,
        proposedContacts,
        sourceReference,
        guardContext: buildDebriefReviewDecisionContext({
          providerContact,
          providerLabel: scopeDisplayContext?.providerLabel,
          discoveryContext,
        }),
        providerLabel: scopeDisplayContext?.providerLabel,
      }),
    [
      review,
      discoveryContext,
      providerContact,
      proposedContacts,
      sourceReference,
      scopeDisplayContext?.providerLabel,
    ],
  );

  const extraction = composedReview.extraction;
  const actionableCards = composedReview.actionableCards;
  const intelligenceBrief = composedReview.brief;

  const [ignoredItemIds, setIgnoredItemIds] = React.useState<Set<string>>(() => new Set());

  const [ignoredCardIds, setIgnoredCardIds] = React.useState<Set<string>>(() => new Set());

  const [acceptedCardIds, setAcceptedCardIds] = React.useState<Set<string>>(() => new Set());

  const [selectedOutcomeIds, setSelectedOutcomeIds] = React.useState<Set<string>>(() => new Set());

  const selectionInitializedRef = React.useRef<string | null>(null);



  const platformAutoRef = React.useRef<string | null>(null);

  React.useEffect(() => {

    const key = review.sourceText.slice(0, 80);

    if (platformAutoRef.current === key) return;

    const preselectPlatforms = extraction.platformMatches.filter(

      (p) => p.confidenceTier === "high_confidence",

    );

    if (preselectPlatforms.length === 0) return;

    platformAutoRef.current = key;

    const credField = review.fieldUpdates.find((f) => f.dbKey.includes("credentialing_platform"));

    const platform = preselectPlatforms[0];

    if (credField && platform) {

      onReviewChange((current) =>

        editIntelligenceReviewItem(current, credField.id, platform.matchedPlatformName ?? platform.mentionedName),

      );

    }

  }, [extraction.platformMatches, review.fieldUpdates, review.sourceText, onReviewChange]);

  const briefOutcomes = React.useMemo(

    () =>

      buildIntelligenceBriefOutcomes(intelligenceBrief, {

        sourceText: review.sourceText,

        fieldUpdates: review.fieldUpdates,

      }),

    [intelligenceBrief, review.sourceText, review.fieldUpdates],

  );

  const visibleBriefOutcomes = React.useMemo(
    () =>
      briefOutcomes.filter((outcome) => {
        if (outcome.kind !== "clinical_insight") return true;
        const labels = [
          outcome.summaryLine,
          outcome.primaryLine,
          outcome.subtitle,
        ].filter((value): value is string => Boolean(value?.trim()));
        return labels.length === 0 || !labels.every(isGenericClinicalFactText);
      }),
    [briefOutcomes],
  );



  const confirmedWorkflowStates = React.useMemo(

    () => deriveConfirmedWorkflowStates({ engagementOutcomeId, providerContact }),

    [engagementOutcomeId, providerContact],

  );



  const reviewSummary = React.useMemo(

    () =>

      buildDebriefReviewSummary({

        outcomes: visibleBriefOutcomes,

        providerLabel: scopeDisplayContext?.providerLabel,

        confirmedWorkflowStates,

      }),

    [visibleBriefOutcomes, scopeDisplayContext?.providerLabel, confirmedWorkflowStates],

  );



  const cardById = React.useMemo(

    () => new Map(actionableCards.map((card) => [card.id, card])),

    [actionableCards],

  );



  const contextLine = buildDebriefReviewContextLine({

    providerLabel: scopeDisplayContext?.providerLabel,

    organizationLabel: scopeDisplayContext?.organizationLabel,

    engagementTypeLabel,

  });



  function patchReview(updater: (current: LogUpdateParseResult) => LogUpdateParseResult) {

    onReviewChange(updater);

  }



  function linkedFieldUpdatesForOutcome(outcome: IntelligenceBriefOutcome): LogUpdateRoutedFieldUpdate[] {

    const ids = new Set<string>();

    for (const cardId of outcome.cardIds) {

      const card = cardById.get(cardId);

      if (!card) continue;

      for (const id of card.linkedFieldUpdateIds) ids.add(id);

    }

    return review.fieldUpdates.filter((field) => ids.has(field.id));

  }



  const selectedLinkedFieldIds = React.useMemo(() => {

    const ids = new Set<string>();

    for (const outcomeId of selectedOutcomeIds) {

      const outcome = visibleBriefOutcomes.find((row) => row.id === outcomeId);

      if (!outcome) continue;

      for (const field of linkedFieldUpdatesForOutcome(outcome)) ids.add(field.id);

    }

    return ids;

  }, [selectedOutcomeIds, visibleBriefOutcomes, review.fieldUpdates, cardById]);



  const unresolvedConflictFields = React.useMemo(

    () => listDebriefFieldsNeedingConflictResolution(review, selectedLinkedFieldIds),

    [review, selectedLinkedFieldIds],

  );



  const decisionOutcomes = React.useMemo(

    () => filterDecisionRequiredOutcomes({ outcomes: visibleBriefOutcomes, proposedContacts }),

    [visibleBriefOutcomes, proposedContacts],

  );



  // Contact decisions render as the contact row itself above; the details

  // brief must not repeat the same person.

  const decisionOutcomeIds = React.useMemo(

    () => new Set(decisionOutcomes.map((outcome) => outcome.id)),

    [decisionOutcomes],

  );



  function acceptFieldUpdateIds(ids: readonly string[]) {

    patchReview((current) => {

      const safeIds = fieldUpdateIdsExcludingUnresolvedConflicts(current, ids);

      if (safeIds.length === 0) return current;

      return acceptIntelligenceReviewItems(current, safeIds);

    });

    setIgnoredItemIds((prev) => {

      const next = new Set(prev);

      for (const id of ids) next.delete(id);

      return next;

    });

  }



  function ignoreFieldUpdateIds(ids: readonly string[]) {

    if (ids.length === 0) return;

    patchReview((current) => ignoreIntelligenceReviewItems(current, ids));

    setIgnoredItemIds((prev) => {

      const next = new Set(prev);

      for (const id of ids) next.add(id);

      return next;

    });

  }



  function acceptCard(card: DebriefActionableReviewCard) {

    setAcceptedCardIds((prev) => new Set(prev).add(card.id));

    setIgnoredCardIds((prev) => {

      const next = new Set(prev);

      next.delete(card.id);

      return next;

    });

    acceptFieldUpdateIds(card.linkedFieldUpdateIds);

  }



  function ignoreCard(card: DebriefActionableReviewCard) {

    setIgnoredCardIds((prev) => new Set(prev).add(card.id));

    setAcceptedCardIds((prev) => {

      const next = new Set(prev);

      next.delete(card.id);

      return next;

    });

    ignoreFieldUpdateIds(card.linkedFieldUpdateIds);

    if (isContactCandidateReviewCard(card)) {

      onContactsChange(

        proposedContacts.map((row) =>

          row.id === card.contactId ? { ...row, disposition: "skipped" as const } : row,

        ),

      );

    }

  }



  function acceptOutcomeCards(outcome: IntelligenceBriefOutcome) {

    const fieldIds: string[] = [];

    for (const cardId of outcome.cardIds) {

      const card = cardById.get(cardId);

      if (!card) continue;

      if (card.category === "workflow_participant") {

        if (outcome.contactId) {

          onContactsChange(

            proposedContacts.map((row) =>

              row.id === outcome.contactId

                ? { ...row, disposition: "accepted" as const }

                : row,

            ),

          );

        }

        continue;

      }

      setAcceptedCardIds((prev) => new Set(prev).add(card.id));

      setIgnoredCardIds((prev) => {

        const next = new Set(prev);

        next.delete(card.id);

        return next;

      });

      if (card.category !== "follow_up_task") {

        fieldIds.push(...card.linkedFieldUpdateIds);

      }

    }

    acceptFieldUpdateIds(fieldIds);

  }



  function ignoreOutcomeCards(outcome: IntelligenceBriefOutcome) {

    for (const cardId of outcome.cardIds) {

      const card = cardById.get(cardId);

      if (!card) continue;

      if (card.category === "follow_up_task") {

        setIgnoredCardIds((prev) => new Set(prev).add(card.id));

        setAcceptedCardIds((prev) => {

          const next = new Set(prev);

          next.delete(card.id);

          return next;

        });

        continue;

      }

      ignoreCard(card);

    }

  }



  function setOutcomeSelected(outcomeId: string, selected: boolean) {

    const outcome = visibleBriefOutcomes.find((row) => row.id === outcomeId);

    if (!outcome) return;



    setSelectedOutcomeIds((prev) => {

      const next = new Set(prev);

      if (selected) next.add(outcomeId);

      else next.delete(outcomeId);

      return next;

    });



    if (selected) acceptOutcomeCards(outcome);

    else ignoreOutcomeCards(outcome);

  }



  React.useEffect(() => {

    const key = review.sourceText.slice(0, 80);

    if (selectionInitializedRef.current === key || visibleBriefOutcomes.length === 0) return;

    selectionInitializedRef.current = key;

    const defaultSelected = new Set(visibleBriefOutcomes.map((outcome) => outcome.id));

    setSelectedOutcomeIds(defaultSelected);

    const fieldIds = new Set<string>();

    for (const outcome of visibleBriefOutcomes) {

      for (const cardId of outcome.cardIds) {

        const card = cardById.get(cardId);

        if (!card) continue;

        if (card.category === "workflow_participant") continue;

        setAcceptedCardIds((prev) => new Set(prev).add(card.id));

        if (card.category !== "follow_up_task") {

          for (const id of card.linkedFieldUpdateIds) fieldIds.add(id);

        }

      }

    }

    const defaultContactIds = new Set(

      visibleBriefOutcomes

        .filter((outcome) => outcome.kind === "contact" && defaultSelected.has(outcome.id))

        .map((outcome) => outcome.contactId)

        .filter(Boolean) as string[],

    );

    if (defaultContactIds.size > 0) {

      onContactsChange(

        proposedContacts.map((row) =>

          defaultContactIds.has(row.id) && row.disposition === "pending"

            ? { ...row, disposition: "accepted" as const }

            : row,

        ),

      );

    }

    if (fieldIds.size > 0) {

      patchReview((current) =>

        supplementDebriefPersistFieldAcceptance(acceptIntelligenceReviewItems(current, fieldIds)),

      );

    } else {

      patchReview((current) => supplementDebriefPersistFieldAcceptance(current));

    }

  }, [review.sourceText, visibleBriefOutcomes, cardById, proposedContacts, onContactsChange]);



  if (visibleBriefOutcomes.length === 0) {

    return (

      <div className="ai-debrief-review ai-debrief-review--rep-friendly" aria-label={TACTICAL_DEBRIEF_REVIEW_TITLE}>

        <p className="ai-debrief-review-empty" data-testid="ai-debrief-actionable-empty">

          {INTELLIGENCE_BRIEF_EMPTY}

        </p>

      </div>

    );

  }



  return (

    <div

      className="ai-debrief-review ai-debrief-review--rep-friendly ai-debrief-review--streamlined ai-debrief-review--flat"

      aria-label={TACTICAL_DEBRIEF_REVIEW_TITLE}

    >

      {suppressExecutiveSummary ? null : <DebriefReviewSummaryPanel summary={reviewSummary} />}



      <DebriefReviewDecisionsSection

        contactOutcomes={decisionOutcomes}

        proposedContacts={proposedContacts}

        organizationId={organizationId ?? null}

        unresolvedConflictFields={unresolvedConflictFields}

        selectedOutcomeIds={selectedOutcomeIds}

        readOnly={readOnly}

        onContactsChange={onContactsChange}

        onSelectedChange={setOutcomeSelected}

        linkedFieldUpdatesForOutcome={linkedFieldUpdatesForOutcome}

        onResolveConflict={onResolveConflict}

      />



      <section

        className="ai-debrief-review-suggestions"

        aria-label={reviewUpdatesTitle}

        data-testid="ai-debrief-review-suggestions"

      >

        <h3 className="ai-debrief-review-suggestions__title">{reviewUpdatesTitle}</h3>

        {contextLine ? <p className="ai-debrief-review-context">{contextLine}</p> : null}

        <DebriefIntelligenceBriefReview

          summary={reviewSummary}

          outcomes={visibleBriefOutcomes}

          selectedOutcomeIds={selectedOutcomeIds}

          readOnly={readOnly}

          proposedContacts={proposedContacts}

          organizationId={organizationId ?? null}

          onContactsChange={onContactsChange}

          onSelectedChange={setOutcomeSelected}

          linkedFieldUpdatesForOutcome={linkedFieldUpdatesForOutcome}

          onResolveConflict={onResolveConflict}

          showSummary={false}

          excludeOutcomeIds={decisionOutcomeIds}

        />

      </section>



      {propagationTargets.length > 0 ? (

        <IntelligencePropagationPanel

          targets={propagationTargets}

          heading={LOG_UPDATE_PROPAGATION_HEADING}

        />

      ) : null}



      <LogUpdateRawDebriefNote sourceText={review.sourceText} savedSubtext={debriefSavedSubtext} />

    </div>

  );

}
