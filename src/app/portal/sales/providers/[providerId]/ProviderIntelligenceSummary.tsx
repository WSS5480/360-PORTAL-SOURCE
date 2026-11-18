"use client";

import { buildProviderIntelligenceSummaryView } from "@/lib/surgical-sales/buildProviderIntelligenceSummaryView";
import {
  formatIntelligenceStrengthDisplay,
  PROVIDER_INTELLIGENCE_UI,
  type IntelligenceStrengthLabel,
} from "@/lib/surgical-sales/providerIntelligenceDisplayLabels";
import {
  intelligenceTrackIdsForCommercialStage,
  type ProviderCommercialWorkflowStage,
} from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import { buildProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import type { ProviderProfilePayload } from "./providerProfileTypes";

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

export function ProviderIntelligenceSummary({
  data,
  providerId,
  commercialStage,
  onOpenIntelligence,
  variant = "default",
}: {
  data: ProviderProfilePayload;
  providerId: string;
  commercialStage: ProviderCommercialWorkflowStage;
  onOpenIntelligence: () => void;
  variant?: "default" | "dashboard";
}) {
  const p = data.provider!;
  const snap = buildProviderIntelligenceSnapshot(p, providerId);
  const view = buildProviderIntelligenceSummaryView({
    contact: p,
    planning: snap.planning,
  });
  const trackIds = new Set(intelligenceTrackIdsForCommercialStage(commercialStage));
  const tracks = view.tracks.filter((track) => trackIds.has(track.id));
  const dashboardTracks = tracks.slice(0, 2);

  const readinessLabel = formatIntelligenceStrengthDisplay(view.overallStatus, "overall");

  if (variant === "dashboard") {
    return (
      <section
        className="provider-ops-panel provider-ops-panel--commercial"
        aria-labelledby="provider-ops-commercial-title"
      >
        <div className="provider-ops-panel-head">
          <h3 id="provider-ops-commercial-title" className="provider-ops-panel-title">
            Commercial readiness
          </h3>
          <button type="button" className="provider-ops-panel-link" onClick={onOpenIntelligence}>
            Open →
          </button>
        </div>
        <p className={`provider-ops-readiness-pill ${readinessToneClass(view.overallStatus)}`}>
          {readinessLabel}
        </p>
        <p className="provider-ops-panel-lead">{view.interpretation}</p>
        {view.focusSummary ? <p className="provider-ops-panel-meta">{view.focusSummary}</p> : null}
        {dashboardTracks.length > 0 ? (
          <ul className="provider-ops-signal-list" aria-label={PROVIDER_INTELLIGENCE_UI.signalsAria}>
            {dashboardTracks.map((track) => (
              <li key={track.id} className="provider-ops-signal-item">
                <span className={`provider-intel-signal-dot ${signalToneClass(track.status)}`} aria-hidden />
                <div>
                  <p className="provider-ops-signal-label">{track.label}</p>
                  <p className="provider-ops-signal-detail">{track.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="provider-ops-panel-foot">{view.recommendation}</p>
      </section>
    );
  }

  return (
    <section className="provider-cc-section provider-cc-section--intel" aria-labelledby="provider-cc-intel-title">
      <div className="provider-cc-section-head">
        <h2 id="provider-cc-intel-title" className="provider-cc-section-title">
          {PROVIDER_INTELLIGENCE_UI.sectionTitle}
        </h2>
        <button type="button" className="provider-cc-text-btn" onClick={onOpenIntelligence}>
          {PROVIDER_INTELLIGENCE_UI.expandCta}
        </button>
      </div>

      <div className="provider-intel-briefing">
        <header className="provider-intel-briefing-head">
          <p className="provider-intel-lead">{view.interpretation}</p>
          <p className={`provider-intel-readiness ${readinessToneClass(view.overallStatus)}`}>
            <span className="provider-intel-readiness-dot" aria-hidden />
            <span>{readinessLabel}</span>
          </p>
        </header>

        {view.focusSummary ? (
          <p className="provider-intel-focus">{view.focusSummary}</p>
        ) : null}

        <ul className="provider-intel-signals" aria-label={PROVIDER_INTELLIGENCE_UI.signalsAria}>
          {tracks.map((track) => (
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

        <div className="provider-intel-next">
          <p className="provider-intel-next-kicker">{PROVIDER_INTELLIGENCE_UI.nextMoveLabel}</p>
          <p className="provider-intel-next-text">{view.recommendation}</p>
          <button type="button" className="provider-intel-next-btn" onClick={onOpenIntelligence}>
            Update account →
          </button>
        </div>
      </div>
    </section>
  );
}
