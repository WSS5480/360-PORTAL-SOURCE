"use client";

import Link from "next/link";
import { buildEngagementHubHref } from "@/lib/surgical-sales/engagements/engagementLifecycle";
import {
  formatEngagementBriefingListLabel,
  isUpcomingEngagementStatus,
  type ProviderEngagementSummary,
} from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { formatEngagementWhenLabel } from "@/lib/surgical-sales/engagements/engagementScheduleDisplay";
import type { ProviderProfilePayload } from "./providerProfileTypes";

const PREVIEW_LIMIT = 4;

function withEngagementType(href: string, type: string): string {
  const u = new URL(href, "http://local");
  u.searchParams.set("engagement_type", type);
  return `${u.pathname}${u.search}`;
}

function formatWhen(row: ProviderEngagementSummary): string {
  return formatEngagementWhenLabel(row);
}

function engagementHref(row: ProviderEngagementSummary): string {
  return buildEngagementHubHref(row.id);
}

function statusTone(status: string): string {
  const s = status.toLowerCase();
  if (s === "completed") return "provider-eng-prev-status--done";
  if (s === "in_progress") return "provider-eng-prev-status--active";
  if (s === "planned") return "provider-eng-prev-status--planned";
  return "";
}

function planLabel(row: ProviderEngagementSummary): string | null {
  return formatEngagementBriefingListLabel(row);
}

function sortForPreview(engagements: ProviderEngagementSummary[]): ProviderEngagementSummary[] {
  const upcoming = engagements
    .filter((e) => isUpcomingEngagementStatus(e.status))
    .sort((a, b) => {
      const ta = a.scheduled_at || (a.engagement_date ? `${a.engagement_date}T12:00:00` : "");
      const tb = b.scheduled_at || (b.engagement_date ? `${b.engagement_date}T12:00:00` : "");
      return new Date(ta || 0).getTime() - new Date(tb || 0).getTime();
    });

  const rest = engagements
    .filter((e) => !isUpcomingEngagementStatus(e.status))
    .sort((a, b) => {
      const ta = a.updated_at || a.scheduled_at || a.engagement_date || "";
      const tb = b.updated_at || b.scheduled_at || b.engagement_date || "";
      return new Date(tb).getTime() - new Date(ta).getTime();
    });

  return [...upcoming, ...rest].slice(0, PREVIEW_LIMIT);
}

