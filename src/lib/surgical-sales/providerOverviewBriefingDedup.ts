/**
 * Provider overview briefing — avoid repeating the same operational theme on one screen.
 */

import {
  OverviewConceptRegistry,
  operationalLineDistinctFrom,
  textsShareOperationalConcept,
} from "@/lib/surgical-sales/providerOverviewConceptDedup";

export function filterDistinctOverviewLines(
  lines: string[],
  exclude: Array<string | null | undefined>,
  max = 4,
): string[] {
  const registry = new OverviewConceptRegistry();
  for (const text of exclude) {
    const trimmed = text?.trim();
    if (trimmed) registry.claimHeadline(trimmed);
  }

  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (exclude.some((ex) => ex && textsShareOperationalConcept(trimmed, ex))) continue;
    if (!operationalLineDistinctFrom(trimmed, registry)) continue;
    out.push(trimmed);
    if (out.length >= max) break;
  }
  return out;
}
