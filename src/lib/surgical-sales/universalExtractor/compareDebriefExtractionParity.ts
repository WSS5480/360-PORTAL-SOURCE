/**
 * Compare DIP review rows vs UF-derived rows on golden corpus (Phase 0 parity gate).
 */

import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import { runDebriefExtractionPipeline } from "@/lib/surgical-sales/debriefExtractionRegressionRunner";
import { isGarbledProductName } from "@/lib/surgical-sales/sharedIntelligence/extractProductMention";
import { procedureNamesOverlap } from "@/lib/surgical-sales/sharedIntelligence/procedurePatterns";
import {
  parityRowFromClinicalAtomicFact,
  parityRowFromProductAtomicFact,
} from "@/lib/surgical-sales/universalExtractor/clinicalProductParityRows";
import {
  buildUfReviewRowsFromRuns,
  type ParityReviewRow,
  type ParityReviewSection,
} from "@/lib/surgical-sales/universalExtractor/buildUfReviewRowsFromRuns";
import type { DebriefExtractionParityFixture } from "@/lib/surgical-sales/universalExtractor/debriefExtractionParityFixtures";
import { runUniversalSurgicalExtraction } from "@/lib/surgical-sales/universalExtractor/runUniversalSurgicalExtraction";

export type ParityCompareResult = {
  fixtureId: string;
  dipRows: ParityReviewRow[];
  ufRows: ParityReviewRow[];
  coverageBySection: Record<ParityReviewSection, number>;
  aggregateCoverage: number;
  conflicts: Array<{ section: ParityReviewSection; dipHeadline: string; ufHeadline: string }>;
  garbageProducts: string[];
};

const PARITY_SECTIONS: ParityReviewSection[] = [
  "clinical_trend",
  "procedure_focus",
  "clinical_preference",
  "product_intelligence",
];

export function buildDipReviewRowsFromAtomicFacts(facts: DebriefAtomicFact[]): ParityReviewRow[] {
  const rows: ParityReviewRow[] = [];
  const seen = new Set<string>();

  for (const fact of facts) {
    const row = parityRowFromProductAtomicFact(fact) ?? parityRowFromClinicalAtomicFact(fact);
    if (!row || seen.has(row.dedupeKey)) continue;
    seen.add(row.dedupeKey);
    rows.push(row);
  }

  return rows;
}

function buildDipReviewRows(dictation: string): ParityReviewRow[] {
  const pipeline = runDebriefExtractionPipeline({ dictation });
  return buildDipReviewRowsFromAtomicFacts(pipeline.parse.atomicFacts ?? []);
}

function rowsMatch(dipRow: ParityReviewRow, ufRow: ParityReviewRow): boolean {
  if (dipRow.section !== ufRow.section) return false;
  if (dipRow.dedupeKey === ufRow.dedupeKey) return true;
  if (dipRow.concept !== ufRow.concept) return false;
  if (dipRow.section === "product_intelligence") {
    const dipProduct = dipRow.headline.replace(/^Current product identified:\s*/i, "").trim();
    const ufProduct = ufRow.headline.replace(/^Current product identified:\s*/i, "").trim();
    return dipProduct.toLowerCase() === ufProduct.toLowerCase();
  }
  return procedureNamesOverlap(dipRow.headline, ufRow.headline);
}

export function compareDebriefExtractionParity(fixture: DebriefExtractionParityFixture): ParityCompareResult {
  const dipRows = buildDipReviewRows(fixture.dictation);
  const ufExtraction = runUniversalSurgicalExtraction({
    raw_note: fixture.dictation,
    declared_source_type: fixture.declaredSource,
  });
  const ufRows = buildUfReviewRowsFromRuns([
    {
      capture_id: "parity",
      declared_source_type: fixture.declaredSource,
      extraction_model: ufExtraction.model,
      created_at: ufExtraction.extracted_at,
      operational_note_id: null,
      facts: ufExtraction.facts.map((fact, index) => ({
        ...fact,
        id: `uf-${fixture.id}-${index}`,
        capture_id: "parity",
        provider_id: null,
        organization_id: null,
        case_id: null,
        encounter_id: null,
        suppressed: false,
        created_at: ufExtraction.extracted_at,
      })),
    },
  ]);

  const coverageBySection = {} as Record<ParityReviewSection, number>;
  let coveredTotal = 0;
  let dipTotal = 0;

  for (const section of PARITY_SECTIONS) {
    const dipSection = dipRows.filter((row) => row.section === section);
    const ufSection = ufRows.filter((row) => row.section === section);
    dipTotal += dipSection.length;

    if (dipSection.length === 0) {
      coverageBySection[section] = 1;
      continue;
    }

    let matched = 0;
    for (const dipRow of dipSection) {
      const ufMatch = ufSection.find((ufRow) => rowsMatch(dipRow, ufRow));
      if (ufMatch) matched += 1;
    }
    coverageBySection[section] = matched / dipSection.length;
    coveredTotal += matched;
  }

  const aggregateCoverage = dipTotal === 0 ? 1 : coveredTotal / dipTotal;

  const conflicts: ParityCompareResult["conflicts"] = [];
  for (const section of PARITY_SECTIONS) {
    const dipSection = dipRows.filter((row) => row.section === section);
    const ufSection = ufRows.filter((row) => row.section === section);
    for (const dipRow of dipSection) {
      const ufMatch = ufSection.find((ufRow) => rowsMatch(dipRow, ufRow));
      if (ufMatch && dipRow.dedupeKey !== ufMatch.dedupeKey) {
        conflicts.push({
          section,
          dipHeadline: dipRow.headline,
          ufHeadline: ufMatch.headline,
        });
      }
    }
  }

  const garbageProducts = [
    ...dipRows
      .filter((row) => row.section === "product_intelligence")
      .map((row) => row.headline.replace(/^Current product identified:\s*/i, "")),
    ...ufRows
      .filter((row) => row.section === "product_intelligence")
      .map((row) => row.headline.replace(/^Current product identified:\s*/i, "")),
  ].filter((name) => isGarbledProductName(name));

  return {
    fixtureId: fixture.id,
    dipRows,
    ufRows,
    coverageBySection,
    aggregateCoverage,
    conflicts,
    garbageProducts,
  };
}

export const PARITY_COVERAGE_TARGET = 0.95;

export function parityGatePasses(result: ParityCompareResult): boolean {
  return result.aggregateCoverage >= PARITY_COVERAGE_TARGET && result.garbageProducts.length === 0;
}
