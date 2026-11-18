"use client";

import { useMemo } from "react";
import { buildProviderOverviewWhatMattersSummary } from "@/lib/surgical-sales/buildProviderOverviewWhatMattersSummary";
import type { ProviderProfilePayload } from "./providerProfileTypes";

export function ProviderOverviewWhatMattersSummary({
  data,
  providerId,
  newEngagementHref,
  intelligenceHref,
  createOpportunityHref,
}: {
  data: ProviderProfilePayload;
  providerId: string;
  newEngagementHref: string;
  intelligenceHref: string;
  createOpportunityHref?: string;
}) {
  const p = data.provider!;
  const lines = useMemo(
    () =>
      buildProviderOverviewWhatMattersSummary({
        providerId,
        relationshipStage: String(p.provider_relationship_stage || "early_discovery"),
        newEngagementHref,
        intelligenceHref,
        createOpportunityHref,
        engagements: data.engagements || [],
        activity_timeline: data.activity_timeline || [],
        planning: data.planning_completion,
        cases: data.cases || [],
        opportunities: data.opportunities || [],
        contact: p,
        relatedContacts: data.related_contacts || [],
      }),
    [
      providerId,
      p,
      newEngagementHref,
      intelligenceHref,
      createOpportunityHref,
      data.engagements,
      data.activity_timeline,
      data.planning_completion,
      data.cases,
      data.opportunities,
      data.related_contacts,
    ],
  );

  if (lines.length === 0) return null;

  return (
    <section
      className="pov-cc-summary mc-surface mc-surface--raised"
      aria-labelledby="pov-what-matters-title"
      data-testid="pov-what-matters-summary"
    >
      <h2 id="pov-what-matters-title" className="pov-cc-summary__title">
        What matters right now
      </h2>
      <ul className="pov-cc-summary__list">
        {lines.map((line) => (
          <li key={line.id} className="pov-cc-summary__item">
            {line.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
