/**
 * Deterministic debrief extraction pipeline for regression tests (no live OpenAI).
 */

import {
  buildDebriefIntelligenceExtractionReview,
  buildInitialProposedContacts,
  type DebriefIntelligenceExtractionReview,
} from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import { buildDebriefReviewSections } from "@/lib/surgical-sales/buildDebriefReviewSections";
import {
  buildDebriefRecommendedNextSteps,
  buildRepFriendlySuggestedUpdates,
} from "@/lib/surgical-sales/debriefRepFriendlyReview";
import { buildDebriefActionableReviewCards } from "@/lib/surgical-sales/buildDebriefActionableReviewCards";
import { findBestMatchingDictationSentence, quoteIsAnchoredInDictation } from "@/lib/surgical-sales/debriefDictationEvidence";
import type { DebriefIntelligenceCategory } from "@/lib/surgical-sales/debriefIntelligenceCategories";
import {
  classifyEngagementOutcomeFromDebrief,
  resolveProviderObservationStatusForEngagementOutcome,
  type ClassifiedEngagementOutcomeId,
} from "@/lib/surgical-sales/engagements/classifyEngagementOutcomeFromDebrief";
import {
  engagementOutcomeAdvancesPathway,
} from "@/lib/surgical-sales/pathway/pathwayStageAdvancement";
import { deriveGatedPathwayStage, type PathwayGateInput } from "@/lib/surgical-sales/pathwayStageGates";
import { discoveryAccessReadyContact } from "@/lib/surgical-sales/salesPathwayTestFixtures";
import type { SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";
import {
  assessObservationAccessFromDebrief,
  debriefExplicitlyApprovesObservation,
} from "@/lib/surgical-sales/observationApprovalDebriefMapping";
import { buildParseResultFromDebriefFacts } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import { buildRegressionAtomicFactsFromDictation } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefRegressionAtomicFactStandIn";
import type { LogUpdateOpenAiMapping } from "@/lib/surgical-sales/logUpdateOpenAiMapping";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import { PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS } from "@/lib/surgical-sales/intelligenceScopeInference";
import type { DebriefPersonMentionLevel } from "@/lib/surgical-sales/debriefDetectedContact";
import type { ObservationStatusChoice } from "@/lib/surgical-sales/observationStatus";

export function emptyDebriefMapping(): LogUpdateOpenAiMapping {
  return {
    summary: "",
    confidence: "medium",
    reasoning: "",
    source_scope: "debrief:test",
    operational_signals: [],
    confirmed_updates: [],
    partial_updates: [],
    still_to_validate: [],
    recommended_next_moves: [],
    do_not_update: [],
  };
}

/** @deprecated Regression-only — converts legacy mapping fixtures to atomic facts. */
export function atomicFactsFromLegacyMapping(
  mapping: LogUpdateOpenAiMapping,
  dictation: string,
): DebriefAtomicFact[] {
  const facts: DebriefAtomicFact[] = [];

  const legacyEvidence = (preferred: string): string => {
    const bare = preferred.trim();
    if (bare && quoteIsAnchoredInDictation(bare.replace(/^["']|["']$/g, ""), dictation)) return bare;
    const matched = findBestMatchingDictationSentence(dictation, bare);
    if (matched) return matched;
    return dictation.slice(0, Math.min(240, dictation.length)).trim();
  };

  const domainToType = (domain: string): DebriefAtomicFact["fact_type"] => {
    switch (domain) {
      case "or_access":
        return "observation_access";
      case "credentialing":
        return "credentialing";
      case "scheduling":
      case "stakeholders":
        return "workflow_contact";
      case "relationship":
        return "relationship";
      case "product_fit":
      case "evaluation":
        return "product_fit";
      case "next_steps":
        return "follow_up";
      case "case_mix":
      case "workflow":
        return "clinical_focus";
      default:
        return "facility_intelligence";
    }
  };

  for (const row of [...mapping.confirmed_updates, ...mapping.partial_updates]) {
    const quoteFromReasoning = row.reasoning.match(/Source quote:\s*"([^"]+)"/i)?.[1]?.trim();
    const quote = legacyEvidence(quoteFromReasoning || row.value.trim());
    const nameMatch =
      row.value.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/) ??
      quote.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/);
    const factType = domainToType(row.domain);
    const isObservation = row.domain === "or_access";
    facts.push({
      fact_type: isObservation ? "observation_access" : factType,
      entity:
        row.domain === "stakeholders" || row.domain === "scheduling"
          ? nameMatch?.[1] ?? ""
          : factType === "credentialing"
            ? row.value.match(/\b(intellicentrics|symplr|reptrax|vendormate|ghx)\b/i)?.[0] ?? ""
            : "",
      attribute: isObservation ? "status" : row.label.trim().toLowerCase().replace(/\s+/g, "_").slice(0, 120),
      value: isObservation
        ? /approv|cleared/i.test(row.value)
          ? "approved"
          : /denied|not allow/i.test(row.value)
            ? "denied"
            : /open|interest|partial/i.test(row.value)
              ? "interested"
              : row.value.trim()
        : row.value.trim(),
      confidence: row.confidence,
      evidence: quote,
    });
  }

  for (const row of mapping.still_to_validate) {
    facts.push({
      fact_type: "follow_up",
      entity: "",
      attribute: "validation",
      value: row.question.trim(),
      confidence: "low",
      evidence: row.question.trim(),
    });
  }

  return facts.length > 0 ? facts : buildRegressionAtomicFactsFromDictation(dictation);
}

export function buildDebriefParseForRegression(input: {
  dictation: string;
  facts?: DebriefAtomicFact[];
  /** @deprecated Use facts — converted for legacy regression fixtures only. */
  mapping?: LogUpdateOpenAiMapping;
}): LogUpdateParseResult {
  const facts =
    input.facts ??
    (input.mapping
      ? atomicFactsFromLegacyMapping(input.mapping, input.dictation)
      : buildRegressionAtomicFactsFromDictation(input.dictation));
  return buildParseResultFromDebriefFacts({
    sourceText: input.dictation,
    facts,
    context: { providerId: "provider-regression-1", writableFieldKeys: [...PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS] },
    existingFields: {},
    mappingSource: "regression_stand_in",
  });
}

const BASE_PATHWAY_GATE: PathwayGateInput = {
  contact: { provider_observation_feasibility: "unknown" },
  cases: [],
  engagements: [],
};

export type DebriefExtractionPipelineResult = {
  dictation: string;
  classifiedOutcomeId: ClassifiedEngagementOutcomeId;
  classifiedRationale: string;
  observationAccess: ReturnType<typeof assessObservationAccessFromDebrief>;
  observationApprovalExplicit: boolean;
  providerObservationStatus: ObservationStatusChoice | null;
  pathwayStageBefore: SalesPathwayStageId;
  pathwayStageAfterDebriefAlone: SalesPathwayStageId;
  pathwayStageAfterExplicitApprovalOnFile: SalesPathwayStageId;
  engagementOutcomeAdvancesPathway: boolean;
  parse: LogUpdateParseResult;
  extraction: DebriefIntelligenceExtractionReview;
  proposedContacts: ReturnType<typeof buildInitialProposedContacts>;
  primaryCategories: DebriefIntelligenceCategory[];
  signalKinds: string[];
  confidenceLabels: Array<"High" | "Medium" | "Low">;
  evidenceQuotes: string[];
  recommendedNextSteps: string[];
  repFriendlyUpdateCount: number;
};

export function runDebriefExtractionPipeline(input: {
  dictation: string;
  facts?: DebriefAtomicFact[];
  /** @deprecated Use facts */
  mapping?: LogUpdateOpenAiMapping;
  recommendedNextMoves?: Array<{ action: string; priority?: string }>;
}): DebriefExtractionPipelineResult {
  const dictation = input.dictation.trim();
  const classified = classifyEngagementOutcomeFromDebrief(dictation);
  const parse = buildDebriefParseForRegression(input);
  const extraction = buildDebriefIntelligenceExtractionReview({ review: parse });
  const proposedContacts = buildInitialProposedContacts({
    review: parse,
    sourceReference: "Debrief regression",
  });
  const repFriendly = buildRepFriendlySuggestedUpdates({
    extraction,
    review: parse,
    proposedContacts,
  });
  const recommendedNextSteps = buildDebriefRecommendedNextSteps({
    review: parse,
    extraction,
    proposedContacts,
    followUp: { required: [], helpful: [] },
  });
  const reviewCards = buildDebriefActionableReviewCards({
    extraction,
    proposedContacts,
    dictation,
  });

  const providerObservationStatus = resolveProviderObservationStatusForEngagementOutcome({
    outcomeId: classified.outcomeId,
    debriefText: dictation,
  });

  const pathwayStageBefore = deriveGatedPathwayStage(BASE_PATHWAY_GATE);
  const pathwayStageAfterDebriefAlone = deriveGatedPathwayStage(BASE_PATHWAY_GATE);
  const pathwayStageAfterExplicitApprovalOnFile = deriveGatedPathwayStage({
    ...BASE_PATHWAY_GATE,
    contact: discoveryAccessReadyContact(),
  });

  const primaryCategories = [
    ...new Set([
      ...extraction.intelligenceUpdates.map((u) => u.primaryCategory),
      ...extraction.pipeline.intelligenceCaptured.map((item) => item.intelligenceCategory),
    ]),
    ...(proposedContacts.length > 0 ? (["people_contacts"] as const) : []),
  ];
  const signalKinds = [
    ...new Set([
      ...extraction.intelligenceUpdates.map((u) => u.signalKind),
      ...(extraction.pipeline.pass3_rules.observationApprovedExplicit ? ["approval_signal"] : []),
    ]),
  ];
  const confidenceLabels = extraction.intelligenceUpdates.map((u) => u.confidenceLabel);
  const evidenceQuotes = [
    ...extraction.intelligenceUpdates.map((u) => u.evidenceQuote),
    ...repFriendly.flatMap((g) => g.updates.map((u) => u.evidenceQuote)),
    ...proposedContacts.map((c) => c.sourceQuote).filter(Boolean) as string[],
  ];

  return {
    dictation,
    classifiedOutcomeId: classified.outcomeId,
    classifiedRationale: classified.rationale,
    observationAccess: assessObservationAccessFromDebrief(dictation),
    observationApprovalExplicit: debriefExplicitlyApprovesObservation(dictation),
    providerObservationStatus,
    pathwayStageBefore,
    pathwayStageAfterDebriefAlone,
    pathwayStageAfterExplicitApprovalOnFile,
    engagementOutcomeAdvancesPathway: engagementOutcomeAdvancesPathway({
      outcomeId: classified.outcomeId,
      debriefCompleted: true,
    }),
    parse,
    extraction,
    proposedContacts,
    primaryCategories,
    signalKinds,
    confidenceLabels,
    evidenceQuotes,
    recommendedNextSteps,
    repFriendlyUpdateCount: reviewCards.length,
  };
}

export function contactMentionLevels(
  proposed: DebriefExtractionPipelineResult["proposedContacts"],
): DebriefPersonMentionLevel[] {
  return proposed.map((c) => c.mentionLevel);
}

/** Rep-facing cards must anchor evidence in dictation; AI reasoning paraphrases may differ. */
export function allRepFriendlyEvidenceAnchoredInDictation(
  result: DebriefExtractionPipelineResult,
): boolean {
  const dictation = result.dictation;
  const cards = buildDebriefActionableReviewCards({
    extraction: result.extraction,
    proposedContacts: result.proposedContacts,
    dictation,
  });
  for (const card of cards) {
    for (const quote of card.evidenceQuotes) {
      const bare = quote.replace(/^["']|["']$/g, "").trim();
      if (!bare) continue;
      if (!quoteIsAnchoredInDictation(bare, dictation)) return false;
    }
  }
  return true;
}
