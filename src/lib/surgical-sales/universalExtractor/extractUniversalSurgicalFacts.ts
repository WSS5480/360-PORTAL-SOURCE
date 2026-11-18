/**
 * Universal Surgical Intelligence Extractor — rules-based shadow engine.
 *
 * Reuses OIE fragment splitting and evidence classification utilities.
 * Does NOT write to provider/opportunity/case stores. Facts only.
 */

import { splitObservationFragments } from "@/lib/surgical-sales/observationIntelligence/extractObservationFacts";
import {
  fragmentHasIntelligenceSignal,
  isConversationalFillerText,
} from "@/lib/surgical-sales/observationFindingQuality";
import {
  dedupeUniversalFacts,
} from "@/lib/surgical-sales/sharedIntelligence/dedupeIntelligenceSignals";
import {
  extractPrimaryProductMention,
  extractProductMentionsFromText,
} from "@/lib/surgical-sales/sharedIntelligence/extractProductMention";
import { extractProcedureSignalsFromText } from "@/lib/surgical-sales/sharedIntelligence/extractProcedureSignals";
import {
  extractUniversalCategorySignals,
  fragmentExpressesProductSubstitution,
} from "@/lib/surgical-sales/sharedIntelligence/extractUniversalCategorySignals";
import {
  fragmentLooksLikeSchedulerContact,
  shouldEmitUfStaffWorkflowQuote,
} from "@/lib/surgical-sales/sharedIntelligence/schedulerContactExtractionPolicy";
import { resolveAssertionForFragment } from "@/lib/surgical-sales/universalExtractor/assertionModel";
import {
  evidenceAppearsInNote,
  fragmentExpressesSizingIssue,
  fragmentExpressesVisualizationPain,
  fragmentIsNegatedAbsence,
  fragmentIsPositiveRoutine,
  scoreConfidence,
} from "@/lib/surgical-sales/universalExtractor/evidenceGrounding";
import {
  mergeUncertaintyNotes,
  mergeFragmentUncertaintyWithNote,
  splitFragmentEvidenceAndUncertainty,
  type EvidenceUncertaintySplit,
} from "@/lib/surgical-sales/universalExtractor/evidenceUncertaintySeparation";
import type {
  UniversalCanonicalConcept,
  UniversalDeclaredSourceType,
  UniversalExtractorInput,
  UniversalSurgicalFact,
} from "@/lib/surgical-sales/universalExtractor/types";

function fragmentIsDebriefSizingRejection(fragment: string, source: UniversalDeclaredSourceType): boolean {
  return (
    source === "debrief_validation" &&
    fragmentExpressesSizingIssue(fragment) &&
    resolveAssertionForFragment(source, fragment) === "rejected"
  );
}

function titleCasePhrase(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      /[a-z][A-Z]/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ");
}

function pushFact(
  target: UniversalSurgicalFact[],
  seen: Set<string>,
  fact: Omit<UniversalSurgicalFact, "source_type"> & { source_type?: never },
  sourceType: UniversalExtractorInput["declared_source_type"],
): void {
  const key = `${fact.concept}:${fact.normalized_label.toLowerCase()}:${fact.evidence_text.toLowerCase()}`;
  if (seen.has(key)) return;
  seen.add(key);
  target.push({ ...fact, source_type: sourceType });
}

function finalizeFactWithUncertainty(
  fact: Omit<UniversalSurgicalFact, "source_type">,
  split: EvidenceUncertaintySplit,
  explicit: boolean,
): Omit<UniversalSurgicalFact, "source_type"> {
  const evidence = split.factualEvidence.trim() || fact.evidence_text.trim();
  const uncertain = split.uncertain || fact.uncertain;
  return {
    ...fact,
    evidence_text: evidence,
    uncertain,
    notes: mergeUncertaintyNotes(fact.notes, split.uncertaintyNotes),
    confidence: scoreConfidence(evidence, uncertain, explicit),
  };
}

function extractProductMention(fragment: string): string | undefined {
  if (fragmentLooksLikeSchedulerContact(fragment)) return undefined;
  return extractPrimaryProductMention(fragment)?.productName;
}

