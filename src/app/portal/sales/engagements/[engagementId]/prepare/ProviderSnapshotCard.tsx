"use client";

import Link from "next/link";
import type { PrepareForMeetingView } from "@/lib/surgical-sales/engagements/buildPrepareForMeetingView";

export function ProviderSnapshotCard({
  snapshot,
  providerHref,
}: {
  snapshot: PrepareForMeetingView["provider_snapshot"];
  providerHref: string | null;
}) {
  const chips: Array<{ key: string; label: string; tone?: "brand" | "neutral" }> = [];
  if (snapshot.relationship_status_label) {
    chips.push({ key: "rel", label: snapshot.relationship_status_label, tone: "brand" });
  }
  if (snapshot.influence_level_label) {
    chips.push({ key: "inf", label: snapshot.influence_level_label, tone: "neutral" });
  }
  if (snapshot.last_engagement_date_label) {
    chips.push({
      key: "last",
      label: `Last ${snapshot.last_engagement_date_label}`,
      tone: "neutral",
    });
  }

  return (
    <section className="pfm-snapshot" aria-labelledby="pfm-provider-snapshot">
      <h2 id="pfm-provider-snapshot" className="pfm-snapshot-title">
        Provider snapshot
      </h2>

      <div className="pfm-snapshot-body">
        <p className="pfm-snapshot-name">{snapshot.display_name}</p>
        {snapshot.specialty ? <p className="pfm-snapshot-line">{snapshot.specialty}</p> : null}
        {snapshot.organization_name ? (
          <p className="pfm-snapshot-line pfm-snapshot-line--org">{snapshot.organization_name}</p>
        ) : null}
        {snapshot.location_label ? (
          <p className="pfm-snapshot-line pfm-snapshot-line--location">{snapshot.location_label}</p>
        ) : null}

        {chips.length > 0 ? (
          <div className="pfm-snapshot-chips" role="list" aria-label="Provider status">
            {chips.map((chip) => (
              <span
                key={chip.key}
                role="listitem"
                className={`pfm-snapshot-chip${chip.tone === "brand" ? " pfm-snapshot-chip--brand" : ""}`}
              >
                {chip.label}
              </span>
            ))}
          </div>
        ) : null}

        {snapshot.last_engagement_title ? (
          <p className="pfm-snapshot-last-eng">
            {snapshot.last_engagement_href ? (
              <Link href={snapshot.last_engagement_href}>{snapshot.last_engagement_title}</Link>
            ) : (
              snapshot.last_engagement_title
            )}
          </p>
        ) : null}
      </div>

      {providerHref ? (
        <Link href={providerHref} className="pfm-snapshot-profile-btn">
          View Provider Profile
        </Link>
      ) : null}
    </section>
  );
}
