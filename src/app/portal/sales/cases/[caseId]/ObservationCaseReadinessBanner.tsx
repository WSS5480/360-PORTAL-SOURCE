"use client";

import React from "react";
import {
  buildObservationCaseReadinessBanner,
  type ObservationReadinessCheck,
} from "@/lib/surgical-sales/buildObservationCaseReadinessBanner";
import { observationCaseReadinessBannerCss } from "./observationCaseReadinessBannerCss";

function checkIcon(check: ObservationReadinessCheck): string {
  if (check.state === "complete") return "✓";
  if (check.state === "blocked") return "!";
  return "○";
}

export function ObservationCaseReadinessBanner({
  caseRow,
  providerContact,
}: {
  caseRow: Record<string, unknown>;
  providerContact?: Record<string, unknown> | null;
}) {
  const view = React.useMemo(
    () => buildObservationCaseReadinessBanner({ caseRow, providerContact }),
    [caseRow, providerContact],
  );

  const missionChips = view.readyToObserve
    ? view.checks.filter((check) => check.required && check.state === "complete")
    : view.pendingChecks;

  return (
    <section
      className={`case-obs-readiness-banner case-obs-readiness-banner--${view.tone === "ready" ? "ready" : "not-ready"}`}
      aria-label="Field mission readiness"
    >
      <style dangerouslySetInnerHTML={{ __html: observationCaseReadinessBannerCss }} />

      <div className="case-obs-readiness-banner-head">
        <div className="case-obs-readiness-banner-head-main">
          <p className="case-obs-readiness-banner-kicker">Field mission</p>
          <h2 className="case-obs-readiness-banner-title">{view.headline}</h2>
        </div>
        <span className="case-obs-readiness-banner-status">{view.statusLabel}</span>
      </div>

      {!view.readyToObserve && view.pendingChecks.length > 0 ? (
        <p className="case-obs-readiness-banner-pending">
          {view.pendingChecks.length === 1 ? "1 prep item" : `${view.pendingChecks.length} prep items`} still open —
          optional sections below when you have details.
        </p>
      ) : view.readyToObserve ? (
        <p className="case-obs-readiness-banner-pending">
          Case is scheduled — expand access or goals below anytime before case day.
        </p>
      ) : null}

      <ul className="case-obs-readiness-banner-checks" aria-label="Field mission readiness">
        {missionChips.map((check) => (
          <li
            key={check.id}
            className={`case-obs-readiness-banner-check case-obs-readiness-banner-check--${check.state}`}
          >
            <span className="case-obs-readiness-banner-check-icon" aria-hidden>
              {checkIcon(check)}
            </span>
            {check.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
