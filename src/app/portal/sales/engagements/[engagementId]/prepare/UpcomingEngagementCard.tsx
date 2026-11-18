"use client";

import Link from "next/link";
import type { PrepareForMeetingView } from "@/lib/surgical-sales/engagements/buildPrepareForMeetingView";

export function UpcomingEngagementCard({
  upcoming,
  engagementDetailHref,
}: {
  upcoming: PrepareForMeetingView["upcoming_engagement"];
  engagementDetailHref: string;
}) {
  const officeCtx = upcoming.office_visit_context;
  const showTitle =
    upcoming.title.trim().length > 0 &&
    upcoming.title.trim().toLowerCase() !== upcoming.type_label.trim().toLowerCase();

  return (
    <section className="pfm-upcoming" aria-labelledby="pfm-upcoming">
      <h2 id="pfm-upcoming" className="pfm-upcoming-title">
        Upcoming engagement
      </h2>

      <div className="pfm-upcoming-head">
        <span className="pfm-upcoming-chip pfm-upcoming-chip--type">{upcoming.type_label}</span>
        <span className="pfm-upcoming-chip pfm-upcoming-chip--status">{upcoming.status_label}</span>
      </div>

      {upcoming.datetime_label ? (
        <p className="pfm-upcoming-datetime">{upcoming.datetime_label}</p>
      ) : null}

      {showTitle ? <p className="pfm-upcoming-subtitle">{upcoming.title}</p> : null}

      {upcoming.organization_name ? (
        <p className="pfm-upcoming-org">{upcoming.organization_name}</p>
      ) : null}

      {upcoming.opportunity_label && upcoming.opportunity_href ? (
        <p className="pfm-upcoming-opp">
          <span className="pfm-upcoming-opp-label">Opportunity</span>
          <Link href={upcoming.opportunity_href}>{upcoming.opportunity_label}</Link>
        </p>
      ) : upcoming.opportunity_label ? (
        <p className="pfm-upcoming-opp">
          <span className="pfm-upcoming-opp-label">Opportunity</span>
          <span>{upcoming.opportunity_label}</span>
        </p>
      ) : null}

      {officeCtx && officeCtx.lines.length > 0 ? (
        <div className="pfm-upcoming-office" aria-label="Office visit and sim lab context">
          <p className="pfm-upcoming-office-label">Office / sim lab</p>
          <ul className="pfm-upcoming-office-list">
            {officeCtx.lines.map((line) => (
              <li key={line.label}>
                <span className="pfm-upcoming-office-k">{line.label}</span>
                <span className="pfm-upcoming-office-v">{line.value}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : officeCtx?.is_office_visit_360 ? (
        <p className="pfm-upcoming-office-empty">
          360 office visit — add sim lab focus and demo details in the engagement plan.
        </p>
      ) : null}

      <Link href={engagementDetailHref} className="pfm-upcoming-open-btn">
        Open engagement
      </Link>
    </section>
  );
}
