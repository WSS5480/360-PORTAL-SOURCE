"use client";

import React from "react";
import { buildProviderIntelligenceInvestigationView } from "@/lib/surgical-sales/buildProviderIntelligenceInvestigationView";
import { PROVIDER_INTELLIGENCE_INVESTIGATION } from "@/lib/surgical-sales/providerIntelligenceInvestigationLabels";
import { ProviderFieldDiscoveriesPanel } from "./ProviderFieldDiscoveriesPanel";
import { ProviderOperationalWarningsPanel } from "./ProviderOperationalWarningsPanel";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";

function deployToneClass(tone: "clear" | "caution" | "hold"): string {
  return `provider-investigation-deploy--${tone}`;
}

export function ProviderIntelligenceInvestigationWorkspace({
  contact,
  planning,
  specialty,
  relationshipStage,
  engagements,
  opportunities,
  cases,
  fieldMetadata,
  onCapture,
}: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  specialty?: string | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;
  onCapture: (sectionId: ProviderIntelligenceSectionId, dbKey?: string) => void;
}) {
  const [staleOpen, setStaleOpen] = React.useState(false);
  const [missingOpen, setMissingOpen] = React.useState(false);

  const view = React.useMemo(
    () =>
      buildProviderIntelligenceInvestigationView({
        contact,
        planning,
        specialty,
        relationshipStage,
        engagements,
        opportunities,
        cases,
        fieldMetadata,
      }),
    [
      contact,
      planning,
      specialty,
      relationshipStage,
      engagements,
      opportunities,
      cases,
      fieldMetadata,
    ],
  );

  if (!view) {
    return <p className="provider-investigation-empty">Briefing unavailable — reload the page.</p>;
  }

  const showOnFile = view.workflowOnFile.length > 0 || view.workflowMissingCount > 0;

  return (
    <div className="provider-investigation" aria-label={PROVIDER_INTELLIGENCE_INVESTIGATION.pageAria}>
      <header className="provider-investigation-hero">
        <p className="provider-investigation-summary">{view.summary}</p>
        <p className={`provider-investigation-deploy ${deployToneClass(view.deployTone)}`}>
          {view.deployLine}
        </p>
        {view.staleSummary ? (
          <div className="provider-investigation-stale">
            <button
              type="button"
              className="provider-investigation-stale-toggle"
              aria-expanded={staleOpen}
              onClick={() => setStaleOpen((v) => !v)}
            >
              {view.staleSummary}
            </button>
            {staleOpen && view.staleDetails.length > 0 ? (
              <ul className="provider-investigation-stale-list">
                {view.staleDetails.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        <div className="provider-investigation-hero-action">
          <p className="provider-investigation-action-line">{view.primaryAction.headline}</p>
          <button
            type="button"
            className="provider-investigation-cta provider-investigation-cta--primary"
            onClick={() => onCapture(view.primaryAction.sectionId, view.primaryAction.dbKey)}
          >
            {view.primaryAction.ctaLabel}
          </button>
        </div>
      </header>

      <ProviderOperationalWarningsPanel
        contact={contact}
        planning={planning}
        relationshipStage={relationshipStage}
        engagements={engagements}
        opportunities={opportunities}
        cases={cases}
        onCapture={onCapture}
      />

      <ProviderFieldDiscoveriesPanel
        contact={contact}
        planning={planning}
        specialty={specialty}
        relationshipStage={relationshipStage}
        engagements={engagements}
        opportunities={opportunities}
        cases={cases}
        onCapture={onCapture}
      />

      {showOnFile ? (
        <section className="provider-investigation-section">
          <h2 className="provider-investigation-section-title">
            {PROVIDER_INTELLIGENCE_INVESTIGATION.onFile}
          </h2>
          {view.workflowOnFile.length > 0 ? (
            <ul className="provider-investigation-onfile-list">
              {view.workflowOnFile.map((row) => (
                <li key={row.dbKey}>
                  <button
                    type="button"
                    className="provider-investigation-onfile-row"
                    onClick={() => onCapture(row.sectionId, row.dbKey)}
                  >
                    <span className="provider-investigation-onfile-label">{row.label}</span>
                    <span className="provider-investigation-onfile-value">{row.value}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {view.workflowMissingCount > 0 ? (
            <div className="provider-investigation-missing-wrap">
              <button
                type="button"
                className="provider-investigation-missing-toggle"
                aria-expanded={missingOpen}
                onClick={() => setMissingOpen((v) => !v)}
              >
                {missingOpen
                  ? PROVIDER_INTELLIGENCE_INVESTIGATION.hideMissing
                  : PROVIDER_INTELLIGENCE_INVESTIGATION.notCapturedCount(view.workflowMissingCount)}
              </button>
              {missingOpen ? (
                <ul className="provider-investigation-missing-list">
                  {view.workflowMissingKeys.map((tile) => (
                    <li key={tile.dbKey}>
                      <button
                        type="button"
                        className="provider-investigation-missing-link"
                        onClick={() => onCapture(tile.sectionId, tile.dbKey)}
                      >
                        {tile.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
