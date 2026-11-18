"use client";



import Link from "next/link";

import React from "react";

import { PortalMobileMenuButton } from "@/components/portal/PortalMobileMenuButton";

import type { PrepareForMeetingView as PrepareView } from "@/lib/surgical-sales/engagements/buildPrepareForMeetingView";

import { PrepareProviderDebriefFieldBriefing } from "./PrepareProviderDebriefFieldBriefing";

import { formatEngagementDisplayStatus } from "@/lib/surgical-sales/engagements/engagementStatusDisplay";

import { IntroCallPrepareMissionStrip } from "./IntroCallPrepareMissionStrip";
import { OfficeVisit360PrepareMissionStrip } from "./OfficeVisit360PrepareMissionStrip";
import { PreparedStatusBanner } from "./PreparedStatusBanner";

import {

  PrepareEngagementPlanningPanel,

  type PrepareEngagementPlanningPanelHandle,

} from "./PrepareEngagementPlanningPanel";

import { PreparePreCallPlanFooter } from "./PreparePreCallPlanFooter";
import { PrepareProviderContextCollapsible } from "./PrepareProviderContextCollapsible";
import { isIntroCallPathwayMission } from "@/lib/surgical-sales/engagements/introCallPathwayMission";
import { isOfficeVisit360PathwayMission } from "@/lib/surgical-sales/engagements/officeVisit360PathwayMission";
import { PrepareProviderDebriefFooter } from "./PrepareProviderDebriefFooter";
import {
  buildEngagementActiveHref,
  buildEngagementDebriefHref,
  ENGAGEMENT_DETAIL_RESUME_ENGAGEMENT_LABEL,
  ENGAGEMENT_PREPARE_START_ENGAGEMENT_LABEL,
} from "@/lib/surgical-sales/engagements/engagementLifecycle";
import {
  INTRO_CALL_PREPARE_KICKER,
  INTRO_CALL_PREPARE_START_LABEL,
  OFFICE_VISIT_360_PREPARE_KICKER,
  OFFICE_VISIT_360_PREPARE_START_LABEL,
} from "@/lib/surgical-sales/engagements/prepareFlowTerminology";
import {
  PROVIDER_DEBRIEF_ACTIVE_PREPARE_BANNER,
  PROVIDER_DEBRIEF_FIELD_BRIEFING_KICKER,
} from "@/lib/surgical-sales/engagements/providerDebriefEngagement";



