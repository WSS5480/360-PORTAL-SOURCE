import type { UniversalFactExtractionRun, UniversalSurgicalFactRow } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import type { UniversalCaptureEnvelope } from "@/lib/surgical-sales/universalExtractor/runUniversalExtractorShadow";
import type { UniversalExtractorContext } from "@/lib/surgical-sales/universalExtractor/types";

function factRowFromCapture(input: {
  fact: UniversalCaptureEnvelope["universal"]["facts"][number];
  index: number;
  capture: UniversalCaptureEnvelope;
  context?: UniversalExtractorContext;
}): UniversalSurgicalFactRow {
  const captureId = input.capture.capture_id ?? "inline-capture";
  return {
    ...input.fact,
    id: input.capture.fact_ids[input.index] ?? `inline-${input.index}`,
    capture_id: captureId,
    provider_id: input.context?.provider_id ?? null,
    organization_id: input.context?.organization_id ?? null,
    case_id: input.context?.case_id ?? null,
    encounter_id: input.context?.encounter_id ?? null,
    suppressed: false,
    created_at: input.capture.universal.extracted_at,
  };
}

/** Convert an inline universal capture envelope to a read-model extraction run. */
export function universalCaptureToExtractionRun(input: {
  capture: UniversalCaptureEnvelope;
  context?: UniversalExtractorContext;
}): UniversalFactExtractionRun {
  const captureId = input.capture.capture_id ?? "inline-capture";
  return {
    capture_id: captureId,
    declared_source_type: input.capture.universal.declared_source_type,
    extraction_model: input.capture.universal.model,
    created_at: input.capture.universal.extracted_at,
    operational_note_id: null,
    facts: input.capture.universal.facts.map((fact, index) =>
      factRowFromCapture({ fact, index, capture: input.capture, context: input.context }),
    ),
  };
}
