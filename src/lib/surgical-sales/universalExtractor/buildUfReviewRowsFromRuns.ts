/**
 * UF extraction runs → normalized parity review rows (clinical/product sections only).
 */

import { parityRowFromUniversalFact } from "@/lib/surgical-sales/universalExtractor/clinicalProductParityRows";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

export type ParityReviewSection =
  | "clinical_trend"
  | "procedure_focus"
  | "clinical_preference"
  | "product_intelligence";

export type ParityReviewRow = {
  section: ParityReviewSection;
  headline: string;
  evidence: string;
  concept: string;
  dedupeKey: string;
};

export function buildUfReviewRowsFromRuns(runs: UniversalFactExtractionRun[]): ParityReviewRow[] {
  const rows: ParityReviewRow[] = [];
  const seen = new Set<string>();

  for (const run of runs) {
    for (const fact of run.facts) {
      if (fact.suppressed || fact.negated || fact.assertion_level === "rejected") continue;
      const row = parityRowFromUniversalFact(fact);
      if (!row || seen.has(row.dedupeKey)) continue;
      seen.add(row.dedupeKey);
      rows.push(row);
    }
  }

  return rows;
}
