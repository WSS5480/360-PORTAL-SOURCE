"use client";

import Link from "next/link";
import { buildProviderObservationCaseWorkflowHref } from "@/lib/surgical-sales/providerDirectoryLinks";
import type { ProviderObservationCasePreview } from "@/lib/surgical-sales/providerObservationCaseCollection";
import type { MissionBoardCardSecondaryAction } from "@/lib/surgical-sales/deriveMissionBoardCardActions";

export function MissionBoardObservationCaseActions({
  observationCase,
  actions,
  busy,
  layout = "wrap",
  onMarkComplete,
  onDictateComplete,
  onReschedule,
}: {
  observationCase: ProviderObservationCasePreview;
  actions: MissionBoardCardSecondaryAction[];
  busy?: boolean;
  layout?: "wrap" | "stack";
  onMarkComplete: (caseId: string) => void;
  onDictateComplete: (caseId: string, observationCase: ProviderObservationCasePreview) => void;
  onReschedule: (caseId: string, observationCase: ProviderObservationCasePreview) => void;
}) {
  return (
    <div
      className={`provider-mission-board-case-actions provider-mission-board-case-actions--${layout}`}
      role="group"
      aria-label={`Actions for ${observationCase.procedureLabel || "observation case"}`}
    >
      {actions.map((action) => {
        if (action.kind === "link" && action.href) {
          return (
            <Link
              key={`${observationCase.caseId}-${action.id}`}
              href={action.href}
              className={`provider-mission-board-case-action provider-mission-board-case-action--${action.id}`}
              title={action.title}
              data-testid={`mission-board-case-action-${action.id}`}
            >
              {action.label}
            </Link>
          );
        }

        return (
          <button
            key={`${observationCase.caseId}-${action.id}`}
            type="button"
            className={`provider-mission-board-case-action provider-mission-board-case-action--${action.id}`}
            title={action.title}
            aria-label={action.title}
            data-testid={`mission-board-case-action-${action.id}`}
            disabled={busy}
            onClick={() => {
              if (!action.caseId) return;
              if (action.id === "mark_complete") {
                onMarkComplete(action.caseId);
                return;
              }
              if (action.id === "dictate_complete") {
                onDictateComplete(action.caseId, observationCase);
                return;
              }
              if (action.id === "reschedule") {
                onReschedule(action.caseId, observationCase);
              }
            }}
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
}

export function missionBoardObservationCaseOpenHref(caseId: string): string {
  return buildProviderObservationCaseWorkflowHref(caseId);
}
