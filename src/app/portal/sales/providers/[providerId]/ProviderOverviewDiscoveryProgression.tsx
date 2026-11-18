"use client";



import React from "react";

import type { ProviderOverviewDiscoveryProgressionModel } from "@/lib/surgical-sales/buildProviderDiscoveryStageProgression";

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";

import { PROVIDER_FIELD_OPS_SECTION } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";



export function ProviderOverviewDiscoveryProgression({

  model,

  onCaptureField,

  onOpenIntelligence,

}: {

  model: ProviderOverviewDiscoveryProgressionModel;

  onCaptureField: (sectionId: ProviderIntelligenceSectionId, dbKey: string) => void;

  onOpenIntelligence: (sectionId: ProviderIntelligenceSectionId, dbKey?: string) => void;

}) {

  const [expandedSignalId, setExpandedSignalId] = React.useState<string | null>(null);



  return (

    <div className="pov-discovery-progression">

      {model.intelligenceGroups
        .filter((group) => group.id !== "open_questions")
        .map((group) => (

        <section

          key={group.id}

          className="pov-discovery-block"

          aria-label={group.title}

          data-discovery-group={group.id}

        >

          <h3 className="pov-discovery-block-title">{group.title}</h3>

          <p className="pov-discovery-block-purpose">{group.purpose}</p>

          {group.signals.length === 0 ? (

            <p className="pov-discovery-block-empty">Nothing flagged in this area yet.</p>

          ) : (

            <ul className="pov-discovery-readiness-list">

              {group.signals.map((item) => {

                const expanded = expandedSignalId === item.id;

                const interactive = Boolean(item.dbKey && item.sectionId);

                return (

                  <li

                    key={item.id}

                    className={`pov-discovery-readiness pov-discovery-readiness--${item.status}${

                      expanded ? " pov-discovery-readiness--expanded" : ""

                    }`}

                  >

                    <button

                      type="button"

                      className="pov-discovery-readiness-trigger"

                      disabled={!interactive}

                      aria-expanded={interactive ? expanded : undefined}

                      onClick={() => {

                        if (!interactive) return;

                        setExpandedSignalId((id) => (id === item.id ? null : item.id));

                      }}

                    >

                      <span className="pov-discovery-readiness-marker" aria-hidden>

                        {item.marker}

                      </span>

                      <span className="pov-discovery-readiness-label">{item.label}</span>

                    </button>

                    {expanded && item.contextLine ? (

                      <div className="pov-discovery-readiness-panel">

                        <p>{item.contextLine}</p>

                        <div className="pov-discovery-readiness-actions">

                          <button

                            type="button"

                            className="pov-discovery-readiness-action"

                            onClick={() => onCaptureField(item.sectionId!, item.dbKey!)}

                          >

                            Capture

                          </button>

                          <button

                            type="button"

                            className="pov-discovery-readiness-action"

                            onClick={() => onOpenIntelligence(item.sectionId!, item.dbKey)}

                          >

                            View intel

                          </button>

                        </div>

                      </div>

                    ) : null}

                  </li>

                );

              })}

            </ul>

          )}

        </section>

      ))}



      {model.tacticalGap ? (

        <section className="pov-discovery-block pov-discovery-block--gap" aria-label={PROVIDER_FIELD_OPS_SECTION.tacticalGap}>

          <h3 className="pov-discovery-block-title">{PROVIDER_FIELD_OPS_SECTION.tacticalGap}</h3>

          <button

            type="button"

            className="pov-discovery-gap-line"

            onClick={() => {

              if (model.tacticalGapSectionId && model.tacticalGapDbKey) {

                onCaptureField(model.tacticalGapSectionId, model.tacticalGapDbKey);

              } else if (model.tacticalGapSectionId) {

                onOpenIntelligence(model.tacticalGapSectionId);

              }

            }}

          >

            {model.tacticalGap}

          </button>

        </section>

      ) : null}



      {model.nextRecommendedAction ? (

        <section

          className="pov-discovery-block pov-discovery-block--next"

          aria-label={PROVIDER_FIELD_OPS_SECTION.nextRecommendedAction}

        >

          <h3 className="pov-discovery-block-title">{PROVIDER_FIELD_OPS_SECTION.nextRecommendedAction}</h3>

          <p className="pov-discovery-next-line">{model.nextRecommendedAction}</p>

        </section>

      ) : null}

    </div>

  );

}


