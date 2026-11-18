"use client";

import {
  engagementMissionCardForType,
  type EngagementMissionCard,
} from "@/lib/surgical-sales/engagements/engagementTypeMissionPicker";
import type { EngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";

export function MissionPreviewPanel({ selectedType }: { selectedType: EngagementType | "" }) {
  const card = engagementMissionCardForType(selectedType);

  return (
    <aside
      className={`create-engagement-mission-preview${card ? " create-engagement-mission-preview--active" : ""}`}
      aria-live="polite"
    >
      {!card ? (
        <p className="create-engagement-mission-preview__empty">
          Select a mission to preview what will be created.
        </p>
      ) : (
        <MissionPreviewContent card={card} />
      )}
    </aside>
  );
}

function MissionPreviewContent({ card }: { card: EngagementMissionCard }) {
  return (
    <div className="create-engagement-mission-preview__body">
      <header className="create-engagement-mission-preview__head">
        <span className="create-engagement-mission-preview__icon" aria-hidden>
          {card.icon}
        </span>
        <div className="create-engagement-mission-preview__intro">
          <h3 className="create-engagement-mission-preview__title">{card.name}</h3>
          <p className="create-engagement-mission-preview__purpose">{card.purpose}</p>
        </div>
      </header>

      <div className="create-engagement-mission-preview__paths">
        <div className="create-engagement-mission-preview__path create-engagement-mission-preview__path--quick">
          <p className="create-engagement-mission-preview__path-label">Quick Add</p>
          <p className="create-engagement-mission-preview__path-note">{card.quickAddNote}</p>
        </div>
        <div className="create-engagement-mission-preview__path create-engagement-mission-preview__path--plan">
          <p className="create-engagement-mission-preview__path-label">Plan First</p>
          <p className="create-engagement-mission-preview__steps" aria-label="Plan First workflow">
            {card.planFirstSteps.map((step, index) => (
              <span key={step} className="create-engagement-mission-preview__step">
                {index > 0 ? (
                  <span className="create-engagement-mission-preview__step-arrow" aria-hidden>
                    →
                  </span>
                ) : null}
                {step}
              </span>
            ))}
          </p>
        </div>
      </div>
    </div>
  );
}
