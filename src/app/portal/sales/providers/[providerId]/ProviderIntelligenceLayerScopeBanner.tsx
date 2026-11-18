"use client";



import React from "react";

import {
  CASE_INTELLIGENCE_LAYER_LABEL,
  ORGANIZATION_INTELLIGENCE_LAYER_LABEL,
  PROVIDER_INTELLIGENCE_EXCLUDES_ENGAGEMENT_STRATEGY,
  PROVIDER_INTELLIGENCE_LAYER_LABEL,
  PROVIDER_INTELLIGENCE_TOPICS,
} from "@/lib/surgical-sales/intelligenceLayerArchitecture";



export function ProviderIntelligenceLayerScopeBanner() {

  const [expanded, setExpanded] = React.useState(false);



  return (

    <aside

      className={`intel-layer-scope intel-layer-scope--provider${expanded ? " intel-layer-scope--open" : ""}`}

      aria-label={PROVIDER_INTELLIGENCE_LAYER_LABEL}

    >

      <div className="intel-layer-scope-compact">

        <span className="intel-layer-scope-kicker">{PROVIDER_INTELLIGENCE_LAYER_LABEL}</span>

        <ul className="intel-layer-scope-topic-chips" aria-label="Intelligence topics">

          {PROVIDER_INTELLIGENCE_TOPICS.map((topic) => (

            <li key={topic.id}>

              <span className="provider-intel-briefing-chip provider-intel-briefing-chip--muted">

                {topic.label}

              </span>

            </li>

          ))}

        </ul>

        <button

          type="button"

          className="provider-intel-ws-summary-expand-btn intel-layer-scope-toggle"

          aria-expanded={expanded}

          onClick={() => setExpanded((v) => !v)}

        >

          {expanded ? "Hide" : "Scope"}

        </button>

      </div>

      {expanded ? (

        <div className="intel-layer-scope-expanded">

          <p className="intel-layer-scope-foot">{PROVIDER_INTELLIGENCE_EXCLUDES_ENGAGEMENT_STRATEGY}</p>

          <p className="intel-layer-scope-foot">
            Facility-wide context (credentialing, OR access rules, scheduling pathways) is{" "}
            <strong>{ORGANIZATION_INTELLIGENCE_LAYER_LABEL}</strong> — shared across surgeons at this site.
            The <strong>OR access &amp; workflow</strong> section here captures that facility context while
            viewing this provider.
          </p>

          <p className="intel-layer-scope-foot">
            Case logistics, live observation notes, and visit prep live in{" "}
            <strong>{CASE_INTELLIGENCE_LAYER_LABEL}</strong> on each scheduled case.
          </p>

        </div>

      ) : null}

    </aside>

  );

}


