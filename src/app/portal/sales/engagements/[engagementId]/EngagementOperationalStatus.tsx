"use client";



import type { EngagementWorkspaceGuidance } from "@/lib/surgical-sales/engagements/engagementWorkspaceUx";

import { OPERATIONAL_STATUS_LABEL } from "@/lib/surgical-sales/engagements/prepareFlowTerminology";



export function EngagementOperationalStatus({

  activeGuidance,

}: {

  activeGuidance: EngagementWorkspaceGuidance;

}) {

  const { banner } = activeGuidance;



  return (

    <div

      className={`edm-op-banner edm-op-banner--${banner.tone}`}

      role="status"

      aria-label={OPERATIONAL_STATUS_LABEL}

    >

      <span className="edm-op-banner-kicker">{OPERATIONAL_STATUS_LABEL}</span>

      <p className="edm-op-banner-title" aria-live="polite">

        {activeGuidance.statusLabel}

      </p>

      <p className="edm-op-banner-subtitle">{activeGuidance.statusHint}</p>

    </div>

  );

}

