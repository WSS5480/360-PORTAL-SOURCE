"use client";

import Link from "next/link";
import type { ProviderOverviewUpcomingTouchModel } from "@/lib/surgical-sales/buildProviderOverviewBody";
import { providerOverviewTouchActionHref } from "@/lib/surgical-sales/buildProviderOverviewTacticalLayout";
import {
  PROVIDER_OVERVIEW_BRIEFING_LABEL,
  formatNextFieldMove,
  formatOverviewVisibility,
  softenOverviewFocusCopy,
} from "@/lib/surgical-sales/providerOverviewBriefingCopy";

export function ProviderOverviewMissionStrip({
  currentFocus,
  nextMove,
  upcoming,
  riskLevel,
  confidenceLevel: _confidenceLevel,
}: {
  currentFocus: string | null;
  nextMove: string | null;
  upcoming: ProviderOverviewUpcomingTouchModel;
  riskLevel: string;
  confidenceLevel: string;
}) {
  const focusLine = softenOverviewFocusCopy(currentFocus);
  const nextMoveLine = formatNextFieldMove(nextMove);
  const visibility = formatOverviewVisibility(riskLevel);

  const hasContent = Boolean(focusLine || nextMoveLine || upcoming || riskLevel);

  if (!hasContent) return null;

  return (
    <section
      className="pov-mission-strip"
      aria-label="Field briefing telemetry"
      data-testid="pov-blocker-band"
    >
      <div className="pov-mission-strip__row">
        <article className="pov-mission-strip__item pov-mission-strip__item--focus">
          <p className="pov-mission-strip__label">{PROVIDER_OVERVIEW_BRIEFING_LABEL.currentFocus}</p>
          {focusLine ? (
            <p className="pov-mission-strip__value" data-testid="pov-primary-gap">
              {focusLine}
            </p>
          ) : (
            <p className="pov-mission-strip__value pov-mission-strip__value--open">
              {PROVIDER_OVERVIEW_BRIEFING_LABEL.focusOpen}
            </p>
          )}
        </article>

        <article
          className="pov-mission-strip__item pov-mission-strip__item--next"
          data-testid="pov-mission-next"
        >
          <p className="pov-mission-strip__label">{PROVIDER_OVERVIEW_BRIEFING_LABEL.nextFieldMove}</p>
          {nextMoveLine ? (
            <p className="pov-mission-strip__value" data-testid="pov-next-move">
              {nextMoveLine.replace(/^next field move:\s*/i, "")}
            </p>
          ) : (
            <p className="pov-mission-strip__value pov-mission-strip__value--muted">—</p>
          )}
        </article>

        <article className="pov-mission-strip__item pov-mission-strip__item--engagement">
          <p className="pov-mission-strip__label">
            {upcoming?.state === "debrief_needed"
              ? PROVIDER_OVERVIEW_BRIEFING_LABEL.debriefNeeded
              : PROVIDER_OVERVIEW_BRIEFING_LABEL.upcomingEngagement}
          </p>
          {upcoming ? (
            <>
              <p className="pov-mission-strip__value">{upcoming.title}</p>
              <p className="pov-mission-strip__meta">{upcoming.whenLabel}</p>
            </>
          ) : (
            <p className="pov-mission-strip__value pov-mission-strip__value--muted">
              {PROVIDER_OVERVIEW_BRIEFING_LABEL.noneScheduled}
            </p>
          )}
        </article>

        <article className="pov-mission-strip__item pov-mission-strip__item--posture">
          <p className="pov-mission-strip__label">{PROVIDER_OVERVIEW_BRIEFING_LABEL.visibility}</p>
          <p className="pov-mission-strip__value">{visibility}</p>
        </article>
      </div>

      {nextMoveLine ? (
        <div className="pov-mission-strip__mobile-next" aria-hidden="true">
          <span className="pov-mission-strip__mobile-kicker">Next</span>
          <span className="pov-mission-strip__mobile-text" data-testid="pov-next-move-mobile">
            {nextMoveLine.replace(/^next field move:\s*/i, "")}
          </span>
        </div>
      ) : null}

      {upcoming && providerOverviewTouchActionHref(upcoming) ? (
        <Link
          href={providerOverviewTouchActionHref(upcoming)!}
          className="pov-mission-strip__mobile-cta"
        >
          {upcoming.ctaLabel}
        </Link>
      ) : null}
    </section>
  );
}
