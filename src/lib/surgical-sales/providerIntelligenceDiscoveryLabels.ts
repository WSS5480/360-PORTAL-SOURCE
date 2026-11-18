/**
 * Rep-facing field states on the Provider Intelligence tab.
 */

import { PROVIDER_INTEL_FIELD_STATE } from "@/lib/surgical-sales/providerIntelligenceRepVocabulary";

export const INTELLIGENCE_DISCOVERY_LABELS = {
  notCapturedYet: PROVIDER_INTEL_FIELD_STATE.unset,
  emergingSignal: PROVIDER_INTEL_FIELD_STATE.building,
  pendingValidation: PROVIDER_INTEL_FIELD_STATE.pendingCheck,
  discoveryNeeded: "Deployment gap open",
  openSignal: PROVIDER_INTEL_FIELD_STATE.assumption,
  validated: PROVIDER_INTEL_FIELD_STATE.confirmed,
} as const;
