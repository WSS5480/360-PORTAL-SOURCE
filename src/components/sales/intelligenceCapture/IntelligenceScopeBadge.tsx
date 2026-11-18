"use client";

import React from "react";
import {
  intelligenceScopeBadgeLabel,
  intelligenceScopeFullLabel,
} from "@/lib/surgical-sales/intelligenceScopeInference";
import type { IntelligenceScope } from "@/lib/surgical-sales/intelligenceScopeModel";

export function IntelligenceScopeBadge({
  scope,
  reason,
  compact = true,
  variant = "default",
}: {
  scope: IntelligenceScope;
  reason?: string | null;
  compact?: boolean;
  /** Smaller badge for inline intelligence list items. */
  variant?: "default" | "item";
}) {
  const label = compact ? intelligenceScopeBadgeLabel(scope) : intelligenceScopeFullLabel(scope);
  return (
    <span
      className={`intel-scope-badge intel-scope-badge--${scope}${variant === "item" ? " intel-scope-badge--item" : ""}`}
      title={reason?.trim() || intelligenceScopeFullLabel(scope)}
      aria-label={intelligenceScopeFullLabel(scope)}
    >
      {label}
    </span>
  );
}
