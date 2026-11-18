"use client";

import { intelligenceGapChipLabel } from "@/lib/surgical-sales/providerIntelligenceBriefing";
import type { IntelligenceLearningGap } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import { IntelligenceScanOpenRow } from "./ProviderIntelligenceScanSignals";

export function ProviderIntelligenceGapLineList({
  gaps,
  onGapClick,
  max = 3,
  emptyLabel = "None flagged",
}: {
  gaps: IntelligenceLearningGap[];
  onGapClick?: (gap: IntelligenceLearningGap) => void;
  max?: number;
  emptyLabel?: string;
  /** @deprecated Discovery source hidden in scan layout — use full area for capture path. */
  showDiscoverySource?: boolean;
}) {
  const visible = gaps.slice(0, max);
  if (visible.length === 0) {
    return <p className="provider-intel-scan-empty provider-intel-scan-empty--open">{emptyLabel}</p>;
  }

  return (
    <ul className="provider-intel-scan-list provider-intel-scan-list--gaps">
      {visible.map((gap) => (
        <IntelligenceScanOpenRow
          key={gap.dbKey}
          label={intelligenceGapChipLabel(
            gap.dbKey,
            gap.state === "unknown" ? "unknown" : "partial",
          )}
          consequence={gap.operationalConsequence}
          fieldGuidance={gap.fieldGuidance}
          onClick={onGapClick ? () => onGapClick(gap) : undefined}
          showTags
        />
      ))}
      {gaps.length > max ? (
        <li className="provider-intel-scan-item provider-intel-scan-item--more">
          <span className="provider-intel-scan-more">+{gaps.length - max} more open</span>
        </li>
      ) : null}
    </ul>
  );
}
