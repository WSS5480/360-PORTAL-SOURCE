/**
 * Compose debrief review display — DIP default or UF-primary when flag on (Phase 1).
 */

import {
  buildDebriefIntelligenceExtractionReview,
  type DebriefIntelligenceExtractionReview,
} from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import type { DebriefActionableReviewCard } from "@/lib/surgical-sales/debriefActionableReviewCardTypes";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import type { DebriefIntelligenceExtractionContext } from "@/lib/surgical-sales/debriefIntelligenceExtractionContext";
import {
  buildDebriefActionableReviewCards,
} from "@/lib/surgical-sales/buildDebriefActionableReviewCards";
import {
  buildDebriefIntelligenceBrief,
  type DebriefIntelligenceBrief,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import { buildDebriefReviewDecisionContext } from "@/lib/surgical-sales/debriefIntelligencePipeline/buildDebriefReviewDecisionContext";
import type { ReviewUpdateGuardContext } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewUpdateGuards";
import { filterProposedContactsWithGuardContext } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewUpdateGuards";
import { discoveryIntelligenceDebug } from "@/lib/surgical-sales/discoveryIntelligenceDebug";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import { dedupeReviewDisplayCards } from "@/lib/surgical-sales/sharedIntelligence/dedupeReviewDisplayCards";
import { isGenericClinicalFactText } from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import { enrichDebriefIntelligenceBriefWithUniversalFacts } from "@/lib/surgical-sales/universalExtractor/adaptUniversalFactsToDebriefClinicalBrief";
import { buildDebriefReviewFromUniversalFacts } from "@/lib/surgical-sales/universalExtractor/buildDebriefReviewFromUniversalFacts";
import { extractUniversalSurgicalFacts } from "@/lib/surgical-sales/universalExtractor/extractUniversalSurgicalFacts";
import {
  filterDipReviewCardsToWorkflowOnly,
} from "@/lib/surgical-sales/universalExtractor/filterDipReviewToWorkflowSections";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import { isUniversalFactsReviewAuthorityEnabled } from "@/lib/surgical-sales/universalExtractor/universalExtractorReviewFlag";
import { normalizeLogUpdateProviderIntelligenceFlag } from "@/lib/surgical-sales/logUpdateReviewPresentation";
import {
  buildRepFriendlyIntelligenceBriefing,
  type RepFriendlyIntelligenceBriefing,
} from "@/lib/surgical-sales/repFriendlyIntelligenceGroups";

export type ComposeDebriefReviewDisplayResult = {
  extraction: DebriefIntelligenceExtractionReview;
  actionableCards: DebriefActionableReviewCard[];
  brief: DebriefIntelligenceBrief;
  categorizedBriefing: RepFriendlyIntelligenceBriefing;
  displaySource: "dip" | "uf_authority";
};

function hasUsableDebriefRuns(runs: UniversalFactExtractionRun[] | null | undefined): runs is UniversalFactExtractionRun[] {
  return Boolean(runs?.some((run) => Array.isArray(run.facts) && run.facts.length > 0));
}

function buildLocalRulesDebriefRun(dictation: string): UniversalFactExtractionRun | null {
  const text = dictation.trim();
  if (text.length < 8) return null;

  const extracted = extractUniversalSurgicalFacts({
    raw_note: text,
    declared_source_type: "debrief_note",
  });
  if (extracted.facts.length === 0) return null;

  const captureId = "local-rules-debrief-review";
  const createdAt = "1970-01-01T00:00:00.000Z";
  return {
    capture_id: captureId,
    declared_source_type: "debrief_note",
    extraction_model: "universal-surgical-rules-v1",
    created_at: createdAt,
    operational_note_id: null,
    facts: extracted.facts.map((fact, index) => ({
      ...fact,
      id: `${captureId}-${index}`,
      capture_id: captureId,
      provider_id: null,
      organization_id: null,
      case_id: null,
      encounter_id: null,
      suppressed: false,
      created_at: createdAt,
    })),
  };
}

function isDurableReviewCard(card: DebriefActionableReviewCard): boolean {
  if (card.category === "clinical_focus") {
    const clinicalLabels = [
      card.headline,
      card.clinicalProcedureFocus,
      card.clinicalDisplayValue,
      card.insightTitle,
    ].filter((value): value is string => Boolean(value?.trim()));
    if (clinicalLabels.length > 0 && clinicalLabels.every(isGenericClinicalFactText)) {
      return false;
    }
  }
  if (
    card.category === "organization_intelligence" &&
    /relationship-building|relationship momentum|open to continued discussion|continued conversation/i.test(
      card.headline,
    )
  ) {
    return false;
  }
  return true;
}

function filterToDurableReviewCards(cards: DebriefActionableReviewCard[]): DebriefActionableReviewCard[] {
  return cards.filter(isDurableReviewCard);
}

function cleanReviewEvidenceQuote(quote: string | null | undefined): string | null {
  const cleaned = String(quote ?? "")
    .trim()
    .replace(/^["“”]+|["“”]+$/g, "")
    .trim();
  return cleaned || null;
}

function categorizedBriefingFromCards(cards: DebriefActionableReviewCard[]): RepFriendlyIntelligenceBriefing {
  return buildRepFriendlyIntelligenceBriefing(
    cards.map((card, index) => {
      const evidenceQuotes = card.evidenceQuotes
        .map(cleanReviewEvidenceQuote)
        .filter((quote): quote is string => Boolean(quote));
      return {
        id: card.id ?? `debrief-card-${index}`,
        text: card.headline,
        evidenceText: evidenceQuotes[0] ?? null,
        sourceNoteText: evidenceQuotes.join(" ") || evidenceQuotes[0] || null,
        extractedFactId: card.id ?? `debrief-card-${index}`,
        supportingEvidence: evidenceQuotes,
        inferred: evidenceQuotes.length > 1,
        sourceCategory: card.category,
      };
    }),
  );
}

export function composeDebriefReviewDisplay(input: {
  dictation: string;
  logUpdate: LogUpdateParseResult;
  debriefRuns?: UniversalFactExtractionRun[] | null;
  discoveryContext?: DebriefIntelligenceExtractionContext | null;
  providerContact?: Record<string, unknown> | null;
  proposedContacts?: DebriefProposedContactItem[];
  sourceReference?: string;
  guardContext?: ReviewUpdateGuardContext;
  providerLabel?: string | null;
}): ComposeDebriefReviewDisplayResult {
  const review = normalizeLogUpdateProviderIntelligenceFlag(input.logUpdate);
  let debriefRuns = input.debriefRuns ?? review.debriefUniversalFactsRuns ?? null;
  if (!hasUsableDebriefRuns(debriefRuns)) {
    const localRulesRun = buildLocalRulesDebriefRun(input.dictation || review.sourceText);
    if (localRulesRun) debriefRuns = [localRulesRun];
  }
  const guardContext =
    input.guardContext ??
    buildDebriefReviewDecisionContext({
      providerContact: input.providerContact,
      providerLabel: input.providerLabel ?? undefined,
      discoveryContext: input.discoveryContext,
    });

  const dipExtraction = buildDebriefIntelligenceExtractionReview({
    review,
    discoveryContext: input.discoveryContext,
    providerContact: input.providerContact,
    providerLabel: input.providerLabel,
    sourceReference: input.sourceReference,
    proposedContacts: input.proposedContacts,
    guardContext,
  });

  const effectiveProposedContacts = filterProposedContactsWithGuardContext(
    input.proposedContacts && input.proposedContacts.length > 0
      ? input.proposedContacts
      : dipExtraction.proposedContacts,
    guardContext,
    input.discoveryContext?.supportContacts,
  );

  const dipCards = buildDebriefActionableReviewCards({
    extraction: dipExtraction,
    proposedContacts: effectiveProposedContacts,
    dictation: input.dictation,
    guardContext,
  });

  const useUfAuthority =
    isUniversalFactsReviewAuthorityEnabled() && hasUsableDebriefRuns(debriefRuns);

  if (!useUfAuthority) {
    const supplementalUfCards = hasUsableDebriefRuns(debriefRuns)
      ? buildDebriefReviewFromUniversalFacts({
          dictation: input.dictation,
          debriefRuns,
          logUpdate: review,
          discoveryContext: input.discoveryContext,
          providerContact: input.providerContact,
          proposedContacts: effectiveProposedContacts,
          guardContext,
        }).actionableCards
      : [];
    const actionableCards = filterToDurableReviewCards(
      dedupeReviewDisplayCards([...dipCards, ...supplementalUfCards], input.dictation),
    );
    const brief = enrichDebriefIntelligenceBriefWithUniversalFacts({
      brief: buildDebriefIntelligenceBrief({ cards: actionableCards }),
      debriefRuns,
    });
    discoveryIntelligenceDebug("composeDebriefReviewDisplay", {
      displaySource: "dip",
      dipCardCount: dipCards.length,
      supplementalUfCardCount: supplementalUfCards.length,
      mergedCardCount: actionableCards.length,
    });
    return {
      extraction: dipExtraction,
      actionableCards,
      brief,
      categorizedBriefing: categorizedBriefingFromCards(actionableCards),
      displaySource: "dip",
    };
  }

  const ufReview = buildDebriefReviewFromUniversalFacts({
    dictation: input.dictation,
    debriefRuns: debriefRuns ?? [],
    logUpdate: review,
    discoveryContext: input.discoveryContext,
    providerContact: input.providerContact,
    proposedContacts: effectiveProposedContacts,
    guardContext,
  });

  const dipWorkflowCards = filterDipReviewCardsToWorkflowOnly(dipCards);
  const actionableCards = dedupeReviewDisplayCards(
    [...ufReview.actionableCards, ...dipWorkflowCards],
    input.dictation,
  ).filter(isDurableReviewCard);
  const brief = buildDebriefIntelligenceBrief({ cards: actionableCards });

  const extraction = buildDebriefIntelligenceExtractionReview({
    review,
    discoveryContext: input.discoveryContext,
    providerContact: input.providerContact,
    providerLabel: input.providerLabel,
    sourceReference: input.sourceReference,
    proposedContacts: effectiveProposedContacts,
    guardContext,
  });

  discoveryIntelligenceDebug("composeDebriefReviewDisplay", {
    displaySource: "uf_authority",
    ufCardCount: ufReview.actionableCards.length,
    dipWorkflowCardCount: dipWorkflowCards.length,
    mergedCardCount: actionableCards.length,
  });

  return {
    extraction,
    actionableCards,
    brief,
    categorizedBriefing: categorizedBriefingFromCards(actionableCards),
    displaySource: "uf_authority",
  };
}
