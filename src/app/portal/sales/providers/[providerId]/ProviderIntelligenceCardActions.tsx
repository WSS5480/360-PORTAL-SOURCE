"use client";

import React from "react";
import type { IntelligenceCardWorkspace } from "@/lib/surgical-sales/providerIntelligenceCardWorkspace";
import { intelligenceContextualCaptureCta } from "@/lib/surgical-sales/providerIntelligenceContextualCtas";
import {
  buildSectionOperationalMappingProgress,
  intelligenceMappingCtaLabel,
} from "@/lib/surgical-sales/providerIntelligenceOperationalMapping";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

export type IntelligenceCardActionHandlers = {
  onCaptureSignal: () => void;
  onMarkValidated: () => void;
  onAddNote: () => void;
  onOpenFullArea: () => void;
  onAssignFollowUp: () => void;
};

const SECONDARY_ACTIONS: {
  id: Exclude<keyof IntelligenceCardActionHandlers, "onCaptureSignal">;
  label: string;
}[] = [
  { id: "onMarkValidated", label: "Confirm for deployment" },
  { id: "onAddNote", label: "Add field note" },
  { id: "onOpenFullArea", label: "Open full area" },
  { id: "onAssignFollowUp", label: "Schedule follow-up" },
];

export function ProviderIntelligenceCardActions({
  workspace,
  handlers,
  busy = false,
  compact = false,
  layer = "actions",
  contact,
  planning,
}: {
  workspace: IntelligenceCardWorkspace;
  handlers: IntelligenceCardActionHandlers;
  busy?: boolean;
  compact?: boolean;
  layer?: "actions";
  contact?: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
}) {
  const disabled: Record<keyof IntelligenceCardActionHandlers, boolean> = {
    onCaptureSignal: busy,
    onMarkValidated: busy || !workspace.canMarkValidated,
    onAddNote: busy || !workspace.canAddNote,
    onOpenFullArea: busy,
    onAssignFollowUp: busy,
  };

  const titles: Partial<Record<keyof IntelligenceCardActionHandlers, string>> = {
    onCaptureSignal: workspace.captureDbKey
      ? "Open quick capture for the top gap in this area"
      : "Open this area to capture",
    onMarkValidated: workspace.canMarkValidated
      ? `Mark ${workspace.validateDbKeys.length} on-file signal(s) validated`
      : "No signals ready to validate",
    onAddNote: "Add or extend notes on a structured field",
    onOpenFullArea: "Expand area — signals, notes, attribution, and history",
    onAssignFollowUp: "Schedule a follow-up engagement for this provider",
  };

  const mappingProgress =
    contact != null
      ? buildSectionOperationalMappingProgress(workspace.sectionId, contact, { planning })
      : null;
  const primaryLabel = mappingProgress
    ? intelligenceMappingCtaLabel(mappingProgress)
    : workspace.captureDbKey
      ? intelligenceContextualCaptureCta(workspace.captureDbKey)
      : "Resolve unknowns";

  return (
    <footer
      className={`provider-intel-card-actions provider-intel-card-layer--${layer}${compact ? " provider-intel-card-actions--compact" : ""}`}
      aria-label="Intelligence area actions"
      onClick={(e) => e.stopPropagation()}
    >
      <ul className="provider-intel-card-actions-list">
        <li>
          <button
            type="button"
            className="provider-intel-card-action provider-intel-card-action--primary"
            disabled={disabled.onCaptureSignal}
            title={titles.onCaptureSignal}
            onClick={handlers.onCaptureSignal}
          >
            {primaryLabel}
          </button>
        </li>
        {SECONDARY_ACTIONS.map(({ id, label }) => (
          <li key={id}>
            <button
              type="button"
              className="provider-intel-card-action"
              disabled={disabled[id]}
              title={titles[id]}
              onClick={handlers[id]}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
    </footer>
  );
}
