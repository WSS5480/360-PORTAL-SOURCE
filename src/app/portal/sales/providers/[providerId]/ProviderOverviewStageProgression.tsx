"use client";

import type { ProviderOverviewStageProgression } from "@/lib/surgical-sales/buildProviderOverviewStageProgression";

export function ProviderOverviewStageProgressionBlock({
  progression,
  onOpenIntelligence,
}: {
  progression: ProviderOverviewStageProgression;
  onOpenIntelligence: (sectionId?: string) => void;
}) {
  const metCount = progression.items.filter((item) => item.met).length;
  const totalCount = progression.items.length;
  const progressSummary =
    metCount > 0 && totalCount > 0 ? `${metCount} of ${totalCount} confirmed` : null;

  return (
    <div className="provider-ops-stage-progression" aria-label={progression.heading}>
      <div className="provider-ops-stage-progression-head">
        <p className="provider-ops-stage-progression-heading">{progression.heading}</p>
        {progressSummary ? (
          <span className="provider-ops-stage-progression-pct">{progressSummary}</span>
        ) : null}
      </div>
      <ul className="provider-ops-stage-progression-list">
        {progression.items.map((item) => {
          const content = (
            <>
              <span className="provider-ops-stage-progression-marker" aria-hidden>
                {item.met ? "✓" : "○"}
              </span>
              <span className="provider-ops-stage-progression-label">{item.scanLabel}</span>
            </>
          );

          if (!item.met && item.sectionId) {
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className="provider-ops-stage-progression-item provider-ops-stage-progression-item--action"
                  onClick={() => onOpenIntelligence(item.sectionId)}
                >
                  {content}
                </button>
              </li>
            );
          }

          return (
            <li
              key={item.id}
              className={`provider-ops-stage-progression-item${item.met ? " provider-ops-stage-progression-item--met" : ""}`}
            >
              {content}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
