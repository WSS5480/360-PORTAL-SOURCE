"use client";

import Link from "next/link";
import type { CaseOperationalContextView } from "@/lib/surgical-sales/buildCaseOperationalContextView";
import {
  formatObservationCaseOperationalContext,
  OBSERVATION_PRE_CASE_BRIEF_TITLE,
} from "@/lib/surgical-sales/observationCaseDetailVocabulary";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { ProviderIntelligenceInsightCards } from "@/components/sales/ProviderIntelligenceInsightCards";

function BriefContextLines({
  title,
  items,
  empty,
}: {
  title: string;
  items: CaseOperationalContextView["facility"]["items"];
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="case-obs-overview-empty">{empty}</p>;
  }

  return (
    <div className="case-obs-brief-context-block">
      <h4 className="case-obs-brief-context-title">{title}</h4>
      <ul className="case-obs-brief-context-list">
        {items.map((item) => (
          <li key={item.id} className="case-obs-brief-context-line">
            <span className="case-obs-brief-context-label">{item.label}</span>
            <span className="case-obs-brief-context-value">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CaseObservationPreCaseBriefSection({
  operationalContext,
  providerId,
}: {
  operationalContext?: CaseOperationalContextView | null;
  providerId?: string | null;
}) {
  const brief = operationalContext ? formatObservationCaseOperationalContext(operationalContext) : null;
  const hasFacilityLines = Boolean(brief && brief.facility.items.length > 0);

  if (!brief && !providerId) return null;

  return (
    <section className="case-obs-workflow-section" aria-labelledby="case-obs-brief-title">
      <div className="case-obs-overview-section-head">
        <h3 id="case-obs-brief-title" className="case-obs-workflow-section-title">
          {OBSERVATION_PRE_CASE_BRIEF_TITLE}
        </h3>
        {providerId ? (
          <Link
            href={`/portal/sales/providers/${encodeURIComponent(providerId)}?tab=intelligence`}
            className="case-obs-overview-section-link"
            data-surgical-press
          >
            Open profile
          </Link>
        ) : null}
      </div>
      {brief ? (
        <>
          <div className="case-obs-brief-readiness">
            <span className={`case-obs-brief-readiness-pill case-obs-brief-readiness-pill--${brief.readinessState}`}>
              {brief.readinessLabel}
            </span>
            <p className="case-obs-brief-readiness-summary">{brief.readinessSummary}</p>
          </div>
          {hasFacilityLines ? (
            <BriefContextLines
              title={brief.facility.title}
              items={brief.facility.items}
              empty="Facility context not captured yet."
            />
          ) : (
            <p className="case-obs-overview-empty">Facility context not captured yet.</p>
          )}
        </>
      ) : (
        <p className="case-obs-overview-empty">Pre-case brief will populate as facility context is captured.</p>
      )}
    </section>
  );
}

export function CaseObservationProviderContextSection({
  operationalContext,
  providerContact,
  planning,
}: {
  operationalContext?: CaseOperationalContextView | null;
  providerContact?: Record<string, unknown> | null;
  planning?: ProviderPlanningCompletion | null;
}) {
  const brief = operationalContext ? formatObservationCaseOperationalContext(operationalContext) : null;
  const hasIntelCards = Boolean(providerContact);
  const hasProviderLines = Boolean(brief && brief.provider.items.length > 0);

  if (!hasIntelCards && !hasProviderLines) return null;

  return (
    <section className="case-obs-workflow-section" aria-labelledby="case-obs-provider-context-title">
      <h3 id="case-obs-provider-context-title" className="case-obs-workflow-section-title">
        Provider context
      </h3>
      {hasIntelCards ? (
        <ProviderIntelligenceInsightCards
          contact={providerContact ?? undefined}
          planning={planning ?? null}
          useCategoryTitles
          maxCards={8}
        />
      ) : null}
      {hasProviderLines ? (
        <BriefContextLines
          title={brief!.provider.title}
          items={brief!.provider.items}
          empty="Provider context not captured yet."
        />
      ) : null}
    </section>
  );
}

/** @deprecated Use CaseObservationPreCaseBriefSection and CaseObservationProviderContextSection in Workflow. */
export function CaseObservationBriefPanel({
  operationalContext,
  providerContact,
  planning,
  providerId,
}: {
  operationalContext?: CaseOperationalContextView | null;
  providerContact?: Record<string, unknown> | null;
  planning?: ProviderPlanningCompletion | null;
  providerId?: string | null;
}) {
  return (
    <>
      <CaseObservationPreCaseBriefSection operationalContext={operationalContext} providerId={providerId} />
      <CaseObservationProviderContextSection
        operationalContext={operationalContext}
        providerContact={providerContact}
        planning={planning}
      />
    </>
  );
}
