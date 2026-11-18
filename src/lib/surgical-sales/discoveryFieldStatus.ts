/** Shared lifecycle labels for discovery intelligence status columns — no heavy imports. */

import { MISSION_DISCOVERY_FIELD_STATUS } from "@/lib/surgical-sales/providerMissionExecutionLanguage";

export const DISCOVERY_FIELD_STATUS = {
  unknown: MISSION_DISCOVERY_FIELD_STATUS.unknown,
  captured: MISSION_DISCOVERY_FIELD_STATUS.captured,
  validated: MISSION_DISCOVERY_FIELD_STATUS.validated,
  conditional: MISSION_DISCOVERY_FIELD_STATUS.conditional,
  blocked: MISSION_DISCOVERY_FIELD_STATUS.declined,
  notApplicable: MISSION_DISCOVERY_FIELD_STATUS.notApplicable,
} as const;

export type DiscoveryFieldStatusLabel =
  (typeof DISCOVERY_FIELD_STATUS)[keyof typeof DISCOVERY_FIELD_STATUS];
