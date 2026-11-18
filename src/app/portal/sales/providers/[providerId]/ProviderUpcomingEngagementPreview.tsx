"use client";

import Link from "next/link";
import { StartEngagementButton } from "@/components/sales/StartEngagementButton";
import { buildEngagementSurfaceActionsFromSummary } from "@/lib/surgical-sales/engagements/engagementWorkflowState";
import {
  formatEngagementPreparationStatus,
  formatEngagementWhen,
  pickNextUpcomingEngagement,
  type ProviderEngagementSummary,
} from "@/lib/surgical-sales/engagements/providerEngagementSummary";

function withEngagementType(href: string, type: string): string {
  const u = new URL(href, "http://local");
  u.searchParams.set("engagement_type", type);
  return `${u.pathname}${u.search}`;
}

function statusTone(status: string): string {
  const s = status.toLowerCase();
  if (s === "in_progress") return "provider-upcoming-eng-status--active";
  if (s === "planned") return "provider-upcoming-eng-status--planned";
  return "";
}

export function ProviderUpcomingEngagementPreview({
  engagements,
  newEngagementHref,
  loading = false,
  sectionTitle = "Current engagement",
}: {
  engagements: ProviderEngagementSummary[];
  newEngagementHref: string;
  loading?: boolean;
  sectionTitle?: string;
}) {
  const upcoming = pickNextUpcomingEngagement(engagements);

  if (loading) {
    return (
      <section
        className="provider-cc-section provider-upcoming-eng"
        aria-labelledby="provider-cc-upcoming-eng-title"
      >
        <div className="provider-cc-section-head">
          <h2 id="provider-cc-upcoming-eng-title" className="provider-cc-section-title">
            {sectionTitle}
          </h2>
        </div>
        <p className="provider-cc-section-meta">Loading…</p>
      </section>
    );
  }
  const introHref = withEngagementType(newEngagementHref, "intro_call");

  if (!upcoming) {
    return (
      <section
        className="provider-cc-section provider-upcoming-eng"
        aria-labelledby="provider-cc-upcoming-eng-title"
      >
        <div className="provider-cc-section-head">
          <h2 id="provider-cc-upcoming-eng-title" className="provider-cc-section-title">
            {sectionTitle}
          </h2>
        </div>
        <div className="provider-upcoming-eng-empty">
          <p className="provider-upcoming-eng-empty-text">
            No upcoming engagement yet. Start with an{" "}
            <Link href={introHref} className="provider-upcoming-eng-inline-link">
              Intro Call
            </Link>
            .
          </p>
          <Link href={newEngagementHref} className="provider-upcoming-eng-cta provider-upcoming-eng-cta--primary">
            New Engagement
          </Link>
        </div>
      </section>
    );
  }

  const { primary, prepareSecondary, primaryUsesBeginCall } =
    buildEngagementSurfaceActionsFromSummary(upcoming);
  const prepStatus = formatEngagementPreparationStatus(upcoming);
  const displayTitle = upcoming.title?.trim();
  const showTitle =
    displayTitle && displayTitle.toLowerCase() !== upcoming.engagement_type_label.toLowerCase();

  return (
    <section
      className="provider-cc-section provider-upcoming-eng"
      aria-labelledby="provider-cc-upcoming-eng-title"
    >
      <div className="provider-cc-section-head">
        <h2 id="provider-cc-upcoming-eng-title" className="provider-cc-section-title">
          {sectionTitle}
        </h2>
      </div>

      <div className="provider-upcoming-eng-card">
        <div className="provider-upcoming-eng-main">
          <div className="provider-upcoming-eng-type-row">
            <span className="provider-upcoming-eng-type">{upcoming.engagement_type_label}</span>
            <span className={`provider-upcoming-eng-status ${statusTone(upcoming.status)}`}>
              {upcoming.status_label}
            </span>
          </div>
          {showTitle ? <p className="provider-upcoming-eng-title">{displayTitle}</p> : null}
          <dl className="provider-upcoming-eng-facts">
            <div className="provider-upcoming-eng-fact">
              <dt>When</dt>
              <dd>{formatEngagementWhen(upcoming)}</dd>
            </div>
            {upcoming.organization_name ? (
              <div className="provider-upcoming-eng-fact">
                <dt>Organization</dt>
                <dd>{upcoming.organization_name}</dd>
              </div>
            ) : null}
            {prepStatus ? (
              <div className="provider-upcoming-eng-fact">
                <dt>Preparation</dt>
                <dd
                  className={
                    upcoming.is_meeting_prepared || upcoming.prepared_at
                      ? "provider-upcoming-eng-prep--ready"
                      : undefined
                  }
                >
                  {prepStatus}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="provider-upcoming-eng-actions">
          {primaryUsesBeginCall ? (
            <StartEngagementButton
              engagementId={upcoming.id}
              className="provider-upcoming-eng-cta provider-upcoming-eng-cta--primary"
            />
          ) : (
            <Link
              href={primary.href}
              className="provider-upcoming-eng-cta provider-upcoming-eng-cta--primary"
            >
              {primary.label}
            </Link>
          )}
          {prepareSecondary ? (
            <Link
              href={prepareSecondary.href}
              className="provider-upcoming-eng-cta provider-upcoming-eng-cta--secondary"
            >
              {prepareSecondary.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
