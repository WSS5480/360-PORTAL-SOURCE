"use client";

import React from "react";
import {
  buildObservationOpportunityRadar,
  type ObservationOpportunityRadarBlip,
} from "@/lib/surgical-sales/buildObservationOpportunityRadar";
import type { CaseIdentity } from "@/lib/surgical-sales/buildCaseIdentity";
import { OBSERVATION_DETAIL_SECTION_LABELS } from "@/lib/surgical-sales/observationCaseDetailVocabulary";
import { observationBriefingStatusLabel } from "@/lib/surgical-sales/observationBriefingSections";
import { buildObservationMissionBriefing } from "@/lib/surgical-sales/buildObservationMissionBriefing";
import type { ProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { observationCaseOpportunityRadarCss } from "./observationCaseOpportunityRadarCss";

function trendGlyph(trend: ObservationOpportunityRadarBlip["trend"]): string {
  if (trend === "up") return "↑";
  if (trend === "down") return "↓";
  return "→";
}

function RadarBlip({ blip }: { blip: ObservationOpportunityRadarBlip }) {
  return (
    <article
      className={`case-obs-opportunity-radar-blip${blip.validated ? " case-obs-opportunity-radar-blip--validated" : ""}`}
      aria-label={`${blip.title}, confidence ${blip.confidenceLabel}`}
    >
      <div className="case-obs-opportunity-radar-blip-head">
        <h3 className="case-obs-opportunity-radar-blip-title">{blip.title}</h3>
        <span
          className={`case-obs-opportunity-radar-trend case-obs-opportunity-radar-trend--${blip.trend}`}
          aria-label={
            blip.trend === "up"
              ? "Confidence increased after observation"
              : blip.trend === "down"
                ? "Confidence decreased after observation"
                : "Confidence unchanged"
          }
        >
          {trendGlyph(blip.trend)}
        </span>
      </div>

      <div className="case-obs-opportunity-radar-confidence">
        <div className="case-obs-opportunity-radar-confidence-label">
          <span>Confidence</span>
          <span className="case-obs-opportunity-radar-confidence-value">{blip.confidenceLabel}</span>
        </div>
        <div className="case-obs-opportunity-radar-confidence-bar" aria-hidden>
          <span
            className={`case-obs-opportunity-radar-confidence-fill case-obs-opportunity-radar-confidence-fill--${blip.confidence}`}
          />
        </div>
      </div>

      {blip.detail ? <p className="case-obs-opportunity-radar-detail">{blip.detail}</p> : null}
      <p className="case-obs-opportunity-radar-source">{blip.sourceLabel}</p>
    </article>
  );
}

export function ObservationCaseOpportunityRadar({
  caseRow,
  identity,
  engagement,
  providerContact,
  providerIntelligence,
  planning,
  activities,
  canEdit,
  onEdit,
}: {
  caseRow: Record<string, unknown>;
  identity: CaseIdentity;
  engagement?: Record<string, unknown> | null;
  providerContact?: Record<string, unknown> | null;
  providerIntelligence?: ProviderIntelligenceSnapshot | null;
  planning?: ProviderPlanningCompletion | null;
  activities?: Array<{ activity_type?: string }>;
  canEdit?: boolean;
  onEdit?: () => void;
}) {
  const view = React.useMemo(
    () => buildObservationOpportunityRadar({ caseRow, engagement, providerContact, providerIntelligence }),
    [caseRow, engagement, providerContact, providerIntelligence],
  );

  const pillarStatus = React.useMemo(() => {
    const briefing = buildObservationMissionBriefing({
      caseRow,
      identity,
      engagement,
      activities,
      providerContact,
      providerIntelligence,
      planning,
    });
    return briefing.pillars.find((pillar) => pillar.id === "opportunities")?.status ?? "prefilled";
  }, [activities, caseRow, engagement, identity, planning, providerContact, providerIntelligence]);

  if (view.blips.length === 0) return null;

  return (
    <section className="case-obs-opportunity-radar" aria-labelledby="case-obs-opportunity-radar-title">
      <style dangerouslySetInnerHTML={{ __html: observationCaseOpportunityRadarCss }} />

      <div className="case-obs-opportunity-radar-head">
        <div className="case-obs-opportunity-radar-title-wrap">
          <h2 id="case-obs-opportunity-radar-title" className="case-obs-opportunity-radar-kicker">
            {OBSERVATION_DETAIL_SECTION_LABELS.opportunitySignals}
          </h2>
          <p className="case-obs-opportunity-radar-lead">{view.lead}</p>
        </div>
        <div className="case-obs-opportunity-radar-actions">
          <span className={`case-obs-mission-status case-obs-mission-status--${pillarStatus}`}>
            {observationBriefingStatusLabel(pillarStatus)}
          </span>
          {canEdit && onEdit ? (
            <button type="button" className="case-obs-mission-edit-btn" onClick={onEdit}>
              Adjust signals
            </button>
          ) : null}
        </div>
      </div>

      <div className="case-obs-opportunity-radar-grid">
        {view.blips.map((blip) => (
          <RadarBlip key={blip.id} blip={blip} />
        ))}
      </div>
    </section>
  );
}
