"use client";

import Link from "next/link";
import type { PrepareAtAGlanceStat } from "@/lib/surgical-sales/engagements/prepareForMeetingGlanceMetrics";

export function AtAGlanceMetricsCard({ stats }: { stats: PrepareAtAGlanceStat[] }) {
  return (
    <section className="pfm-glance" aria-labelledby="pfm-glance">
      <h2 id="pfm-glance" className="pfm-glance-title">
        At a glance
      </h2>
      <div className="pfm-glance-stats" role="list">
        {stats.map((stat) => (
          <div key={stat.key} className="pfm-glance-stat" role="listitem">
            <span className="pfm-glance-stat-value">{stat.value}</span>
            <span className="pfm-glance-stat-label">{stat.label}</span>
            {stat.href ? (
              <Link href={stat.href} className="pfm-glance-stat-link">
                View
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
