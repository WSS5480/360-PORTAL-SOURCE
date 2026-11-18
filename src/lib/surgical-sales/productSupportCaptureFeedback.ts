import { buildProductSupportCaseIntelligenceView } from "@/lib/surgical-sales/buildProductSupportCaseIntelligenceView";
import type { ProductSupportNoteAiExtraction } from "@/lib/surgical-sales/processProductSupportNoteCapture";
import {
  PRODUCT_SUPPORT_CASE_RESULT_LABELS,
  PRODUCT_SUPPORT_NEXT_STEP_LABELS,
  PRODUCT_SUPPORT_PROVIDER_REACTION_LABELS,
} from "@/lib/surgical-sales/productSupportCaseMoments";
import { intelligenceEvidenceQuoteFromFact } from "@/lib/surgical-sales/universalExtractor/intelligenceDisplayFromFact";
import { adaptUniversalFactsToProductSupportSections } from "@/lib/surgical-sales/universalExtractor/adaptUniversalFactsToProductSupportIntelligence";
import type { UniversalCaptureEnvelope } from "@/lib/surgical-sales/universalExtractor/runUniversalExtractorShadow";
import { isUniversalFactsReadModelEnabled } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelFlag";

export type ProductSupportCaptureFeedbackItem = {
  id: string;
  text: string;
};

export type ProductSupportCaptureFeedbackResult =
  | {
      status: "chips";
      outcomes: ProductSupportCaptureFeedbackItem[];
      findings: ProductSupportCaptureFeedbackItem[];
    }
  | { status: "deferred"; message: string };

export const PRODUCT_SUPPORT_CAPTURE_FEEDBACK_DEFERRED_MESSAGE =
  "Note saved — review the Intelligence tab for captured findings.";

const OUTCOME_PREFIX_RE = /^(provider reaction:|case result:|next step:|classified as)/i;

function universalCaptureToCaseRuns(input: {
  capture: UniversalCaptureEnvelope;
  caseId: string;
  providerId?: string | null;
  organizationId?: string | null;
}) {
  const captureId = input.capture.capture_id ?? `capture-${input.caseId}`;
  const createdAt = input.capture.universal.extracted_at;

  const facts = input.capture.universal.facts.map((fact, index) => ({
    id: input.capture.fact_ids[index] ?? `fact-${captureId}-${index}`,
    capture_id: captureId,
    provider_id: input.providerId ?? null,
    organization_id: input.organizationId ?? null,
    case_id: input.caseId,
    encounter_id: null,
    concept: fact.concept,
    normalized_label: fact.normalized_label,
    assertion_level: fact.assertion_level,
    source_type: fact.source_type,
    evidence_text: fact.evidence_text,
    confidence: fact.confidence,
    negated: fact.negated,
    uncertain: fact.uncertain,
    suppressed: false,
    product_mentioned: fact.product_mentioned,
    person_mentioned: fact.person_mentioned,
    item_mentioned: fact.item_mentioned,
    notes: fact.notes,
    created_at: createdAt,
  }));

  if (facts.length === 0) return [];

  return [
    {
      capture_id: captureId,
      declared_source_type: input.capture.universal.declared_source_type,
      extraction_model: input.capture.universal.model,
      created_at: createdAt,
      operational_note_id: null,
      facts,
    },
  ];
}

function outcomeFeedbackItems(extraction: ProductSupportNoteAiExtraction | null | undefined): ProductSupportCaptureFeedbackItem[] {
  const outcomes = extraction?.outcomes;
  if (!outcomes) return [];

  const items: ProductSupportCaptureFeedbackItem[] = [];
  if (outcomes.providerReaction) {
    items.push({
      id: "outcome:reaction",
      text: `Provider reaction: ${PRODUCT_SUPPORT_PROVIDER_REACTION_LABELS[outcomes.providerReaction]}`,
    });
  }
  if (outcomes.caseResult) {
    items.push({
      id: "outcome:result",
      text: `Case result: ${PRODUCT_SUPPORT_CASE_RESULT_LABELS[outcomes.caseResult]}`,
    });
  }
  if (outcomes.nextStep) {
    items.push({
      id: "outcome:next_step",
      text: `Next step: ${PRODUCT_SUPPORT_NEXT_STEP_LABELS[outcomes.nextStep]}`,
    });
  }
  return items;
}

function findingItemsFromExtraction(
  extraction: ProductSupportNoteAiExtraction | null | undefined,
  noteBody: string,
  activityId = "current-note",
): ProductSupportCaptureFeedbackItem[] {
  const items: ProductSupportCaptureFeedbackItem[] = [];
  const seen = new Set<string>();

  const push = (id: string, text: string) => {
    const normalized = text.trim();
    if (!normalized || OUTCOME_PREFIX_RE.test(normalized)) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ id, text: normalized });
  };

  if (extraction?.observation?.entities?.length) {
    for (const [index, entity] of extraction.observation.entities.entries()) {
      const finding = String(entity.finding ?? entity.value ?? "").trim();
      if (finding) push(`${activityId}:entity:${index}`, finding);
    }
  }

  const summary = extraction?.productSupport?.summary?.trim();
  if (summary && summary !== noteBody.trim()) {
    push(`${activityId}:summary`, summary);
  }

  return items;
}

