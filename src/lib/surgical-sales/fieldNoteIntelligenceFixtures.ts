import { buildLogUpdateIntelligenceReview } from "@/lib/surgical-sales/logUpdateRelatedIntelligence";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import { runUniversalSurgicalExtraction } from "@/lib/surgical-sales/universalExtractor/runUniversalSurgicalExtraction";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import { buildReviewProjectionFromUniversalFacts } from "@/lib/surgical-sales/universalExtractor/buildReviewProjectionFromUniversalFacts";

export const DR_LETTUCE_LOUNGE_NOTE = [
  "Ran into Dr. Lettuce in the physician lounge this afternoon after his last case.",
  "He said he looked over the clinical article I sent last week and appreciated the data,",
  "but he still wants to see how the product performs during an actual case before making any decisions.",
  "Jessica mentioned they have a robotic ventral hernia repair coming up in about two weeks",
  "that might be a good opportunity for an observation if scheduling works out.",
  "Dr. Lettuce also said they're seeing a higher volume of larger ventral defects lately,",
  "so he's paying closer attention to products that are easier to position laparoscopically.",
  "No action needed today other than following up with Jessica next week",
  "to confirm whether the observation date is available.",
].join(" ");

export function emptyWorkflowLogUpdate(dictation: string): LogUpdateParseResult {
  return {
    sourceText: dictation,
    suggestedUpdates: [],
    fieldUpdates: [],
    intelligenceReview: buildLogUpdateIntelligenceReview(dictation, [], {}),
    stillMissing: [],
    saveAsNoteAccepted: true,
    usesProviderIntelligence: true,
  };
}

export function ufRunsFromDictation(dictation: string, scenarioId: string): UniversalFactExtractionRun[] {
  const extraction = runUniversalSurgicalExtraction({
    raw_note: dictation,
    declared_source_type: "discovery_note",
    context: { provider_display_name: "Tom Lettuce" },
  });
  return [
    {
      capture_id: `mapping-${scenarioId}`,
      declared_source_type: "discovery_note",
      extraction_model: extraction.model,
      created_at: extraction.extracted_at,
      operational_note_id: null,
      facts: extraction.facts.map((fact, index) => ({
        ...fact,
        id: `${scenarioId}-${index}`,
        capture_id: `mapping-${scenarioId}`,
        provider_id: null,
        organization_id: null,
        case_id: null,
        encounter_id: null,
        suppressed: false,
        created_at: extraction.extracted_at,
      })),
    },
  ];
}

export function reviewParseFromDictation(dictation: string, scenarioId: string): LogUpdateParseResult {
  return buildReviewProjectionFromUniversalFacts({
    dictation,
    debriefRuns: ufRunsFromDictation(dictation, scenarioId),
    workflowLogUpdate: emptyWorkflowLogUpdate(dictation),
    existingFields: {},
  }).logUpdate;
}
