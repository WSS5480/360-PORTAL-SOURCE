"use client";



import React from "react";

import { buildProviderAccountUnderstandingView } from "@/lib/surgical-sales/buildProviderAccountUnderstandingView";

import { PROVIDER_ACCOUNT_UNDERSTANDING } from "@/lib/surgical-sales/providerAccountUnderstanding";

import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";

import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";

import { AccountUnderstandingConfirmCard } from "./AccountUnderstandingConfirmCard";
import { ProviderMissionReadinessStrip } from "./ProviderMissionReadinessStrip";



export function ProviderAccountUnderstandingWorkspace({

  contact,

  planning,

  relationshipStage,

  engagements,

  opportunities,

  cases,

  fieldMetadata,

  onAddNote,

  onViewDetails,

  sectionPulse = {},

  deployment,

  readinessChangelog = [],

}: {

  contact: Record<string, unknown>;

  planning?: ProviderPlanningCompletion | null;

  relationshipStage?: string | null;

  engagements?: ProviderEngagementSummary[];

  opportunities?: Array<Record<string, unknown>>;

  cases?: Array<Record<string, unknown>>;

  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;

  onAddNote: (sectionId: ProviderIntelligenceSectionId, dbKey?: string) => void;

  onViewDetails: (sectionId: ProviderIntelligenceSectionId) => void;

  sectionPulse?: Partial<Record<ProviderIntelligenceSectionId, number>>;

  deployment: import("@/lib/surgical-sales/commercialDeploymentReadiness").CommercialDeploymentReadinessSnapshot;

  readinessChangelog?: string[];

}) {

  const view = React.useMemo(

    () =>

      buildProviderAccountUnderstandingView({

        contact,

        planning,

        relationshipStage,

        engagements,

        opportunities,

        cases,

        fieldMetadata,

      }),

    [contact, planning, relationshipStage, engagements, opportunities, cases, fieldMetadata],

  );



  if (!view) {

    return <p className="pau-empty">{PROVIDER_ACCOUNT_UNDERSTANDING.emptyReload}</p>;

  }



  return (

    <div className="pau" aria-label={PROVIDER_ACCOUNT_UNDERSTANDING.pageAria}>

      <p className="pau-lead">{view.lead}</p>



      <section className="pau-synthesis" aria-labelledby="pau-synthesis-heading">

        <h2 id="pau-synthesis-heading" className="pau-synthesis-title">

          {PROVIDER_ACCOUNT_UNDERSTANDING.synthesisTitle}

        </h2>

        <dl className="pau-synthesis-grid">

          {view.workspaceSynthesis.map((row) => (

            <div key={row.id} className={`pau-synthesis-row pau-synthesis-row--${row.id}`}>

              <dt>{row.label}</dt>

              <dd>{row.line}</dd>

            </div>

          ))}

        </dl>

      </section>



      <ProviderMissionReadinessStrip
        deployment={deployment}
        readinessChangelog={readinessChangelog}
      />

      <section className="pau-band" aria-label={PROVIDER_ACCOUNT_UNDERSTANDING.intelligenceByArea}>

        <h2 className="pau-band-heading">{PROVIDER_ACCOUNT_UNDERSTANDING.intelligenceByArea}</h2>

        <div className="pau-intel-stack">

          {view.confirmCards.map((card) => (

            <AccountUnderstandingConfirmCard
              key={card.id}
              card={card}
              contact={contact}
              onAddNote={onAddNote}
              onViewDetails={onViewDetails}
              pulseKey={sectionPulse[card.sectionId]}
            />

          ))}

        </div>

      </section>

    </div>

  );

}


