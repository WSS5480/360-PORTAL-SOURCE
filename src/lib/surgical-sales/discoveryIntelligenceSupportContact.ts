/**
 * Discovery intelligence rows — support contact assignment (provider + organization).
 */

import type { DiscoveryStructuredSignalId } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import {
  defaultSupportContactRoleId,
  type RapidDiscoverySupportContactRoleOption,
} from "@/lib/surgical-sales/rapidDiscoverySupportContact";

export type DiscoverySupportContactSignalId = Extract<
  DiscoveryStructuredSignalId,
  "scheduling_owner" | "facility_vendor_pathway" | "clinical_champion"
>;

export const DISCOVERY_SUPPORT_CONTACT_SIGNAL_IDS: DiscoverySupportContactSignalId[] = [
  "scheduling_owner",
  "facility_vendor_pathway",
  "clinical_champion",
];

const SUPPORT_CONTACT_SIGNAL_SET = new Set<string>(DISCOVERY_SUPPORT_CONTACT_SIGNAL_IDS);

export function discoveryIntelligenceSignalSupportsContact(
  signalId: string,
): signalId is DiscoverySupportContactSignalId {
  return SUPPORT_CONTACT_SIGNAL_SET.has(signalId);
}

/** Primary intelligence field updated when a contact is linked from this row. */
export function discoverySupportContactPrimaryDbKey(
  signalId: DiscoverySupportContactSignalId,
): string {
  switch (signalId) {
    case "scheduling_owner":
      return "provider_scheduling_contact";
    case "facility_vendor_pathway":
      return "provider_observation_access_path";
    case "clinical_champion":
      return "provider_champion_potential";
    default:
      return "provider_observation_coordinator_contact";
  }
}

export function discoverySupportContactDrawerTitle(signalId: DiscoverySupportContactSignalId): string {
  switch (signalId) {
    case "scheduling_owner":
      return "Scheduling owner";
    case "facility_vendor_pathway":
      return "Facility / vendor pathway";
    case "clinical_champion":
      return "Clinical champion";
    default:
      return "Support contact";
  }
}

export function defaultSupportContactRoleForDiscoverySignal(
  signalId: DiscoverySupportContactSignalId,
): string {
  switch (signalId) {
    case "scheduling_owner":
      return "scheduling_owner";
    case "facility_vendor_pathway":
      return "vendor_access_contact";
    case "clinical_champion":
      return "clinical_champion";
    default:
      return defaultSupportContactRoleId(discoverySupportContactPrimaryDbKey(signalId));
  }
}

/** Role options shown in the picker for each discovery row. */
export const DISCOVERY_SIGNAL_CONTACT_ROLE_IDS: Record<
  DiscoverySupportContactSignalId,
  readonly string[]
> = {
  scheduling_owner: [
    "scheduling_owner",
    "scheduler",
    "or_coordinator",
    "office_manager",
    "coordinator",
  ],
  facility_vendor_pathway: [
    "vendor_access_contact",
    "credentialing",
    "or_coordinator",
    "office_manager",
    "materials_contact",
    "facility_admin",
  ],
  clinical_champion: ["clinical_champion", "liaison", "or_coordinator"],
};

export function discoverySignalContactRoleOptions(
  signalId: DiscoverySupportContactSignalId,
  allRoles: RapidDiscoverySupportContactRoleOption[],
): RapidDiscoverySupportContactRoleOption[] {
  const allowed = new Set(DISCOVERY_SIGNAL_CONTACT_ROLE_IDS[signalId]);
  const filtered = allRoles.filter((r) => allowed.has(r.id));
  return filtered.length > 0 ? filtered : allRoles;
}

export function discoverySupportContactRelationshipNotes(
  signalId: DiscoverySupportContactSignalId,
): string {
  switch (signalId) {
    case "scheduling_owner":
      return "scheduling owner for observation access";
    case "facility_vendor_pathway":
      return "facility / vendor access pathway";
    case "clinical_champion":
      return "clinical champion for this provider";
    default:
      return "linked from Discovery intelligence";
  }
}

/** Planning fields to PATCH after linking (segmented fields use tokens, text fields use contact line). */
export function buildDiscoverySupportContactPlanningPatch(input: {
  signalId: DiscoverySupportContactSignalId;
  intelligenceValue: string;
}): Record<string, string> {
  switch (input.signalId) {
    case "scheduling_owner":
      return { provider_scheduling_contact: input.intelligenceValue };
    case "facility_vendor_pathway":
      return { provider_observation_access_path: input.intelligenceValue };
    case "clinical_champion":
      return { provider_champion_potential: "high" };
    default:
      return {
        [discoverySupportContactPrimaryDbKey(input.signalId)]: input.intelligenceValue,
      };
  }
}

export function discoverySupportContactValidateFields(
  signalId: DiscoverySupportContactSignalId,
): string[] {
  return Object.keys(
    buildDiscoverySupportContactPlanningPatch({
      signalId,
      intelligenceValue: "",
    }),
  );
}

/** All provider planning keys that may change when linking a discovery support contact. */
export function discoverySupportContactPlanningFieldKeys(): string[] {
  const keys = new Set<string>();
  for (const signalId of DISCOVERY_SUPPORT_CONTACT_SIGNAL_IDS) {
    for (const key of discoverySupportContactValidateFields(signalId)) {
      keys.add(key);
    }
  }
  return [...keys];
}
