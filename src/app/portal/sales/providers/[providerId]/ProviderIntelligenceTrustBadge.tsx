"use client";

import type { IntelligenceOperationalTrustTier } from "@/lib/surgical-sales/providerIntelligenceOperationalTrust";

export function ProviderIntelligenceTrustBadge({
  tier,
  label,
  title,
  compact = false,
}: {
  tier: IntelligenceOperationalTrustTier;
  label: string;
  title?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={`provider-intel-trust-badge provider-intel-trust-badge--${tier}${compact ? " provider-intel-trust-badge--compact" : ""}`}
      title={title ?? label}
    >
      {label}
    </span>
  );
}
