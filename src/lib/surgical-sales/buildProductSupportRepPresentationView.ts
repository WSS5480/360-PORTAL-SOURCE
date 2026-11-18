/**
 * Rep-facing presentation view for Product Support Intelligence tab.
 */

import { buildCaseIdentity, formatCaseIntelligenceContextLine } from "@/lib/surgical-sales/buildCaseIdentity";
import { buildProductSupportKnownInsights } from "@/lib/surgical-sales/buildProductSupportRepBriefingContent";
import type { CaseOperationalContextView } from "@/lib/surgical-sales/buildCaseOperationalContextView";
import {
  buildProductSupportCaseIntelligenceView,
  type ProductSupportIntelligenceItem,
} from "@/lib/surgical-sales/buildProductSupportCaseIntelligenceView";
import {
  PRODUCT_SUPPORT_CASE_RESULT_LABELS,
  PRODUCT_SUPPORT_NEXT_STEP_LABELS,
  PRODUCT_SUPPORT_PROVIDER_REACTION_LABELS,
  parseProductSupportCaseResult,
  parseProductSupportNextStep,
  parseProductSupportProviderReaction,
} from "@/lib/surgical-sales/productSupportCaseMoments";
import type { ProductSupportNoteAiExtraction } from "@/lib/surgical-sales/processProductSupportNoteCapture";
import { intelligenceEvidenceQuoteFromFact } from "@/lib/surgical-sales/universalExtractor/intelligenceDisplayFromFact";
import {
  adaptUniversalFactsToThisObservationItems,
  resolveActiveOperationalNoteIdsFromActivities,
  resolveReadModelSection,
  type UniversalFactsReadModelPayload,
} from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import type { UniversalSurgicalFactRow } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

export type ProductSupportRepListItem = {
  id: string;
  text: string;
  quote?: string;
  evidenceText?: string | null;
  sourceNoteText?: string | null;
  extractedFactId?: string | null;
  inferred?: boolean;
  supportingEvidence?: string[];
  concept?: string | null;
  sourceCategory?: string | null;
  sourceType?: string | null;
  productMentioned?: string | null;
  personMentioned?: string | null;
};

export type ProductSupportOutcomeBadges = {
  providerReaction: string | null;
  caseResult: string | null;
  nextStep: string | null;
};

export type ProductSupportRepPresentationView = {
  hasCapturedNotes: boolean;
  contextLine: string;
  outcomeBadges: ProductSupportOutcomeBadges;
  statusSummary: {
    caseTypeLabel: string;
    statusLabel: string;
    noteCount: number;
    maturityNote: string;
  };
  thisCase: {
    title: string;
    items: ProductSupportRepListItem[];
    emptyMessage: string;
  };
  followUp: {
    title: string;
    items: ProductSupportRepListItem[];
    emptyMessage: string;
  };
  whatWeKnow: {
    title: string;
    items: ProductSupportRepListItem[];
    emptyMessage: string;
  };
  evidenceCount: number;
};

const FOLLOW_UP_UF_CONCEPTS = new Set([
  "training_or_familiarity_issue",
  "inventory_availability_issue",
  "unavailable_item",
  "requested_item",
  "next_action",
]);

function currentCaseId(caseRow: Record<string, unknown>): string {
  return String(caseRow.id ?? "current").trim() || "current";
}

function hasCapturedNotes(
  activities?: Array<{ activity_type?: string; body?: string }>,
): boolean {
  return (activities ?? []).some(
    (activity) =>
      String(activity.activity_type ?? "").trim().toLowerCase() === "note" &&
      String(activity.body ?? "").trim().length > 0,
  );
}

