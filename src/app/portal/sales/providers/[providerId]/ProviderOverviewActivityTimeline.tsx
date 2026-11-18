"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  buildProviderOverviewActivityTimeline,
  OVERVIEW_ACTIVITY_TIMELINE_EMPTY,
} from "@/lib/surgical-sales/buildProviderOverviewActivityTimeline";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";

export function ProviderOverviewActivityTimeline({
  timeline,
  engagements,
  contact,
  organizationLinks,
  activityHref,
  loading = false,
  nested = false,
}: {
  timeline?: Array<Record<string, unknown>>;
  engagements?: ProviderEngagementSummary[];
  contact?: Record<string, unknown>;
  organizationLinks?: Array<Record<string, unknown>>;
  activityHref: string;
  loading?: boolean;
  nested?: boolean;
}) {
  const view = useMemo(
    () =>
      buildProviderOverviewActivityTimeline({
        timeline,
        engagements,
        contact,
        organizationLinks,
      }),
    [timeline, engagements, contact, organizationLinks],
  );

  const body = (
    <>
      {loading ? (
        <p className="pov-bottom-accordion__empty">Loading activity…</p>
      ) : view.groups.length === 0 ? (
        <p className="pov-bottom-accordion__empty">{OVERVIEW_ACTIVITY_TIMELINE_EMPTY}</p>
      ) : (
        <div className="pov-activity-timeline__groups">
          {view.groups.map((group) => (
            <section key={group.dateLabel} className="pov-activity-timeline__group">
              <h4 className="pov-activity-timeline__group-label">{group.dateLabel}</h4>
              <ul className="pov-activity-timeline__entries">
                {group.entries.map((entry) => (
                  <li key={entry.id} className="pov-activity-timeline__entry">
                    {entry.href ? (
                      <Link href={entry.href} className="pov-activity-timeline__link">
                        {entry.line}
                      </Link>
                    ) : (
                      entry.line
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <Link href={activityHref} className="pov-bottom-accordion__footer-link">
        View all activity
      </Link>
    </>
  );

  if (nested) {
    return (
      <section className="pov-supporting-subsection pov-activity-timeline" data-testid="pov-activity-timeline">
        <h4 className="pov-supporting-subsection__title">Activity timeline</h4>
        {body}
      </section>
    );
  }

  return (
    <details className="pov-bottom-accordion pov-activity-timeline" data-testid="pov-activity-timeline">
      <summary className="pov-bottom-accordion__summary">
        <span className="pov-bottom-accordion__summary-label">Activity timeline</span>
        {view.totalCount > 0 ? (
          <span className="pov-bottom-accordion__badge" aria-label={`${view.totalCount} activities`}>
            {view.totalCount}
          </span>
        ) : null}
      </summary>
      <div className="pov-bottom-accordion__body">{body}</div>
    </details>
  );
}
