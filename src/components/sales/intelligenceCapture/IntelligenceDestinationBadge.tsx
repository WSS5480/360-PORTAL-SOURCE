"use client";

import React from "react";
import { intelligenceSaveDestinationLabel } from "@/lib/surgical-sales/intelligenceSaveDestination";
import type { IntelligenceSaveDestination } from "@/lib/surgical-sales/intelligenceSaveDestination";

const DESTINATION_SCOPE_CLASS: Record<IntelligenceSaveDestination, string> = {
  facility: "organization",
  provider: "provider",
  case: "case",
  engagement_note: "case",
};

export function IntelligenceDestinationBadge({
  destination,
  reason,
  compact = true,
  variant = "default",
}: {
  destination: IntelligenceSaveDestination;
  reason?: string | null;
  compact?: boolean;
  variant?: "default" | "item";
}) {
  const label = intelligenceSaveDestinationLabel(destination);
  const scopeClass = DESTINATION_SCOPE_CLASS[destination];
  return (
    <span
      className={`intel-scope-badge intel-scope-badge--${scopeClass} intel-scope-badge--dest-${destination}${variant === "item" ? " intel-scope-badge--item" : ""}`}
      title={reason?.trim() || label}
      aria-label={`Proposed destination: ${label}`}
    >
      {label}
    </span>
  );
}
