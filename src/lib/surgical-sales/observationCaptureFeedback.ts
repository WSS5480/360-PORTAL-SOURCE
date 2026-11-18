/**
 * Post-save capture feedback for observation notes.
 * When UNIVERSAL_FACTS_READ_MODEL=1, chips use the same UF adapter as "This Observation".
 * Otherwise reuses the legacy OIE display path on the just-saved note.
 */

import { buildObservationCaseIntelligenceSections } from "@/lib/surgical-sales/buildObservationCaseBriefingView";
import { adaptUniversalFactsToThisObservationItems } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import type { UniversalCaptureEnvelope } from "@/lib/surgical-sales/universalExtractor/runUniversalExtractorShadow";
import { isUniversalFactsReadModelEnabled } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelFlag";

export type ObservationCaptureFeedbackItem = {
  id: string;
  text: string;
  quote?: string;
};

export type ObservationCaptureFeedbackResult =
  | { status: "chips"; items: ObservationCaptureFeedbackItem[] }
  | { status: "deferred"; message: string };

export const OBSERVATION_CAPTURE_FEEDBACK_DEFERRED_MESSAGE =
  "Note saved — review the Intelligence tab for captured findings.";

function universalCaptureToCaseRuns(input: {
  capture: UniversalCaptureEnvelope;
  caseId: string;
  providerId?: string | null;
  organizationId?: string | null;
}): UniversalFactExtractionRun[] {
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

/** UF read-model chips — same adapter as Intelligence tab "This Observation". */
export function buildObservationCaptureFeedbackFromUniversalCapture(input: {
  caseId: string;
  universalCapture: UniversalCaptureEnvelope;
  providerId?: string | null;
  organizationId?: string | null;
  providerName?: string | null;
}): ObservationCaptureFeedbackItem[] {
  const caseRuns = universalCaptureToCaseRuns({
    capture: input.universalCapture,
    caseId: input.caseId,
    providerId: input.providerId,
    organizationId: input.organizationId,
  });

  return adaptUniversalFactsToThisObservationItems({
    caseRuns,
    caseId: input.caseId,
    hasCurrentNotes: true,
    providerName: input.providerName,
  }).map((item) => ({
    id: item.id,
    text: item.text,
    ...(item.quote ? { quote: item.quote } : {}),
  }));
}

export function buildObservationCaptureFeedback(input: {
  caseId?: string | null;
  noteBody: string;
  /** Stored extraction envelope returned by the notes API (`intelligence.ai_extraction`). */
  aiExtraction?: Record<string, unknown> | null;
}): ObservationCaptureFeedbackItem[] {
  const body = input.noteBody.trim();
  if (!body) return [];

  const sections = buildObservationCaseIntelligenceSections({
    caseRow: {
      id: String(input.caseId ?? "current").trim() || "current",
      status: "confirmed",
      case_type: "observation",
    },
    activities: [
      {
        activity_type: "note",
        body,
        metadata_json: input.aiExtraction ? { ai_extraction: input.aiExtraction } : {},
      },
    ],
  });

  return sections.thisCaseItems.map((item) => ({
    id: item.id,
    text: item.text,
    ...(item.quote ? { quote: item.quote } : {}),
  }));
}

/** Server/client resolver for post-save capture feedback. */
export function resolveObservationCaptureFeedback(input: {
  caseId: string;
  noteBody: string;
  aiExtraction?: Record<string, unknown> | null;
  universalCapture?: UniversalCaptureEnvelope | null;
  providerId?: string | null;
  organizationId?: string | null;
  readModelEnabled?: boolean;
}): ObservationCaptureFeedbackResult | null {
  const readModelEnabled = input.readModelEnabled ?? isUniversalFactsReadModelEnabled();

  if (readModelEnabled) {
    if (input.universalCapture?.universal?.facts?.length) {
      const items = buildObservationCaptureFeedbackFromUniversalCapture({
        caseId: input.caseId,
        universalCapture: input.universalCapture,
        providerId: input.providerId,
        organizationId: input.organizationId,
      });
      if (items.length > 0) {
        return { status: "chips", items };
      }
    }

    const oieFallbackItems = buildObservationCaptureFeedback({
      caseId: input.caseId,
      noteBody: input.noteBody,
      aiExtraction: input.aiExtraction,
    });
    if (oieFallbackItems.length > 0) {
      return { status: "chips", items: oieFallbackItems };
    }

    return { status: "deferred", message: OBSERVATION_CAPTURE_FEEDBACK_DEFERRED_MESSAGE };
  }

  const items = buildObservationCaptureFeedback({
    caseId: input.caseId,
    noteBody: input.noteBody,
    aiExtraction: input.aiExtraction,
  });
  return items.length > 0 ? { status: "chips", items } : null;
}