function providerNameTokens(providerName?: string | null): Set<string> {
  const normalized = String(providerName ?? "")
    .replace(/\bDr\.?\b/gi, " ")
    .replace(/[^A-Za-z\s'-]/g, " ")
    .trim();
  const tokens = normalized
    .split(/\s+/)
    .map((token) => token.toLowerCase())
    .filter((token) => token.length >= 3);
  return new Set(tokens);
}

function sanitizeMismatchedProviderMentions(raw: string, providerName?: string | null): string {
  const allowed = providerNameTokens(providerName);
  if (allowed.size === 0) return raw;
  return raw.replace(/\bDr\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g, (match, captured: string) => {
    const tokens = String(captured)
      .split(/\s+/)
      .map((token) => token.toLowerCase())
      .filter(Boolean);
    return tokens.some((token) => allowed.has(token)) ? match : "this provider";
  });
}

function extractInventoryAndSupportFacts(
  fragment: string,
  split: EvidenceUncertaintySplit,
  input: UniversalExtractorInput,
  facts: UniversalSurgicalFact[],
  seen: Set<string>,
): void {
  const evidence = split.factualEvidence.trim();
  if (!evidence) return;

  const assertion = resolveAssertionForFragment(input.declared_source_type, fragment);
  const product = extractProductMention(evidence);

  const hasUnavailable =
    /\b(?:unavailable|not\s+available|out\s+of\s+stock|wasn't\s+available|was\s+not\s+available)\b/i.test(
      evidence,
    ) ||
    /\b(?:backup\s+sizes?|implant\s+inventory|mesh\s+inventory|inventory)\b[^.!?]{0,80}\b(?:not\s+stocked|stocked\s+correctly|not\s+ready|not\s+available|delays?)\b/i.test(
      evidence,
    ) ||
    /\b(?:not\s+stocked|not\s+ready|not\s+available|delays?)\b[^.!?]{0,80}\b(?:backup\s+sizes?|implant\s+inventory|mesh\s+inventory|inventory)\b/i.test(
      evidence,
    );
  const hasRequested = /\brequested\b/i.test(evidence);
  const hasAlternative = fragmentExpressesProductSubstitution(evidence);

  if (hasRequested) {
    const itemMatch = evidence.match(
      /\brequested\s+((?:implant\s+)?(?:size|product|screw|plate|tray|item)[^.!?]{0,60})/i,
    );
    pushFact(
      facts,
      seen,
      finalizeFactWithUncertainty(
        {
          concept: "requested_item",
          normalized_label: itemMatch?.[1]
            ? titleCasePhrase(itemMatch[1].trim())
            : "Requested item noted",
          assertion_level: assertion,
          evidence_text: evidence,
          confidence: "high",
          negated: false,
          uncertain: false,
          item_mentioned: itemMatch?.[1]?.trim() ?? "requested item",
          product_mentioned: product,
        },
        split,
        true,
      ),
      input.declared_source_type,
    );
  }

  if (hasUnavailable) {
    pushFact(
      facts,
      seen,
      finalizeFactWithUncertainty(
        {
          concept: "unavailable_item",
          normalized_label: "Requested item unavailable",
          assertion_level: assertion,
          evidence_text: evidence,
          confidence: "high",
          negated: false,
          uncertain: false,
          item_mentioned: product ?? "item",
          product_mentioned: product,
        },
        split,
        true,
      ),
      input.declared_source_type,
    );
    pushFact(
      facts,
      seen,
      finalizeFactWithUncertainty(
        {
          concept: "inventory_availability_issue",
          normalized_label: "Inventory or availability issue",
          assertion_level: assertion,
          evidence_text: evidence,
          confidence: "high",
          negated: false,
          uncertain: false,
          product_mentioned: product,
        },
        split,
        true,
      ),
      input.declared_source_type,
    );
  }

  if (hasAlternative) {
    pushFact(
      facts,
      seen,
      finalizeFactWithUncertainty(
        {
          concept: "alternative_used",
          normalized_label: "Alternative product or item used",
          assertion_level: assertion,
          evidence_text: evidence,
          confidence: "high",
          negated: false,
          uncertain: false,
          product_mentioned: product,
          notes: "Alternative substituted when primary was unavailable",
        },
        split,
        true,
      ),
      input.declared_source_type,
    );
  }
}

function extractSizingFact(
  fragment: string,
  split: EvidenceUncertaintySplit,
  input: UniversalExtractorInput,
  facts: UniversalSurgicalFact[],
  seen: Set<string>,
): void {
  const evidence = split.factualEvidence.trim();
  if (!evidence || !fragmentExpressesSizingIssue(evidence)) return;

  const assertion = resolveAssertionForFragment(input.declared_source_type, fragment);

  pushFact(
    facts,
    seen,
    finalizeFactWithUncertainty(
      {
        concept: "sizing_or_fit_issue",
        normalized_label: "Implant sizing or fit issue",
        assertion_level: assertion,
        evidence_text: evidence,
        confidence: "high",
        negated: false,
        uncertain: false,
        item_mentioned: "implant size",
        product_mentioned: extractProductMention(fragment),
      },
      split,
      /\b(?:issues?|trouble|unavailable|confirming)\b/i.test(evidence),
    ),
    input.declared_source_type,
  );
}

function extractVisualizationFact(
  fragment: string,
  split: EvidenceUncertaintySplit,
  input: UniversalExtractorInput,
  facts: UniversalSurgicalFact[],
  seen: Set<string>,
): void {
  const evidence = split.factualEvidence.trim();
  if (!evidence || !fragmentExpressesVisualizationPain(evidence)) return;

  const assertion = resolveAssertionForFragment(input.declared_source_type, fragment);

  pushFact(
    facts,
    seen,
    finalizeFactWithUncertainty(
      {
        concept: "visualization_or_access_issue",
        normalized_label: split.uncertain
          ? "Visualization or access concern (uncertain significance)"
          : "Visualization or access issue",
        assertion_level: assertion,
        evidence_text: evidence,
        confidence: "high",
        negated: false,
        uncertain: false,
      },
      split,
      /\b(?:extra\s+time|getting|difficult|hard)\b/i.test(evidence),
    ),
    input.declared_source_type,
  );
}

function extractPositiveFacts(
  fragment: string,
  split: EvidenceUncertaintySplit,
  input: UniversalExtractorInput,
  facts: UniversalSurgicalFact[],
  seen: Set<string>,
): void {
  if (fragmentIsDebriefSizingRejection(fragment, input.declared_source_type)) {
    return;
  }

  const evidence = split.factualEvidence.trim();
  if (!evidence) return;

  const assertion = resolveAssertionForFragment(input.declared_source_type, fragment);

  if (shouldEmitUfStaffWorkflowQuote(evidence)) {
    pushFact(
      facts,
      seen,
      finalizeFactWithUncertainty(
        {
          concept: "staff_workflow",
          normalized_label: "Positive staff workflow observed",
          assertion_level: assertion,
          evidence_text: evidence,
          confidence: "high",
          negated: false,
          uncertain: false,
        },
        split,
        true,
      ),
      input.declared_source_type,
    );
  }

  if (fragmentIsPositiveRoutine(evidence)) {
    pushFact(
      facts,
      seen,
      finalizeFactWithUncertainty(
        {
          concept: "case_outcome",
          normalized_label: "Routine or smooth case progression",
          assertion_level: assertion,
          evidence_text: evidence,
          confidence: "high",
          negated: false,
          uncertain: false,
          notes: "Positive workflow — not mapped to pain",
        },
        split,
        true,
      ),
      input.declared_source_type,
    );
  }
}

function extractProductFacts(
  fragment: string,
  split: EvidenceUncertaintySplit,
  input: UniversalExtractorInput,
  facts: UniversalSurgicalFact[],
  seen: Set<string>,
): void {
  const evidence = fragment.trim();
  if (!evidence || fragmentLooksLikeSchedulerContact(evidence)) return;

  const assertion = resolveAssertionForFragment(input.declared_source_type, fragment);
  const mentions = extractProductMentionsFromText({ text: evidence, mode: "debrief" });

  for (const mention of mentions) {
    const product = mention.productName;
    const concept = mention.isCompetitor ? "competitor_product" : "current_product";
    const factualEvidence = split.factualEvidence.trim();
    const mentionEvidence =
      factualEvidence &&
      factualEvidence.length <= 240 &&
      new RegExp(`\\b${product.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i").test(factualEvidence)
        ? factualEvidence
        : mention.evidence;
    const mentionSplit: EvidenceUncertaintySplit = {
      factualEvidence: mentionEvidence,
      uncertaintyPhrases: split.uncertaintyPhrases,
      uncertain: split.uncertain,
      uncertaintyNotes: split.uncertaintyNotes,
    };

    pushFact(
      facts,
      seen,
      finalizeFactWithUncertainty(
        {
          concept,
          normalized_label: mention.isCompetitor
            ? `Competitor product: ${product}`
            : `Current product: ${product}`,
          assertion_level: assertion,
          evidence_text: evidence,
          confidence: mention.confidence,
          negated: false,
          uncertain: false,
          product_mentioned: product,
        },
        mentionSplit,
        true,
      ),
      input.declared_source_type,
    );
  }
}

function introLikeSource(source: UniversalExtractorInput["declared_source_type"]): boolean {
  return ["intro_call", "debrief_note", "debrief_validation", "office_visit", "discovery_note"].includes(
    source,
  );
}

/** Intro/debrief fragments may retain procedure context when hedging strips factualEvidence. */
function resolveFragmentEvidence(
  fragment: string,
  split: EvidenceUncertaintySplit,
  declaredSource: UniversalExtractorInput["declared_source_type"],
): string {
  const factual = split.factualEvidence.trim();
  if (factual.length >= 8) return factual;

  const trimmedFragment = fragment.trim();
  if (
    introLikeSource(declaredSource) &&
    trimmedFragment.length >= 8 &&
    fragmentHasIntelligenceSignal(trimmedFragment)
  ) {
    return trimmedFragment;
  }

  if (
    trimmedFragment.length >= 8 &&
    /\b(?:send|share|email|text|follow\s+up|next steps?|my next step|clinical data)\b/i.test(trimmedFragment)
  ) {
    return trimmedFragment;
  }

  return factual;
}

function extractCategoryFacts(
  fragment: string,
  split: EvidenceUncertaintySplit,
  input: UniversalExtractorInput,
  facts: UniversalSurgicalFact[],
  seen: Set<string>,
): void {
  const evidence = resolveFragmentEvidence(fragment, split, input.declared_source_type);
  if (!evidence) return;

  const assertion = resolveAssertionForFragment(input.declared_source_type, fragment);
  for (const signal of extractUniversalCategorySignals(evidence, {
    providerName: input.context?.provider_display_name,
  })) {
    pushFact(
      facts,
      seen,
      finalizeFactWithUncertainty(
        {
          concept: signal.concept,
          normalized_label: signal.normalized_label,
          assertion_level: assertion,
          evidence_text: signal.evidence_text,
          confidence: signal.confidence,
          negated: false,
          uncertain: false,
          product_mentioned: signal.product_mentioned,
          person_mentioned: signal.person_mentioned,
          notes: signal.notes,
        },
        split,
        true,
      ),
      input.declared_source_type,
    );
  }
}

function extractIntroDebriefClinicalFacts(
  fragment: string,
  split: EvidenceUncertaintySplit,
  input: UniversalExtractorInput,
  facts: UniversalSurgicalFact[],
  seen: Set<string>,
): void {
  const introLike = introLikeSource(input.declared_source_type);
  const observationCase = input.declared_source_type === "observation_case";
  if (!introLike && !observationCase) return;

  const evidence = resolveFragmentEvidence(fragment, split, input.declared_source_type);
  if (!evidence) return;
  const assertion = resolveAssertionForFragment(input.declared_source_type, fragment);

  const signals = extractProcedureSignalsFromText({
    text: evidence,
    declaredSource: input.declared_source_type,
  });

  for (const signal of signals) {
    pushFact(
      facts,
      seen,
      {
        concept: signal.concept,
        normalized_label: signal.normalizedLabel,
        assertion_level: assertion,
        evidence_text: signal.evidence,
        confidence: signal.concept === "procedure_volume_trend" || observationCase ? "medium" : "low",
        negated: false,
        uncertain: false,
        notes: split.uncertain ? split.uncertaintyNotes : undefined,
      },
      input.declared_source_type,
    );
  }
}

function extractRoutineOrUnknown(
  fragment: string,
  split: EvidenceUncertaintySplit,
  input: UniversalExtractorInput,
  facts: UniversalSurgicalFact[],
  seen: Set<string>,
  hasOtherFacts: boolean,
): void {
  if (hasOtherFacts) return;

  const evidence = split.factualEvidence.trim();
  if (!evidence) return;

  const assertion = resolveAssertionForFragment(input.declared_source_type, fragment);

  if (fragmentIsPositiveRoutine(evidence) || isConversationalFillerText(evidence)) {
    if (introLikeSource(input.declared_source_type)) return;
    pushFact(
      facts,
      seen,
      finalizeFactWithUncertainty(
        {
          concept: "no_issue_or_routine",
          normalized_label: "No meaningful intelligence issue identified",
          assertion_level: assertion,
          evidence_text: evidence,
          confidence: "medium",
          negated: false,
          uncertain: false,
        },
        split,
        false,
      ),
      input.declared_source_type,
    );
    return;
  }

  if (split.uncertain && fragmentHasIntelligenceSignal(evidence)) {
    pushFact(
      facts,
      seen,
      finalizeFactWithUncertainty(
        {
          concept: "unknown",
          normalized_label: "Unclear intelligence signal",
          assertion_level: assertion,
          evidence_text: evidence,
          confidence: "low",
          negated: false,
          uncertain: true,
          notes: "Insufficient clarity to classify confidently",
        },
        split,
        false,
      ),
      input.declared_source_type,
    );
  }
}

function processFragment(
  fragment: string,
  input: UniversalExtractorInput,
  facts: UniversalSurgicalFact[],
  suppressed: UniversalSurgicalFact[],
  seen: Set<string>,
  suppressedSeen: Set<string>,
): void {
  const split = mergeFragmentUncertaintyWithNote(
    splitFragmentEvidenceAndUncertainty(fragment),
    input.raw_note,
  );
  const evidence = resolveFragmentEvidence(fragment, split, input.declared_source_type);
  if (!evidence || evidence.length < 8) return;
  if (!evidenceAppearsInNote(evidence, input.raw_note)) return;
  const isExplicitTaskLanguage = /\b(?:send|share|email|text|follow\s+up|next steps?|my next step|clinical data)\b/i.test(
    evidence,
  );
  if (isConversationalFillerText(evidence) && !fragmentHasIntelligenceSignal(evidence) && !isExplicitTaskLanguage) {
    return;
  }

  if (fragmentIsNegatedAbsence(evidence)) {
    pushFact(
      suppressed,
      suppressedSeen,
      {
        concept: "no_issue_or_routine",
        normalized_label: "Negated absence statement — not a problem fact",
        assertion_level: resolveAssertionForFragment(input.declared_source_type, fragment),
        evidence_text: evidence,
        confidence: "high",
        negated: true,
        uncertain: false,
        notes: "Suppressed: evidence asserts absence of problem",
      },
      input.declared_source_type,
    );
    return;
  }

  const beforeCount = facts.length;

  extractSizingFact(fragment, split, input, facts, seen);
  extractInventoryAndSupportFacts(fragment, split, input, facts, seen);
  extractVisualizationFact(fragment, split, input, facts, seen);
  extractProductFacts(fragment, split, input, facts, seen);
  extractIntroDebriefClinicalFacts(fragment, split, input, facts, seen);
  extractCategoryFacts(fragment, split, input, facts, seen);
  if (!introLikeSource(input.declared_source_type)) {
    extractPositiveFacts(fragment, split, input, facts, seen);
  }
  extractRoutineOrUnknown(fragment, split, input, facts, seen, facts.length > beforeCount);
}

/** Rules-based universal extraction — shadow mode only. */
export function extractUniversalSurgicalFacts(input: UniversalExtractorInput): {
  facts: UniversalSurgicalFact[];
  suppressed_facts: UniversalSurgicalFact[];
} {
  const raw = sanitizeMismatchedProviderMentions(
    input.raw_note.trim(),
    input.context?.provider_display_name,
  );
  if (!raw) {
    return { facts: [], suppressed_facts: [] };
  }

  const fragments = splitObservationFragments(raw);
  const facts: UniversalSurgicalFact[] = [];
  const suppressed: UniversalSurgicalFact[] = [];
  const seen = new Set<string>();
  const suppressedSeen = new Set<string>();

  const parts = fragments.length > 0 ? fragments : raw.length >= 8 ? [raw] : [];

  for (const fragment of parts) {
    processFragment(fragment, input, facts, suppressed, seen, suppressedSeen);
  }

  const noteSplit = splitFragmentEvidenceAndUncertainty(raw);

  if (facts.length === 0 && parts.length > 0) {
    if (noteSplit.uncertain && !noteSplit.factualEvidence.trim()) {
      return { facts, suppressed_facts: suppressed };
    }

    const combinedPositive = !introLikeSource(input.declared_source_type) && fragmentIsPositiveRoutine(raw);
    if (combinedPositive) {
      const assertion = resolveAssertionForFragment(input.declared_source_type, raw);
      pushFact(
        facts,
        seen,
        {
          concept: "case_outcome",
          normalized_label: "Routine or smooth case progression",
          assertion_level: assertion,
          evidence_text: raw,
          confidence: "high",
          negated: false,
          uncertain: false,
          notes: "Positive workflow — not mapped to pain",
        },
        input.declared_source_type,
      );
    } else {
      const assertion = resolveAssertionForFragment(input.declared_source_type, raw);
      pushFact(
        facts,
        seen,
        {
          concept: "no_issue_or_routine",
          normalized_label: "No meaningful intelligence issue identified",
          assertion_level: assertion,
          evidence_text: parts[0] ?? raw,
          confidence: "medium",
          negated: false,
          uncertain: false,
        },
        input.declared_source_type,
      );
    }
  }

  extractFullNoteIntroClinicalAndProductFacts(raw, input, facts, seen);

  return { facts: dedupeUniversalFacts(facts), suppressed_facts: suppressed };
}

function extractFullNoteIntroClinicalAndProductFacts(
  raw: string,
  input: UniversalExtractorInput,
  facts: UniversalSurgicalFact[],
  seen: Set<string>,
): void {
  const introLike = introLikeSource(input.declared_source_type);
  const observationCase = input.declared_source_type === "observation_case";

  const assertion = resolveAssertionForFragment(input.declared_source_type, raw);
  const noteSplit = splitFragmentEvidenceAndUncertainty(raw);

  if (introLike || observationCase) {
    for (const signal of extractProcedureSignalsFromText({
      text: raw,
      declaredSource: input.declared_source_type,
    })) {
      const signalSplit: EvidenceUncertaintySplit = {
        factualEvidence: signal.evidence,
        uncertaintyPhrases: [],
        uncertain: false,
      };
      pushFact(
        facts,
        seen,
        finalizeFactWithUncertainty(
          {
            concept: signal.concept,
            normalized_label: signal.normalizedLabel,
            assertion_level: assertion,
            evidence_text: signal.evidence,
            confidence: signal.concept === "procedure_volume_trend" || observationCase ? "medium" : "low",
            negated: false,
            uncertain: false,
          },
          signalSplit,
          false,
        ),
        input.declared_source_type,
      );
    }

  }

  for (const signal of extractUniversalCategorySignals(raw, {
    providerName: input.context?.provider_display_name,
  })) {
    if (
      !introLike &&
      signal.concept !== "product_interest" &&
      signal.concept !== "contact_role" &&
      signal.concept !== "case_outcome" &&
      !(
        signal.concept === "workflow_or_timing_issue" &&
        /^current setup:/i.test(signal.normalized_label)
      )
    ) {
      continue;
    }
    const signalSplit: EvidenceUncertaintySplit = {
      factualEvidence: signal.evidence_text,
      uncertaintyPhrases: [],
      uncertain: false,
    };
    pushFact(
      facts,
      seen,
      finalizeFactWithUncertainty(
        {
          concept: signal.concept,
          normalized_label: signal.normalized_label,
          assertion_level: assertion,
          evidence_text: signal.evidence_text,
          confidence: signal.confidence,
          negated: false,
          uncertain: false,
          product_mentioned: signal.product_mentioned,
          person_mentioned: signal.person_mentioned,
          notes: signal.notes,
        },
        signalSplit,
        true,
      ),
      input.declared_source_type,
    );
  }

  if (fragmentLooksLikeSchedulerContact(raw)) return;

  for (const mention of extractProductMentionsFromText({ text: raw, mode: "debrief" })) {
    const factualEvidence = noteSplit.factualEvidence.trim();
    const mentionEvidence =
      factualEvidence &&
      factualEvidence.length <= 240 &&
      new RegExp(`\\b${mention.productName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i").test(
        factualEvidence,
      )
        ? factualEvidence
        : mention.evidence;
    const mentionSplit: EvidenceUncertaintySplit = {
      factualEvidence: mentionEvidence,
      uncertaintyPhrases: noteSplit.uncertaintyPhrases,
      uncertain: noteSplit.uncertain,
      uncertaintyNotes: noteSplit.uncertaintyNotes,
    };
    pushFact(
      facts,
      seen,
      finalizeFactWithUncertainty(
        {
          concept: mention.isCompetitor ? "competitor_product" : "current_product",
          normalized_label: mention.isCompetitor
            ? `Competitor product: ${mention.productName}`
            : `Current product: ${mention.productName}`,
          assertion_level: assertion,
          evidence_text: mention.evidence,
          confidence: mention.confidence,
          negated: false,
          uncertain: false,
          product_mentioned: mention.productName,
        },
        mentionSplit,
        true,
      ),
      input.declared_source_type,
    );
  }
}

/** Guard: universal extractor must never emit opportunity concepts. */
export function factsContainOpportunitySignal(facts: UniversalSurgicalFact[]): boolean {
  return facts.some((fact) => (fact.concept as string) === "opportunity_signal");
}

export function factConcepts(facts: UniversalSurgicalFact[]): UniversalCanonicalConcept[] {
  return facts.map((f) => f.concept);
}
