/**

 * Rep-facing vocabulary for the Provider Intelligence tab.

 * Operational, commercialization-focused language — not CRM administration.

 */



import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { PROVIDER_FIELD_OPS_TAB_LABELS } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";

import {

  OPERATIONAL_INTEL_AREA_DEPTH,

  OPERATIONAL_INTEL_AREA_STATUS,

  OPERATIONAL_INTEL_FIELD_STATE,

  OPERATIONAL_INTEL_INVESTIGATION,

  OPERATIONAL_INTEL_TRACK,

} from "@/lib/surgical-sales/providerIntelligenceOperationalCopy";



/** Tab, page, and navigation */

export const PROVIDER_INTEL_REP = {

  tabLabel: PROVIDER_FIELD_OPS_TAB_LABELS.intelligence,

  pageAria: "Operational intelligence",

  pageBriefAria: "Deployment intelligence brief",

  expandFullBrief: "Open deployment brief",

  accountNotesFields: "Field detail & mapping",

  hideAccountNotesFields: "Hide field detail",

} as const;



/** Briefing hero */

export const PROVIDER_INTEL_BRIEF = {

  fieldReadiness: OPERATIONAL_INTEL_INVESTIGATION.fieldReadiness,

  nextBestStep: "Next field move",

} as const;



/** Main sections on the investigation workspace */

export const PROVIDER_INTEL_SECTIONS = {

  likelyRisks: OPERATIONAL_INTEL_INVESTIGATION.likelyRisks,

  nextBestDiscoveries: OPERATIONAL_INTEL_INVESTIGATION.nextDiscoveries,

  whatWeKnow: OPERATIONAL_INTEL_INVESTIGATION.whatWeKnow,

  whatWeStillNeed: OPERATIONAL_INTEL_INVESTIGATION.whatWeStillNeed,

} as const;



/** Discovery guidance card field labels */

export const PROVIDER_INTEL_DISCOVERY_CARD = {

  why: "Why it matters",

  bestPersonToAsk: "Best person to ask",

  /** @deprecated Use whyThisMatters */

  whatYoullLearn: "Why it matters",

  whyThisMatters: "Why it matters",

} as const;



/** Risk / caution card field labels */

export const PROVIDER_INTEL_RISK_CARD = {

  why: "Why it matters",

  reduceRisk: "Reduce deployment risk",

} as const;



/** Collapsed area cards — short section names */

export const PROVIDER_INTEL_AREA_LABELS: Record<ProviderIntelligenceSectionId, string> = {

  clinical_workflow: "Clinical",

  or_environment: "OR & site",

  relationship_intelligence: "Relationship",

  commercial_signals: "Commercial",

  observation_readiness: "Observation",

};



/** How complete an area feels */

export const PROVIDER_INTEL_AREA_DEPTH = { ...OPERATIONAL_INTEL_AREA_DEPTH };



/** Area workflow status */

export const PROVIDER_INTEL_AREA_STATUS = { ...OPERATIONAL_INTEL_AREA_STATUS };



/** Overview strip / track labels */

export const PROVIDER_INTEL_TRACK = { ...OPERATIONAL_INTEL_TRACK };



/** Field capture states */

export const PROVIDER_INTEL_FIELD_STATE = { ...OPERATIONAL_INTEL_FIELD_STATE };



/** Legacy export aliases */

export const INTELLIGENCE_COLLECTION_QUEUE_TITLE = PROVIDER_INTEL_SECTIONS.nextBestDiscoveries;

export const INTELLIGENCE_COLLECTION_QUEUE_KICKER = "Prioritized for your next field touch";

export const INTELLIGENCE_UNLOCKS_NEXT_LABEL = PROVIDER_INTEL_DISCOVERY_CARD.whyThisMatters;

export const FIELD_DISCOVERIES_SECTION_TITLE = PROVIDER_INTEL_SECTIONS.nextBestDiscoveries;

export const OPERATIONAL_WARNINGS_SECTION_TITLE = PROVIDER_INTEL_SECTIONS.likelyRisks;

export const INTELLIGENCE_LEARNING_GAPS_TITLE = PROVIDER_INTEL_SECTIONS.whatWeStillNeed;



export const EXECUTION_QUEUE_COLUMN_LABELS = {

  leverage: "Priority",

  unlock: PROVIDER_INTEL_DISCOVERY_CARD.whyThisMatters,

  capture: PROVIDER_INTEL_DISCOVERY_CARD.bestPersonToAsk,

  interaction: "Good moment to ask",

  timing: "When to ask",

  confidence: "Deployment confidence gain",

} as const;


