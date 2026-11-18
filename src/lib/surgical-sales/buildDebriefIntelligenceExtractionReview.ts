/**
 * Review Extracted Intelligence — structured extraction for rep approval before save.
 */

import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";
import { fieldLabelForDbKey } from "@/lib/surgical-sales/logUpdateProviderRouting";
import {
  confidenceForFieldUpdate,
  normalizeLogUpdateProviderIntelligenceFlag,
  recommendedUpdateDetail,
  recommendedUpdateHeadline,
} from "@/lib/surgical-sales/logUpdateReviewPresentation";
import { reviewFieldBucket } from "@/lib/surgical-sales/logUpdateReviewSelection";
import type { DebriefIntelligenceExtractionContext } from "@/lib/surgical-sales/debriefIntelligenceExtractionContext";
import { findCredentialingPlatformMatch } from "@/lib/surgical-sales/credentialingPlatforms";
import { buildDiscoveryIntelligenceGroupsView } from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";
import { hydrateDiscoveryContactFromLegacy } from "@/lib/surgical-sales/discoveryIntelligenceLegacyMigration";
import {
  openQuestionForIncompleteSignal,
  type DiscoveryOpenQuestionRow,
} from "@/lib/surgical-sales/discoveryIntelligenceOpenQuestions";
import {
  isDiscoverySignalStatusResolved,
  resolveDiscoveryStructuredSignalStatus,
  type DiscoveryStructuredSignalId,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import type { IntelligenceDomain } from "@/lib/surgical-sales/structuredIntelligenceAnalysis";
import { textHasUncertaintyMarkers } from "@/lib/surgical-sales/intelligenceClassificationGuardrails";
import { sanitizeFieldIntelligenceText } from "@/lib/surgical-sales/fieldIntelligenceLanguage";
import { removeResolvedIntelligenceGaps } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceGapReconciliation";
import {
  buildProposedContactFromExtraction,
  debriefContactFollowUpTask,
  extractContactNamesFromDebriefText,
  mergeWorkflowContactsForRecommendedActions,
  type DebriefProposedContactItem,
} from "@/lib/surgical-sales/debriefDetectedContact";
import { isPlausiblePersonName } from "@/lib/surgical-sales/debriefContactLeadExtraction";
import { extractMentionedPeopleFromDebriefText } from "@/lib/surgical-sales/debriefContactLeadExtraction";
import { OPPORTUNITY_INTELLIGENCE_DB_KEY_TO_SIGNAL } from "@/lib/surgical-sales/opportunityIntelligenceSignals";
import type {
  DebriefExtractionSignalKind,
  DebriefIntelligenceCategory,
} from "@/lib/surgical-sales/debriefIntelligenceCategories";
import {
  buildUniversalExtractionItems,
  canAutoApplyExtractedItem,
  debriefConfidenceDisplayLabel,
  type DebriefUniversalExtractedItem,
} from "@/lib/surgical-sales/debriefUniversalExtraction";
import {
  buildDebriefExecutiveBriefing,
  executiveBriefingToOrganizedNarrative,
  type DebriefExecutiveBriefing,
} from "@/lib/surgical-sales/debriefPostDictationSynthesis";
import { repIndicatesCredentialingPlatformUnknown } from "@/lib/surgical-sales/debriefCredentialingPlatformResolution";
import {
  runDebriefIntelligencePipeline,
  type DebriefIntelligencePipelineResult,
  type DebriefRulesOutcome,
} from "@/lib/surgical-sales/debriefIntelligencePipeline";
import {
  buildStillToValidateFromFacts,
  proposedContactsFromAtomicFacts,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import { buildDebriefReviewDecisionContext } from "@/lib/surgical-sales/debriefIntelligencePipeline/buildDebriefReviewDecisionContext";
import {
  filterProposedContactsWithGuardContext,
  type ReviewUpdateGuardContext,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewUpdateGuards";
import {
  classifyIntelligenceUpdateItemMaturity,
  extractedIntelligenceMaturityLabel,
  type ExtractedIntelligenceMaturity,
} from "@/lib/surgical-sales/extractedIntelligenceClassification";

export type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
export type {
  DebriefExtractionCategory,
  DebriefExtractionSignalKind,
  DebriefIntelligenceCategory,
  DebriefUniversalExtractedItem,
} from "@/lib/surgical-sales/debriefUniversalExtraction";

export type DebriefReviewConfidenceTier = "high_confidence" | "needs_review" | "ambiguous";

export type DebriefIntelligenceUpdateItem = {
  id: string;
  field: LogUpdateRoutedFieldUpdate;
  extractedStatement: string;
  intelligenceFieldLabel: string;
  proposedValue: string;
  confidenceTier: DebriefReviewConfidenceTier;
  /** High / Medium / Low — style-agnostic extraction confidence. */
  confidenceLabel: "High" | "Medium" | "Low";
  sourceQuote: string | null;
  evidenceQuote: string;
  primaryCategory: DebriefIntelligenceCategory;
  secondaryCategories: DebriefIntelligenceCategory[];
  signalKind: DebriefExtractionSignalKind;
  /** @deprecated Use primaryCategory */
  category: DebriefExtractionSignalKind;
  suggestedUpdate: string;
  requiresRepConfirmation: boolean;
  discoverySignalId: DiscoveryStructuredSignalId | null;
  hasConflict: boolean;
  /** Pre-save maturity — Referenced / Learning / Confirmed. */
  intelligenceMaturity: ExtractedIntelligenceMaturity;
  intelligenceMaturityLabel: string;
};

export type DebriefCredentialingPlatformMatch = {
  id: string;
  mentionedName: string;
  matchedPlatformId: string | null;
  matchedPlatformName: string | null;
  suggestCreateNew: boolean;
  confidenceTier: DebriefReviewConfidenceTier;
  sourceQuote: string | null;
  accepted: boolean;
};

export type DebriefPathwayImpact = {
  readinessBeforePercent: number;
  readinessAfterPercent: number;
  lines: string[];
  nextRecommendedMove: string | null;
};

export type DebriefMentionedPersonItem = {
  id: string;
  displayName: string;
  sourceQuote: string | null;
};

export type DebriefIntelligenceExtractionReview = {
  title: string;
  summary: string | null;
  intelligenceUpdates: DebriefIntelligenceUpdateItem[];
  /** All extracted rows (fields, contacts, platforms, unknowns) with universal metadata. */
  extractedItems: DebriefUniversalExtractedItem[];
  proposedContacts: DebriefProposedContactItem[];
  /** Names heard without a clear support-contact role — narrative only. */
  mentionedPeople: DebriefMentionedPersonItem[];
  platformMatches: DebriefCredentialingPlatformMatch[];
  pathwayImpact: DebriefPathwayImpact | null;
  unresolvedItems: string[];
  organizedNarrative: string | null;
  /** Post-dictation synthesis — access summary, participants, clinical/commercial snapshot. */
  executiveBriefing: DebriefExecutiveBriefing;
  /** Multi-pass pipeline (facts → classify → rules — internal only, not Review Updates UI). */
  pipeline: DebriefIntelligencePipelineResult;
  /** Normalized atomic facts — source of truth for Review Updates rendering. */
  atomicFacts: DebriefAtomicFact[];
  /** CRM field rows linked behind review cards (not rendered as separate cards). */
  fieldUpdates: LogUpdateRoutedFieldUpdate[];
};

export type { DebriefExecutiveBriefing } from "@/lib/surgical-sales/debriefPostDictationSynthesis";

const DB_KEY_TO_SIGNAL: Partial<Record<string, DiscoveryStructuredSignalId>> = {
  provider_observation_feasibility: "observation_approval",
  provider_evaluation_openness: "observation_approval",
  provider_observation_coordinator_contact: "scheduling_owner",
  provider_scheduling_contact: "scheduling_owner",
  provider_facility_scheduling_contact: "scheduling_owner",
  provider_observation_scheduling_control: "scheduling_owner",
  provider_observation_access_path: "facility_vendor_pathway",
  provider_credentialing_platform_name: "facility_vendor_pathway",
  provider_credentialing_status: "facility_vendor_pathway",
  provider_observation_credentialing_needed: "facility_vendor_pathway",
  provider_observation_best_days_case_types: "observation_logistics",
  provider_procedure_focus: "workflow_visibility",
  provider_technique_preferences: "workflow_visibility",
  provider_workflow_pain_points: "workflow_visibility",
  provider_competitive_products: "product_alignment",
  provider_preference_card_signals: "product_alignment",
  provider_champion_potential: "clinical_champion",
  provider_decision_maker_status: "decision_influence",
  influence_level: "decision_influence",
  ...OPPORTUNITY_INTELLIGENCE_DB_KEY_TO_SIGNAL,
};

const DOMAIN_TO_SIGNAL: Partial<Record<IntelligenceDomain, DiscoveryStructuredSignalId>> = {
  or_access: "observation_approval",
  scheduling: "scheduling_owner",
  credentialing: "facility_vendor_pathway",
  workflow: "opportunity_workflow_inefficiencies",
  product_fit: "opportunity_products_in_use",
  stakeholders: "clinical_champion",
  evaluation: "opportunity_clinical_frustrations",
  case_mix: "opportunity_future_signals",
};

function confidenceTierFromUniversal(input: {
  confidence: DebriefUniversalExtractedItem["confidence"];
  requiresRepConfirmation: boolean;
  hasConflict: boolean;
}): DebriefReviewConfidenceTier {
  if (input.hasConflict) return "needs_review";
  if (input.confidence === "low" || input.requiresRepConfirmation) return "ambiguous";
  if (input.confidence === "high") return "high_confidence";
  return "needs_review";
}

const PLATFORM_NAME_PATTERNS = [
  /\bintelli\s*centrics\b/i,
  /\bsec3ure\b/i,
  /\breptrax\b/i,
  /\bvendormate\b/i,
  /\bsymplr\b/i,
  /\bgreen\s+security\b/i,
  /\bghx\b/i,
];

function signalForField(field: LogUpdateRoutedFieldUpdate, aiDomain?: IntelligenceDomain): DiscoveryStructuredSignalId | null {
  if (field.dbKey && DB_KEY_TO_SIGNAL[field.dbKey]) return DB_KEY_TO_SIGNAL[field.dbKey]!;
  if (aiDomain && DOMAIN_TO_SIGNAL[aiDomain]) return DOMAIN_TO_SIGNAL[aiDomain]!;
  return null;
}

function domainForField(
  field: LogUpdateRoutedFieldUpdate,
  review: LogUpdateParseResult,
): IntelligenceDomain | undefined {
  const ai = review.aiMapping;
  if (!ai) return undefined;
  const confirmed = ai.confirmed_updates.find((_, i) => field.id === `ai-confirmed-${i}`);
  if (confirmed) return confirmed.domain;
  const partial = ai.partial_updates.find((_, i) => field.id === `ai-partial-${i}`);
  return partial?.domain;
}

export function sourceQuoteForField(
  field: LogUpdateRoutedFieldUpdate,
  review: LogUpdateParseResult,
): string | null {
  const ai = review.aiMapping;
  if (!ai) return null;
  const domain = domainForField(field, review);
  const signals = ai.operational_signals ?? [];
  const match =
    signals.find((s) => domain && s.domain === domain) ??
    signals.find((s) =>
      s.signal.toLowerCase().includes(field.label.toLowerCase().slice(0, 12)),
    );
  const evidence = match?.evidence?.trim();
  if (evidence && evidence.length > 8) return evidence.slice(0, 400);
  return null;
}

export function resolveDebriefReviewConfidenceTier(
  field: LogUpdateRoutedFieldUpdate,
  review: LogUpdateParseResult,
): DebriefReviewConfidenceTier {
  const ai = review.aiMapping;
  const conf = confidenceForFieldUpdate(field, ai ?? null);
  const blob = `${field.label} ${field.proposedValue} ${sourceQuoteForField(field, review) ?? ""}`;

  if (field.conflict && !field.conflict.resolution) return "needs_review";
  if (textHasUncertaintyMarkers(blob)) return "ambiguous";
  if (reviewFieldBucket(field, ai) === "recommended" && conf === "high") return "high_confidence";
  if (conf === "low" || field.id.startsWith("ai-partial-")) return "ambiguous";
  if (conf === "medium") return "needs_review";
  return "needs_review";
}

function simulateContactAfterUpdates(
  contact: Record<string, unknown>,
  acceptedFields: LogUpdateRoutedFieldUpdate[],
): Record<string, unknown> {
  const next = { ...contact };
  for (const field of acceptedFields) {
    if (field.proposedValue.trim()) next[field.dbKey] = field.proposedValue.trim();
  }
  return next;
}

function buildPathwayImpact(input: {
  discoveryContext: DebriefIntelligenceExtractionContext;
  providerContact: Record<string, unknown>;
  acceptedFields: LogUpdateRoutedFieldUpdate[];
  unresolved: string[];
  review: LogUpdateParseResult;
}): DebriefPathwayImpact {
  const before = input.discoveryContext.discoveryReadinessPercent;
  const afterContact = simulateContactAfterUpdates(input.providerContact, input.acceptedFields);
  const afterView = buildDiscoveryIntelligenceGroupsView({ contact: afterContact });
  const after = afterView.confidenceScore;

  const lines: string[] = [];
  if (after !== before) {
    lines.push(`Discovery readiness: ${before}% → ${after}%`);
  }

  const resolvedSignals = new Set<DiscoveryStructuredSignalId>();
  for (const field of input.acceptedFields) {
    const signalId = signalForField(field, domainForField(field, input.review));
    if (!signalId) continue;
    const beforeStatus = resolveDiscoveryStructuredSignalStatus(signalId, input.providerContact);
    const afterStatus = resolveDiscoveryStructuredSignalStatus(signalId, afterContact);
    if (
      !isDiscoverySignalStatusResolved(signalId, beforeStatus) &&
      isDiscoverySignalStatusResolved(signalId, afterStatus)
    ) {
      resolvedSignals.add(signalId);
    }
    if (beforeStatus !== afterStatus && afterStatus !== beforeStatus) {
      const label =
        input.discoveryContext.signalStatuses.find((s) => s.signalId === signalId)?.label ??
        signalId;
      lines.push(`${label}: ${beforeStatus} → ${afterStatus}`);
    }
  }

  for (const signalId of resolvedSignals) {
    const q = openQuestionForIncompleteSignal(
      signalId,
      resolveDiscoveryStructuredSignalStatus(signalId, input.providerContact),
    );
    if (q) lines.push(`Open question cleared: ${q.replace(/\?$/, "")}`);
  }

  let nextRecommendedMove: string | null = null;
  const openAfter = input.discoveryContext.openQuestions.filter((q) => {
    const status = resolveDiscoveryStructuredSignalStatus(q.signalId, afterContact);
    return !isDiscoverySignalStatusResolved(q.signalId, status);
  });
  if (openAfter[0]) {
    nextRecommendedMove = `Next: ${openAfter[0].label.replace(/\?$/, "")}`;
  } else if (input.unresolved[0]) {
    nextRecommendedMove = `Still unclear: ${input.unresolved[0]}`;
  } else if (input.acceptedFields.some((f) => f.dbKey.includes("scheduling"))) {
    nextRecommendedMove = "Next: schedule observation logistics";
  }

  return {
    readinessBeforePercent: before,
    readinessAfterPercent: after,
    lines,
    nextRecommendedMove,
  };
}

function extractPlatformMentions(
  text: string,
  platforms: DebriefIntelligenceExtractionContext["credentialingPlatforms"],
): DebriefCredentialingPlatformMatch[] {
  if (repIndicatesCredentialingPlatformUnknown(text)) {
    return [];
  }
  const matches: DebriefCredentialingPlatformMatch[] = [];
  const seen = new Set<string>();

  const tryAdd = (name: string, quote: string, tier: DebriefReviewConfidenceTier) => {
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const catalogMatch = findCredentialingPlatformMatch(platforms, name);
    matches.push({
      id: `platform-${key.slice(0, 24)}`,
      mentionedName: name,
      matchedPlatformId: catalogMatch?.id ?? null,
      matchedPlatformName: catalogMatch?.name ?? null,
      suggestCreateNew: !catalogMatch,
      confidenceTier: tier,
      sourceQuote: quote.slice(0, 300),
      accepted: tier === "high_confidence" && Boolean(catalogMatch),
    });
  };

  for (const pattern of PLATFORM_NAME_PATTERNS) {
    const m = text.match(pattern);
    if (!m) continue;
    const name = m[0].trim();
    const idx = text.search(pattern);
    const quote = text.slice(Math.max(0, idx - 30), idx + name.length + 50);
    const hedged =
      /\b(may|might|think|probably|possibly|could be wrong|not sure|unsure|don't know)\b/i.test(
        quote,
      );
    if (hedged) continue;
    tryAdd(name, quote, "high_confidence");
  }

  const credentialingSignals =
    platforms.length > 0
      ? platforms.filter((p) => text.toLowerCase().includes(p.name_normalized))
      : [];
  for (const p of credentialingSignals) {
    const idx = text.toLowerCase().indexOf(p.name_normalized);
    tryAdd(
      p.name,
      text.slice(Math.max(0, idx - 30), idx + p.name.length + 40),
      /\b(use|uses|through|via)\b/i.test(text.slice(idx - 20, idx + 20))
        ? "high_confidence"
        : "needs_review",
    );
  }

  return matches;
}

function platformMatchesFromAtomicFacts(
  facts: import("@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts").DebriefAtomicFact[],
  platforms: DebriefIntelligenceExtractionContext["credentialingPlatforms"],
): DebriefCredentialingPlatformMatch[] {
  const matches: DebriefCredentialingPlatformMatch[] = [];
  const seen = new Set<string>();

  for (const fact of facts) {
    if (fact.fact_type !== "credentialing") continue;
    const name = fact.entity.trim() || fact.value.trim();
    if (!name || name.toLowerCase() === "unknown") continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const hedged = fact.confidence === "low" || /unconfirmed|unknown|maybe|think/i.test(fact.value);
    const catalogMatch = findCredentialingPlatformMatch(platforms, name);
    const tier: DebriefReviewConfidenceTier =
      hedged || fact.value.toLowerCase() === "unconfirmed"
        ? "needs_review"
        : catalogMatch
          ? "high_confidence"
          : "needs_review";

    matches.push({
      id: `platform-${key.slice(0, 24)}`,
      mentionedName: name,
      matchedPlatformId: catalogMatch?.id ?? null,
      matchedPlatformName: catalogMatch?.name ?? null,
      suggestCreateNew: !catalogMatch,
      confidenceTier: tier,
      sourceQuote: fact.evidence.slice(0, 300),
      accepted: tier === "high_confidence" && Boolean(catalogMatch),
    });
  }

  return matches;
}

export function buildDebriefIntelligenceExtractionReview(input: {
  review: LogUpdateParseResult;
  discoveryContext?: DebriefIntelligenceExtractionContext | null;
  providerContact?: Record<string, unknown> | null;
  providerLabel?: string | null;
  sourceReference?: string;
  proposedContacts?: DebriefProposedContactItem[];
  guardContext?: ReviewUpdateGuardContext;
}): DebriefIntelligenceExtractionReview {
  const review = normalizeLogUpdateProviderIntelligenceFlag(input.review);
  const fields = review.usesProviderIntelligence ? review.fieldUpdates : [];
  const atomicFacts = review.atomicFacts ?? [];

  const guardContext =
    input.guardContext ??
    buildDebriefReviewDecisionContext({
      providerContact: input.providerContact,
      providerLabel: input.providerLabel,
      discoveryContext: input.discoveryContext,
    });
  const supportContacts = input.discoveryContext?.supportContacts;

  const unresolvedFromFacts = buildStillToValidateFromFacts(atomicFacts);
  let unresolvedItems = [...unresolvedFromFacts, ...review.intelligenceReview.stillWorthConfirming]
    .map((t) => sanitizeFieldIntelligenceText(t, { maxLen: 200 }))
    .filter((t, i, arr) => t && arr.indexOf(t) === i)
    .slice(0, 6);

  const text = review.sourceText;
  const sourceReference =
    input.sourceReference?.trim() || `debrief:${new Date().toISOString().slice(0, 10)}`;
  const knownNames = new Set(
    (input.discoveryContext?.supportContacts ?? []).map((c) => c.name.toLowerCase()),
  );

  const rawProposedContacts: DebriefProposedContactItem[] =
    input.proposedContacts ??
    (atomicFacts.length > 0
      ? proposedContactsFromAtomicFacts({
          facts: atomicFacts,
          dictation: text,
          sourceReference,
          knownNames,
          guardContext,
        })
      : extractContactNamesFromDebriefText(text)
          .filter((c) => !knownNames.has(c.name.toLowerCase()))
          .filter((c) => isPlausiblePersonName(c.name))
          .map((c, i) =>
            buildProposedContactFromExtraction({
              name: c.name,
              quote: c.quote,
              sourceReference,
              debriefText: text,
              index: i,
              mentionLevel: c.mentionLevel,
            }),
          ));

  const proposedContacts = filterProposedContactsWithGuardContext(
    rawProposedContacts,
    guardContext,
    supportContacts,
  );

  const mentionedPeople: DebriefMentionedPersonItem[] = extractMentionedPeopleFromDebriefText(text)
    .filter((c) => !knownNames.has(c.name.toLowerCase()))
    .filter((c) => !proposedContacts.some((p) => p.displayName.toLowerCase() === c.name.toLowerCase()))
    .map((c, i) => ({
      id: `mentioned-${i}`,
      displayName: c.name,
      sourceQuote: c.quote || null,
    }));

  const platformMatches =
    atomicFacts.length > 0
      ? platformMatchesFromAtomicFacts(atomicFacts, input.discoveryContext?.credentialingPlatforms ?? [])
      : input.discoveryContext
        ? extractPlatformMentions(text, input.discoveryContext.credentialingPlatforms)
        : [];

  const signalIdForField = (field: LogUpdateRoutedFieldUpdate) => {
    const domain = domainForField(field, review);
    return signalForField(field, domain);
  };

  const allExtractedItems = buildUniversalExtractionItems({
    review,
    discoveryContext: input.discoveryContext,
    proposedContacts,
    platformMatches,
    signalIdForField,
  });

  const fieldExtractionById = new Map(
    allExtractedItems
      .filter((item) => item.fieldUpdateId)
      .map((item) => [item.fieldUpdateId!, item]),
  );

  const intelligenceUpdates: DebriefIntelligenceUpdateItem[] = fields.map((field) => {
    const universal = fieldExtractionById.get(field.id);
    const domain = domainForField(field, review);
    const hasConflict = Boolean(field.conflict && !field.conflict.resolution);
    const tier = universal
      ? confidenceTierFromUniversal({
          confidence: universal.confidence,
          requiresRepConfirmation: universal.requiresRepConfirmation,
          hasConflict,
        })
      : resolveDebriefReviewConfidenceTier(field, review);
    const evidenceQuote =
      universal?.evidenceQuote || sourceQuoteForField(field, review) || field.proposedValue.trim();
    const itemCore = {
      id: field.id,
      field,
      extractedStatement: recommendedUpdateHeadline(field),
      intelligenceFieldLabel: field.label || fieldLabelForDbKey(field.dbKey),
      proposedValue: field.proposedValue.trim(),
      confidenceTier: tier,
      confidenceLabel: universal?.confidenceLabel ?? debriefConfidenceDisplayLabel("medium"),
      sourceQuote: evidenceQuote || null,
      evidenceQuote,
      primaryCategory: universal?.primaryCategory ?? "workflow_intelligence",
      secondaryCategories: universal?.secondaryCategories ?? [],
      signalKind: universal?.signalKind ?? "inferred_signal",
      category: universal?.signalKind ?? universal?.category ?? "inferred_signal",
      suggestedUpdate: universal?.suggestedUpdate ?? recommendedUpdateHeadline(field),
      requiresRepConfirmation: universal?.requiresRepConfirmation ?? tier !== "high_confidence",
      discoverySignalId: signalForField(field, domain),
      hasConflict,
    };
    const intelligenceMaturity = classifyIntelligenceUpdateItemMaturity(itemCore);
    return {
      ...itemCore,
      intelligenceMaturity,
      intelligenceMaturityLabel: extractedIntelligenceMaturityLabel(intelligenceMaturity),
    };
  });

  const openAfterExtraction = (input.discoveryContext?.openQuestions ?? []).filter((q: DiscoveryOpenQuestionRow) => {
    const answered = intelligenceUpdates.some(
      (u) =>
        u.discoverySignalId === q.signalId &&
        u.field.accepted &&
        u.confidenceTier === "high_confidence" &&
        !u.requiresRepConfirmation,
    );
    return !answered;
  });
  for (const q of openAfterExtraction.slice(0, 6)) {
    if (!unresolvedItems.includes(q.label)) unresolvedItems.push(q.label);
  }

  // A fact cannot be both confirmed and unconfirmed: drop unresolved items
  // already answered by intelligence captured in this review.
  unresolvedItems = removeResolvedIntelligenceGaps(unresolvedItems, {
    fieldUpdates: fields.map((field) => ({
      dbKey: field.dbKey,
      proposedValue: field.proposedValue,
    })),
    contactLines: proposedContacts.map((contact) =>
      [contact.displayName, contact.roleLabel, contact.workflowLabel, contact.ownershipLabel]
        .filter(Boolean)
        .join(" — "),
    ),
  });

  const acceptedHigh = intelligenceUpdates.filter(
    (u) =>
      u.field.accepted &&
      u.confidenceTier === "high_confidence" &&
      !u.requiresRepConfirmation &&
      canAutoApplyExtractedItem({
        confidence: u.confidenceLabel === "High" ? "high" : u.confidenceLabel === "Low" ? "low" : "medium",
        requiresRepConfirmation: u.requiresRepConfirmation,
        signalKind: u.signalKind,
        category: u.signalKind,
      }),
  );
  const pathwayImpact =
    input.discoveryContext && input.providerContact
      ? buildPathwayImpact({
          discoveryContext: input.discoveryContext,
          providerContact: hydrateDiscoveryContactFromLegacy(input.providerContact),
          acceptedFields: acceptedHigh.map((u) => u.field),
          unresolved: unresolvedItems,
          review,
        })
      : null;

  const pipelineRun = runDebriefIntelligencePipeline({
    dictation: text,
    atomicFacts,
    proposedContacts,
  });
  const pipelineContacts = applyPipelineContactMentionLevels(
    proposedContacts,
    pipelineRun.pass3_rules,
  );
  const { contacts: mergedPipelineContacts, actions: mergedRecommendedActions } =
    mergeWorkflowContactsForRecommendedActions({
      contacts: pipelineContacts,
      actions: pipelineRun.recommendedActions,
      dictation: text,
      sourceReference,
    });
  const pipeline = {
    ...pipelineRun,
    recommendedActions: mergedRecommendedActions,
  };

  const executiveBriefing = buildDebriefExecutiveBriefing({
    dictation: text,
    review,
    proposedContacts: mergedPipelineContacts,
  });
  executiveBriefing.keyTakeawayLines = [...pipeline.pass4_synthesis.keyTakeawayLines];
  executiveBriefing.nextActionLines = [...pipeline.pass4_synthesis.nextActionLines];

  const organizedNarrative =
    pipeline.pass4_synthesis.keyTakeawayLines.join("\n") ||
    executiveBriefingToOrganizedNarrative(executiveBriefing);

  return {
    title: "Review Extracted Intelligence",
    summary: null,
    intelligenceUpdates,
    extractedItems: allExtractedItems,
    proposedContacts: mergedPipelineContacts,
    mentionedPeople,
    platformMatches,
    pathwayImpact,
    unresolvedItems,
    organizedNarrative,
    executiveBriefing,
    pipeline,
    atomicFacts,
    fieldUpdates: fields,
  };
}

function applyPipelineContactMentionLevels(
  contacts: DebriefProposedContactItem[],
  rules: DebriefRulesOutcome,
): DebriefProposedContactItem[] {
  return contacts.map((contact) => {
    const key = contact.displayName.toLowerCase();
    const isSupport = rules.supportContactCandidateNames.some((n) => n.toLowerCase() === key);
    const isWorkflow = rules.workflowParticipantNames.some((n) => n.toLowerCase() === key);
    if (isWorkflow && !isSupport) {
      return {
        ...contact,
        mentionLevel: "workflow_participant" as const,
        contactDetailsMissing: !(contact.email.trim() || contact.phone.trim()),
      };
    }
    return contact;
  });
}

export function acceptAllHighConfidenceUpdates(review: LogUpdateParseResult): LogUpdateParseResult {
  const extraction = buildDebriefIntelligenceExtractionReview({ review });
  const highIds = new Set(
    extraction.intelligenceUpdates
      .filter((u) => {
        if (u.hasConflict || u.requiresRepConfirmation) return false;
        if (u.confidenceLabel === "Low") return false;
        return canAutoApplyExtractedItem({
          confidence: u.confidenceLabel === "High" ? "high" : "medium",
          requiresRepConfirmation: u.requiresRepConfirmation,
          signalKind: u.signalKind,
          category: u.signalKind,
        });
      })
      .map((u) => u.id),
  );

  if (!review.usesProviderIntelligence) return review;

  return {
    ...review,
    fieldUpdates: review.fieldUpdates.map((field) => ({
      ...field,
      accepted: highIds.has(field.id) ? true : field.accepted,
    })),
  };
}

export function applyExtractionItemAccepted(
  review: LogUpdateParseResult,
  itemId: string,
  accepted: boolean,
): LogUpdateParseResult {
  if (!review.usesProviderIntelligence) return review;
  return {
    ...review,
    fieldUpdates: review.fieldUpdates.map((field) =>
      field.id === itemId ? { ...field, accepted } : field,
    ),
  };
}

export function applyExtractionItemValue(
  review: LogUpdateParseResult,
  itemId: string,
  value: string,
): LogUpdateParseResult {
  if (!review.usesProviderIntelligence) return review;
  return {
    ...review,
    fieldUpdates: review.fieldUpdates.map((field) =>
      field.id === itemId ? { ...field, proposedValue: value.trim(), accepted: true } : field,
    ),
  };
}

export function buildInitialProposedContacts(input: {
  review: LogUpdateParseResult;
  discoveryContext?: DebriefIntelligenceExtractionContext | null;
  sourceReference: string;
  providerContact?: Record<string, unknown> | null;
  providerLabel?: string | null;
  guardContext?: ReviewUpdateGuardContext;
}): DebriefProposedContactItem[] {
  const text = input.review.sourceText;
  const knownNames = new Set(
    (input.discoveryContext?.supportContacts ?? []).map((c) => c.name.toLowerCase()),
  );
  const atomicFacts = input.review.atomicFacts ?? [];
  const guardContext =
    input.guardContext ??
    buildDebriefReviewDecisionContext({
      providerContact: input.providerContact,
      providerLabel: input.providerLabel,
      discoveryContext: input.discoveryContext,
    });
  const supportContacts = input.discoveryContext?.supportContacts;

  const fromText = extractContactNamesFromDebriefText(text)
    .filter((c) => !knownNames.has(c.name.toLowerCase()))
    .filter((c) => isPlausiblePersonName(c.name))
    .map((c, i) =>
      buildProposedContactFromExtraction({
        name: c.name,
        quote: c.quote,
        sourceReference: input.sourceReference,
        debriefText: text,
        index: i,
        mentionLevel: c.mentionLevel,
      }),
    );

  let merged: DebriefProposedContactItem[];
  if (atomicFacts.length > 0) {
    const fromAtomic = proposedContactsFromAtomicFacts({
      facts: atomicFacts,
      dictation: text,
      sourceReference: input.sourceReference,
      knownNames,
      guardContext,
    });
    if (fromAtomic.length === 0) {
      merged = fromText;
    } else {
      const seen = new Set(fromAtomic.map((contact) => contact.displayName.toLowerCase()));
      merged = [...fromAtomic];
      for (const contact of fromText) {
        const key = contact.displayName.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(contact);
      }
    }
  } else {
    merged = fromText;
  }

  return filterProposedContactsWithGuardContext(merged, guardContext, supportContacts);
}

export function pendingContactFollowUpHints(contacts: DebriefProposedContactItem[]): string[] {
  return contacts
    .filter((c) => c.disposition === "add_details" && c.contactDetailsMissing)
    .map((c) => debriefContactFollowUpTask(c.displayName));
}

export { recommendedUpdateDetail };
