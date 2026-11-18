"use client";

import React from "react";
import type { IntelligenceCardReadinessTone } from "@/lib/surgical-sales/providerIntelligenceCardStatus";
import type { IntelligenceProgressPill } from "@/lib/surgical-sales/intelligenceSectionScanView";
import { providerIntelligenceScanCardCss } from "./providerIntelligenceScanCardCss";

export function ProviderIntelligenceScanCard({
  sectionTitle,
  statusBadge,
  readinessTone,
  progressPills,
  scanSummary,
  primaryActionLabel,
  onPrimaryAction,
  onViewDetails,
  disabled = false,
  className = "",
  pulseKey = 0,
}: {
  sectionTitle: string;
  statusBadge: string;
  readinessTone: IntelligenceCardReadinessTone;
  progressPills: IntelligenceProgressPill[];
  scanSummary: string;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  onViewDetails: () => void;
  disabled?: boolean;
  className?: string;
  /** Change to replay live-update highlight animation. */
  pulseKey?: number;
}) {
  const openDetails = () => {
    if (!disabled) onViewDetails();
  };

  return (
    <article
      key={pulseKey ? `pulse-${pulseKey}` : undefined}
      className={`provider-intel-scan-card provider-intel-scan-card--${readinessTone}${pulseKey ? " provider-intel-scan-card--live-pulse" : ""}${className ? ` ${className}` : ""}`}
    >
      <style>{providerIntelligenceScanCardCss}</style>
      <button
        type="button"
        className="provider-intel-scan-card-tap"
        disabled={disabled}
        onClick={openDetails}
        aria-label={`${sectionTitle} details`}
      >
        <header className="provider-intel-scan-card-head">
          <h3 className="provider-intel-scan-card-title">{sectionTitle}</h3>
          <span
            className={`provider-intel-confidence-badge provider-intel-confidence-badge--${readinessTone}`}
          >
            {statusBadge}
          </span>
        </header>

        {progressPills.length > 0 ? (
          <div className="provider-intel-scan-card-pills" aria-label="Area progress">
            {progressPills.map((pill) => (
              <span
                key={pill.id}
                className={`provider-intel-scan-pill provider-intel-scan-pill--${pill.variant}`}
              >
                {pill.label}
              </span>
            ))}
          </div>
        ) : null}

        <p className="provider-intel-scan-card-summary">{scanSummary}</p>
      </button>

      <div className="provider-intel-scan-card-actions">
        <button
          type="button"
          className="provider-intel-scan-card-primary"
          disabled={disabled}
          onClick={onPrimaryAction}
        >
          {primaryActionLabel}
        </button>
        <button
          type="button"
          className="provider-intel-scan-card-details"
          disabled={disabled}
          onClick={onViewDetails}
        >
          View details
        </button>
      </div>
    </article>
  );
}
