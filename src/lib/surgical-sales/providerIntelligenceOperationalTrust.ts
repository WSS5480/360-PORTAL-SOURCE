/**
 * Operational trust — what reps can plan against in the field.
 *
 * Validated: durable, attributed, ready for operational use.
 * Emerging: captured or inferred — provisional until validated.
 * Unknown: unresolved — too thin for deployment planning.
 */

import type { IntelligenceLearningGapState } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import type { IntelligenceFieldAttribution } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import type { IntelligenceFreshnessTier } from "@/lib/surgical-sales/providerIntelligenceFreshness";
import {
  resolveIntelligenceFieldLifecycle,
  type IntelligenceFieldLifecycleResult,
} from "@/lib/surgical-sales/providerIntelligenceLifecycle";
import {
  assessIntelligenceFieldQuality,
  type IntelligenceFieldQualityAssessment,
} from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import {
  OPERATIONAL_INTEL_TRUST,
  OPERATIONAL_INTEL_TRUST_HINTS,
} from "@/lib/surgical-sales/providerIntelligenceOperationalCopy";

export type IntelligenceOperationalTrustTier = "validated" | "emerging" | "unknown";

export const INTELLIGENCE_OPERATIONAL_TRUST_LABELS: Record<
  IntelligenceOperationalTrustTier,
  string
> = { ...OPERATIONAL_INTEL_TRUST };

export const INTELLIGENCE_OPERATIONAL_TRUST_HINTS: Record<
  IntelligenceOperationalTrustTier,
  string
> = { ...OPERATIONAL_INTEL_TRUST_HINTS };

export type IntelligenceOperationalTrust = {
  tier: IntelligenceOperationalTrustTier;
  label: string;
  hint: string;
};

export function operationalTrustFromFreshnessTier(
  tier: IntelligenceFreshnessTier,
): IntelligenceOperationalTrustTier {
  if (tier === "recent" || tier === "current") return "validated";
  return "emerging";
}

function freshnessTierFromLifecycle(
  lifecycle: IntelligenceFieldLifecycleResult | null | undefined,
): IntelligenceFreshnessTier | null {
  if (!lifecycle || !("freshnessTier" in lifecycle)) return null;
  return (lifecycle as { freshnessTier: IntelligenceFreshnessTier }).freshnessTier;
}

export function resolveIntelligenceOperationalTrust(input: {
  dbKey: string;
  raw?: string | null | undefined;
  meta?: IntelligenceFieldAttribution;
  gapState?: IntelligenceLearningGapState;
  assessment?: IntelligenceFieldQualityAssessment;
  lifecycle?: IntelligenceFieldLifecycleResult | null;
  freshnessTier?: IntelligenceFreshnessTier | null;
}): IntelligenceOperationalTrust {
  const assessment =
    input.assessment ??
    assessIntelligenceFieldQuality(input.dbKey, input.raw);
  const hasSignal = assessment.hasSignal && fieldHasIntelligenceSignal(input.dbKey, input.raw);
  const lifecycle =
    input.lifecycle ??
    (hasSignal
      ? resolveIntelligenceFieldLifecycle(input.dbKey, input.raw, input.meta)
      : null);

  const freshnessTier =
    input.freshnessTier ?? freshnessTierFromLifecycle(lifecycle);

  let tier: IntelligenceOperationalTrustTier = "unknown";

  if (hasSignal) {
    if (freshnessTier) {
      tier = operationalTrustFromFreshnessTier(freshnessTier);
    } else {
      const validatedAt = Boolean(input.meta?.validated_at?.trim());
      const stale =
        lifecycle?.state === "outdated" ||
        Boolean(lifecycle?.needsRefresh && validatedAt);

      if (validatedAt && lifecycle?.state === "validated" && !stale) {
        tier = "validated";
      } else if (validatedAt && assessment.depth === "validated" && !stale) {
        tier = "validated";
      } else {
        tier = "emerging";
      }
    }
  } else if (input.gapState === "partial") {
    tier = "emerging";
  }

  return {
    tier,
    label: INTELLIGENCE_OPERATIONAL_TRUST_LABELS[tier],
    hint: INTELLIGENCE_OPERATIONAL_TRUST_HINTS[tier],
  };
}
