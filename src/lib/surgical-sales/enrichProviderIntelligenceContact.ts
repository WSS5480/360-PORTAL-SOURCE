/**
 * Single read path for provider intelligence — merge persisted row values with linked
 * support contacts so Overview, Intelligence, and Mission share one contact shape.
 */

import { filterContactToPersistentIntelligenceLayer } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  formatIntelligenceValueFromSupportContact,
  SCHEDULING_OWNER_INTELLIGENCE_DB_KEY,
} from "@/lib/surgical-sales/rapidDiscoverySupportContact";
import {
  resolveSchedulingOwnerFieldText,
  SCHEDULING_OWNER_FIELD_DB_KEYS,
  isStaleSchedulingNarrative,
} from "@/lib/surgical-sales/schedulingIntelligenceDbKeys";

function schedulingRoleMatches(role: string): boolean {
  return (
    role.includes("scheduler") ||
    role.includes("scheduling") ||
    role.includes("coordinator")
  );
}

export function findLinkedSchedulingSupportContact(
  relatedContacts?: Array<Record<string, unknown>>,
): Record<string, unknown> | null {
  for (const related of relatedContacts ?? []) {
    const role = `${related.role_type ?? ""} ${related.title ?? ""} ${related.relationship_type ?? ""}`.toLowerCase();
    if (schedulingRoleMatches(role)) return related;
  }
  return null;
}

function schedulingFieldHasSignal(contact: Record<string, unknown>): boolean {
  return SCHEDULING_OWNER_FIELD_DB_KEYS.some((key) =>
    fieldHasIntelligenceSignal(key, contact[key]),
  );
}

/** Merge provider row + draft with linked scheduler when planning columns are still empty. */
export function enrichProviderIntelligenceContact(input: {
  contact: Record<string, unknown>;
  relatedContacts?: Array<Record<string, unknown>>;
  planDraft?: Record<string, string>;
}): Record<string, unknown> {
  const merged = filterContactToPersistentIntelligenceLayer({
    ...input.contact,
    ...(input.planDraft ?? {}),
  });

  const linked = findLinkedSchedulingSupportContact(input.relatedContacts);
  const resolved = resolveSchedulingOwnerFieldText(merged).trim();

  if (linked) {
    const roleLabel =
      String(linked.title ?? linked.role_type ?? "Scheduler").trim() || "Scheduler";
    const linkedValue = formatIntelligenceValueFromSupportContact(linked, roleLabel).trim();
    if (linkedValue && (!resolved || isStaleSchedulingNarrative(resolved))) {
      return {
        ...merged,
        [SCHEDULING_OWNER_INTELLIGENCE_DB_KEY]: linkedValue,
      };
    }
  }

  if (schedulingFieldHasSignal(merged) || resolved) {
    return merged;
  }

  if (!linked) return merged;

  const roleLabel =
    String(linked.title ?? linked.role_type ?? "Scheduler").trim() || "Scheduler";
  const intelligenceValue = formatIntelligenceValueFromSupportContact(linked, roleLabel);

  return {
    ...merged,
    [SCHEDULING_OWNER_INTELLIGENCE_DB_KEY]: intelligenceValue,
  };
}

export function linkedSchedulingContactDisplayName(
  relatedContacts?: Array<Record<string, unknown>>,
): string | null {
  const linked = findLinkedSchedulingSupportContact(relatedContacts);
  if (!linked) return null;
  return contactDisplayName(linked as Parameters<typeof contactDisplayName>[0]);
}
