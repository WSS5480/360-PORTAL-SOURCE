"use client";

import { CASE_INTELLIGENCE_SCOPE_DESCRIPTION } from "@/lib/surgical-sales/intelligenceLayerArchitecture";

/** Compact scope line for Prepare for Meeting — case-scoped visit prep. */
export const PREPARE_MISSION_SCOPE_TITLE = "Case Intelligence";
export const PREPARE_MISSION_SCOPE_SUBTEXT = CASE_INTELLIGENCE_SCOPE_DESCRIPTION;

export function EngagementIntelligenceLayerScopeBanner() {
  return (
    <details className="pfm-scope-header pfm-scope-header--fold">
      <summary className="pfm-scope-header-summary">{PREPARE_MISSION_SCOPE_TITLE}</summary>
      <p className="pfm-scope-header-sub">{PREPARE_MISSION_SCOPE_SUBTEXT}</p>
    </details>
  );
}
