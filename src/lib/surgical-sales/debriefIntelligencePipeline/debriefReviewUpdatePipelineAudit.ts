/**
 * Full audit of Review Updates upstream collections and item generation.
 */

import { buildDebriefActionableReviewCards } from "@/lib/surgical-sales/buildDebriefActionableReviewCards";
import {
  buildDebriefIntelligenceExtractionReview,
  buildInitialProposedContacts,
} from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import { buildRegressionAtomicFactsFromDictation } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefRegressionAtomicFactStandIn";
import { buildParseResultFromDebriefFacts } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import {
  buildDebriefReviewDecisions,
  type DebriefReviewDecision,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewDecisions";
import { buildDebriefReviewDecisionContext } from "@/lib/surgical-sales/debriefIntelligencePipeline/buildDebriefReviewDecisionContext";
import type { ReviewUpdateDebugTrace } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewUpdateDebug";
import type { ReviewUpdateGuardContext } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewUpdateGuards";
import { INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";
import { PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS } from "@/lib/surgical-sales/intelligenceScopeInference";
import type { DebriefActionableReviewCard } from "@/lib/surgical-sales/debriefActionableReviewCardTypes";

export type ReviewUpdateUpstreamCollection = {
  id: string;
  sourceFile: string;
  builderFunction: string;
  inputSummary: string;
  outputSummary: string;
  records: Array<Record<string, unknown>>;
};

export type ReviewUpdatePipelineAudit = {
  dictation: string;
  guardContext: ReviewUpdateGuardContext;
  upstreamCollections: ReviewUpdateUpstreamCollection[];
  reviewItems: DebriefReviewDecision[];
  reviewCards: DebriefActionableReviewCard[];
  itemDebug: ReviewUpdateDebugTrace[];
  cardDebug: ReviewUpdateDebugTrace[];
  removedItems: ReviewUpdateDebugTrace[];
  emittedItems: ReviewUpdateDebugTrace[];
};

function summarizeFacts(facts: DebriefAtomicFact[]): string {
  const counts = new Map<string, number>();
  for (const fact of facts) {
    counts.set(fact.fact_type, (counts.get(fact.fact_type) ?? 0) + 1);
  }
  return [...counts.entries()].map(([type, count]) => `${type}:${count}`).join(", ");
}

export function runReviewUpdatePipelineAudit(input: {
  dictation: string;
  guardContext?: ReviewUpdateGuardContext;
  facts?: DebriefAtomicFact[];
}): ReviewUpdatePipelineAudit {
  const dictation = input.dictation.trim();
  const guardContext: ReviewUpdateGuardContext =
    input.guardContext ??
    buildDebriefReviewDecisionContext({
      providerLabel: "Tom Sandy",
      providerContact: { first_name: "Tom", last_name: "Sandy" },
    });

  const rawFacts =
    input.facts ?? buildRegressionAtomicFactsFromDictation(dictation);

  const parse = buildParseResultFromDebriefFacts({
    sourceText: dictation,
    facts: rawFacts,
    context: {
      providerId: "provider-audit-tom-sandy",
      writableFieldKeys: [...PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS],
    },
    existingFields: {},
    mappingSource: "regression_stand_in",
  });

  const proposedContacts = buildInitialProposedContacts({
    review: parse,
    sourceReference: "audit:tom-sandy",
  });

  const extraction = buildDebriefIntelligenceExtractionReview({
    review: parse,
    proposedContacts,
    sourceReference: "audit:tom-sandy",
  });

  const itemDebug: ReviewUpdateDebugTrace[] = [];
  const reviewItems = buildDebriefReviewDecisions({
    dictation,
    atomicFacts: extraction.atomicFacts ?? [],
    fieldUpdates: extraction.fieldUpdates ?? [],
    proposedContacts,
    guardContext,
    debugLog: itemDebug,
  });

  const cardDebug: ReviewUpdateDebugTrace[] = [];
  const reviewCards = buildDebriefActionableReviewCards({
    extraction,
    proposedContacts,
    dictation,
    debugLog: cardDebug,
  });

  const upstreamCollections: ReviewUpdateUpstreamCollection[] = [
    {
      id: "normalized_atomic_facts",
      sourceFile: "debriefIntelligencePipeline/debriefAtomicFacts.ts",
      builderFunction: "normalizeAndDedupeAtomicFacts()",
      inputSummary: "Raw OpenAI or regression stand-in facts + dictation",
      outputSummary: `${rawFacts.length} raw → ${(parse.atomicFacts ?? []).length} normalized (${summarizeFacts(parse.atomicFacts ?? [])})`,
      records: (parse.atomicFacts ?? []).map((fact, index) => ({
        index,
        fact_type: fact.fact_type,
        entity: fact.entity,
        attribute: fact.attribute,
        value: fact.value,
        confidence: fact.confidence,
        evidence: fact.evidence,
      })),
    },
    {
      id: "proposed_contacts",
      sourceFile: "debriefIntelligencePipeline/debriefAtomicFacts.ts",
      builderFunction: "proposedContactsFromAtomicFacts()",
      inputSummary: "workflow_contact + scheduling facts, knownNames filter",
      outputSummary: `${proposedContacts.length} proposed contacts`,
      records: proposedContacts.map((contact) => ({
        id: contact.id,
        displayName: contact.displayName,
        mentionLevel: contact.mentionLevel,
        disposition: contact.disposition,
      })),
    },
    {
      id: "field_updates",
      sourceFile: "debriefIntelligencePipeline/debriefAtomicFacts.ts",
      builderFunction: "buildFieldUpdatesFromClassifiedFacts()",
      inputSummary: "Classified atomic facts + existing CRM fields",
      outputSummary: `${(parse.fieldUpdates ?? []).length} CRM field rows (linked, not carded)`,
      records: (parse.fieldUpdates ?? []).map((field) => ({
        id: field.id,
        dbKey: field.dbKey,
        label: field.label,
        proposedValue: field.proposedValue,
        accepted: field.accepted,
      })),
    },
    {
      id: "review_update_items",
      sourceFile: "debriefIntelligencePipeline/debriefReviewUpdateItems.ts",
      builderFunction: "buildDebriefReviewDecisions()",
      inputSummary: "atomicFacts + fieldUpdates + proposedContacts + guardContext + dictation",
      outputSummary: `${reviewItems.length} canonical DebriefReviewDecision records`,
      records: reviewItems.map((item) => ({
        id: item.id,
        type: item.type,
        displayName: item.displayName,
        taskTitle: item.taskTitle,
        insightTitle: item.insightTitle,
        observationStatus: item.observationStatus,
        dedupeKey: item.dedupeKey,
        linkedFactKeys: item.linkedFactKeys,
      })),
    },
    {
      id: "actionable_review_cards",
      sourceFile: "buildDebriefActionableReviewCards.ts",
      builderFunction: "buildDebriefActionableReviewCards()",
      inputSummary: "ReviewUpdateItem[] → reviewItemToCard() + evidence normalization",
      outputSummary: `${reviewCards.length} UI cards`,
      records: reviewCards.map((card) => ({
        id: card.id,
        category: card.category,
        headline: card.headline,
        taskTitle: "taskTitle" in card ? card.taskTitle : undefined,
        insightTitle: "insightTitle" in card ? card.insightTitle : undefined,
        evidenceQuotes: card.evidenceQuotes,
      })),
    },
  ];

  const removedItems = itemDebug.filter((trace) => trace.outcome === "removed");
  const emittedItems = [...itemDebug, ...cardDebug].filter((trace) => trace.outcome === "emitted");

  return {
    dictation,
    guardContext,
    upstreamCollections,
    reviewItems,
    reviewCards,
    itemDebug,
    cardDebug,
    removedItems,
    emittedItems,
  };
}

export function formatReviewUpdatePipelineAuditReport(audit: ReviewUpdatePipelineAudit): string {
  const lines: string[] = [
    "# Review Updates Pipeline Audit — Tom Sandy",
    "",
    "## Dictation",
    "",
    audit.dictation,
    "",
    "## Guard Context",
    "",
    "```json",
    JSON.stringify(audit.guardContext, null, 2),
    "```",
    "",
    "## 1. Upstream Collections",
    "",
  ];

  for (const collection of audit.upstreamCollections) {
    lines.push(`### ${collection.id}`);
    lines.push("");
    lines.push(`| Field | Value |`);
    lines.push(`| --- | --- |`);
    lines.push(`| Source file | \`${collection.sourceFile}\` |`);
    lines.push(`| Builder | \`${collection.builderFunction}\` |`);
    lines.push(`| Input | ${collection.inputSummary} |`);
    lines.push(`| Output | ${collection.outputSummary} |`);
    lines.push("");
    lines.push("<details><summary>Records</summary>");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(collection.records, null, 2));
    lines.push("```");
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }

  lines.push("## 2. Review Items Produced");
  lines.push("");
  lines.push("| id | type | label | dedupeKey | sourceFactId |");
  lines.push("| --- | --- | --- | --- | --- |");

  for (const trace of audit.emittedItems.filter((t) => t.reviewType !== "review_card")) {
    const item = audit.reviewItems.find((row) => row.id === trace.itemId);
    const label =
      item?.displayName ??
      item?.taskTitle ??
      item?.insightTitle ??
      item?.topicTitle ??
      item?.observationStatus ??
      trace.label ??
      trace.itemId ??
      "";
    lines.push(
      `| ${trace.itemId ?? ""} | ${trace.reviewType} | ${label.replace(/\|/g, "\\|")} | \`${trace.dedupeKey}\` | \`${trace.sourceFactId}\` |`,
    );
  }

  lines.push("");
  lines.push("## 3. Review Cards Produced");
  lines.push("");
  lines.push("| id | category | headline | evidence count |");
  lines.push("| --- | --- | --- | --- |");

  for (const card of audit.reviewCards) {
    lines.push(
      `| ${card.id} | ${card.category} | ${String(card.headline).replace(/\|/g, "\\|")} | ${card.evidenceQuotes.length} |`,
    );
  }

  lines.push("");
  lines.push("## 4. Items Removed (dedupe / guards)");
  lines.push("");

  if (audit.removedItems.length === 0) {
    lines.push("_None._");
  } else {
    lines.push("| reviewType | dedupeKey | sourceFactId | reason | label |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const trace of audit.removedItems) {
      lines.push(
        `| ${trace.reviewType} | \`${trace.dedupeKey}\` | \`${trace.sourceFactId}\` | ${trace.removalReason ?? ""} | ${(trace.label ?? "").replace(/\|/g, "\\|")} |`,
      );
    }
  }

  lines.push("");
  lines.push("## 5. Duplicate Root Causes (pre-guard baseline)");
  lines.push("");
  lines.push("### A. Jennifer contact tasks");
  lines.push("- **Sources:** `dictation_inference` (`contactInfoExplicitlyMissing`) + `normalized_atomic_facts` (`follow_up` fact from last sentence)");
  lines.push("- **Why duplicate:** Title-level dedupe only; \"Get Jennifer's phone or email\" ≠ \"identify Jennifer's contact information\"");
  lines.push("- **Fix:** `followUpSemanticDedupeKey()` → `task:contact_info:jennifer`");
  lines.push("");
  lines.push("### B. Observation access tasks");
  lines.push("- **Sources:** Multiple `observation_access` + `credentialing` facts; compound `follow_up` sentence");
  lines.push("- **Why duplicate:** Observation card merges access facts, but follow_up facts still emit credentialing/scheduling tasks");
  lines.push("- **Fix:** `isObservationReadinessFollowUp()` suppressed when observation card exists");
  lines.push("");
  lines.push("### C. Tom Sandy contact candidate");
  lines.push("- **Sources:** `workflow_contact` from \"Tom said…\" sentence in regression stand-in");
  lines.push("- **Why duplicate:** No provider/participant exclusion in `buildReviewUpdateItems()`");
  lines.push("- **Fix:** `shouldExcludeContactCandidate()` with provider + engagement participant guards");
  lines.push("");
  lines.push("### D. Clinical insight without evidence");
  lines.push("- **Sources:** Clinical fact with weak/unanchored evidence → card renderer shows \"No quote captured\"");
  lines.push("- **Fix:** `hasValidClinicalEvidence()` — no evidence = no card");
  lines.push("");
  lines.push("## 6. Full Debug Trace");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify([...audit.itemDebug, ...audit.cardDebug], null, 2));
  lines.push("```");

  return lines.join("\n");
}

export function runTomSandyReviewUpdatePipelineAudit(): ReviewUpdatePipelineAudit {
  return runReviewUpdatePipelineAudit({
    dictation: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
    guardContext: buildDebriefReviewDecisionContext({
      providerLabel: "Tom Sandy",
      providerContact: { first_name: "Tom", last_name: "Sandy" },
    }),
  });
}

export function formatTomSandyReviewUpdatePipelineAuditReport(): string {
  return formatReviewUpdatePipelineAuditReport(runTomSandyReviewUpdatePipelineAudit());
}
