"use client";

import type { OperationalIntelligenceWorkspaceView } from "@/lib/surgical-sales/buildOperationalIntelligenceWorkspaceView";
import { LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";

import {
  CTAGroup,
  PiButtonPrimary,
  PiButtonSecondary,
  SurfaceCard,
} from "./index";

export function OperationalIntelligenceHero({
  header,
  disabled,
  onBuildIntelligence,
  onLogUpdate,
}: {
  header: OperationalIntelligenceWorkspaceView["header"];
  disabled?: boolean;
  onBuildIntelligence: () => void;
  onLogUpdate: () => void;
}) {
  return (
    <SurfaceCard variant="hero" className="oi-hero-block">
      <div className="oi-hero-accent" aria-hidden />
      <div className="oi-hero-glow" aria-hidden />
      <div className="oi-hero-inner">
        <div className="oi-hero-copy">
          <p className="oi-hero-eyebrow">{header.eyebrow}</p>
          <h1 className="oi-hero-title">{header.title}</h1>
          <p className="oi-hero-summary">{header.subtitle}</p>
        </div>

        <ul className="oi-hero-metrics" aria-label="Context and recency">
          <li className="oi-hero-metric">
            <span className="oi-hero-metric-icon oi-hero-metric-icon--facility" aria-hidden>
              F
            </span>
            <span className="oi-hero-metric-copy">
              <span className="oi-hero-metric-label">Facility context</span>
              <span className="oi-hero-metric-value">{header.facilityConfidence}</span>
            </span>
          </li>
          <li className="oi-hero-metric">
            <span className="oi-hero-metric-icon oi-hero-metric-icon--provider" aria-hidden>
              P
            </span>
            <span className="oi-hero-metric-copy">
              <span className="oi-hero-metric-label">Provider context</span>
              <span className="oi-hero-metric-value">{header.providerConfidence}</span>
            </span>
          </li>
          <li className="oi-hero-metric">
            <span className="oi-hero-metric-icon oi-hero-metric-icon--time" aria-hidden>
              ↻
            </span>
            <span className="oi-hero-metric-copy">
              <span className="oi-hero-metric-label">Last field update</span>
              <span className="oi-hero-metric-value">{header.lastFieldUpdate}</span>
            </span>
          </li>
        </ul>

        <CTAGroup className="oi-hero-cta-bar">
          <PiButtonPrimary className="pi-btn--lg" disabled={disabled} onClick={onBuildIntelligence}>
            {header.primaryCtaLabel}
          </PiButtonPrimary>
          {LOG_UPDATE_UI_ENABLED ? (
            <PiButtonSecondary className="pi-btn--lg" disabled={disabled} onClick={onLogUpdate}>
              {header.secondaryCtaLabel}
            </PiButtonSecondary>
          ) : null}
        </CTAGroup>
      </div>
    </SurfaceCard>
  );
}
