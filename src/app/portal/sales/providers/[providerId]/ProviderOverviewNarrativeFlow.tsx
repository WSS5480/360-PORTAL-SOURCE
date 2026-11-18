"use client";

import Link from "next/link";
import { useState } from "react";
import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import type { ProviderOverviewNarrative } from "@/lib/surgical-sales/buildProviderOverviewNarrative";
import { operationalOverviewCaptureLabel } from "@/lib/surgical-sales/providerOperationalActionLabels";
import { LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";
import {
  PROVIDER_OVERVIEW_ACTION_FEWER,
  PROVIDER_OVERVIEW_ACTION_LOG_CASE,
  PROVIDER_OVERVIEW_ACTION_MORE,
  PROVIDER_OVERVIEW_ACTION_SCHEDULE_TOUCH,
  PROVIDER_OVERVIEW_DASHBOARD_ARIA,
  PROVIDER_OVERVIEW_FIELD_TOUCH_HISTORY_TITLE,
  PROVIDER_OVERVIEW_OBSERVATION_HISTORY_TITLE,
  PROVIDER_OVERVIEW_RECENT_MOTION_TITLE,
  PROVIDER_OVERVIEW_RECORD_TITLE,
} from "@/lib/surgical-sales/providerOverviewVocabulary";

import { ProviderActivityPreview } from "./ProviderActivityPreview";
import { ProviderEngagementsPreview } from "./ProviderEngagementsPreview";
import { ProviderOverviewCommandSummaryPanel } from "./ProviderOverviewCommandSummary";
import { ProviderExecutionBlockersPanel } from "./ProviderExecutionBlockersPanel";
import { ProviderFieldTimeRiskPanel } from "./ProviderFieldTimeRiskPanel";
import { BackgroundIntelligenceSections } from "@/components/sales/BackgroundIntelligenceSections";
import { ProviderOverviewMissionControlSection } from "./ProviderOverviewMissionControlSection";
import { ProviderOverviewWorkStreams } from "./ProviderOverviewWorkStreams";
import type { ProviderProfilePayload } from "./providerProfileTypes";

export function ProviderOverviewNarrativeFlow({
  narrative,
  data,
  providerId,
  newEngagementHref,
  newCaseHref,
  createOpportunityHref,
  noteHref,
  engagementsLoading,
  activityLoading,
  onOpenIntelligence,
  onOpenDiscoveryPriorities,
  onCaptureIntelligence,
}: {
  narrative: ProviderOverviewNarrative;
  data: ProviderProfilePayload;
  providerId: string;
  newEngagementHref: string;
  newCaseHref: string;
  createOpportunityHref: string;
  noteHref: string;
  engagementsLoading?: boolean;
  activityLoading?: boolean;
  onOpenIntelligence: (sectionId?: string) => void;
  onOpenDiscoveryPriorities: () => void;
  onCaptureIntelligence: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const { nextStep, showSection, workStreams, visibility } = narrative;
  const showRecord = workStreams.length > 0;

  const captureChipLabel = operationalOverviewCaptureLabel(
    (data.provider ?? {}) as Record<string, unknown>,
  );
  const showNewEngagementOverflow = !nextStep.primaryAction.href.includes("/engagements/new");
  const showRecentMomentum =
    (showSection("activity_feed") && visibility.hasActivity) ||
    (showSection("engagements_feed") && visibility.hasEngagementHistory);

  const showMission =
    narrative.missionControl.hasUpcomingEngagement || showSection("upcoming_engagement");

  return (
    <article className="provider-ops-briefing-flow" aria-label={PROVIDER_OVERVIEW_DASHBOARD_ARIA}>
      <ProviderOverviewCommandSummaryPanel
        summary={narrative.commandSummary}
        primaryActionHref={nextStep.primaryAction.href}
        primaryActionLabel={nextStep.primaryAction.label}
        onOpenIntelligence={onOpenIntelligence}
        onOpenDiscoveryPriorities={onOpenDiscoveryPriorities}
      />

      {narrative.commandSummary.fieldTimeRisk.state !== "efficient_field_target" ? (
        <section className="provider-ops-field-time-risk-panel" aria-label="Operational confidence">
          <ProviderFieldTimeRiskPanel
            risk={narrative.commandSummary.fieldTimeRisk}
            variant="full"
            onOpenIntelligence={(sectionId) =>
              sectionId ? onOpenIntelligence(sectionId) : onOpenIntelligence()
            }
          />
        </section>
      ) : null}

      <ProviderExecutionBlockersPanel
        blockers={narrative.executionBlockers}
        onResolve={(sectionId) => onOpenIntelligence(sectionId)}
        onOpenDiscoveryPriorities={onOpenDiscoveryPriorities}
      />

      <BackgroundIntelligenceSections
        contact={(data.provider ?? {}) as Record<string, unknown>}
        accessOnly
        lead={null}
        className="provider-ops-background-intel"
      />

      {showMission ? (
        <section className="provider-ops-execute-row" aria-label="Execute next move">
          <ProviderOverviewMissionControlSection mission={narrative.missionControl} />
          <div className="provider-ops-action-row">
            {LOG_UPDATE_UI_ENABLED ? (
              <button type="button" className="provider-ops-action-chip" onClick={onCaptureIntelligence}>
                {captureChipLabel}
              </button>
            ) : null}
            {showNewEngagementOverflow ? (
              <Link href={newEngagementHref} className="provider-ops-action-chip">
                {PROVIDER_OVERVIEW_ACTION_SCHEDULE_TOUCH}
              </Link>
            ) : null}
            <Link href={newCaseHref} className="provider-ops-action-chip">
              {PROVIDER_OVERVIEW_ACTION_LOG_CASE}
            </Link>
            <button
              type="button"
              className="provider-ops-action-chip provider-ops-action-chip--muted"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((o) => !o)}
            >
              {moreOpen ? PROVIDER_OVERVIEW_ACTION_FEWER : PROVIDER_OVERVIEW_ACTION_MORE}
            </button>
          </div>
          {moreOpen ? (
            <div className="provider-ops-more-menu">
              <Link href={createOpportunityHref} className="provider-ops-more-item">
                {OPPORTUNITY_UI.createFromProvider}
              </Link>
              <Link href={noteHref} className="provider-ops-more-item">
                Add note
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}

      {showRecentMomentum ? (
        <details className="provider-ops-momentum-detail">
          <summary className="provider-ops-momentum-detail-summary">
            {PROVIDER_OVERVIEW_RECENT_MOTION_TITLE}
          </summary>
          <div className="provider-ops-momentum-feeds">
            {showSection("activity_feed") && visibility.hasActivity ? (
              <ProviderActivityPreview
                providerId={providerId}
                timeline={data.activity_timeline || []}
                engagements={data.engagements || []}
                loading={activityLoading}
                newEngagementHref={newEngagementHref}
                onOpenIntelligence={() => onOpenIntelligence()}
                variant="dashboard"
              />
            ) : null}
            {showSection("engagements_feed") && visibility.hasEngagementHistory ? (
              <ProviderEngagementsPreview
                data={data}
                providerId={providerId}
                newEngagementHref={newEngagementHref}
                loading={engagementsLoading}
                sectionTitle={
                  narrative.commercialStage === "observation"
                    ? PROVIDER_OVERVIEW_OBSERVATION_HISTORY_TITLE
                    : PROVIDER_OVERVIEW_FIELD_TOUCH_HISTORY_TITLE
                }
                variant="dashboard"
              />
            ) : null}
          </div>
        </details>
      ) : null}

      {showRecord ? (
        <details className="provider-ops-record">
          <summary>
            {PROVIDER_OVERVIEW_RECORD_TITLE}
            {narrative.recordSummary ? (
              <span className="provider-ops-record-meta">{narrative.recordSummary}</span>
            ) : null}
          </summary>
          <div className="provider-ops-record-body">
            <ProviderOverviewWorkStreams
              streams={workStreams}
              data={data}
              providerId={providerId}
              newCaseHref={newCaseHref}
              createOpportunityHref={createOpportunityHref}
            />
          </div>
        </details>
      ) : null}
    </article>
  );
}
