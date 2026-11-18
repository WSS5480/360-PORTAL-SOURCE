"use client";

import type { ProviderDiscoveryProgressView } from "@/lib/surgical-sales/buildProviderDiscoveryProgressView";

export function ProviderDiscoveryProgressChecklist({
  progress,
  className = "",
  compact = false,
}: {
  progress: ProviderDiscoveryProgressView;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`discovery-progress-checklist${compact ? " discovery-progress-checklist--compact" : ""}${
        progress.approved ? " discovery-progress-checklist--approved" : " discovery-progress-checklist--pending"
      }${className ? ` ${className}` : ""}`}
      aria-label="Discovery status"
    >
      <div className="discovery-progress-checklist__head">
        <span className="discovery-progress-checklist__title">Discovery Status</span>
        <span className="discovery-progress-checklist__summary">{progress.statusLabel}</span>
      </div>
    </div>
  );
}
