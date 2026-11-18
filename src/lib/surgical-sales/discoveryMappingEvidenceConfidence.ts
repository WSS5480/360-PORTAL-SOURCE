/**
 * Discovery Mapping — rep-facing evidence confidence (single selector).
 *
 * Status badges and legacy high/medium/low confidence are derived from this level.
 */

import type { DiscoveryMappingScanStatusSlug } from "@/lib/surgical-sales/discoveryMappingEvidenceQuality";
import type { DiscoveryMappingIntelligenceConfidenceLevel } from "@/lib/surgical-sales/discoveryMappingIntelligenceConfidence";
import type { StageMappingValidationStatus } from "@/lib/surgical-sales/stageMappingAnswerTypes";
import type { IntelligenceDiscoveryStance } from "@/lib/surgical-sales/operationalIntelligenceReadiness";

export type DiscoveryMappingEvidenceConfidence =
  | "mentioned_once"
  | "discussed"
  | "observed"
  | "validated";

export const DISCOVERY_MAPPING_EVIDENCE_CONFIDENCE_ORDER: DiscoveryMappingEvidenceConfidence[] = [
  "mentioned_once",
  "discussed",
  "observed",
  "validated",
];

export const DISCOVERY_MAPPING_EVIDENCE_CONFIDENCE_LABEL: Record<
  DiscoveryMappingEvidenceConfidence,
  string
> = {
  mentioned_once: "Mentioned Once",
  discussed: "Discussed",
  observed: "Observed",
  validated: "Confirmed in the field",
};

export const DISCOVERY_MAPPING_EVIDENCE_CONFIDENCE_SCAN: Record<
  DiscoveryMappingEvidenceConfidence,
  { label: string; slug: DiscoveryMappingScanStatusSlug }
> = {
  mentioned_once: { label: "Open", slug: "open" },
  discussed: { label: "Partial", slug: "partial" },
  observed: { label: "Partial", slug: "partial" },
  validated: { label: "Captured", slug: "confirmed" },
};

export const DISCOVERY_MAPPING_EVIDENCE_CONFIDENCE_LEGACY_LEVEL: Record<
  DiscoveryMappingEvidenceConfidence,
  DiscoveryMappingIntelligenceConfidenceLevel
> = {
  mentioned_once: "low",
  discussed: "medium",
  observed: "medium",
  validated: "high",
};

export function isDiscoveryMappingEvidenceConfidence(
  value: string,
): value is DiscoveryMappingEvidenceConfidence {
  return (DISCOVERY_MAPPING_EVIDENCE_CONFIDENCE_ORDER as readonly string[]).includes(value);
}

export function discoveryMappingScanFromEvidenceConfidence(
  confidence: DiscoveryMappingEvidenceConfidence,
): { label: string; slug: DiscoveryMappingScanStatusSlug } {
  return DISCOVERY_MAPPING_EVIDENCE_CONFIDENCE_SCAN[confidence];
}

export function legacyIntelligenceConfidenceFromEvidenceConfidence(
  confidence: DiscoveryMappingEvidenceConfidence,
): DiscoveryMappingIntelligenceConfidenceLevel {
  return DISCOVERY_MAPPING_EVIDENCE_CONFIDENCE_LEGACY_LEVEL[confidence];
}

/** Map rep confidence → persistence stance + field validation. */
export function evidenceConfidenceToPersistence(confidence: DiscoveryMappingEvidenceConfidence): {
  stance: IntelligenceDiscoveryStance;
  validateField: boolean;
  uncertaintyKind?: "unexplored" | "opaque";
} {
  switch (confidence) {
    case "validated":
      return { stance: "needs_validation", validateField: true };
    case "observed":
      return { stance: "needs_validation", validateField: false };
    case "discussed":
      return { stance: "ask_next_touch", validateField: false };
    case "mentioned_once":
    default:
      return { stance: "unknown", uncertaintyKind: "unexplored", validateField: false };
  }
}

/** Infer evidence confidence from stored metadata (backward compatible). */
export function inferDiscoveryMappingEvidenceConfidence(input: {
  validationStatus?: StageMappingValidationStatus | null;
  validatedOnFile?: boolean;
  evidenceStrength?: "none" | "weak" | "partial" | "substantive";
  stored?: DiscoveryMappingEvidenceConfidence | null;
}): DiscoveryMappingEvidenceConfidence {
  if (input.stored && isDiscoveryMappingEvidenceConfidence(input.stored)) {
    return input.stored;
  }

  if (input.validatedOnFile || input.validationStatus === "confirmed") {
    return "validated";
  }

  const strength = input.evidenceStrength ?? "none";
  if (strength === "none") return "mentioned_once";
  if (strength === "weak") return "discussed";
  if (input.validationStatus === "likely") return "discussed";
  if (input.validationStatus === "needs_validation" && strength === "substantive") {
    return "observed";
  }
  if (input.validationStatus === "needs_validation") return "discussed";
  if (strength === "substantive" || strength === "partial") return "discussed";

  return "mentioned_once";
}

export function validationStatusFromEvidenceConfidence(
  confidence: DiscoveryMappingEvidenceConfidence,
): StageMappingValidationStatus {
  switch (confidence) {
    case "validated":
      return "confirmed";
    case "observed":
      return "needs_validation";
    case "discussed":
      return "likely";
    case "mentioned_once":
    default:
      return "unknown";
  }
}
