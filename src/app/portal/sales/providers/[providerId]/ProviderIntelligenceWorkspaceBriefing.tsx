"use client";

import React from "react";
import { buildProviderIntelligenceSummaryView } from "@/lib/surgical-sales/buildProviderIntelligenceSummaryView";
import {
  formatIntelligenceStrengthDisplay,
  PROVIDER_INTELLIGENCE_UI,
  type IntelligenceStrengthLabel,
} from "@/lib/surgical-sales/providerIntelligenceDisplayLabels";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

function readinessToneClass(status: IntelligenceStrengthLabel): string {
  if (status === "Strong") return "provider-intel-readiness--strong";
  if (status === "Building") return "provider-intel-readiness--building";
  return "provider-intel-readiness--limited";
}

function signalToneClass(status: IntelligenceStrengthLabel): string {
  if (status === "Strong") return "provider-intel-signal-dot--strong";
  if (status === "Building") return "provider-intel-signal-dot--building";
  return "provider-intel-signal-dot--limited";
}

export function ProviderIntelligenceWorkspaceBriefing({
  contact,
  planning,
}: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
}) {
  const view = React.useMemo(() => {
    if (!planning) return null;
    return buildProviderIntelligenceSummaryView({ contact, planning });
  }, [contact, planning]);

  if (!view) return null;

  const readinessLabel = formatIntelligenceStrengthDisplay(view.overallStatus, "overall");

  return (
    <section className="provider-intel-workspace-briefing" aria-label="Field intelligence briefing">
      <header className="provider-intel-briefing-head">
        <p className="provider-intel-lead">{view.interpretation}</p>
        <p className={`provider-intel-readiness ${readinessToneClass(view.overallStatus)}`}>
          <span className="provider-intel-readiness-dot" aria-hidden />
          <span>{readinessLabel}</span>
        </p>
      </header>

      {view.focusSummary ? <p className="provider-intel-focus">{view.focusSummary}</p> : null}

      <ul className="provider-intel-signals" aria-label={PROVIDER_INTELLIGENCE_UI.signalsAria}>
        {view.tracks.map((track) => (
          <li key={track.id} className="provider-intel-signal">
            <span
              className={`provider-intel-signal-dot ${signalToneClass(track.status)}`}
              aria-hidden
            />
            <div className="provider-intel-signal-body">
              <p className="provider-intel-signal-title">{track.label}</p>
              <p className="provider-intel-signal-detail">{track.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
