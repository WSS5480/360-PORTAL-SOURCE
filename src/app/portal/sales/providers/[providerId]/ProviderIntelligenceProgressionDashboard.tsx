"use client";

import React from "react";
import {
  buildProviderIntelligenceProgressionDashboard,
  type ProviderIntelligenceProgressionDashboard as ProgressionDashboardModel,
} from "@/lib/surgical-sales/buildProviderIntelligenceProgressionDashboard";
import type { IntelligenceProgressionLane } from "@/lib/surgical-sales/buildProviderIntelligenceProgressionLanes";
import type { OperationalProgressionPhase } from "@/lib/surgical-sales/buildProviderOperationalProgressionTimeline";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

function deploymentConnectorClass(
  phase: OperationalProgressionPhase,
  next?: OperationalProgressionPhase,
): string {
  if (!next) return "";
  if (phase.status === "complete" && next.status !== "upcoming") {
    return "provider-intel-progression-connector--complete";
  }
  if (next.status === "blocked") return "provider-intel-progression-connector--blocked";
  return "provider-intel-progression-connector--muted";
}

function deploymentNodeClass(phase: OperationalProgressionPhase): string {
  return `provider-intel-progression-node provider-intel-progression-node--${phase.status}`;
}

function ProgressionLaneRow({ lane }: { lane: IntelligenceProgressionLane }) {
  const metCount = lane.steps.filter((step) => step.status === "complete").length;
  const progressSummary =
    metCount > 0 ? `${metCount} of ${lane.steps.length} confirmed` : lane.currentLabel;

  return (
    <article className={`provider-intel-progression-lane provider-intel-progression-lane--${lane.id}`}>
      <header className="provider-intel-progression-lane-head">
        <span className="provider-intel-progression-lane-label">{lane.label}</span>
        <span className="provider-intel-progression-lane-state">{progressSummary}</span>
      </header>
      <ol className="provider-intel-progression-lane-steps provider-intel-progression-lane-steps--list" aria-label={`${lane.label} evidence`}>
        {lane.steps.map((step) => (
          <li
            key={step.id}
            className={`provider-intel-progression-lane-step provider-intel-progression-lane-step--${step.status}`}
          >
            <span className="provider-intel-progression-lane-step-marker" aria-hidden>
              {step.status === "complete" ? "✓" : "○"}
            </span>
            <span>{step.label}</span>
          </li>
        ))}
      </ol>
      <p className="provider-intel-progression-lane-scan">{lane.evolutionScan}</p>
    </article>
  );
}

function DeploymentTrack({ dashboard }: { dashboard: ProgressionDashboardModel }) {
  const { deployment: timeline } = dashboard;

  return (
    <div className="provider-intel-progression-deploy">
      <header className="provider-intel-progression-head">
        <div>
          <p className="provider-intel-progression-kicker">{timeline.kicker}</p>
          <h2 className="provider-intel-progression-title">{timeline.title}</h2>
        </div>
        <div className="provider-intel-progression-momentum" aria-label="Gate progress">
          <span className="provider-intel-progression-momentum-label">{timeline.momentumLabel}</span>
        </div>
      </header>

      <div className="provider-intel-progression-track-wrap provider-intel-progression-track-wrap--deploy">
        <ol className="provider-intel-progression-track">
          {timeline.phases.map((phase, index) => {
            const next = timeline.phases[index + 1];
            return (
              <li key={phase.id} className="provider-intel-progression-step">
                {index > 0 ? (
                  <span
                    className={`provider-intel-progression-connector ${deploymentConnectorClass(timeline.phases[index - 1]!, phase)}`}
                    aria-hidden
                  />
                ) : null}
                <div className={deploymentNodeClass(phase)}>
                  <span className="provider-intel-progression-node-dot" aria-hidden />
                  <span className="provider-intel-progression-node-label">{phase.label}</span>
                  {phase.status === "current" ? (
                    <span className="provider-intel-progression-node-badge">Now</span>
                  ) : null}
                  {phase.status === "blocked" && phase.blockReason ? (
                    <span className="provider-intel-progression-node-block">{phase.blockReason}</span>
                  ) : null}
                </div>
                {next ? (
                  <span
                    className={`provider-intel-progression-connector ${deploymentConnectorClass(phase, next)}`}
                    aria-hidden
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>

      <footer className="provider-intel-progression-foot">
        <div className="provider-intel-progression-foot-current">
          <span className="provider-intel-progression-foot-kicker">Deploying from</span>
          <strong>{timeline.currentPhaseLabel}</strong>
        </div>
        {timeline.nextPhaseLabel ? (
          <div className="provider-intel-progression-foot-unlock">
            <span className="provider-intel-progression-foot-kicker">{timeline.nextUnlockLabel}</span>
            <strong>{timeline.nextUnlockScan}</strong>
          </div>
        ) : (
          <p className="provider-intel-progression-foot-clear">Commercialization-ready on file.</p>
        )}
      </footer>
    </div>
  );
}

export function ProviderIntelligenceProgressionDashboard({
  contact,
  planning,
  relationshipStage,
  engagements,
  opportunities,
  cases,
  variant = "full",
}: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  variant?: "full" | "compact";
}) {
  const dashboard = React.useMemo(
    () =>
      buildProviderIntelligenceProgressionDashboard({
        contact,
        planning,
        relationshipStage,
        engagements,
        opportunities,
        cases,
      }),
    [contact, planning, relationshipStage, engagements, opportunities, cases],
  );

  if (variant === "compact") {
    return (
      <div
        className="provider-intel-progression-compact"
        role="status"
        aria-label={dashboard.title}
      >
        <p className="provider-intel-progression-compact-kicker">{dashboard.kicker}</p>
        <p className="provider-intel-progression-compact-headline">{dashboard.movementHeadline}</p>
        <div className="provider-intel-progression-compact-lanes" aria-hidden>
          {dashboard.lanes.map((lane) => (
            <span
              key={lane.id}
              className={`provider-intel-progression-compact-chip provider-intel-progression-compact-chip--${lane.id}`}
              title={lane.evolutionScan}
            >
              {lane.label}: {lane.currentLabel}
            </span>
          ))}
        </div>
      </div>
    );
  }

  const secondaryLanes = dashboard.lanes.filter((l) => l.id !== "deployment_progression");

  return (
    <section className="provider-intel-progression-dashboard" aria-label={dashboard.title}>
      <header className="provider-intel-progression-dashboard-hero">
        <div>
          <p className="provider-intel-progression-dashboard-kicker">{dashboard.kicker}</p>
          <h2 className="provider-intel-progression-dashboard-title">{dashboard.title}</h2>
        </div>
        <p className="provider-intel-progression-dashboard-movement">{dashboard.movementHeadline}</p>
        <p className="provider-intel-progression-dashboard-evolution">{dashboard.evolutionBrief}</p>
      </header>

      <DeploymentTrack dashboard={dashboard} />

      <div className="provider-intel-progression-lanes" aria-label="Progression by dimension">
        <p className="provider-intel-progression-lanes-kicker">How intelligence is evolving</p>
        <div className="provider-intel-progression-lanes-grid">
          {secondaryLanes.map((lane) => (
            <ProgressionLaneRow key={lane.id} lane={lane} />
          ))}
        </div>
      </div>
    </section>
  );
}
