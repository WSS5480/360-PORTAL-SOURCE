"use client";

import Link from "next/link";
import React from "react";
import { useCaptureIntelligence, buildLogUpdateContextFromEngagementScope } from "@/components/sales/captureIntelligence/CaptureIntelligenceHost";
import { buildIntelligenceCaptureScopeFromEngagement } from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureScope";
import { buildEngagementPreparationStatus } from "@/lib/surgical-sales/engagements/engagementPreparationStatus";
import {
  buildEngagementWorkspaceGuidance,
  ENGAGEMENT_RECORD_TITLE,
  type EngagementPlanProgress,
} from "@/lib/surgical-sales/engagements/engagementWorkspaceUx";
import { buildEngagementDetailRecord } from "@/lib/surgical-sales/engagements/buildEngagementDetailRecord";
import { ENGAGEMENT_DEBRIEF_LABEL } from "@/lib/surgical-sales/engagements/engagementUiLabels";
import { buildDebriefReviewHref } from "@/lib/surgical-sales/engagements/debriefIntelligenceSnapshot";
import { LOG_UPDATE_BUTTON_LABEL, LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";
import { EngagementOperationalStatus } from "./EngagementOperationalStatus";
import { EngagementCompactObjectives } from "./EngagementCompactObjectives";
import { EngagementFieldBriefingCard } from "./EngagementFieldBriefingCard";

export function EngagementWorkspacePanel({
  engagementId,
  engagement,
  planProgress,
  prepareHref,
  linkedCaseId,
  caseNumber,
  compact,
  provider,
  organizationId,
  organizationLabel,
  opportunityProductLine,
  linkedOpportunityId,
  opportunityLabel,
  activities,
  onReload,
}: {
  engagementId: string;
  engagement: Record<string, unknown>;
  planProgress: EngagementPlanProgress;
  prepareHref: string;
  saving?: boolean;
  onReload?: () => Promise<void>;
  onError?: (message: string | null) => void;
  onSavingChange?: (v: boolean) => void;
  linkedCaseId: string | null;
  caseNumber?: string | null;
  compact?: boolean;
  provider?: Record<string, unknown> | null;
  organizationId?: string | null;
  organizationLabel?: string | null;
  opportunityProductLine?: string | null;
  linkedOpportunityId?: string | null;
  opportunityLabel?: string | null;
  activities?: Array<{ id: string; activity_type: string; body: string; created_at: string }>;
}) {
  const capture = useCaptureIntelligence();
  const preparation = React.useMemo(() => buildEngagementPreparationStatus(engagement), [engagement]);
  const notes = String(engagement.notes ?? "").trim();
  const providerId =
    (provider?.id ? String(provider.id) : null) ||
    (engagement.provider_id ? String(engagement.provider_id) : null);

  const captureScope = React.useMemo(
    () =>
      buildIntelligenceCaptureScopeFromEngagement({
        engagementId,
        providerId,
        organizationId: organizationId ?? (engagement.organization_id ? String(engagement.organization_id) : null),
        providerLabel: provider?.display_name ? String(provider.display_name) : null,
        organizationLabel: organizationLabel ?? null,
        engagementType: String(engagement.engagement_type ?? ""),
        productLine: String(engagement.product_line ?? "").trim() || null,
        opportunityProductLine: opportunityProductLine ?? null,
      }),
    [engagement, engagementId, organizationId, organizationLabel, opportunityProductLine, provider, providerId],
  );

  const guidance = buildEngagementWorkspaceGuidance({
    engagementId,
    engagement,
    engagementType: String(engagement.engagement_type ?? ""),
    status: String(engagement.status ?? "planned"),
    preparation,
    planProgress,
    hasOutcomeNotes: Boolean(notes),
    provider: provider ?? null,
    providerId,
  });

  const record = React.useMemo(
    () =>
      buildEngagementDetailRecord({
        engagementId,
        engagement,
        preparation,
        planProgress,
        readiness: guidance.readiness,
        provider: provider ?? null,
        providerId,
        linkedCaseId,
        caseNumber,
        linkedOpportunityId,
        opportunityLabel,
        activities,
      }),
    [
      activities,
      caseNumber,
      engagement,
      engagementId,
      guidance.readiness,
      linkedCaseId,
      linkedOpportunityId,
      opportunityLabel,
      planProgress,
      preparation,
      provider,
      providerId,
    ],
  );

  const debriefHref = buildDebriefReviewHref(
    prepareHref,
    record.debriefStatus.id === "completed",
  );
  const showTimeline = record.timeline.length > 0;

  return (
    <div className={`edm-workspace edm-record${compact ? " edm-workspace--compact" : ""}`}>
      <div className="edm-workspace-head">
        <h2 className="edm-workspace-title">{ENGAGEMENT_RECORD_TITLE}</h2>
        <p className="edm-workspace-lead">{guidance.headline}</p>
      </div>

      <EngagementOperationalStatus activeGuidance={guidance} />

      <section className="edm-record-summary" aria-label="Engagement summary">
        <dl className="edm-record-summary-grid">
          <div>
            <dt>Type</dt>
            <dd>{record.typeLabel}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{record.statusLabel}</dd>
          </div>
          {record.dateLabel ? (
            <div>
              <dt>When</dt>
              <dd>
                {record.dateLabel}
                {record.timeLabel ? ` · ${record.timeLabel}` : ""}
              </dd>
            </div>
          ) : null}
          {record.participants.length > 0 ? (
            <div className="edm-record-summary-span">
              <dt>Participants</dt>
              <dd>{record.participants.join(" · ")}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {record.operationalOutcome ? (
        <section className="edm-record-section" aria-labelledby="edm-outcome-title">
          <h3 id="edm-outcome-title" className="edm-record-section-title">
            Operational outcome
          </h3>
          <p className="edm-record-outcome">{record.operationalOutcome}</p>
        </section>
      ) : null}

      {String(engagement.status ?? "planned").toLowerCase() !== "completed" ? (
        <EngagementFieldBriefingCard
          engagementId={engagementId}
          engagement={engagement}
          prepareHref={prepareHref}
          planFilled={planProgress.filled}
          planTotal={planProgress.total}
          onReload={onReload}
        />
      ) : null}

      <section
        className={`edm-record-debrief edm-record-debrief--${record.debriefStatus.id}`}
        aria-labelledby="edm-debrief-title"
      >
        <div className="edm-record-debrief-row">
          <div>
            <h3 id="edm-debrief-title" className="edm-record-section-title">
              Debrief
            </h3>
            <p className="edm-record-debrief-status">{record.debriefStatus.label}</p>
            {record.debriefStatus.hint ? (
              <p className="edm-record-debrief-hint">{record.debriefStatus.hint}</p>
            ) : null}
          </div>
          {record.debriefStatus.id !== "not_applicable" ? (
            <Link href={debriefHref} className="edm-record-debrief-cta">
              {record.debriefStatus.id === "completed"
                ? `Review ${ENGAGEMENT_DEBRIEF_LABEL.toLowerCase()}`
                : ENGAGEMENT_DEBRIEF_LABEL}
            </Link>
          ) : null}
        </div>
      </section>

      <EngagementCompactObjectives
        objectives={record.keyObjectives}
        prepareHref={prepareHref}
        engagementType={String(engagement.engagement_type ?? "")}
      />

      {record.intelligenceChanges.length > 0 ? (
        <section className="edm-record-section" aria-labelledby="edm-intel-changes-title">
          <h3 id="edm-intel-changes-title" className="edm-record-section-title">
            Intelligence changes
          </h3>
          <p className="edm-record-section-lead">What changed after this engagement</p>
          <ul className="edm-record-bullet-list">
            {record.intelligenceChanges.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {record.followUpActions.length > 0 ? (
        <section className="edm-record-section" aria-labelledby="edm-followups-title">
          <h3 id="edm-followups-title" className="edm-record-section-title">
            Follow-up actions
          </h3>
          <ul className="edm-record-bullet-list edm-record-bullet-list--actions">
            {record.followUpActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {record.linkedWorkflows.length > 0 ? (
        <section className="edm-record-section" aria-labelledby="edm-linked-workflows-title">
          <h3 id="edm-linked-workflows-title" className="edm-record-section-title">
            Linked workflow
          </h3>
          <ul className="edm-record-link-list">
            {record.linkedWorkflows.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="edm-record-link-row">
                  <span>{item.label}</span>
                  <span className="edm-record-link-chevron">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {showTimeline ? (
        <section className="edm-record-section edm-record-section--timeline" aria-labelledby="edm-timeline-title">
          <h3 id="edm-timeline-title" className="edm-record-section-title">
            Activity
          </h3>
          <ol className="edm-record-timeline">
            {record.timeline.map((entry) => (
              <li key={entry.id}>
                <span className="edm-record-timeline-label">{entry.label}</span>
                {entry.at ? (
                  <time className="edm-record-timeline-at" dateTime={entry.at}>
                    {new Date(entry.at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </time>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="edm-workspace-next" aria-labelledby="edm-workspace-next-title">
        <h3 id="edm-workspace-next-title" className="edm-workspace-section-title">
          {guidance.nextActionTitle}
        </h3>
        <p className="edm-workspace-next-body">{guidance.nextActionBody}</p>
        <div className="edm-workspace-cta-row">
          <Link href={guidance.primaryCtaHref} className="edm-workspace-cta primary">
            {guidance.primaryCtaLabel}
          </Link>
          {guidance.secondaryCtaLabel && guidance.secondaryCtaHref ? (
            <Link href={guidance.secondaryCtaHref} className="edm-workspace-cta secondary">
              {guidance.secondaryCtaLabel}
            </Link>
          ) : null}
        </div>
      </section>

      <div className="edm-workspace-quick" aria-label="Quick actions">
        {record.phase !== "pre_visit" ? (
          <Link href={debriefHref} className="edm-workspace-quick-btn">
            {record.debriefStatus.id === "completed"
              ? `Review ${ENGAGEMENT_DEBRIEF_LABEL.toLowerCase()}`
              : ENGAGEMENT_DEBRIEF_LABEL}
          </Link>
        ) : (
          <Link href={prepareHref} className="edm-workspace-quick-btn">
            Field Briefing
          </Link>
        )}
        {!linkedCaseId ? (
          <Link
            href={`/portal/sales/cases/new?engagement_id=${encodeURIComponent(engagementId)}`}
            className="edm-workspace-quick-btn"
          >
            Create case
          </Link>
        ) : null}
        {record.phase !== "pre_visit" ? (
          <Link href={prepareHref} className="edm-workspace-quick-btn">
            Field Briefing
          </Link>
        ) : null}
        {captureScope.providerId && LOG_UPDATE_UI_ENABLED ? (
          <button
            type="button"
            className="edm-workspace-quick-btn"
            onClick={() => capture.open(buildLogUpdateContextFromEngagementScope(captureScope))}
          >
            {LOG_UPDATE_BUTTON_LABEL}
          </button>
        ) : null}
      </div>
    </div>
  );
}
