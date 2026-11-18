"use client";

import React from "react";
import Link from "next/link";

import { PortalMobileMenuButton } from "@/components/portal/PortalMobileMenuButton";
import { EngagementRepLifecycleStrip } from "@/components/sales/EngagementRepLifecycleStrip";
import type { PrepareForMeetingView } from "@/lib/surgical-sales/engagements/buildPrepareForMeetingView";
import type { ActiveProviderDebriefGuide } from "@/lib/surgical-sales/engagements/buildActiveProviderDebriefGuide";
import {
  ACTIVE_DEBRIEF_HYPOTHESIS_LABEL,
  ACTIVE_DEBRIEF_OBJECTIVE_LABEL,
  ACTIVE_DEBRIEF_OBSERVED_LABEL,
  ACTIVE_DEBRIEF_QUESTIONS_LABEL,
  ACTIVE_DEBRIEF_VALIDATE_LABEL,
  ACTIVE_ENGAGEMENT_PRIMARY_QUESTION_LABEL,
  ACTIVE_ENGAGEMENT_SECONDARY_QUESTIONS_LABEL,
  PROVIDER_DEBRIEF_ACTIVE_DEBRIEF_NEXT_HINT,
  PROVIDER_DEBRIEF_END_LABEL,
} from "@/lib/surgical-sales/engagements/prepareFlowTerminology";
import { beginEngagementCallClient } from "@/lib/surgical-sales/engagements/beginEngagementCallClient";
import type { StartMissionOutcomeId } from "@/lib/surgical-sales/engagements/startMissionConfig";

const ACTIVE_DEBRIEF_KICKER = "Live provider debrief";

function GuideList({
  items,
  ordered = false,
  className,
  itemClassName,
}: {
  items: string[];
  ordered?: boolean;
  className?: string;
  itemClassName?: string;
}) {
  if (items.length === 0) return null;
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={className}>
      {items.map((item) => (
        <li key={item} className={itemClassName}>
          {item}
        </li>
      ))}
    </Tag>
  );
}

