"use client";

import React from "react";
import { GENERATE_DEBRIEF_LABEL } from "@/lib/surgical-sales/observationProgramGate";
import { PLAN_PROVIDER_DEBRIEF_NEXT_STEP_LEAD } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";
import { PlanProviderDebriefCta } from "./PlanProviderDebriefCta";

export function ObservationDebriefNextStepPrompt({
  caseId,
  providerName,
  disabled,
  debriefUnlocked = false,
  onDismiss,
  onError,
}: {
  caseId: string;
  providerName?: string | null;
  disabled?: boolean;
  debriefUnlocked?: boolean;
  onDismiss?: () => void;
  onError?: (message: string) => void;
}) {
  if (!debriefUnlocked) return null;
  const providerLabel = providerName?.trim() || "the surgeon";

  return (
    <div role="status" className="case-obs-debrief-next-step">
      <div style={{ fontWeight: 800, marginBottom: 4 }}>Observation program complete — generate your provider debrief</div>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>
        {PLAN_PROVIDER_DEBRIEF_NEXT_STEP_LEAD} Field Briefing opens with {providerLabel}, the facility, this case,
        and everything captured during observation already linked.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <PlanProviderDebriefCta
          caseId={caseId}
          disabled={disabled}
          label={GENERATE_DEBRIEF_LABEL}
          onError={onError}
          className="case-obs-plan-debrief-btn case-obs-plan-debrief-btn--primary"
        />
        {onDismiss ? (
          <button type="button" className="case-obs-plan-debrief-btn case-obs-plan-debrief-btn--secondary" disabled={disabled} onClick={onDismiss}>
            Not now
          </button>
        ) : null}
      </div>
    </div>
  );
}
