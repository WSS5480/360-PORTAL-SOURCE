"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ProviderActivityPreviewKind } from "@/lib/surgical-sales/buildProviderActivityPreviewRows";
import {
  buildProviderOverviewActivityTimeline,
  OVERVIEW_ACTIVITY_PREVIEW_LIMIT,
} from "@/lib/surgical-sales/buildProviderOverviewActivityTimeline";
import { PROVIDER_OVERVIEW_BRIEFING_VOCABULARY as BRIEF } from "@/lib/surgical-sales/providerOverviewBriefingVocabulary";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";

function activityIconClass(kind: ProviderActivityPreviewKind | "lifecycle"): string {
  return `pov-cc-activity-feed__icon pov-cc-activity-feed__icon--${kind}`;
}

export function ProviderOverviewActivityHistory({
  timeline,
  engagements,
  contact,
  organizationLinks,
  activityHref,
  loading = false,
}: {
  timeline?: Array<Record<string, unknown>>;
  engagements?: ProviderEngagementSummary[];
  contact?: Record<string, unknown>;
  organizationLinks?: Array<Record<string, unknown>>;
  activityHref: string;
  loading?: boolean;
}) {
  const view = useMemo(
    () =>
      buildProviderOverviewActivityTimeline({
        timeline,
        engagements,
        contact,
        organizationLinks,
        limit: OVERVIEW_ACTIVITY_PREVIEW_LIMIT,
      }),
    [timeline, engagements, contact, organizationLinks],
  );

  if (!loading && view.entries.length === 0) {
    return null;
  }

  return (
    <section className="pov-cc-activity pov-cc-activity--compact mc-surface mc-surface--raised" data-testid="pov-activity-timeline">
      <div className="pov-cc-activity__head">
        <h2 className="pov-cc-activity__title">{BRIEF.recentActivity}</h2>
        <Link href={activityHref} className="pov-cc-activity__link">
          View all
        </Link>
      </div>

      {loading ? (
        <p className="pov-cc-activity__empty">Loading activity…</p>
      ) : (
        <ol className="pov-cc-activity-feed pov-cc-activity-feed--compact">
          {view.entries.map((entry) => {
            const content = (
              <>
                <span className={activityIconClass(entry.kind)} aria-hidden />
                <span className="pov-cc-activity-feed__content">
                  <span className="pov-cc-activity-feed__line">{entry.line}</span>
                </span>
                {entry.timeLabel ? (
                  <time className="pov-cc-activity-feed__time" dateTime={entry.timestamp}>
                    {entry.timeLabel}
                  </time>
                ) : null}
              </>
            );

            return (
              <li key={entry.id} className="pov-cc-activity-feed__item">
                {entry.href ? (
                  <Link href={entry.href} className="pov-cc-activity-feed__link">
                    {content}
                  </Link>
                ) : (
                  <div className="pov-cc-activity-feed__row">{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
