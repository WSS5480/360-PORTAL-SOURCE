"use client";

import {
  INTELLIGENCE_GAP_FIELD_GUIDANCE_LABELS,
  type IntelligenceGapFieldGuidance,
} from "@/lib/surgical-sales/providerIntelligenceGapFieldGuidance";

export function ProviderGapFieldGuidance({
  guidance,
  compact = false,
}: {
  guidance: IntelligenceGapFieldGuidance;
  compact?: boolean;
}) {
  const rootClass = [
    "provider-intel-gap-field-guidance",
    compact ? "provider-intel-gap-field-guidance--compact" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <dl className={rootClass}>
      <div className="provider-intel-gap-field-guidance-row">
        <dt>{INTELLIGENCE_GAP_FIELD_GUIDANCE_LABELS.bestSource}</dt>
        <dd>{guidance.bestSource}</dd>
      </div>
      <div className="provider-intel-gap-field-guidance-row">
        <dt>{INTELLIGENCE_GAP_FIELD_GUIDANCE_LABELS.bestInteraction}</dt>
        <dd>{guidance.bestInteraction}</dd>
      </div>
      <div className="provider-intel-gap-field-guidance-row">
        <dt>{INTELLIGENCE_GAP_FIELD_GUIDANCE_LABELS.idealTiming}</dt>
        <dd>{guidance.idealTiming}</dd>
      </div>
    </dl>
  );
}
