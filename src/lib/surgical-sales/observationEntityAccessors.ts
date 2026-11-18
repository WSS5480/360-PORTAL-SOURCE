import type { ObservationNoteExtractedEntity } from "@/lib/surgical-sales/extractObservationNoteEntities";
import {
  isActionableIntelligenceFinding,
  isConversationalFillerText,
  isTranscriptChunkText,
} from "@/lib/surgical-sales/observationFindingQuality";

export { isTranscriptChunkText } from "@/lib/surgical-sales/observationFindingQuality";

/** Normalized intelligence statement (not raw transcript). */
export function observationEntityFinding(entity: ObservationNoteExtractedEntity): string {
  const finding = String(entity.finding ?? entity.value ?? "").trim();
  return finding;
}

/** Supporting quote from the note that justifies the finding. */
export function observationEntityEvidence(entity: ObservationNoteExtractedEntity): string {
  const evidence = String(entity.evidence ?? "").trim();
  if (evidence) return evidence;
  return String(entity.value ?? "").trim();
}

/** Drop legacy entities that stored transcript excerpts as findings. */
export function isUsableObservationEntity(entity: ObservationNoteExtractedEntity): boolean {
  const finding = observationEntityFinding(entity);
  if (!finding) return false;
  if (entity.confidence === "Low") return false;
  if (isConversationalFillerText(finding)) return false;
  if (!isActionableIntelligenceFinding(finding)) return false;
  if (isTranscriptChunkText(finding)) return false;
  const evidence = observationEntityEvidence(entity);
  if (evidence && finding.toLowerCase() === evidence.toLowerCase() && isTranscriptChunkText(evidence)) {
    return false;
  }
  return true;
}