export function ActiveProviderDebriefWorkspace({
  engagementId,
  guide,
  data,
  providerHref,
  onReload,
  onError,
  onEndEngagement,
  endingEngagement = false,
}: {
  engagementId: string;
  guide: ActiveProviderDebriefGuide;
  data: PrepareForMeetingView;
  providerHref?: string | null;
  onReload: () => void | Promise<void>;
  onError: (message: string | null) => void;
  onEndEngagement: (outcomeId: StartMissionOutcomeId | null, liveNotes: string) => void | Promise<void>;
  endingEngagement?: boolean;
}) {
  const { executionGuide } = guide;
  const organizationName = data.provider_snapshot.organization_name;
  const [primaryQuestion, ...secondaryQuestions] = executionGuide.conversationStarters;
  const sessionReadyRef = React.useRef(false);

  React.useEffect(() => {
    if (sessionReadyRef.current || data.live_session) {
      sessionReadyRef.current = true;
      return;
    }
    if (data.upcoming_engagement.status !== "in_progress") return;

    let cancelled = false;

    void (async () => {
      const result = await beginEngagementCallClient(engagementId);
      if (cancelled) return;
      sessionReadyRef.current = true;
      if (!result.ok) {
        onError(result.message);
        return;
      }
      await onReload();
    })();

    return () => {
      cancelled = true;
    };
  }, [data.live_session, data.upcoming_engagement.status, engagementId, onError, onReload]);

  return (
    <article
      className="live-call-workspace live-call-workspace--provider-debrief live-call-workspace--provider-debrief-exec"
      aria-label="Active provider debrief workspace"
      data-testid="active-provider-debrief-workspace"
      data-execution-guide-source={executionGuide.source}
    >
      <header className="live-call-workspace__header live-call-workspace__header--provider-debrief">
        <div className="live-call-workspace__bar">
          <PortalMobileMenuButton className="sales-cmd-mobile-menu" />
          {providerHref ? (
            <Link href={providerHref} className="live-call-workspace__back" data-testid="active-debrief-provider-link">
              ← Provider
            </Link>
          ) : null}
          <span className="live-call-workspace__kicker">{ACTIVE_DEBRIEF_KICKER}</span>
        </div>
        <h1 className="live-call-workspace__provider">{guide.providerName}</h1>
        {organizationName ? (
          <p className="live-call-workspace__org">{organizationName}</p>
        ) : null}
        <span className="live-call-workspace__type">{guide.engagementTypeLabel}</span>
      </header>

      <EngagementRepLifecycleStrip phase="active" nextActionLabel={PROVIDER_DEBRIEF_END_LABEL} />

      {executionGuide.meetingObjective ? (
        <section
          className="live-call-workspace__card live-call-workspace__card--goal live-call-workspace__card--hero"
          aria-labelledby="active-debrief-objective"
        >
          <h2 id="active-debrief-objective" className="live-call-workspace__label">
            {ACTIVE_DEBRIEF_OBJECTIVE_LABEL}
          </h2>
          <p className="live-call-workspace__goal">{executionGuide.meetingObjective}</p>
        </section>
      ) : null}

      {executionGuide.primaryHypothesis ? (
        <section
          className="live-call-workspace__card live-call-workspace__card--validation"
          aria-labelledby="active-debrief-hypothesis"
        >
          <h2 id="active-debrief-hypothesis" className="live-call-workspace__label">
            {ACTIVE_DEBRIEF_HYPOTHESIS_LABEL}
          </h2>
          <p className="live-call-workspace__mission-note">{executionGuide.primaryHypothesis}</p>
        </section>
      ) : null}

      {executionGuide.whatWeObserved.length > 0 ? (
        <section
          className="live-call-workspace__card live-call-workspace__card--validation"
          aria-labelledby="active-debrief-observed"
        >
          <h2 id="active-debrief-observed" className="live-call-workspace__label">
            {ACTIVE_DEBRIEF_OBSERVED_LABEL}
          </h2>
          <GuideList
            items={executionGuide.whatWeObserved}
            className="live-call-workspace__followup-list live-call-workspace__followup-list--compact"
            itemClassName="live-call-workspace__followup-item"
          />
        </section>
      ) : null}

      {executionGuide.whatToValidate.length > 0 ? (
        <section
          className="live-call-workspace__card live-call-workspace__card--validation"
          aria-labelledby="active-debrief-validate"
        >
          <h2 id="active-debrief-validate" className="live-call-workspace__label">
            {ACTIVE_DEBRIEF_VALIDATE_LABEL}
          </h2>
          <GuideList
            items={executionGuide.whatToValidate}
            className="live-call-workspace__validation-list"
            itemClassName="live-call-workspace__validation-item"
          />
        </section>
      ) : null}

      {primaryQuestion ? (
        <section
          className="live-call-workspace__card live-call-workspace__card--primary"
          aria-labelledby="active-debrief-primary-question"
        >
          <h2 id="active-debrief-primary-question" className="live-call-workspace__label">
            {ACTIVE_ENGAGEMENT_PRIMARY_QUESTION_LABEL}
          </h2>
          <p className="live-call-workspace__primary">{primaryQuestion}</p>
        </section>
      ) : null}

      {secondaryQuestions.length > 0 ? (
        <details className="live-call-workspace__secondary">
          <summary className="live-call-workspace__secondary-summary">
            {ACTIVE_DEBRIEF_QUESTIONS_LABEL}
            <span className="live-call-workspace__secondary-count">{secondaryQuestions.length}</span>
          </summary>
          <ol className="live-call-workspace__secondary-list">
            {secondaryQuestions.map((question) => (
              <li key={question} className="live-call-workspace__secondary-item">
                {question}
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      <section
        className="live-call-workspace__card live-call-workspace__card--decision"
        aria-labelledby="active-debrief-decision"
      >
        <div className="live-call-workspace__decision-panel live-call-workspace__decision-panel--intro">
          <p id="active-debrief-decision" className="live-call-workspace__intro-debrief-hint">
            {PROVIDER_DEBRIEF_ACTIVE_DEBRIEF_NEXT_HINT}
          </p>
          <button
            type="button"
            className="live-call-workspace__end-engagement"
            disabled={endingEngagement}
            onClick={() => {
              void onEndEngagement(null, "");
            }}
          >
            {endingEngagement ? "Ending…" : PROVIDER_DEBRIEF_END_LABEL}
          </button>
        </div>
      </section>
    </article>
  );
}
