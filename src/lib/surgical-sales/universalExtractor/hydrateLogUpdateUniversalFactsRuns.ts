import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import { loadUniversalFactsByCaptureId } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

/** Attach persisted UF extraction runs when inline runs were stripped from storage. */
export async function hydrateLogUpdateWithUniversalFactsRuns(
  logUpdate: LogUpdateParseResult,
  captureId: string | null | undefined,
): Promise<LogUpdateParseResult> {
  if (logUpdate.debriefUniversalFactsRuns?.length) return logUpdate;

  const id = String(captureId ?? "").trim();
  if (!id) return logUpdate;

  const run = await loadUniversalFactsByCaptureId(id);
  if (!run) return logUpdate;

  return { ...logUpdate, debriefUniversalFactsRuns: [run] };
}