function formatCaseTypeLabel(raw: unknown): string {
  const value = String(raw ?? "product_support").trim().replace(/_/g, " ");
  if (!value) return "Product support";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatCaseStatusLabel(caseRow: Record<string, unknown>): string {
  const status = String(caseRow.status ?? "").trim().toLowerCase();
  if (status === "completed" || status === "closed") return "Completed";
  if (status === "confirmed" || status === "scheduled" || status === "in_progress") return "In progress";
  if (status) return status.charAt(0).toUpperCase() + status.slice(1);
  return "In progress";
}

function noteCount(activities?: Array<{ activity_type?: string; body?: string }>): number {
  return (activities ?? []).filter(
    (activity) =>
      String(activity.activity_type ?? "").trim().toLowerCase() === "note" &&
      String(activity.body ?? "").trim().length > 0,
  ).length;
}

function latestNoteExtraction(
  activities?: Array<{ activity_type?: string; metadata_json?: Record<string, unknown> }>,
): ProductSupportNoteAiExtraction | null {
  for (const activity of [...(activities ?? [])].reverse()) {
    if (String(activity.activity_type ?? "").trim().toLowerCase() !== "note") continue;
    const extraction = activity.metadata_json?.ai_extraction;
    if (extraction && typeof extraction === "object") {
      return extraction as ProductSupportNoteAiExtraction;
    }
  }
  return null;
}

function resolveOutcomeBadges(input: {
  caseRow: Record<string, unknown>;
  activities?: Array<{ activity_type?: string; metadata_json?: Record<string, unknown> }>;
}): ProductSupportOutcomeBadges {
  const reaction =
    parseProductSupportProviderReaction(
      input.caseRow.case_support_provider_reaction as string | null | undefined,
    ) ?? latestNoteExtraction(input.activities)?.outcomes?.providerReaction ??
    null;
  const result =
    parseProductSupportCaseResult(input.caseRow.case_support_case_result as string | null | undefined) ??
    latestNoteExtraction(input.activities)?.outcomes?.caseResult ??
    null;
  const nextStep =
    parseProductSupportNextStep(input.caseRow.case_support_next_step as string | null | undefined) ??
    latestNoteExtraction(input.activities)?.outcomes?.nextStep ??
    null;

  return {
    providerReaction: reaction ? PRODUCT_SUPPORT_PROVIDER_REACTION_LABELS[reaction] : null,
    caseResult: result ? PRODUCT_SUPPORT_CASE_RESULT_LABELS[result] : null,
    nextStep: nextStep ? PRODUCT_SUPPORT_NEXT_STEP_LABELS[nextStep] : null,
  };
}

function oieThisCaseFallback(
  viewItems: ProductSupportIntelligenceItem[],
  sourceNoteText: string,
): ProductSupportRepListItem[] {
  return viewItems
    .filter((item) => item.sourceKind === "field_note")
    .map((item) => ({
      id: item.id,
      text: item.text,
      evidenceText: sourceNoteText || item.text,
      sourceNoteText: sourceNoteText || item.text,
      extractedFactId: item.id,
    }));
}

function followUpFromFacts(facts: UniversalSurgicalFactRow[]): ProductSupportRepListItem[] {
  const items: ProductSupportRepListItem[] = [];
  const seen = new Set<string>();

  for (const fact of facts) {
    const concept = String(fact.concept ?? "").trim();
    if (!FOLLOW_UP_UF_CONCEPTS.has(concept)) continue;
    const text = intelligenceEvidenceQuoteFromFact(fact) ?? fact.normalized_label?.trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      id: `follow-up:${concept}:${items.length}`,
      text,
      quote: fact.evidence_text?.trim() && fact.evidence_text.trim() !== text ? fact.evidence_text.trim() : undefined,
      evidenceText: fact.evidence_text ?? null,
      sourceNoteText: fact.evidence_text ?? null,
      extractedFactId: fact.id ?? fact.capture_id ?? null,
      concept,
      sourceType: fact.source_type ?? null,
      productMentioned: fact.product_mentioned ?? null,
      personMentioned: fact.person_mentioned ?? null,
    });
  }

  return items;
}

function followUpFromNotes(
  activities?: Array<{ id: string; activity_type?: string; body?: string }>,
): ProductSupportRepListItem[] {
  const items: ProductSupportRepListItem[] = [];
  const seen = new Set<string>();

  for (const activity of activities ?? []) {
    if (String(activity.activity_type ?? "").trim().toLowerCase() !== "note") continue;
    const body = String(activity.body ?? "").trim();
    if (!body) continue;
    const sentences = body.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
    for (const sentence of sentences) {
      if (!/\b(follow[- ]?up|worth following up|continuing to watch|next visit|check back)\b/i.test(sentence)) {
        continue;
      }
      const key = sentence.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ id: `${activity.id}:follow-up:${items.length}`, text: sentence });
    }
  }

  return items;
}

