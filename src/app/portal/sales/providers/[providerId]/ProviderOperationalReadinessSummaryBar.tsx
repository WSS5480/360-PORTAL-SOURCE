"use client";

import React from "react";
import { buildProviderIntelligenceSummaryView } from "@/lib/surgical-sales/buildProviderIntelligenceSummaryView";
import { buildOperationalReadinessSummaryBar } from "@/lib/surgical-sales/buildProviderOperationalReadinessBar";
import { buildProviderFieldTimeRisk } from "@/lib/surgical-sales/buildProviderFieldTimeRisk";
import { buildPriorityStaleFreshnessLines } from "@/lib/surgical-sales/providerIntelligenceFreshness";
import { parseProviderIntelligenceFieldMetadata } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { buildProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import { resolveProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import type { ProviderProfilePayload } from "./providerProfileTypes";
import { ProviderFieldTimeRiskPanel } from "./ProviderFieldTimeRiskPanel";

export function ProviderOperationalReadinessSummaryBar({
  data,
  providerId,
  showFieldTimeRisk = true,
  onOpenIntelligence,
}: {
  data: ProviderProfilePayload;
  providerId: string;
  showFieldTimeRisk?: boolean;
  onOpenIntelligence?: (sectionId?: string) => void;
}) {
  const bar = React.useMemo(() => {
    const contact = data.provider;
    if (!contact) return null;
    const snap = buildProviderIntelligenceSnapshot(contact, providerId);
    const intelView = buildProviderIntelligenceSummaryView({
      contact,
      planning: snap.planning,
    });
    return buildOperationalReadinessSummaryBar({
      contact,
      planning: snap.planning,
      relationshipStage: String(contact.provider_relationship_stage ?? ""),
      engagements: data.engagements,
      opportunities: data.opportunities,
      cases: data.cases,
      overallStatus: intelView.overallStatus,
    });
  }, [data, providerId]);

  const fieldTimeRisk = React.useMemo(() => {
    const contact = data.provider;
    if (!contact || !showFieldTimeRisk) return null;
    const commercialStage = resolveProviderCommercialWorkflowStage({
      relationshipStage: String(contact.provider_relationship_stage ?? ""),
      opportunities: data.opportunities,
      cases: data.cases,
      engagements: data.engagements,
    });
    return buildProviderFieldTimeRisk({
      contact,
      relationshipStage: String(contact.provider_relationship_stage ?? ""),
      commercialStage,
      engagements: data.engagements,
    });
  }, [data, showFieldTimeRisk]);

  const staleLines = React.useMemo(() => {
    const contact = data.provider;
    if (!contact) return [];
    const meta = parseProviderIntelligenceFieldMetadata(
      contact.provider_intelligence_field_metadata,
    );
    return buildPriorityStaleFreshnessLines(contact, meta, 1);
  }, [data]);

  if (!bar) return null;

  return (
    <div className="provider-readiness-stack">
      {staleLines.length > 0 ? (
        <p className="provider-readiness-freshness-warn" role="alert">
          {staleLines[0]}
        </p>
      ) : null}
      {fieldTimeRisk ? (
        <ProviderFieldTimeRiskPanel
          risk={fieldTimeRisk}
          variant="compact"
          onOpenIntelligence={onOpenIntelligence}
        />
      ) : null}
      <p
        className={`provider-readiness-bar provider-readiness-bar--${bar.tone}`}
        aria-live="polite"
        aria-label="Operational visibility summary"
      >
        {bar.segments.map((segment, index) => (
          <React.Fragment key={`${segment}-${index}`}>
            {index > 0 ? (
              <span className="provider-readiness-bar-sep" aria-hidden="true">
                {" "}
                •{" "}
              </span>
            ) : null}
            <span className="provider-readiness-bar-segment">{segment}</span>
          </React.Fragment>
        ))}
      </p>
    </div>
  );
}
