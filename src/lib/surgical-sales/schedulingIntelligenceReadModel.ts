/**
 * Shared scheduling intelligence read model — aligned with discovery signal status.
 */

import {
  DISCOVERY_FIELD_STATUS,
  resolveSchedulingOwnerStatus,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import {
  resolveSchedulingOwnerFieldText,
  SCHEDULING_OWNER_FIELD_DB_KEYS,
} from "@/lib/surgical-sales/schedulingIntelligenceDbKeys";

export { SCHEDULING_OWNER_FIELD_DB_KEYS };

export function hasSchedulingIntelligenceOnFile(contact: Record<string, unknown>): boolean {
  return resolveSchedulingOwnerStatus(contact) !== DISCOVERY_FIELD_STATUS.unknown;
}

export function schedulingOwnerDisplayLine(contact: Record<string, unknown>): string | null {
  const text = resolveSchedulingOwnerFieldText(contact).trim();
  return text || null;
}
