/**
 * Discovery advancement signal — shared by unified discovery state and stage progression.
 */

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { hasProviderObservationApprovalValidated } from "@/lib/surgical-sales/providerObservationApproval";
import { formatIntelligenceCaptureSummaryChip } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";

export type DiscoveryAdvancementSignal = {
  label: string;
  met: boolean;
  detail: string | null;
  dbKey?: string;
  sectionId?: ProviderIntelligenceSectionId;
};

const OBSERVATION_FEASIBILITY_BLOCKED = new Set(["no", "blocked", "denied"]);

function observationFeasibilityBlocked(contact: Record<string, unknown>): boolean {
  const v = String(contact.provider_observation_feasibility ?? "").trim().toLowerCase();
  return OBSERVATION_FEASIBILITY_BLOCKED.has(v);
}

function readinessContextLine(dbKey: string, contact: Record<string, unknown>): string | null {
  const raw = String(contact[dbKey] ?? "").trim();
  if (!raw) return null;
  const chip = formatIntelligenceCaptureSummaryChip(dbKey, raw);
  return scanLine(chip || raw, 72);
}

export function buildDiscoveryAdvancementSignal(
  contact: Record<string, unknown>,
): DiscoveryAdvancementSignal {
  const blocked = observationFeasibilityBlocked(contact);
  const approved = hasProviderObservationApprovalValidated(contact);

  if (approved && !blocked) {
    return {
      label: "Permission Confirmed",
      met: true,
      detail: readinessContextLine("provider_observation_feasibility", contact),
      dbKey: "provider_observation_feasibility",
      sectionId: "observation_readiness",
    };
  }

  if (blocked) {
    return {
      label: "Observation Not Approved",
      met: false,
      detail: scanLine(
        String(contact.provider_observation_feasibility ?? "Access restricted"),
        96,
      ),
      dbKey: "provider_observation_feasibility",
      sectionId: "observation_readiness",
    };
  }

  return {
    label: "Permission Not Yet Confirmed",
    met: false,
    detail: "Secure validated observation permission before scheduling OR days.",
    dbKey: "provider_observation_feasibility",
    sectionId: "observation_readiness",
  };
}
