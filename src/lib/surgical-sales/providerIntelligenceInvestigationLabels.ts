/** @deprecated Import from providerIntelligenceRepVocabulary — re-exports for compatibility */

export {
  EXECUTION_QUEUE_COLUMN_LABELS,
  FIELD_DISCOVERIES_SECTION_TITLE,
  INTELLIGENCE_COLLECTION_QUEUE_KICKER,
  INTELLIGENCE_COLLECTION_QUEUE_TITLE,
  INTELLIGENCE_UNLOCKS_NEXT_LABEL,
  OPERATIONAL_WARNINGS_SECTION_TITLE,
  PROVIDER_INTEL_AREA_DEPTH,
  PROVIDER_INTEL_AREA_LABELS,
  PROVIDER_INTEL_AREA_STATUS,
  PROVIDER_INTEL_BRIEF,
  PROVIDER_INTEL_DISCOVERY_CARD,
  PROVIDER_INTEL_FIELD_STATE,
  PROVIDER_INTEL_REP,
  PROVIDER_INTEL_RISK_CARD,
  PROVIDER_INTEL_SECTIONS,
  PROVIDER_INTEL_TRACK,
} from "@/lib/surgical-sales/providerIntelligenceRepVocabulary";

import {
  PROVIDER_INTEL_BRIEF,
  PROVIDER_INTEL_REP,
  PROVIDER_INTEL_SECTIONS,
} from "@/lib/surgical-sales/providerIntelligenceRepVocabulary";
import { OPERATIONAL_INTEL_INVESTIGATION } from "@/lib/surgical-sales/providerIntelligenceOperationalCopy";

/** Investigation workspace section copy */
export const PROVIDER_INTELLIGENCE_INVESTIGATION = {
  pageAria: PROVIDER_INTEL_REP.pageBriefAria,
  likelyRisks: PROVIDER_INTEL_SECTIONS.likelyRisks,
  watchFor: PROVIDER_INTEL_SECTIONS.likelyRisks,
  beforeField: PROVIDER_INTEL_SECTIONS.likelyRisks,
  nextBestDiscoveries: PROVIDER_INTEL_SECTIONS.nextBestDiscoveries,
  onFile: PROVIDER_INTEL_SECTIONS.whatWeKnow,
  fieldReadiness: PROVIDER_INTEL_BRIEF.fieldReadiness,
  nextAction: PROVIDER_INTEL_BRIEF.nextBestStep,
  updateDetails: PROVIDER_INTEL_REP.accountNotesFields,
  notCaptured: OPERATIONAL_INTEL_INVESTIGATION.notCaptured,
  showMissing: "Show supporting details",
  hideMissing: "Hide supporting details",
  staleToggle: "Stale reads",
  notCapturedCount: OPERATIONAL_INTEL_INVESTIGATION.notCapturedCount,
} as const;

export const PROGRESSION_LANE_LABELS_INVESTIGATION = {
  operational_maturity: "Account understanding",
  deployment_progression: "Field readiness",
  observation_readiness: "Observation access",
  commercialization: "Commercial path",
} as const;
