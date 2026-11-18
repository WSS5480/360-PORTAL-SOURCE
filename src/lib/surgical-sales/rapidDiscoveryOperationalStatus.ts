/**
 * Rapid Discovery — operational classification (separate from intelligence questions).
 */

import type { IntelligenceDiscoveryStance } from "@/lib/surgical-sales/operationalIntelligenceReadiness";

export type RapidDiscoveryOperationalStatus =
  | "unknown"
  | "in_progress"
  | "cleared"
  | "blocked"
  | "requires_approval";

export const RAPID_DISCOVERY_OPERATIONAL_STATUS_LABELS: Record<RapidDiscoveryOperationalStatus, string> = {
  unknown: "Unknown",
  in_progress: "In progress",
  cleared: "Cleared",
  blocked: "Still open on file",
  requires_approval: "Requires approval",
};

export const RAPID_DISCOVERY_OPERATIONAL_STATUSES: RapidDiscoveryOperationalStatus[] = [
  "unknown",
  "in_progress",
  "cleared",
  "blocked",
  "requires_approval",
];

export function defaultOperationalStatusForAnswer(hasSignal: boolean): RapidDiscoveryOperationalStatus {
  return hasSignal ? "in_progress" : "unknown";
}

export function operationalStatusToDiscoveryStance(
  status: RapidDiscoveryOperationalStatus,
): { stance: IntelligenceDiscoveryStance; uncertaintyKind?: "unexplored" | "opaque" } {
  switch (status) {
    case "unknown":
      return { stance: "unknown", uncertaintyKind: "unexplored" };
    case "in_progress":
      return { stance: "needs_validation" };
    case "cleared":
      return { stance: "needs_validation" };
    case "blocked":
      return { stance: "needs_validation", uncertaintyKind: "opaque" };
    case "requires_approval":
      return { stance: "needs_validation" };
    default:
      return { stance: "unknown" };
  }
}

export function shouldValidateFieldOnSave(status: RapidDiscoveryOperationalStatus): boolean {
  return status === "cleared";
}
