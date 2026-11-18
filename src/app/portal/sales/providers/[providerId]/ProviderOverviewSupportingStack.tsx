"use client";

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderOverviewPriorityUnknown } from "@/lib/surgical-sales/buildProviderOverviewPriorityUnknowns";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { ProviderOverviewAccessIntelligence } from "./ProviderOverviewAccessIntelligence";
import { OptionalIntelligenceOverviewSection } from "./OptionalIntelligenceOverviewSection";
import { ProviderOverviewWhatWeKnow } from "./ProviderOverviewWhatWeKnow";
import { ProviderOverviewActivityTimeline } from "./ProviderOverviewActivityTimeline";

export function ProviderOverviewSupportingStack({
  contact,
  facts,
  priorityUnknowns = [],
  timeline,
  engagements,
  organizationLinks,
  activityHref,
  activityLoading,
  onOpenOptionalIntelligence,
  onResolvePriorityUnknown,
}: {
  contact: Record<string, unknown>;
  facts: string[];
  priorityUnknowns?: ProviderOverviewPriorityUnknown[];
  timeline?: Array<Record<string, unknown>>;
  engagements?: ProviderEngagementSummary[];
  organizationLinks?: Array<Record<string, unknown>>;
  activityHref: string;
  activityLoading?: boolean;
  onOpenOptionalIntelligence?: () => void;
  onResolvePriorityUnknown?: (sectionId: ProviderIntelligenceSectionId, dbKey: string) => void;
}) {
  const unknownCount = priorityUnknowns.length;

  return (
    <details className="pov-supporting-stack" data-testid="pov-supporting-stack">
      <summary className="pov-supporting-stack__summary">
        <span className="pov-supporting-stack__summary-label">Supporting information</span>
        {unknownCount > 0 ? (
          <span className="pov-bottom-accordion__badge" aria-label={`${unknownCount} open questions`}>
            {unknownCount}
          </span>
        ) : null}
      </summary>
      <div className="pov-supporting-stack__body">
        {priorityUnknowns.length > 0 ? (
          <section className="pov-supporting-stack__section" data-testid="pov-supporting-unknowns">
            <h3 className="pov-supporting-stack__section-label">Open questions</h3>
            <ul className="pov-supporting-stack__unknowns">
              {priorityUnknowns.map((item) => (
                <li key={item.id}>
                  {onResolvePriorityUnknown && item.sectionId ? (
                    <button
                      type="button"
                      className="pov-supporting-stack__unknown-btn"
                      onClick={() => onResolvePriorityUnknown(item.sectionId!, item.primaryDbKey)}
                    >
                      {item.question}
                    </button>
                  ) : (
                    <span>{item.question}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="pov-supporting-stack__sections">
          <ProviderOverviewAccessIntelligence contact={contact} nested />
          <OptionalIntelligenceOverviewSection
            contact={contact}
            compact
            layout="overview"
            nested
          />
          <ProviderOverviewWhatWeKnow facts={facts} nested />
          <ProviderOverviewActivityTimeline
            timeline={timeline}
            engagements={engagements}
            contact={contact}
            organizationLinks={organizationLinks}
            activityHref={activityHref}
            loading={activityLoading}
            nested
          />
        </div>
      </div>
    </details>
  );
}
