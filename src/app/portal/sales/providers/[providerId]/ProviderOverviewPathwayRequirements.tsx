"use client";

import React from "react";
import type { ProviderOverviewRequirementItem } from "@/lib/surgical-sales/buildProviderOverviewPathwayRequirements";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { PROVIDER_FIELD_OPS_SECTION } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";
import { LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";

export function ProviderOverviewPathwayRequirements({
  requirements,
  onCaptureField,
  onOpenIntelligence,
  onLogFieldIntel,
  followUpHref,
}: {
  requirements: ProviderOverviewRequirementItem[];
  onCaptureField: (sectionId: ProviderIntelligenceSectionId, dbKey: string) => void;
  onOpenIntelligence: (sectionId: ProviderIntelligenceSectionId, dbKey?: string) => void;
  onLogFieldIntel: () => void;
  followUpHref: string;
}) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  if (requirements.length === 0) return null;

  return (
    <div className="pov-pathway-requirements">
      <h3 className="pov-pathway-requirements-title">
        {PROVIDER_FIELD_OPS_SECTION.requirementToAdvance}
      </h3>
      <ul className="pov-pathway-requirements-list">
        {requirements.map((req) => {
          const expanded = expandedId === req.id;
          const canCapture = Boolean(req.dbKey && req.sectionId);
          const panelId = `pov-req-panel-${req.id}`;

          return (
            <li
              key={req.id}
              className={`pov-pathway-req pov-pathway-req--${req.status}${expanded ? " pov-pathway-req--expanded" : ""}`}
            >
              <button
                type="button"
                className="pov-pathway-req-trigger"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setExpandedId((id) => (id === req.id ? null : req.id))}
              >
                <span className={`pov-pathway-req-status pov-pathway-req-status--${req.status}`}>
                  {req.statusLabel}
                </span>
                <span className="pov-pathway-req-body">
                  <span className="pov-pathway-req-label">{req.label}</span>
                  {req.contextLine ? (
                    <span className="pov-pathway-req-context">{req.contextLine}</span>
                  ) : null}
                </span>
                <span className="pov-pathway-req-chevron" aria-hidden>
                  {expanded ? "−" : "+"}
                </span>
              </button>

              {expanded ? (
                <div id={panelId} className="pov-pathway-req-panel">
                  <p className="pov-pathway-req-why">{req.whyItMatters}</p>
                  {req.knownEvidence ? (
                    <p className="pov-pathway-req-evidence">{req.knownEvidence}</p>
                  ) : null}
                  {req.stillNeeded && req.status !== "validated" ? (
                    <p className="pov-pathway-req-gap">{req.stillNeeded}</p>
                  ) : null}
                  {(req.lastUpdated || req.sourceEngagement) && (
                    <div className="pov-pathway-req-meta">
                      {req.lastUpdated ? <span>{req.lastUpdated}</span> : null}
                      {req.sourceEngagement ? <span>{req.sourceEngagement}</span> : null}
                    </div>
                  )}
                  <div className="pov-pathway-req-actions">
                    {canCapture && req.status !== "validated" ? (
                      <button
                        type="button"
                        className="pov-pathway-req-action pov-pathway-req-action--primary"
                        onClick={() => onCaptureField(req.sectionId!, req.dbKey!)}
                      >
                        Mark validated
                      </button>
                    ) : null}
                    {req.sectionId ? (
                      <button
                        type="button"
                        className="pov-pathway-req-action"
                        onClick={() => onOpenIntelligence(req.sectionId!, req.dbKey)}
                      >
                        Link intel
                      </button>
                    ) : null}
                    {LOG_UPDATE_UI_ENABLED ? (
                      <button type="button" className="pov-pathway-req-action" onClick={onLogFieldIntel}>
                        Log intel
                      </button>
                    ) : null}
                    {req.status === "needs_follow_up" || req.status === "validated" ? (
                      <a href={followUpHref} className="pov-pathway-req-action pov-pathway-req-action--link">
                        Create follow-up
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