function EngagementPreviewCard({ row }: { row: ProviderEngagementSummary }) {
  const href = engagementHref(row);
  const title = row.title?.trim();
  const plan = planLabel(row);
  const isCompleted = row.status.toLowerCase() === "completed";
  const outcome = isCompleted && row.outcome_label ? row.outcome_label : null;

  const links: { label: string; href: string }[] = [];
  if (row.case_id && row.case_number) {
    links.push({
      label: `Case ${row.case_number}`,
      href: `/portal/sales/cases/${encodeURIComponent(row.case_id)}`,
    });
  }
  if (row.opportunity_id && row.opportunity_label) {
    links.push({
      label: row.opportunity_label,
      href: `/portal/sales/opportunities/${encodeURIComponent(row.opportunity_id)}`,
    });
  }

  return (
    <li className="provider-eng-prev-card">
      <Link href={href} className="provider-eng-prev-card-main">
        <div className="provider-eng-prev-card-top">
          <span className="provider-eng-prev-type">{row.engagement_type_label}</span>
          <span className={`provider-eng-prev-status ${statusTone(row.status)}`}>{row.status_label}</span>
        </div>
        {title && title !== row.engagement_type_label ? (
          <span className="provider-eng-prev-title">{title}</span>
        ) : null}
        <span className="provider-eng-prev-when">{formatWhen(row)}</span>
        <div className="provider-eng-prev-meta">
          {plan ? <span className="provider-eng-prev-pill">{plan}</span> : null}
          {outcome ? <span className="provider-eng-prev-outcome">{outcome}</span> : null}
        </div>
      </Link>
      {links.length > 0 ? (
        <div className="provider-eng-prev-links">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="provider-eng-prev-link">
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </li>
  );
}

export function ProviderEngagementsPreview({
  data,
  providerId,
  newEngagementHref,
  loading = false,
  sectionTitle: sectionTitleProp,
  variant = "default",
}: {
  data: ProviderProfilePayload;
  providerId: string;
  newEngagementHref: string;
  loading?: boolean;
  sectionTitle?: string;
  variant?: "default" | "record" | "dashboard";
}) {
  const sectionClass =
    variant === "record"
      ? "provider-cc-section provider-cc-section--record"
      : variant === "dashboard"
        ? "provider-ops-feed-panel"
        : "provider-cc-section";
  const engagements = data.engagements || [];
  const upcomingCount = engagements.filter((e) => isUpcomingEngagementStatus(e.status)).length;
  const nonUpcoming = engagements.filter((e) => !isUpcomingEngagementStatus(e.status));
  const preview = sortForPreview(nonUpcoming);
  const sectionTitle =
    sectionTitleProp ??
    (upcomingCount > 0 && nonUpcoming.length > 0 ? "Recent engagements" : "Engagements");
  const viewAllHref = `/portal/sales/providers/${encodeURIComponent(providerId)}?tab=engagements`;
  const introHref = withEngagementType(newEngagementHref, "intro_call");
  const observationHref = withEngagementType(newEngagementHref, "observation_request");

  if ((variant === "record" || variant === "dashboard") && !loading && nonUpcoming.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <section className={sectionClass} aria-labelledby="provider-cc-eng-title">
        <div className="provider-cc-section-head">
          <h2 id="provider-cc-eng-title" className="provider-cc-section-title">
            {sectionTitle}
          </h2>
        </div>
        <p className="provider-cc-section-meta">Loading engagements…</p>
      </section>
    );
  }

  if (variant === "record" && engagements.length === 0) {
    return null;
  }

  return (
    <section className={sectionClass} aria-labelledby="provider-cc-eng-title">
      <div className="provider-cc-section-head">
        <h2 id="provider-cc-eng-title" className="provider-cc-section-title">
          {sectionTitle}
        </h2>
        {engagements.length > 0 ? (
          <Link href={viewAllHref} className="provider-cc-section-link">
            View all
          </Link>
        ) : null}
      </div>

      {engagements.length === 0 && variant !== "record" && variant !== "dashboard" ? (
        <div className="provider-eng-prev-empty">
          <p className="provider-eng-prev-empty-text">
            No engagements yet. Start with an{" "}
            <Link href={introHref} className="provider-eng-prev-empty-link">
              Intro Call
            </Link>{" "}
            or{" "}
            <Link href={observationHref} className="provider-eng-prev-empty-link">
              Observation Access Request
            </Link>
            .
          </p>
          <Link href={newEngagementHref} className="provider-eng-prev-empty-cta">
            New engagement
          </Link>
        </div>
      ) : preview.length === 0 && upcomingCount > 0 ? (
        <p className="provider-cc-section-meta">
          {upcomingCount} upcoming ·{" "}
          <Link href={viewAllHref} className="provider-eng-prev-empty-link">
            View all {engagements.length} engagements
          </Link>
        </p>
      ) : (
        <>
          <p className="provider-cc-section-meta">
            {upcomingCount > 0 && nonUpcoming.length > 0
              ? `${upcomingCount} upcoming · ${nonUpcoming.length} other · `
              : upcomingCount > 0
                ? `${upcomingCount} upcoming · `
                : ""}
            {engagements.length} total
          </p>
          <ul className="provider-eng-prev-list">
            {preview.map((row) => (
              <EngagementPreviewCard key={row.id} row={row} />
            ))}
          </ul>
          {engagements.length > PREVIEW_LIMIT ? (
            <Link href={viewAllHref} className="provider-eng-prev-more">
              View all {engagements.length} engagements →
            </Link>
          ) : null}
        </>
      )}
    </section>
  );
}