function findingItemsFromIntelligenceView(input: {
  caseId?: string | null;
  noteBody: string;
  aiExtraction?: ProductSupportNoteAiExtraction | Record<string, unknown> | null;
}): ProductSupportCaptureFeedbackItem[] {
  const body = input.noteBody.trim();
  if (!body) return [];

  const typed =
    input.aiExtraction && typeof input.aiExtraction === "object"
      ? (input.aiExtraction as ProductSupportNoteAiExtraction)
      : null;

  const extractionFindings = findingItemsFromExtraction(typed, body);
  if (extractionFindings.length > 0) return extractionFindings;

  const view = buildProductSupportCaseIntelligenceView({
    caseRow: { id: String(input.caseId ?? "current").trim() || "current", case_type: "product_support" },
    activities: [
      {
        id: "current-note",
        activity_type: "note",
        body,
        metadata_json: typed ? { ai_extraction: typed } : {},
        created_at: new Date().toISOString(),
      },
    ],
  });

  const items: ProductSupportCaptureFeedbackItem[] = [];
  for (const section of view.sections) {
    for (const item of section.items) {
      if (item.sourceKind !== "field_note") continue;
      if (OUTCOME_PREFIX_RE.test(item.text)) continue;
      items.push({ id: item.id, text: item.text });
    }
  }
  return items;
}

function findingItemsFromUniversalCapture(input: {
  universalCapture: UniversalCaptureEnvelope;
  caseId: string;
  providerId?: string | null;
  organizationId?: string | null;
}): ProductSupportCaptureFeedbackItem[] {
  const runs = universalCaptureToCaseRuns({
    capture: input.universalCapture,
    caseId: input.caseId,
    providerId: input.providerId,
    organizationId: input.organizationId,
  });

  const ufMap = adaptUniversalFactsToProductSupportSections({ caseRuns: runs });
  const items: ProductSupportCaptureFeedbackItem[] = [];
  const seen = new Set<string>();

  for (const run of runs) {
    for (const [index, fact] of run.facts.entries()) {
      const text = intelligenceEvidenceQuoteFromFact(fact);
      if (!text || OUTCOME_PREFIX_RE.test(text)) continue;
      const key = text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ id: `uf:${fact.id ?? index}`, text });
    }
  }

  for (const [sectionId, sectionItems] of ufMap.entries()) {
    for (const item of sectionItems) {
      const key = item.text.toLowerCase();
      if (seen.has(key)) continue;
      if (OUTCOME_PREFIX_RE.test(item.text)) continue;
      seen.add(key);
      items.push({ id: `${sectionId}:${item.id}`, text: item.text });
    }
  }

  return items;
}

function dedupeItems(items: ProductSupportCaptureFeedbackItem[]): ProductSupportCaptureFeedbackItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildProductSupportCaptureFeedback(input: {
  caseId?: string | null;
  noteBody: string;
  aiExtraction?: ProductSupportNoteAiExtraction | Record<string, unknown> | null;
}): { outcomes: ProductSupportCaptureFeedbackItem[]; findings: ProductSupportCaptureFeedbackItem[] } {
  const typed =
    input.aiExtraction && typeof input.aiExtraction === "object"
      ? (input.aiExtraction as ProductSupportNoteAiExtraction)
      : null;

  return {
    outcomes: dedupeItems(outcomeFeedbackItems(typed)),
    findings: dedupeItems(findingItemsFromIntelligenceView(input)),
  };
}

export function resolveProductSupportCaptureFeedback(input: {
  caseId: string;
  noteBody: string;
  aiExtraction?: ProductSupportNoteAiExtraction | Record<string, unknown> | null;
  universalCapture?: UniversalCaptureEnvelope | null;
  providerId?: string | null;
  organizationId?: string | null;
  readModelEnabled?: boolean;
}): ProductSupportCaptureFeedbackResult | null {
  const readModelEnabled = input.readModelEnabled ?? isUniversalFactsReadModelEnabled();
  const typed =
    input.aiExtraction && typeof input.aiExtraction === "object"
      ? (input.aiExtraction as ProductSupportNoteAiExtraction)
      : null;

  const outcomes = dedupeItems(outcomeFeedbackItems(typed));
  const findings: ProductSupportCaptureFeedbackItem[] = [];

  if (readModelEnabled && input.universalCapture?.universal?.facts?.length) {
    findings.push(
      ...findingItemsFromUniversalCapture({
        universalCapture: input.universalCapture,
        caseId: input.caseId,
        providerId: input.providerId,
        organizationId: input.organizationId,
      }),
    );
  }

  findings.push(
    ...findingItemsFromIntelligenceView({
      caseId: input.caseId,
      noteBody: input.noteBody,
      aiExtraction: typed,
    }),
  );

  const dedupedFindings = dedupeItems(findings).slice(0, 8);

  if (outcomes.length > 0 || dedupedFindings.length > 0) {
    return { status: "chips", outcomes, findings: dedupedFindings };
  }

  if (readModelEnabled) {
    return { status: "deferred", message: PRODUCT_SUPPORT_CAPTURE_FEEDBACK_DEFERRED_MESSAGE };
  }

  return null;
}
