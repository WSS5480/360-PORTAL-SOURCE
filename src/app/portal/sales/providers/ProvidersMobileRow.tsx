"use client";

import Link from "next/link";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import {
  deriveProviderLastTouch,
  deriveProviderMissionBadge,
  deriveProviderMissionNextAction,
  deriveProviderUpcomingObservationDate,
} from "@/lib/surgical-sales/providerDirectoryOperations";
import {
  providerDirectoryLinks,
  providerDisplayName,
} from "@/lib/surgical-sales/providerDirectoryLinks";

export function ProvidersMobileRow({ provider: p }: { provider: ProviderDirectoryRow }) {
  const { detailHref, observationCaseHref, newEngagementHref, noteHref } = providerDirectoryLinks(p);
  const orgLabel = p.primary_organization_name || "No organization";
  const specialty = p.specialty || "Specialty not set";
  const badge = deriveProviderMissionBadge(p);
  const nextAction = deriveProviderMissionNextAction(p);
  const lastTouch = deriveProviderLastTouch(p);
  const upcomingDate = deriveProviderUpcomingObservationDate(p);
  const showUpcoming = Boolean(upcomingDate);

  return (
    <li
      className="mission-provider-card"
      data-mission-health={badge.health}
      data-has-upcoming={showUpcoming ? "true" : undefined}
    >
      <div className="mission-provider-card-body">
        <header className="mission-provider-header">
          <h3 className="mission-provider-name">{providerDisplayName(p)}</h3>
          <p className="mission-provider-meta">
            {specialty}
            <span aria-hidden> · </span>
            {orgLabel}
          </p>
        </header>

        <div
          className={`mission-provider-badge mission-provider-badge--${badge.health}`}
          title={badge.healthLabel}
        >
          <span className="mission-provider-badge-dot" aria-hidden />
          <span className="mission-provider-badge-label">{badge.label}</span>
        </div>

        <p className="mission-provider-touch">{lastTouch}</p>
        <p className="mission-provider-next">{nextAction}</p>

        {showUpcoming ? (
          <p className="mission-provider-upcoming">
            <span className="mission-provider-upcoming-icon" aria-hidden>
              📅
            </span>
            {upcomingDate}
          </p>
        ) : null}
      </div>

      <div className="mission-provider-actions mission-provider-actions--primary">
        <Link href={detailHref} className="mission-provider-action mission-provider-action--primary-btn" data-surgical-press>
          Open Provider
        </Link>
        <Link href={noteHref} className="mission-provider-action mission-provider-action--primary-btn" data-surgical-press>
          Log Activity
        </Link>
      </div>
      <div className="mission-provider-actions mission-provider-actions--secondary">
        <Link href={newEngagementHref} className="mission-provider-action" data-surgical-press>
          Create Engagement
        </Link>
        <Link href={observationCaseHref} className="mission-provider-action" data-surgical-press>
          Create Observation
        </Link>
      </div>
    </li>
  );
}
