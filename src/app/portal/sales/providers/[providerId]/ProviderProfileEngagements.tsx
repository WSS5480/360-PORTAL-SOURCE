"use client";

import Link from "next/link";
import React from "react";
import { StartEngagementButton } from "@/components/sales/StartEngagementButton";
import { buildEngagementSurfaceActionsFromSummary } from "@/lib/surgical-sales/engagements/engagementWorkflowState";
import {
  buildProviderEngagementTabRowModel,
  partitionProviderEngagementsForTab,
  type ProviderEngagementTabRowModel,
} from "@/lib/surgical-sales/engagements/providerEngagementTabDisplay";
import { formatEngagementBriefingListLabel } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { assessEngagementSalesExecutionNeedsAction } from "@/lib/surgical-sales/salesExecutionNeedsAction";
import type { ProviderEngagementSummary } from "./providerProfileTypes";
import { providerEngagementsTabCss } from "./providerEngagementsTabCss";

function engagementStatusTone(status: string): string {
  const s = status.toLowerCase();
  if (s === "completed") return "done";
  if (s === "in_progress") return "active";
  if (s === "planned") return "planned";
  return "neutral";
}

function ProviderEngagementRow({
  model,
  attention = false,
}: {
  model: ProviderEngagementTabRowModel;
  attention?: boolean;
}) {
  const { primary, prepareSecondary, primaryUsesBeginCall } =
    buildEngagementSurfaceActionsFromSummary(model.row);
  const plan = formatEngagementBriefingListLabel(model.row);
  const needsAction = assessEngagementSalesExecutionNeedsAction(model.row);
  const attentionLabel = needsAction.items[0]?.label;
  const outcome =
    model.row.status.toLowerCase() === "completed" && model.row.outcome_label?.trim()
      ? model.row.outcome_label.trim()
      : null;

  return (
    <li
      className={`pet-row${attention ? " pet-row--attention" : ""}${model.isLegacy ? " pet-row--legacy" : ""}`}
    >
      <Link href={model.openHref} className="pet-row__main" data-surgical-press>
        <div className="pet-row__top">
          <span className="pet-row__type">{model.typeLabel}</span>
          <span className={`pet-row__status pet-row__status--${engagementStatusTone(model.row.status)}`}>
            {model.statusLabel}
          </span>
        </div>
        <div className="pet-row__meta">
          <span className="pet-row__when">{model.whenLabel}</span>
          {plan ? <span className="pet-row__pill">{plan}</span> : null}
          {attention && attentionLabel ? (
            <span className="pet-row__flag">{attentionLabel}</span>
          ) : null}
          {outcome ? <span className="pet-row__outcome">{outcome}</span> : null}
        </div>
      </Link>
      <div className="pet-row__actions">
        {primaryUsesBeginCall ? (
          <StartEngagementButton
            engagementId={model.row.id}
            className="pet-row__action pet-row__action--primary"
          />
        ) : (
          <Link href={primary.href} className="pet-row__action pet-row__action--primary" data-surgical-press>
            {primary.label}
          </Link>
        )}
        {prepareSecondary ? (
          <Link
            href={prepareSecondary.href}
            className="pet-row__action pet-row__action--secondary"
            data-surgical-press
          >
            {prepareSecondary.label}
          </Link>
        ) : null}
      </div>
    </li>
  );
}

function EngagementSectionLabel({ title, count }: { title: string; count: number }) {
  return (
    <li className="pet-section-label" aria-hidden>
      <span>{title}</span>
      <span className="pet-section-label__count">{count}</span>
    </li>
  );
}

function buildSummaryMeta(parts: { needsAttention: number; upcoming: number; completed: number }): string {
  const segments: string[] = [];
  if (parts.needsAttention > 0) {
    segments.push(`${parts.needsAttention} need attention`);
  }
  if (parts.upcoming > 0) {
    segments.push(`${parts.upcoming} upcoming`);
  }
  if (parts.completed > 0) {
    segments.push(`${parts.completed} completed`);
  }
  return segments.join(" · ");
}

export function ProviderProfileEngagements({
  engagements,
  newEngagementHref,
  providerId,
  loading = false,
}: {
  engagements: ProviderEngagementSummary[];
  newEngagementHref: string;
  providerId: string;
  loading?: boolean;
}) {
  const { upcoming, completed, needsAttention } = partitionProviderEngagementsForTab(engagements);
  const total = engagements.length;
  const summaryMeta = buildSummaryMeta({
    needsAttention: needsAttention.length,
    upcoming: upcoming.length,
    completed: completed.length,
  });

  const hasListContent =
    needsAttention.length > 0 || upcoming.length > 0 || completed.length > 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: providerEngagementsTabCss }} />
      <section className="pet provider-tab-workspace" aria-label="Provider engagements">
        <div className="pet-head">
          <div className="pet-head-copy">
            <h2 className="pet-head-title">
              {total} {total === 1 ? "Engagement" : "Engagements"}
            </h2>
            {summaryMeta ? <p className="pet-head-meta">{summaryMeta}</p> : null}
          </div>
          <Link href={newEngagementHref} className="pet-head-action" data-surgical-press>
            New engagement
          </Link>
        </div>

        {loading ? <p className="pet-loading">Loading engagements…</p> : null}

        {!loading && total === 0 ? (
          <div className="pet-empty">
            <p className="pet-empty-text">No engagements yet. Schedule an intro call or observation touch.</p>
            <Link href={newEngagementHref} className="pet-empty-cta" data-surgical-press>
              New engagement
            </Link>
          </div>
        ) : null}

        {!loading && total > 0 && hasListContent ? (
          <ol className="pet-list" aria-label="Engagement timeline">
            {needsAttention.length > 0 ? (
              <>
                <EngagementSectionLabel title="Needs attention" count={needsAttention.length} />
                {needsAttention.map((row) => (
                  <ProviderEngagementRow
                    key={row.id}
                    model={buildProviderEngagementTabRowModel(row, providerId)}
                    attention
                  />
                ))}
              </>
            ) : null}

            {upcoming.length > 0 ? (
              <>
                <EngagementSectionLabel title="Upcoming" count={upcoming.length} />
                {upcoming.map((row) => (
                  <ProviderEngagementRow
                    key={row.id}
                    model={buildProviderEngagementTabRowModel(row, providerId)}
                  />
                ))}
              </>
            ) : null}

            {completed.length > 0 ? (
              <>
                <EngagementSectionLabel title="Completed" count={completed.length} />
                {completed.map((row) => (
                  <ProviderEngagementRow
                    key={row.id}
                    model={buildProviderEngagementTabRowModel(row, providerId)}
                  />
                ))}
              </>
            ) : null}
          </ol>
        ) : null}

        {!loading && total > 0 && !hasListContent ? (
          <p className="pet-empty-inline">No open engagements on file.</p>
        ) : null}
      </section>
    </>
  );
}
