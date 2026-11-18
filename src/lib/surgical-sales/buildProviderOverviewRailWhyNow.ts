/**
 * Provider overview action rail — contextual “why now” (not a repeat of next field move).
 */

import { displayNextFieldMoveLine } from "@/lib/surgical-sales/providerOverviewBriefingCopy";
import { buildDiscoveryIntelligencePriorityUnknowns } from "@/lib/surgical-sales/buildDiscoveryIntelligencePriorityUnknowns";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";

export function buildProviderOverviewRailWhyNow(input: {
  contact: Record<string, unknown>;
  pathwayStageId: string;
  nextBestActionDetail: string | null;
  nextMove: string | null;
}): string | null {
  if (input.pathwayStageId === "discovery") {
    const priority = buildDiscoveryIntelligencePriorityUnknowns({
      contact: input.contact,
      max: 1,
    })[0];
    if (priority?.summary) {
      return scanLine(`Resolve before advancing: ${priority.summary}`, 120);
    }
    return null;
  }

  const detail = displayNextFieldMoveLine(input.nextBestActionDetail);
  const move = displayNextFieldMoveLine(input.nextMove);
  if (detail && move && detail !== move) {
    return scanLine(detail, 120);
  }
  return detail || move || null;
}
