"use client";

import type { JSX } from "react";
import type { DiscoveryIntelligenceGroupId } from "@/lib/surgical-sales/discoveryIntelligenceProgress";

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 20 20",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  "aria-hidden": true as const,
};

function AccessReadinessIcon() {
  return (
    <svg {...iconProps} className="dig-domain-icon-svg">
      <path
        d="M10 3.5 16 7v6l-6 3.5L4 13V7l6-3.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M10 10.5v3.5M10 10.5 4 7M10 10.5l6-3.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function ClinicalFitIcon() {
  return (
    <svg {...iconProps} className="dig-domain-icon-svg">
      <path
        d="M4 10c2-3.5 4-5 6-5s4 1.5 6 5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d="M6 14h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="10" cy="10" r="1.75" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function ChampionLandscapeIcon() {
  return (
    <svg {...iconProps} className="dig-domain-icon-svg">
      <circle cx="7" cy="8" r="2.25" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="13.5" cy="8" r="2.25" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M3.5 16c.8-2.2 2.2-3.25 3.5-3.25S9.7 13.8 10.5 16M10.5 16c.8-2.2 2.2-3.25 3.5-3.25S16.7 13.8 17.5 16"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function OpportunityIntelligenceIcon() {
  return (
    <svg {...iconProps} className="dig-domain-icon-svg">
      <path
        d="M10 3.5 15.5 6.25V11.75L10 14.5 4.5 11.75V6.25L10 3.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M10 7.5v5M8 10h4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

const ICONS: Record<DiscoveryIntelligenceGroupId, () => JSX.Element> = {
  opportunity_intelligence: OpportunityIntelligenceIcon,
  access_readiness: AccessReadinessIcon,
  clinical_fit: ClinicalFitIcon,
  champion_landscape: ChampionLandscapeIcon,
};

export function DiscoveryDomainIcon({ groupId }: { groupId: DiscoveryIntelligenceGroupId }) {
  const Icon = ICONS[groupId] ?? AccessReadinessIcon;
  return (
    <span className="dig-domain-icon" aria-hidden>
      <Icon />
    </span>
  );
}
