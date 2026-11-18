"use client";

import React from "react";
import { IntelligenceDestinationBadge } from "@/components/sales/intelligenceCapture/IntelligenceDestinationBadge";
import type { IntelligenceSaveDestination } from "@/lib/surgical-sales/intelligenceSaveDestination";
import type { IntelligenceScope } from "@/lib/surgical-sales/intelligenceScopeModel";
import { intelligenceSaveDestinationFromScope } from "@/lib/surgical-sales/intelligenceSaveDestination";
import { intelligenceScopeItemCss } from "@/components/sales/intelligenceCapture/intelligenceScopeItemCss";

export function IntelligenceItemLine({
  scope,
  destination,
  children,
  reason,
  className = "",
}: {
  scope: IntelligenceScope;
  /** When set, shown instead of deriving from scope alone. */
  destination?: IntelligenceSaveDestination;
  children: React.ReactNode;
  reason?: string | null;
  className?: string;
}) {
  const resolvedDestination =
    destination ?? intelligenceSaveDestinationFromScope({ scope, text: reason ?? "" });
  return (
    <>
      <style>{intelligenceScopeItemCss}</style>
      <span className={`intel-item-line${className ? ` ${className}` : ""}`}>
        <IntelligenceDestinationBadge destination={resolvedDestination} reason={reason} variant="item" />
        <span className="intel-item-line-text">{children}</span>
      </span>
    </>
  );
}
