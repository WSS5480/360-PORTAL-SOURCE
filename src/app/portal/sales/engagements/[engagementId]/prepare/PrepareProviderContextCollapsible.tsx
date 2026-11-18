"use client";

import Link from "next/link";
import React from "react";
import type { PrepareForMeetingView as PrepareView } from "@/lib/surgical-sales/engagements/buildPrepareForMeetingView";
import { buildPrepareProviderContext } from "@/lib/surgical-sales/engagements/buildPrepareProviderContext";
import { shouldExpandPrepareProviderContext } from "@/lib/surgical-sales/engagements/prepareProviderContextImportant";

export function PrepareProviderContextCollapsible({
  data,
  collapsedByDefault = false,
}: {
  data: PrepareView;
  collapsedByDefault?: boolean;
}) {
  const context = React.useMemo(() => buildPrepareProviderContext(data), [data]);
  const defaultExpanded = React.useMemo(
    () =>
      collapsedByDefault
        ? false
        : shouldExpandPrepareProviderContext({
            knownIntelligence: data.known_intelligence,
            supportContactsSummary: data.provider_snapshot.support_contacts_summary,
          }),
    [collapsedByDefault, data.known_intelligence, data.provider_snapshot.support_contacts_summary],
  );
  const [open, setOpen] = React.useState(defaultExpanded);

  React.useEffect(() => {
    setOpen(defaultExpanded);
  }, [defaultExpanded]);

  if (!context.hasAnyContent) return null;

  const profileHref = data.provider_href;

  return (
    <details
      className={`pfm-precall-provider-context${open ? " pfm-precall-provider-context--open" : ""}`}
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="pfm-precall-provider-context__summary">Provider Context</summary>
      <div className="pfm-precall-provider-context__body">
        <dl className="pfm-precall-provider-context__list">
          {context.blocks.map((block) => (
            <div key={block.id} className="pfm-precall-provider-context__row">
              <dt className="pfm-precall-provider-context__label">{block.label}</dt>
              <dd className="pfm-precall-provider-context__value">
                {block.value ? (
                  block.href ? (
                    <Link href={block.href} className="pfm-precall-provider-context__link">
                      {block.value}
                    </Link>
                  ) : (
                    block.value
                  )
                ) : (
                  <span className="pfm-precall-provider-context__empty">—</span>
                )}
              </dd>
            </div>
          ))}
        </dl>

        <div className="pfm-precall-provider-context__activity">
          <p className="pfm-precall-provider-context__activity-label">Recent activity</p>
          {context.recentActivity.length > 0 ? (
            <ul className="pfm-precall-provider-context__activity-list">
              {context.recentActivity.map((item) => (
                <li key={item.id} className="pfm-precall-provider-context__activity-item">
                  {item.href ? (
                    <Link href={item.href} className="pfm-precall-provider-context__activity-row">
                      <ActivityLine item={item} />
                    </Link>
                  ) : (
                    <span className="pfm-precall-provider-context__activity-row">
                      <ActivityLine item={item} />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="pfm-precall-provider-context__empty">No recent touchpoints on file.</p>
          )}
          {profileHref ? (
            <p className="pfm-precall-provider-context__profile-link">
              <Link href={profileHref}>View full profile</Link>
            </p>
          ) : null}
        </div>
      </div>
    </details>
  );
}

function ActivityLine({
  item,
}: {
  item: { title: string; at_label: string; summary: string };
}) {
  return (
    <>
      <span className="pfm-precall-provider-context__activity-title">{item.title}</span>
      <span className="pfm-precall-provider-context__activity-meta">
        {item.at_label}
        {item.summary ? ` · ${item.summary}` : ""}
      </span>
    </>
  );
}
