/**
 * Canonical observation completion source — every surface that counts completed
 * observations (Intelligence tab, debrief prepare, provider overview, pathway
 * gates) must derive from these helpers so counts never disagree across screens.
 *
 * This module is intentionally dependency-free to stay importable from both
 * pathwayStageGates and observationProgramGate without cycles.
 */

export function isObservationCaseComplete(caseRow: Record<string, unknown>): boolean {
  const status = String(caseRow.status ?? "").trim().toLowerCase();
  return status === "completed" || Boolean(caseRow.observation_completed_at);
}

/** Provider-profile observation count (contact.observation_count), normalized. */
export function observationCountFromProviderContact(
  contact: Record<string, unknown> | null | undefined,
): number {
  const raw = (contact ?? {}) as { observation_count?: unknown };
  if (typeof raw.observation_count === "number" && Number.isFinite(raw.observation_count)) {
    return Math.max(0, raw.observation_count);
  }
  return 0;
}
