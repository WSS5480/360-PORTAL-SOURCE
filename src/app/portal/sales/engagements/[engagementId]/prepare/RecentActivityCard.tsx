"use client";

import Link from "next/link";
import type { PrepareRecentActivityFeed } from "@/lib/surgical-sales/engagements/prepareForMeetingRecentActivity";

export function RecentActivityCard({ feed }: { feed: PrepareRecentActivityFeed }) {
  const { items, timeline_href } = feed;

  return (
    <section className="pfm-activity" aria-labelledby="pfm-activity">
      <div className="pfm-activity-head">
        <h2 id="pfm-activity" className="pfm-activity-title">
          Recent activity
        </h2>
        <Link href={timeline_href} className="pfm-activity-timeline-link">
          View timeline
        </Link>
      </div>

      {items.length > 0 ? (
        <ul className="pfm-activity-list">
          {items.map((item) => (
            <li key={item.id}>
              {item.href ? (
                <Link href={item.href} className="pfm-activity-row">
                  <ActivityRowContent item={item} />
                </Link>
              ) : (
                <div className="pfm-activity-row pfm-activity-row--static">
                  <ActivityRowContent item={item} />
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="pfm-activity-empty">
          No recent activity yet.{" "}
          <Link href={timeline_href} className="pfm-activity-timeline-link">
            View timeline
          </Link>
        </p>
      )}
    </section>
  );
}

function ActivityRowContent({
  item,
}: {
  item: PrepareRecentActivityFeed["items"][number];
}) {
  return (
    <>
      <span className={`pfm-activity-icon pfm-activity-icon--${item.kind}`} aria-hidden>
        {item.icon}
      </span>
      <span className="pfm-activity-main">
        <span className="pfm-activity-row-head">
          <span className="pfm-activity-row-title">{item.title}</span>
          <span className="pfm-activity-row-date">{item.at_label}</span>
        </span>
        {item.summary ? <span className="pfm-activity-row-summary">{item.summary}</span> : null}
      </span>
      {item.href ? (
        <span className="pfm-activity-chevron" aria-hidden>
          ›
        </span>
      ) : null}
    </>
  );
}
