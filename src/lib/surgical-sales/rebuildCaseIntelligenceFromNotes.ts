import {
  extractFieldObservationNoteEntitiesForRebuild,
} from "@/lib/surgical-sales/fieldObservationIntelligence";
import { extractObservationNoteEntities } from "@/lib/surgical-sales/extractObservationNoteEntities";
import { extractProductSupportObservation } from "@/lib/surgical-sales/extractProductSupportObservation";
import { mergeObservationNoteIntoCaseSnapshot } from "@/lib/surgical-sales/mergeObservationCaseIntelligenceSnapshot";
import { buildLiveObservationPatchesFromExtraction } from "@/lib/surgical-sales/observationNoteEntityMapping";
import { isSurgicalObservationCase } from "@/lib/surgical-sales/labels";

export const CASE_NOTE_LIVE_INTELLIGENCE_FIELDS = [
  "live_observation_workflow",
  "live_observation_clinical_pain_points",
  "live_observation_surgeon_reactions",
  "live_observation_product_fit",
  "live_observation_competitors",
  "live_observation_staff_process",
  "live_observation_questions",
  "live_observation_follow_up_items",
  "observation_quick_finding_product_interest",
  "debrief_key_findings",
] as const;

function emptyLiveFieldPatch(): Record<string, null> {
  return Object.fromEntries(CASE_NOTE_LIVE_INTELLIGENCE_FIELDS.map((field) => [field, null]));
}

function buildProductSupportFollowUpPatches(noteBodies: string[]): Record<string, unknown> {
  let followUpNeeded = false;
  let suggestedNext: string | null = null;
  for (const body of noteBodies) {
    const productSupport = extractProductSupportObservation(body);
    if (productSupport.primaryClassification === "follow_up") {
      followUpNeeded = true;
      if (!suggestedNext) suggestedNext = body.trim();
    }
  }
  return {
    follow_up_needed: followUpNeeded,
    debrief_suggested_next_action: suggestedNext,
  };
}

export type RebuildCaseNote = {
  body: string;
  /** Stored extraction envelope for the note — gates v2 rebuild (§6b). */
  aiExtraction?: unknown;
};

/** Rebuild case intelligence fields from remaining notes (chronological). */
export function rebuildCaseIntelligenceFromNoteBodies(input: {
  caseType: string | null | undefined;
  noteBodies: string[];
  /** When provided, replaces noteBodies and carries each note's stored extraction. */
  notes?: RebuildCaseNote[];
}): Record<string, unknown> {
  const notes: RebuildCaseNote[] = (
    input.notes ?? input.noteBodies.map((body) => ({ body }))
  )
    .map((note) => ({ ...note, body: note.body.trim() }))
    .filter((note) => Boolean(note.body));
  const isObservation = isSurgicalObservationCase(input.caseType);

  let snapshot: Record<string, unknown> | null = null;
  const rollingCaseRow: Record<string, unknown> = { ...emptyLiveFieldPatch() };

  for (const note of notes) {
    const observationExtraction = isObservation
      ? extractFieldObservationNoteEntitiesForRebuild(note)
      : extractObservationNoteEntities(note.body);

    snapshot = mergeObservationNoteIntoCaseSnapshot(snapshot, observationExtraction);

    const livePatches = buildLiveObservationPatchesFromExtraction(observationExtraction, rollingCaseRow);
    Object.assign(rollingCaseRow, livePatches);

  }

  const patch: Record<string, unknown> = {
    observation_workflow_intelligence_snapshot: snapshot,
    ...rollingCaseRow,
  };

  if (!isObservation) {
    Object.assign(patch, buildProductSupportFollowUpPatches(notes.map((note) => note.body)));
  }

  return patch;
}
