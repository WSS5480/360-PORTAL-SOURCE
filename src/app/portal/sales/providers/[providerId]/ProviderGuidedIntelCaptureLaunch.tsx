"use client";

import React from "react";
import {
  buildGuidedIntelCaptureAudienceCounts,
  buildGuidedIntelCaptureLaunchStats,
  formatDiscoveryAudienceChipLabel,
  GUIDED_INTEL_CAPTURE,
} from "@/lib/surgical-sales/providerGuidedIntelCapture";
import type { OrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { ProviderIntelligenceMaturitySnapshot } from "@/lib/surgical-sales/providerIntelligenceMaturity";
import {
  DISCOVERY_STAKEHOLDER_PATH_OPTIONS,
  type IntelligenceDiscoveryStakeholder,
} from "@/lib/surgical-sales/providerIntelligenceStakeholderDiscovery";
import { providerGuidedIntelCaptureCss } from "./providerGuidedIntelCaptureCss";

export function ProviderGuidedIntelCaptureLaunch({
  contact,
  planning,
  fieldMetadata,
  maturitySnapshot,
  discoveryStakeholder,
  onDiscoveryStakeholderChange,
  onStart,
  disabled = false,
  organizationBaseline,
}: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;
  maturitySnapshot?: ProviderIntelligenceMaturitySnapshot;
  discoveryStakeholder: IntelligenceDiscoveryStakeholder;
  organizationBaseline?: OrganizationIntelligenceBaseline | null;
  onDiscoveryStakeholderChange?: (stakeholder: IntelligenceDiscoveryStakeholder) => void;
  onStart: () => void;
  disabled?: boolean;
}) {
  const audienceCounts = React.useMemo(
    () =>
      buildGuidedIntelCaptureAudienceCounts(contact, {
        planning,
        fieldMetadata,
        maturitySnapshot,
        organizationBaseline,
      }),
    [contact, planning, fieldMetadata, maturitySnapshot, organizationBaseline],
  );

  const stats = React.useMemo(
    () =>
      buildGuidedIntelCaptureLaunchStats(contact, {
        planning,
        fieldMetadata,
        maturitySnapshot,
        discoveryStakeholder,
        organizationBaseline,
      }),
    [contact, planning, fieldMetadata, maturitySnapshot, discoveryStakeholder, organizationBaseline],
  );

  return (
    <div className="provider-guided-intel-launch">
      <style>{providerGuidedIntelCaptureCss}</style>
      <div className="provider-guided-intel-launch-card">
        <div className="provider-guided-intel-launch-head">
          <div className="provider-guided-intel-launch-titles">
            <p className="provider-guided-intel-launch-eyebrow">{GUIDED_INTEL_CAPTURE.productName}</p>
            <h2 className="provider-guided-intel-launch-title">{GUIDED_INTEL_CAPTURE.altName}</h2>
            <p className="provider-guided-intel-launch-sub">{stats.subtitle}</p>
          </div>
          <span className="provider-guided-intel-launch-meta" title={stats.deployment.provider.headline}>
            Provider {stats.deployment.provider.tierLabel} · Facility {stats.deployment.facility.tierLabel}
          </span>
        </div>

        <div className="provider-guided-intel-path">
          {onDiscoveryStakeholderChange ? (
            <div className="provider-guided-intel-path-chips" role="group" aria-label="Intelligence scope filter">
              {DISCOVERY_STAKEHOLDER_PATH_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`provider-guided-intel-path-chip${discoveryStakeholder === opt.id ? " provider-guided-intel-path-chip--active" : ""}`}
                  disabled={disabled}
                  aria-pressed={discoveryStakeholder === opt.id}
                  onClick={() => onDiscoveryStakeholderChange(opt.id)}
                >
                  {formatDiscoveryAudienceChipLabel(opt.shortLabel, audienceCounts[opt.id])}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="provider-guided-intel-launch-btn"
          disabled={disabled}
          onClick={onStart}
        >
          {stats.ctaLabel}
        </button>
      </div>
    </div>
  );
}
