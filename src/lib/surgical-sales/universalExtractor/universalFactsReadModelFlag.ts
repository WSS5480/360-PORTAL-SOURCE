/** Phase 1: serve surgical intelligence read paths from Universal Facts instead of OIE. */

export function isUniversalFactsReadModelEnabled(): boolean {
  const raw = process.env.UNIVERSAL_FACTS_READ_MODEL?.trim();
  if (raw === "0") return false;
  if (raw === "1") return true;
  return true;
}
