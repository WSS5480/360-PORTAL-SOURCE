"use client";

import React from "react";
import {
  buildProviderOverviewFieldBriefing,
  FIELD_BRIEFING_SECTION,
  type FieldBriefingAccessHeadline,
  type ProviderOverviewFieldBriefingView,
} from "@/lib/surgical-sales/buildProviderOverviewFieldBriefing";
import { PROVIDER_OVERVIEW_BRIEFING_VOCABULARY as BRIEF } from "@/lib/surgical-sales/providerOverviewBriefingVocabulary";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

function accessHeadlineClass(headlineKey: FieldBriefingAccessHeadline): string {
  switch (headlineKey) {
    case "approved":
      return "pov-field-briefing__status-value--approved";
    case "interested":
      return "pov-field-briefing__status-value--interested";
    case "pending":
      return "pov-field-briefing__status-value--pending";
    case "declined":
      return "pov-field-briefing__status-value--blocked";
    default:
      return "pov-field-briefing__status-value--unknown";
  }
}

function BriefingGapList({
  items,
  domains,
  empty,
}: {
  items: ProviderOverviewFieldBriefingView["intelligenceGaps"];
  domains: ProviderOverviewFieldBriefingView["intelligenceGapDomains"];
  empty?: string;
}) {
  if (items.length === 0) {
    return empty ? <p className="pov-field-briefing__empty">{empty}</p> : null;
  }

  return (
    <>
      <div className="pov-field-briefing__gap-domains" aria-label="Intelligence domain coverage">
        {domains.map((domain) => (
          <div
            key={domain.id}
            className={`pov-field-briefing__gap-domain pov-field-briefing__gap-domain--${domain.completeness}`}
            data-testid={`pov-fb-gap-domain-${domain.id}`}
          >
            <span className="pov-field-briefing__gap-domain-label">{domain.label}</span>
            <span className="pov-field-briefing__gap-domain-status">{domain.completeness}</span>
          </div>
        ))}
      </div>
      <ul className="pov-field-briefing__list pov-field-briefing__list--gaps">
        {items.map((item) => (
          <li key={item.id} className="pov-field-briefing__list-item pov-field-briefing__list-item--gap">
            <span
              className={`pov-field-briefing__gap-priority pov-field-briefing__gap-priority--${item.priority}`}
              data-testid={`pov-fb-gap-priority-${item.priority}`}
            >
              {item.priorityLabel}
            </span>
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function AccessStatusSection({
  access,
}: {
  access: ProviderOverviewFieldBriefingView["accessStatus"];
}) {
  return (
    <section className="pov-field-briefing__section" aria-labelledby="pov-fb-access-title">
      <h3 id="pov-fb-access-title" className="pov-field-briefing__section-title">
        {FIELD_BRIEFING_SECTION.accessStatus}
      </h3>
      <div className="pov-field-briefing__access-grid">
        <div className="pov-field-briefing__access-headline">
          <span
            className={`pov-field-briefing__status-value ${accessHeadlineClass(access.headlineKey)}`}
            data-testid="pov-fb-access-headline"
          >
            {access.headline}
          </span>
        </div>
        <dl className="pov-field-briefing__status-dl">
          <div className="pov-field-briefing__status-row">
            <dt>{FIELD_BRIEFING_SECTION.observationStatus}</dt>
            <dd>{access.observationStatus}</dd>
          </div>
          <div className="pov-field-briefing__status-row">
            <dt>{FIELD_BRIEFING_SECTION.approvalStatus}</dt>
            <dd>{access.approvalStatus}</dd>
          </div>
          {access.executionRecommendations.length > 0 ? (
            <div className="pov-field-briefing__status-row">
              <dt>{BRIEF.executionRecommendations}</dt>
              <dd>
                <ul className="pov-field-briefing__blocker-list">
                  {access.executionRecommendations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    </section>
  );
}

function MissionProgressSection({
  missionProgress,
  intelligenceConfidence,
}: {
  missionProgress: ProviderOverviewFieldBriefingView["missionProgress"];
  intelligenceConfidence: ProviderOverviewFieldBriefingView["intelligenceConfidence"];
}) {
  return (
    <section className="pov-field-briefing__section" aria-labelledby="pov-fb-progress-title">
      <h3 id="pov-fb-progress-title" className="pov-field-briefing__section-title">
        {FIELD_BRIEFING_SECTION.missionProgress}
      </h3>
      <div className="pov-field-briefing__progress-grid" data-testid="pov-fb-mission-progress">
        <div className="pov-field-briefing__progress-card">
          <span className="pov-field-briefing__progress-label">{FIELD_BRIEFING_SECTION.missionProgress}</span>
          <span className="pov-field-briefing__progress-value">{missionProgress.levelLabel}</span>
          <span className="pov-field-briefing__progress-meta">{missionProgress.advancementLabel}</span>
        </div>
        <div className="pov-field-briefing__progress-card">
          <span className="pov-field-briefing__progress-label">{FIELD_BRIEFING_SECTION.intelligenceConfidence}</span>
          <span
            className={`pov-field-briefing__confidence pov-field-briefing__confidence--${intelligenceConfidence.tone}`}
          >
            {intelligenceConfidence.label}
          </span>
          <span className="pov-field-briefing__progress-meta">{intelligenceConfidence.domainSummary}</span>
        </div>
      </div>
      <p className="pov-field-briefing__progress-note">{FIELD_BRIEFING_SECTION.gapsImproveExecution}</p>
    </section>
  );
}

function NextMissionSection({
  mission,
}: {
  mission: ProviderOverviewFieldBriefingView["nextMission"];
}) {
  return (
    <section
      className="pov-field-briefing__section pov-field-briefing__section--mission"
      aria-labelledby="pov-fb-mission-title"
    >
      <h3 id="pov-fb-mission-title" className="pov-field-briefing__section-title">
        {FIELD_BRIEFING_SECTION.nextMission}
      </h3>
      <div className="pov-field-briefing__mission-card" data-testid="pov-fb-next-mission">
        <p className="pov-field-briefing__mission-objective">{mission.objective}</p>
        <dl className="pov-field-briefing__mission-dl">
          <div>
            <dt>{FIELD_BRIEFING_SECTION.whyItMatters}</dt>
            <dd>{mission.whyItMatters}</dd>
          </div>
          <div>
            <dt>{FIELD_BRIEFING_SECTION.expectedOutcome}</dt>
            <dd>{mission.expectedOutcome}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

export function ProviderOverviewFieldBriefing({
  contact,
  planning,
  organizationName,
  relatedContacts,
  engagements,
  onManageContacts,
}: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  organizationName?: string | null;
  relatedContacts?: Array<Record<string, unknown>>;
  engagements?: ProviderEngagementSummary[];
  onManageContacts?: () => void;
}) {
  const briefing = React.useMemo(
    () =>
      buildProviderOverviewFieldBriefing({
        contact,
        planning,
        organizationName,
        relatedContacts,
        engagements,
      }),
    [contact, planning, organizationName, relatedContacts, engagements],
  );

  return (
    <section
      className="pov-field-briefing"
      aria-label={BRIEF.preCallBriefingAria}
      data-testid="pov-field-briefing"
    >
      <header className="pov-field-briefing__head">
        <p className="pov-field-briefing__kicker">{FIELD_BRIEFING_SECTION.fieldBriefingKicker}</p>
        <h2 className="pov-field-briefing__title">{briefing.title}</h2>
      </header>

      <MissionProgressSection
        missionProgress={briefing.missionProgress}
        intelligenceConfidence={briefing.intelligenceConfidence}
      />

      <AccessStatusSection access={briefing.accessStatus} />

      <section className="pov-field-briefing__section" aria-labelledby="pov-fb-known-title">
        <h3 id="pov-fb-known-title" className="pov-field-briefing__section-title">
          {FIELD_BRIEFING_SECTION.whatWeKnow}
        </h3>
        {briefing.whatWeKnow.length === 0 ? (
          <p className="pov-field-briefing__empty">{FIELD_BRIEFING_SECTION.whatWeKnowEmpty}</p>
        ) : (
          <ul className="pov-field-briefing__list pov-field-briefing__list--known">
            {briefing.whatWeKnow.map((item) => (
              <li key={item.id} className="pov-field-briefing__list-item">
                <span className="pov-field-briefing__bullet" aria-hidden>
                  ✓
                </span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="pov-field-briefing__section" aria-labelledby="pov-fb-gaps-title">
        <h3 id="pov-fb-gaps-title" className="pov-field-briefing__section-title">
          {FIELD_BRIEFING_SECTION.intelligenceGaps}
        </h3>
        <p className="pov-field-briefing__gaps-lead">{FIELD_BRIEFING_SECTION.gapsImproveExecution}</p>
        <BriefingGapList
          items={briefing.intelligenceGaps}
          domains={briefing.intelligenceGapDomains}
          empty={briefing.hasFieldEvidence ? FIELD_BRIEFING_SECTION.gapsEmpty : undefined}
        />
      </section>

      <NextMissionSection mission={briefing.nextMission} />

      {onManageContacts ? (
        <footer className="pov-field-briefing__footer">
          <button type="button" className="pov-field-briefing__footer-action" onClick={onManageContacts}>
            {FIELD_BRIEFING_SECTION.manageKeyRelationships}
          </button>
        </footer>
      ) : null}
    </section>
  );
}
