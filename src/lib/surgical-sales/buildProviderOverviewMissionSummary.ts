/**
 * Provider overview — compact mission briefing below the pathway header (discovery).
 */

import { buildDiscoveryIntelligencePriorityUnknowns } from "@/lib/surgical-sales/buildDiscoveryIntelligencePriorityUnknowns";
import { discoveryMissionStatusLine } from "@/lib/surgical-sales/discoveryIntelligenceNarrative";
import { resolveDiscoveryStructuredSignalStatus } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { hydrateDiscoveryContactFromLegacy } from "@/lib/surgical-sales/discoveryIntelligenceLegacyMigration";
import { sanitizeFieldFriendlyOverviewCopy } from "@/lib/surgical-sales/providerOverviewBriefingCopy";
import { filterDistinctOverviewLines } from "@/lib/surgical-sales/providerOverviewBriefingDedup";

export type ProviderOverviewMissionSummary = {
  statusLines: string[];
  recommendedMove: string;
};

function formatRecommendedMove(nextFieldMove: string | null): string {
  const raw = nextFieldMove?.trim();
  if (!raw) return "Open field briefing and capture the next signal";
  const stripped = raw.replace(/^next (?:field )?move:\s*/i, "").trim();
  return sanitizeFieldFriendlyOverviewCopy(stripped) || raw;
}

export function buildProviderOverviewMissionSummary(input: {
  contact: Record<string, unknown>;
  nextFieldMove: string | null;
  currentFocus?: string | null;
  maxStatusLines?: number;
}): ProviderOverviewMissionSummary | null {
  const contact = hydrateDiscoveryContactFromLegacy(input.contact);
  const max = Math.min(Math.max(input.maxStatusLines ?? 3, 1), 4);

  const priorityItems = buildDiscoveryIntelligencePriorityUnknowns({ contact, max: max + 2 });
  const rawStatusLines = priorityItems
    .map((item) => {
      const status = resolveDiscoveryStructuredSignalStatus(item.signalId, contact);
      return discoveryMissionStatusLine(item.signalId, status);
    })
    .filter((line): line is string => Boolean(line));

  const statusLines = filterDistinctOverviewLines(
    rawStatusLines,
    [input.currentFocus, input.nextFieldMove],
    max,
  );

  const recommendedMove = formatRecommendedMove(input.nextFieldMove);

  if (statusLines.length === 0 && !input.nextFieldMove?.trim()) {
    return null;
  }

  return {
    statusLines:
      statusLines.length > 0 ? statusLines : ["No open discovery targets — advance the recommended move"],
    recommendedMove,
  };
}
