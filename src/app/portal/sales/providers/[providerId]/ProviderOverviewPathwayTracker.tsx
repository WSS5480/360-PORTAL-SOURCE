"use client";

import React from "react";
import { providerOverviewPathwayDisplayLabel } from "@/lib/surgical-sales/providerOverviewPathwayDisplayLabels";
import type { ProviderOverviewPathwayTimelineModel } from "@/lib/surgical-sales/buildProviderOverviewBody";
import { SALES_PATHWAY_STAGE_IDS, type SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";
import type { PathwayGateInput } from "@/lib/surgical-sales/pathwayStageGates";
import {
  pathwayStageStepIsActionable,
  resolvePathwayStageClick,
  type PathwayTimelineStepStatus,
} from "@/lib/surgical-sales/pathwayStageTimelineActions";

type StepStatus = PathwayTimelineStepStatus;

function resolveStepStatuses(
  timeline: ProviderOverviewPathwayTimelineModel,
): Array<{ id: (typeof SALES_PATHWAY_STAGE_IDS)[number]; status: StepStatus }> {
  const phaseById = new Map(timeline.phases.map((p) => [p.id, p]));
  return SALES_PATHWAY_STAGE_IDS.map((id) => {
    const status = (phaseById.get(id)?.status ?? "upcoming") as StepStatus;
    return { id, status };
  });
}

function connectorStatus(
  steps: Array<{ status: StepStatus }>,
  index: number,
): StepStatus {
  const left = steps[index]?.status;
  const right = steps[index + 1]?.status;
  if (left === "complete" && (right === "complete" || right === "current")) {
    return "complete";
  }
  if (left === "complete" || left === "current") {
    return "current";
  }
  return "upcoming";
}

export function ProviderOverviewPathwayTracker({
  timeline,
  activeStageId,
  gateInput,
  onOpenObservationApproval,
  onOpenDebriefStatus,
  onShowUnlockHint,
}: {
  timeline: ProviderOverviewPathwayTimelineModel;
  activeStageId?: SalesPathwayStageId;
  gateInput?: PathwayGateInput;
  onOpenObservationApproval?: (options?: { preferScheduleObservation?: boolean }) => void;
  onOpenDebriefStatus?: () => void;
  onShowUnlockHint?: (hint: { title: string; message: string }) => void;
}) {
  const steps = resolveStepStatuses(timeline);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const interactive = Boolean(
    activeStageId &&
      gateInput &&
      onOpenObservationApproval &&
      onOpenDebriefStatus &&
      onShowUnlockHint,
  );

  React.useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const currentStep = scrollEl.querySelector<HTMLElement>('[aria-current="step"]');
    currentStep?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [steps]);

  const handleStageClick = (clickedStageId: SalesPathwayStageId, clickedStepStatus: StepStatus) => {
    if (
      !interactive ||
      !activeStageId ||
      !gateInput ||
      !onOpenObservationApproval ||
      !onOpenDebriefStatus ||
      !onShowUnlockHint
    ) {
      return;
    }
    const action = resolvePathwayStageClick({
      activeStageId,
      clickedStageId,
      clickedStepStatus,
      gateInput,
    });

    switch (action.type) {
      case "open_observation_approval":
        onOpenObservationApproval({ preferScheduleObservation: action.preferScheduleObservation });
        return;
      case "open_debrief_status":
        onOpenDebriefStatus();
        return;
      case "show_unlock_hint":
        onShowUnlockHint({ title: action.title, message: action.message });
        return;
      default:
        return;
    }
  };

  return (
    <nav
      className="pov-pathway-track pov-pathway-track--workflow"
      aria-label="360 Medical Sales Pathway"
      data-testid="pov-pathway-track"
    >
      <div
        ref={scrollRef}
        className="pov-pathway-track__scroll"
        tabIndex={0}
        aria-label="Sales pathway — swipe to see all steps"
      >
        <ol className="pov-pathway-track__list">
          {steps.map(({ id, status }, index) => {
            const isLast = index === steps.length - 1;
            const linkStatus = isLast ? null : connectorStatus(steps, index);
            const actionable =
              interactive &&
              pathwayStageStepIsActionable({
                clickedStepStatus: status,
              });
            const label = providerOverviewPathwayDisplayLabel(id);

            return (
              <li key={id} className="pov-pathway-track__segment" data-segment={id}>
                {actionable ? (
                  <button
                    type="button"
                    className={`pov-pathway-track__step pov-pathway-track__step--${status} pov-pathway-track__step--actionable`}
                    aria-current={status === "current" ? "step" : undefined}
                    aria-label={`${label}. Click for next step.`}
                    onClick={() => handleStageClick(id, status)}
                  >
                    <span className="pov-pathway-track__marker" aria-hidden>
                      {status === "complete" ? (
                        <span className="pov-pathway-track__marker-icon">✓</span>
                      ) : status === "current" ? (
                        <span className="pov-pathway-track__marker-pulse" aria-hidden />
                      ) : (
                        <span className="pov-pathway-track__marker-index">{index + 1}</span>
                      )}
                    </span>
                    <span className="pov-pathway-track__label">{label}</span>
                    {status === "current" ? (
                      <span className="pov-pathway-track__active-tag">Active</span>
                    ) : (
                      <span className="pov-pathway-track__action-tag">Unlock</span>
                    )}
                  </button>
                ) : (
                  <span
                    className={`pov-pathway-track__step pov-pathway-track__step--${status}`}
                    aria-current={status === "current" ? "step" : undefined}
                  >
                    <span className="pov-pathway-track__marker" aria-hidden>
                      {status === "complete" ? (
                        <span className="pov-pathway-track__marker-icon">✓</span>
                      ) : status === "current" ? (
                        <span className="pov-pathway-track__marker-pulse" aria-hidden />
                      ) : (
                        <span className="pov-pathway-track__marker-index">{index + 1}</span>
                      )}
                    </span>
                    <span className="pov-pathway-track__label">{label}</span>
                    {status === "current" ? (
                      <span className="pov-pathway-track__active-tag">Active</span>
                    ) : null}
                  </span>
                )}
                {!isLast && linkStatus ? (
                  <span
                    className={`pov-pathway-track__connector pov-pathway-track__connector--${linkStatus}`}
                    aria-hidden
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
