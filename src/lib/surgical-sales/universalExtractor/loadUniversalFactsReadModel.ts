import { isUniversalFactsReadModelEnabled } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelFlag";
import {
  loadUniversalFactsGroupedByCapture,
  type UniversalFactExtractionRun,
} from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import type { UniversalFactsReadModelPayload } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";

/** Same-case multi-note history for This Observation / note-level views. */
const CASE_CAPTURE_LIMIT = 50;

/**
 * Provider/program history for What We Know rollups.
 * Sized for ~100+ dictations; loader also diversifies by case so one busy case
 * cannot push older completed observations out of the count window.
 */
const PROGRAM_CAPTURE_LIMIT = 200;

export async function loadUniversalFactsReadModelForCase(input: {
  caseId: string;
  providerId?: string | null;
}): Promise<UniversalFactsReadModelPayload | null> {
  if (!isUniversalFactsReadModelEnabled()) return null;

  const [caseRuns, programRuns] = await Promise.all([
    loadUniversalFactsGroupedByCapture({ case_id: input.caseId, capture_limit: CASE_CAPTURE_LIMIT }),
    input.providerId
      ? loadUniversalFactsGroupedByCapture({
          provider_id: String(input.providerId),
          capture_limit: PROGRAM_CAPTURE_LIMIT,
          diversify_by_case: true,
        })
      : Promise.resolve([] as UniversalFactExtractionRun[]),
  ]);

  if (caseRuns.length === 0 && programRuns.length === 0) return null;
  return { caseRuns, programRuns };
}

export async function loadUniversalFactsReadModelForProvider(
  providerId: string,
): Promise<UniversalFactsReadModelPayload | null> {
  if (!isUniversalFactsReadModelEnabled()) return null;

  const providerRuns = await loadUniversalFactsGroupedByCapture({
    provider_id: providerId,
    capture_limit: PROGRAM_CAPTURE_LIMIT,
    diversify_by_case: true,
  });

  if (providerRuns.length === 0) return null;
  return { providerRuns };
}
