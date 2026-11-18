"use client";

import type React from "react";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  engagementPlanningHintForStage,
  formatProviderRelationshipStage,
  intelligenceHintFromPlanning,
  observationSetupHintForStage,
  type ProviderEngagementPlanningHint,
} from "@/lib/surgical-sales/providerRelationshipStage";

function hintStyle(tone: ProviderEngagementPlanningHint["tone"]): React.CSSProperties {
  if (tone === "active") {
    return {
      color: "#166534",
      border: "1px solid color-mix(in srgb, var(--success) 24%, var(--border))",
      background: "color-mix(in srgb, var(--success) 8%, var(--surface))",
    };
  }
  if (tone === "encouraged") {
    return {
      color: "var(--brand-700)",
      border: "1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border))",
      background: "color-mix(in srgb, var(--brand-600) 6%, var(--surface))",
    };
  }
  if (tone === "optional") {
    return {
      color: "var(--muted)",
      border: "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
      background: "color-mix(in srgb, var(--foreground) 3%, var(--surface))",
    };
  }
  return {
    color: "var(--foreground)",
    border: "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
    background: "color-mix(in srgb, var(--foreground) 3%, var(--surface))",
  };
}

function StatusRow({ label, hint }: { label: string; hint: ProviderEngagementPlanningHint }) {
  return (
    <div className="provider-rel-status-row">
      <span className="provider-rel-status-label">{label}</span>
      <span className="provider-rel-status-value" style={hintStyle(hint.tone)}>
        {hint.label}
      </span>
    </div>
  );
}

export function ProviderRelationshipStatusSummary({
  relationshipStage,
  planning,
  upcomingEngagementCount = 0,
  compact = false,
}: {
  relationshipStage: string | null | undefined;
  planning: ProviderPlanningCompletion | null | undefined;
  upcomingEngagementCount?: number;
  compact?: boolean;
}) {
  const intelligence = intelligenceHintFromPlanning(planning ?? undefined);

  return (
    <div className={`provider-rel-status-summary${compact ? " provider-rel-status-summary--compact" : ""}`}>
      <StatusRow
        label="Relationship stage"
        hint={{ label: formatProviderRelationshipStage(relationshipStage), tone: "neutral" }}
      />
      <StatusRow
        label="Pre-call plan"
        hint={engagementPlanningHintForStage(relationshipStage, upcomingEngagementCount)}
      />
      <StatusRow label="Observation setup" hint={observationSetupHintForStage(relationshipStage)} />
      <StatusRow label="Provider intelligence" hint={intelligence} />
    </div>
  );
}
