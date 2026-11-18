"use client";

import Link from "next/link";
import React from "react";
import { legacyProviderTimelineToFeedItem } from "@/lib/activity/activityFeedPresentation";
import { useUnifiedActivityFeed } from "@/hooks/useUnifiedActivityFeed";
import {
  buildProviderActivityPreviewRows,
  PROVIDER_ACTIVITY_PREVIEW_EMPTY_COPY,
  providerActivityPreviewKindLabel,
  type ProviderActivityPreviewRow,
} from "@/lib/surgical-sales/buildProviderActivityPreviewRows";
import { PROVIDER_OVERVIEW_RECENT_ACTIVITY_TITLE } from "@/lib/surgical-sales/providerOverviewFieldBriefingVocabulary";
import { PROVIDER_FIELD_OPS_CTA, PROVIDER_FIELD_OPS_SECTION } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";
import type { ProviderEngagementSummary } from "./providerProfileTypes";

const PREVIEW_LIMIT = 6;
const PREVIEW_LIMIT_MINIMAL = 3;

function formatAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function kindTone(row: ProviderActivityPreviewRow): string {
  return `provider-act-prev-kind--${row.kind}`;
}

function ActivityPreviewRow({ row }: { row: ProviderActivityPreviewRow }) {
  const showTitle =
    row.title.trim().length > 0 &&
    row.title.trim().toLowerCase() !== row.activityTypeLabel.trim().toLowerCase();

  const body = (
    <>
      <div className="provider-act-prev-row-top">
        <span className={`provider-act-prev-kind ${kindTone(row)}`}>
          {row.activityTypeLabel || providerActivityPreviewKindLabel(row.kind)}
        </span>
        <time className="provider-act-prev-time" dateTime={row.timestamp}>
          {formatAt(row.timestamp)}
        </time>
      </div>
      {showTitle ? <span className="provider-act-prev-title">{row.title}</span> : null}
      {row.summary ? <span className="provider-act-prev-summary">{row.summary}</span> : null}
      {row.relatedEntity ? (
        <span className="provider-act-prev-related">{row.relatedEntity}</span>
      ) : null}
      {row.nextStep ? (
        <span className="provider-act-prev-next">Next: {row.nextStep}</span>
      ) : null}
    </>
  );

  return (
    <li className="provider-act-prev-item">
      {row.href ? (
        <Link href={row.href} className="provider-act-prev-link">
          {body}
        </Link>
      ) : (
        <div className="provider-act-prev-link">{body}</div>
      )}
    </li>
  );
}

export function ProviderActivityPreview({
  providerId,
  timeline,
  engagements = [],
  loading,
  newEngagementHref,
  onOpenIntelligence,
  variant = "default",
}: {
  providerId: string;
  timeline: Array<Record<string, unknown>>;
  engagements?: ProviderEngagementSummary[];
  loading?: boolean;
  newEngagementHref: string;
  onOpenIntelligence: () => void;
  variant?: "default" | "record" | "dashboard" | "minimal";
}) {
  const sectionClass =
    variant === "minimal"
      ? "pov-footer-activity"
      : variant === "record"
        ? "provider-cc-section provider-cc-section--record"
        : variant === "dashboard"
          ? "provider-ops-feed-panel"
          : "provider-cc-section";
  const previewLimit = variant === "minimal" ? PREVIEW_LIMIT_MINIMAL : PREVIEW_LIMIT;
  const timelineKey = timeline.map((e) => `${e.kind}-${e.id}-${e.at}`).join("|");

  const buildLegacyFallback = React.useCallback(() => {
    return timeline
      .map((e) => legacyProviderTimelineToFeedItem(e))
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [timeline]);

  const { items: feedItems, loading: feedLoading } = useUnifiedActivityFeed({
    entityType: "provider",
    entityId: providerId,
    buildLegacyFallback,
    refreshKey: timelineKey,
  });

  const previewRows = React.useMemo(
    () =>
      buildProviderActivityPreviewRows({
        feedItems,
        timeline,
        engagements,
        limit: previewLimit,
      }),
    [feedItems, timeline, engagements],
  );

  const activityTab = `/portal/sales/providers/${encodeURIComponent(providerId)}?tab=activity`;
  const noteHref = `${activityTab}&note=1`;
  const isLoading = loading || feedLoading;

  if (
    (variant === "record" || variant === "dashboard" || variant === "minimal") &&
    !isLoading &&
    previewRows.length === 0
  ) {
    return null;
  }

  const list = (
    <ul className="provider-act-prev-list">
      {previewRows.map((row) => (
        <ActivityPreviewRow key={row.id} row={row} />
      ))}
    </ul>
  );

  if (variant === "minimal") {
    return (
      <div className={sectionClass} aria-label="Recent field activity">
        {isLoading && previewRows.length === 0 ? (
          <p className="provider-act-prev-loading">Loading…</p>
        ) : (
          list
        )}
      </div>
    );
  }

  return (
    <section className={sectionClass} aria-labelledby="provider-cc-activity-title">
      <div className="provider-cc-section-head">
        <h2 id="provider-cc-activity-title" className="provider-cc-section-title">
          {PROVIDER_OVERVIEW_RECENT_ACTIVITY_TITLE}
        </h2>
        <Link href={activityTab} className="provider-cc-section-link">
          {PROVIDER_FIELD_OPS_SECTION.viewAllFieldActivity}
        </Link>
      </div>

      {isLoading && previewRows.length === 0 ? (
        <p className="provider-act-prev-loading">Loading field activity…</p>
      ) : previewRows.length === 0 && variant !== "record" ? (
        <div className="provider-act-prev-empty">
          <p className="provider-act-prev-empty-text">{PROVIDER_ACTIVITY_PREVIEW_EMPTY_COPY}</p>
          <div className="provider-act-prev-empty-actions">
            <Link href={newEngagementHref} className="provider-act-prev-empty-link">
              New engagement
            </Link>
            <button type="button" className="provider-act-prev-empty-link" onClick={onOpenIntelligence}>
              {PROVIDER_FIELD_OPS_CTA.logFieldUpdate}
            </button>
            <Link href={noteHref} className="provider-act-prev-empty-link">
              Add note
            </Link>
          </div>
        </div>
      ) : (
        list
      )}
    </section>
  );
}
