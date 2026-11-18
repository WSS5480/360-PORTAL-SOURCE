"use client";

import type { ProviderOverviewWorkPreviewMode } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import { ProviderCasesPreview } from "./ProviderCasesPreview";
import { ProviderOpportunitiesPreview } from "./ProviderOpportunitiesPreview";
import type { ProviderProfilePayload } from "./providerProfileTypes";

export function ProviderWorkPreview({
  data,
  providerId,
  newCaseHref,
  createOpportunityHref,
  workMode,
  sectionTitle = "Cases & opportunities",
  variant = "default",
}: {
  data: ProviderProfilePayload;
  providerId: string;
  newCaseHref: string;
  createOpportunityHref: string;
  workMode: ProviderOverviewWorkPreviewMode;
  sectionTitle?: string;
  variant?: "default" | "record";
}) {
  const { showCases, showOpportunities } = workMode;
  if (!showCases && !showOpportunities) return null;

  const sectionClass =
    variant === "record" ? "provider-cc-section provider-cc-section--record" : "provider-cc-section";

  return (
    <section className={sectionClass} aria-labelledby="provider-cc-pipeline-title">
      <div className="provider-cc-section-head">
        <h2 id="provider-cc-pipeline-title" className="provider-cc-section-title">
          {sectionTitle}
        </h2>
      </div>

      <div
        className={`provider-pipe-grid${showCases && showOpportunities ? "" : " provider-pipe-grid--single"}`}
      >
        {showCases ? (
          <ProviderCasesPreview data={data} providerId={providerId} newCaseHref={newCaseHref} />
        ) : null}
        {showOpportunities ? (
          <ProviderOpportunitiesPreview
            data={data}
            providerId={providerId}
            createOpportunityHref={createOpportunityHref}
          />
        ) : null}
      </div>
    </section>
  );
}
