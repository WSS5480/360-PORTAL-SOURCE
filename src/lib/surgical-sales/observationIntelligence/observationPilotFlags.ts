/**
 * Observation Note Pilot (v3) feature flags.
 *
 * `OBSERVATION_AI_FIRST_EXTRACTION=1` turns on AI-first validated extraction for
 * observation case notes. Flag OFF ⇒ behavior is byte-identical to the legacy
 * rules-first pipeline. Read-path gates do NOT consult this flag — they key on
 * `validation_version` carried by stored extractions, so already-captured v2
 * notes stay correct even if the flag is later turned off.
 */

export function isObservationAiFirstExtractionEnabled(): boolean {
  return process.env.OBSERVATION_AI_FIRST_EXTRACTION === "1";
}

/**
 * Pilot-org hide for the Add Intelligence bulk "Note or Dictate" panel
 * (capture-surface audit action 2). Server-side route rejection uses the same
 * env; the client hide uses the NEXT_PUBLIC_ variant so the method picker can
 * filter without a round trip.
 */
export function isBulkIntelligenceCaptureHiddenForPilot(): boolean {
  return (
    process.env.OBSERVATION_PILOT_HIDE_BULK_CAPTURE === "1" ||
    process.env.NEXT_PUBLIC_OBSERVATION_PILOT_HIDE_BULK_CAPTURE === "1"
  );
}
