/**
 * Rep-facing depth labels for intelligence areas (internal keys unchanged).
 */

import {
  PROVIDER_INTEL_AREA_DEPTH,
  PROVIDER_INTEL_TRACK,
} from "@/lib/surgical-sales/providerIntelligenceRepVocabulary";

export const OPERATIONAL_MATURITY_SECTION_LABELS = { ...PROVIDER_INTEL_AREA_DEPTH };

export const OPERATIONAL_MATURITY_SECTION_HINTS = {
  unknown: "Still learning — add operational context on your next touch",
  partial: "Deployment gaps remain — validate before field time",
  confirmed: "Partially clear — enough to plan the next move",
  validated: "Field-ready for deployment planning",
} as const;

export const OPERATIONAL_MATURITY_STATUS_CARD_LABELS = {
  low: "Gap to close",
  partial: PROVIDER_INTEL_AREA_DEPTH.partial,
  strong: PROVIDER_INTEL_AREA_DEPTH.confirmed,
  validated: PROVIDER_INTEL_AREA_DEPTH.validated,
} as const;

export const OPERATIONAL_MATURITY_PROGRESSION_TIER_LABELS = {
  emerging: "Visibility limited",
  low: "Check before travel",
  moderate: PROVIDER_INTEL_AREA_DEPTH.partial,
  solid: "Ready for the field",
} as const;

export const OPERATIONAL_MATURITY_PROGRESSION_INDICATOR_LABELS = {
  observation: "Observation access",
  evaluation: "Evaluation path",
  adoption: "Deployment path",
} as const;

export const CLINICAL_DISCOVERY_SIGNAL_STRENGTH_LABELS = {
  low: PROVIDER_INTEL_AREA_DEPTH.unknown,
  medium: PROVIDER_INTEL_AREA_DEPTH.partial,
  high: PROVIDER_INTEL_AREA_DEPTH.validated,
} as const;

export const CLINICAL_DISCOVERY_SIGNAL_STRENGTH_LEGEND = "How well this is documented";

export const DISCOVERY_QUEUE_READINESS_GAIN_COLUMN = "Field readiness gain";

export const PROVIDER_INTEL_AREA_MATURITY_HEADING = "Account understanding by area";

export const PROVIDER_INTEL_PATHWAY_MATURITY_HEADING = "Path checks";

export function formatClinicalDiscoverySignalStrengthLabel(
  level: "" | keyof typeof CLINICAL_DISCOVERY_SIGNAL_STRENGTH_LABELS,
): string {
  if (!level) return "";
  return CLINICAL_DISCOVERY_SIGNAL_STRENGTH_LABELS[level];
}
