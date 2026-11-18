/** Discovery access signal ids — leaf module (no surgical-sales imports). */

export const DISCOVERY_ACCESS_PREP_SIGNAL_IDS = new Set([
  "scheduling_owner",
  "facility_vendor_pathway",
  "observation_logistics",
]);

export const DISCOVERY_ACCESS_SIGNAL_IDS = new Set([
  "observation_approval_status",
  ...DISCOVERY_ACCESS_PREP_SIGNAL_IDS,
]);