export function buildProductSupportRepPresentationView(input: {
  caseRow: Record<string, unknown>;
  activities?: Array<{
    id: string;
    activity_type: string;
    body: string;
    metadata_json?: Record<string, unknown>;
    created_at: string;
  }>;
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
  providerContact?: Record<string, unknown> | null;
  operationalContext?: CaseOperationalContextView | null;
  priorCases?: Array<Record<string, unknown>>;
  specialty?: string | null;
}): ProductSupportRepPresentationView {
  const captured = hasCapturedNotes(input.activities);
  const caseId = currentCaseId(input.caseRow);
  const caseIdentity = buildCaseIdentity({
    ...input.caseRow,
    providerContact: input.providerContact,
  });
  const contextLine = formatCaseIntelligenceContextLine(caseIdentity);
  const intelligenceView = buildProductSupportCaseIntelligenceView(input);
  const activeOperationalNoteIds = resolveActiveOperationalNoteIdsFromActivities(input.activities);
  const providerName =
    caseIdentity.providerName && caseIdentity.providerName !== "Provider pending"
      ? caseIdentity.providerName
      : null;

  const thisCaseItems = resolveReadModelSection(
    input.universalFactsReadModel?.caseRuns?.length
      ? adaptUniversalFactsToThisObservationItems({
          caseRuns: input.universalFactsReadModel.caseRuns,
          caseId,
          hasCurrentNotes: captured,
          activeOperationalNoteIds,
          providerName,
        })
      : [],
    () => {
      const fallbackItems: ProductSupportIntelligenceItem[] = [];
      for (const section of intelligenceView.sections) {
        for (const item of section.items) {
          if (item.sourceKind === "field_note") fallbackItems.push(item);
        }
      }
      const sourceNoteText = (input.activities ?? [])
        .map((activity) => String(activity.body ?? "").trim())
        .filter(Boolean)
        .join(" ");
      return oieThisCaseFallback(fallbackItems, sourceNoteText);
    },
  );

  const whatWeKnowItems: ProductSupportRepListItem[] = buildProductSupportKnownInsights({
    caseRow: input.caseRow,
    providerContact: input.providerContact,
    priorCases: input.priorCases,
    activities: input.activities,
    specialty: input.specialty,
  }).map((insight) => ({
    id: insight.id,
    text: insight.text,
  }));

  const outcomeBadges = resolveOutcomeBadges({
    caseRow: input.caseRow,
    activities: input.activities,
  });

  const followUpItems: ProductSupportRepListItem[] = [];
  const followUpSeen = new Set<string>();
  const pushFollowUp = (item: ProductSupportRepListItem) => {
    const key = item.text.toLowerCase();
    if (followUpSeen.has(key)) return;
    followUpSeen.add(key);
    followUpItems.push(item);
  };

  if (outcomeBadges.nextStep) {
    pushFollowUp({
      id: "outcome:next-step",
      text: `Next step: ${outcomeBadges.nextStep}`,
    });
  }

  const currentCaseFacts =
    input.universalFactsReadModel?.caseRuns
      ?.flatMap((run) => run.facts)
      .filter((fact) => String(fact.case_id ?? "") === caseId) ?? [];

  for (const item of followUpFromFacts(currentCaseFacts)) pushFollowUp(item);
  for (const item of followUpFromNotes(input.activities)) pushFollowUp(item);

  const notes = noteCount(input.activities);

  return {
    hasCapturedNotes: captured,
    contextLine,
    outcomeBadges,
    statusSummary: {
      caseTypeLabel: formatCaseTypeLabel(input.caseRow.case_type),
      statusLabel: formatCaseStatusLabel(input.caseRow),
      noteCount: notes,
      maturityNote: captured
        ? "Today's note is captured — review findings below and confirm outcomes on Follow-Up."
        : "Add a field note during the case to populate intelligence.",
    },
    thisCase: {
      title: "This case",
      items: thisCaseItems,
      emptyMessage: captured
        ? "Note saved — detailed findings will appear here shortly."
        : "Nothing captured yet. Dictate or type a field note to build this section.",
    },
    followUp: {
      title: "Follow up",
      items: followUpItems,
      emptyMessage: captured
        ? "No follow-up items flagged yet."
        : "Follow-up opportunities will appear after you capture a field note.",
    },
    whatWeKnow: {
      title: "What we already know",
      items: whatWeKnowItems,
      emptyMessage: "No provider history on file yet — prior cases and profile notes will appear here.",
    },
    evidenceCount: intelligenceView.evidenceCount,
  };
}
