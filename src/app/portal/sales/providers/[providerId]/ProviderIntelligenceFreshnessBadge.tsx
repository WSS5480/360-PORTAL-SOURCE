"use client";

import type { IntelligenceFreshnessTier } from "@/lib/surgical-sales/providerIntelligenceFreshness";
import { operationalTrustFromFreshnessTier } from "@/lib/surgical-sales/providerIntelligenceOperationalTrust";
import { ProviderIntelligenceTrustBadge } from "./ProviderIntelligenceTrustBadge";

export function ProviderIntelligenceFreshnessBadge({
  tier,
  label,
  title,
  compact = false,
}: {
  tier: IntelligenceFreshnessTier;
  label: string;
  title?: string;
  compact?: boolean;
}) {
  const trustTier = operationalTrustFromFreshnessTier(tier);
  return (
    <ProviderIntelligenceTrustBadge
      tier={trustTier}
      label={label}
      title={title ?? label}
      compact={compact}
    />
  );
}