export function PrepareForMeetingView({

  data,

  engagement,

  engagementDetailHref,

  planningError,

  onPlanningError,

  onEngagementUpdated,

  onPrepareRefresh,

  actionError,

  onActionError,

}: {

  data: PrepareView;

  engagement: Record<string, unknown>;

  engagementDetailHref: string;

  planningError?: string | null;

  onPlanningError: (message: string | null) => void;

  onEngagementUpdated: (row: Record<string, unknown>) => void;

  onPrepareRefresh: () => void | Promise<void>;

  actionError?: string | null;

  onActionError: (message: string | null) => void;

}) {

  const planningRef = React.useRef<PrepareEngagementPlanningPanelHandle | null>(null);
  const [planSaving, setPlanSaving] = React.useState(false);

  const upcoming = data.upcoming_engagement;

  const providerName = data.provider_snapshot.display_name;
  const organizationName =
    data.provider_snapshot.organization_name ?? upcoming.organization_name ?? null;

  const engagementTypeLabel = React.useMemo(() => {

    const type = upcoming.type_label?.trim();

    if (type) return type;

    const title = upcoming.title?.trim();

    if (title && title.toLowerCase() !== providerName.trim().toLowerCase()) return title;

    return "Visit";

  }, [upcoming.type_label, upcoming.title, providerName]);

  const isProviderDebrief = data.provider_debrief_briefing.is_provider_debrief;
  const isIntroCall = isIntroCallPathwayMission(String(engagement.engagement_type ?? ""));
  const isOfficeVisit360 = isOfficeVisit360PathwayMission(String(engagement.engagement_type ?? ""));
  const useIntroStylePrepare = isIntroCall || isOfficeVisit360;

  const statusLabel =

    upcoming.status_label?.trim() || formatEngagementDisplayStatus(upcoming.status ?? "planned");

  const engagementStatus = String(upcoming.status ?? "planned").trim().toLowerCase();
  const isActiveDebriefPrepare = isProviderDebrief && engagementStatus === "in_progress";
  const isCompletedDebriefPrepare = isProviderDebrief && engagementStatus === "completed";

  // While the engagement is still upcoming, "Planned" reads as if planning is finished.
  // Surface prep readiness instead so the chip reflects where the rep actually stands.
  const prepareStatusLabel =
    engagementStatus === "planned"
      ? data.preparation.is_prepared
        ? "Ready"
        : "Not prepared"
      : statusLabel;



  if (isProviderDebrief) {

    return (

      <div className="prepare-for-meeting-page prepare-for-meeting-page--provider-debrief mc-workspace">

        <header className="dpb-command" aria-label="Debrief context">

          <div className="dpb-command__surface">

            <div className="dpb-command__top">

              <PortalMobileMenuButton className="sales-cmd-mobile-menu dpb-command__menu" />

              <div className="dpb-command__back-row">
                {data.provider_href ? (
                  <Link href={data.provider_href} className="dpb-command__back">
                    ← Provider
                  </Link>
                ) : null}
                <Link href={engagementDetailHref} className="dpb-command__back">
                  ← Engagement
                </Link>
              </div>

            </div>

            <p className="dpb-command__kicker">{PROVIDER_DEBRIEF_FIELD_BRIEFING_KICKER}</p>

            <h1 className="dpb-command__provider">{providerName}</h1>

            {organizationName ? (

              <p className="dpb-command__org">{organizationName}</p>

            ) : null}

            <div className="dpb-command__meta">

              <span className="dpb-command__type">{engagementTypeLabel}</span>

              <span className="dpb-command__chip">{statusLabel}</span>

              {upcoming.datetime_label ? (

                <span className="dpb-command__when">{upcoming.datetime_label}</span>

              ) : null}

            </div>

          </div>

        </header>

        <main className="dpb-main">

          {actionError ? (

            <p className="dpb-footer__alert" role="alert">

              {actionError}

            </p>

          ) : null}

          {isActiveDebriefPrepare ? (
            <p className="dpb-coach-alert dpb-active-prepare-banner" role="status">
              {PROVIDER_DEBRIEF_ACTIVE_PREPARE_BANNER}
            </p>
          ) : null}

          <PrepareProviderDebriefFieldBriefing

            briefing={data.provider_debrief_briefing}

            engagementId={data.engagement_id}

            engagementHref={engagementDetailHref}

            providerId={data.provider_snapshot.provider_id}

            organizationId={data.capture_scope.organizationId}

          />

        </main>

        <footer className="dpb-footer">

          <div className="dpb-footer__inner">

            {isCompletedDebriefPrepare ? (
              <Link
                href={buildEngagementDebriefHref(data.engagement_id)}
                className="dpb-footer__primary"
              >
                Continue Debrief
              </Link>
            ) : isActiveDebriefPrepare ? (
              <Link
                href={buildEngagementActiveHref(data.engagement_id)}
                className="dpb-footer__primary"
              >
                {ENGAGEMENT_DETAIL_RESUME_ENGAGEMENT_LABEL}
              </Link>
            ) : (
              <PrepareProviderDebriefFooter
                engagementId={data.engagement_id}
                engagementDetailHref={engagementDetailHref}
                onActionError={onActionError}
              />
            )}

            <Link href={engagementDetailHref} className="dpb-footer__secondary">

              Back to engagement

            </Link>

          </div>

        </footer>

      </div>

    );

  }



  return (
    <div
      className={`prepare-for-meeting-page prepare-for-meeting-page--precall-plan${useIntroStylePrepare ? " prepare-for-meeting-page--intro-call" : ""}`}
    >
      <header className="pfm-precall-command" aria-label="Visit context">
        <div className="pfm-precall-command__surface">
          <div className="pfm-precall-command__top">
            <PortalMobileMenuButton className="sales-cmd-mobile-menu pfm-precall-command__menu" />
            <Link href={engagementDetailHref} className="pfm-precall-command__back">
              ← Engagement
            </Link>
          </div>
          <div className="pfm-precall-command__hero">
            <p className="pfm-precall-command__kicker">
              {isIntroCall
                ? INTRO_CALL_PREPARE_KICKER
                : isOfficeVisit360
                  ? OFFICE_VISIT_360_PREPARE_KICKER
                  : "Pre-call planning"}
            </p>
            <h1 className="pfm-precall-command__provider">{providerName}</h1>
            {organizationName ? (
              <p className="pfm-precall-command__org">{organizationName}</p>
            ) : null}
            <div className="pfm-precall-command__meta">
              <span className="pfm-precall-command__type">{engagementTypeLabel}</span>
              <span className="pfm-precall-command__chip">{prepareStatusLabel}</span>
              {upcoming.datetime_label ? (
                <span className="pfm-precall-command__when">{upcoming.datetime_label}</span>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="pfm-precall-main">
        <div className="pfm-precall-layout">
          {planningError ? (
            <p className="pfm-precall-alert" role="alert">
              {planningError}
            </p>
          ) : null}
          {actionError ? (
            <p className="pfm-precall-alert" role="alert">
              {actionError}
            </p>
          ) : null}

          <PreparedStatusBanner
            preparation={data.preparation}
            variant={isIntroCall ? "intro_call" : isOfficeVisit360 ? "office_visit_360" : "default"}
          />

          {isIntroCall ? (
            <IntroCallPrepareMissionStrip specialty={data.provider_snapshot.specialty} />
          ) : isOfficeVisit360 ? (
            <OfficeVisit360PrepareMissionStrip specialty={data.provider_snapshot.specialty} />
          ) : null}

          <PrepareEngagementPlanningPanel
            ref={planningRef}
            data={data}
            engagement={engagement}
            onEngagementUpdated={onEngagementUpdated}
            onError={onPlanningError}
            onSavingChange={setPlanSaving}
            onAutoPrepared={onPrepareRefresh}
          />

          <PrepareProviderContextCollapsible data={data} collapsedByDefault={useIntroStylePrepare} />
        </div>
      </main>



      <PreparePreCallPlanFooter
        engagementId={data.engagement_id}
        engagementDetailHref={engagementDetailHref}
        isAlreadyPrepared={data.preparation.is_prepared}
        planningRef={planningRef}
        saving={planSaving}
        onActionError={onActionError}
        onPlanSaved={onPrepareRefresh}
        onPreparedMarked={onPrepareRefresh}
        startEngagementLabel={
          isIntroCall
            ? INTRO_CALL_PREPARE_START_LABEL
            : isOfficeVisit360
              ? OFFICE_VISIT_360_PREPARE_START_LABEL
              : undefined
        }
      />

    </div>

  );

}


