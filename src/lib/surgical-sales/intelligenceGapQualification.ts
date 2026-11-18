/**

 * Intelligence gap qualification — unknown ≠ open question.

 *

 * A gap surfaces only when:

 * 1. Field evidence explicitly references something unresolved.

 * 2. The item is required for the next immediate observation action.

 * 3. The rep saved partial intelligence marked still needed (captured / assumed).

 */



import { CONTACT_INFO_MISSING_RE } from "@/lib/surgical-sales/debriefContactLeadExtraction";

import { buildProviderObservationReadiness } from "@/lib/surgical-sales/providerObservationReadiness";

import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";

import {

  assessIntelligenceFieldQuality,

  type IntelligenceFieldQualityAssessment,

} from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";

import {

  parseProviderIntelligenceFieldMetadata,

  type ProviderIntelligenceFieldMetadataMap,

} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";

import { isIntelligenceFieldValidatedOnFile } from "@/lib/surgical-sales/providerIntelligenceValidatedOnFile";
import { isOrganizationInheritanceConfirmedForProvider } from "@/lib/surgical-sales/organizationIntelligenceInheritance";

import { resolveSalesPathwayStage } from "@/lib/surgical-sales/pathway/resolveSalesPathwayStage";

import {

  normalizeSalesPathwayStageId,

  type SalesPathwayStageId,

} from "@/lib/surgical-sales/salesPathwayCanonical";

import type { IntelligenceLearningGapState } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";



const UNRESOLVED_IN_EVIDENCE_RE =

  /\b(?:don'?t|do not)\s+know(?:\s+which|\s+what|\s+how|\s+who|\s+when|\s+if)?\b|\bstill\s+need(?:s|ed)?\b|\bnot\s+(?:yet\s+)?(?:captured|confirmed|clear|known|identified)\b|\b(?:unclear|unknown)\s+which\b|\bcontact\s+info\s+(?:missing|not)\b|\bstill\s+needed:/i;



const PERSON_NAME_IN_TEXT_RE = /\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?\b/;



export const SCHEDULING_CONTACT_KEYS = new Set([

  "provider_observation_coordinator_contact",

  "provider_scheduling_contact",

  "provider_facility_scheduling_contact",

  "provider_observation_scheduling_control",

  "provider_credentialing_contact",

]);



const STAGE_MISSION_REQUIRED_KEYS: Record<SalesPathwayStageId, readonly string[]> = {

  discovery: ["provider_observation_feasibility", "provider_evaluation_openness"],

  observe: ["provider_ideal_observation_cases", "provider_first_observation_questions"],

  debrief: [

    "provider_workflow_pain_points",

    "provider_clinical_frustrations",

    "provider_competitive_products",

  ],

  evaluation: [

    "provider_evaluation_openness",

    "provider_competitive_products",

    "provider_dissatisfaction_areas",

  ],

  commitment: [],

  outcomes: [],

};



const STAGE_MISSION_CONDITIONAL_KEYS: Partial<

  Record<SalesPathwayStageId, Array<{ dbKey: string; when: (contact: Record<string, unknown>) => boolean }>>

> = {

  discovery: [

    {

      dbKey: "provider_observation_credentialing_needed",

      when: (contact) => credentialingRequiredOnFile(contact),

    },

    {

      dbKey: "provider_credentialing_status",

      when: (contact) => credentialingRequiredOnFile(contact),

    },

    {

      dbKey: "provider_observation_access_path",

      when: (contact) => observationInterestOnFile(contact),

    },

  ],

  observe: [

    {

      dbKey: "provider_observation_coordinator_contact",

      when: (contact) => observationApprovedOnFile(contact),

    },

    {

      dbKey: "provider_scheduling_contact",

      when: (contact) => observationApprovedOnFile(contact),

    },

    {

      dbKey: "provider_observation_best_days_case_types",

      when: (contact) => observationApprovedOnFile(contact),

    },

    {

      dbKey: "provider_observation_cadence_preference",

      when: (contact) => observationApprovedOnFile(contact),

    },

  ],

};



const IMMEDIATE_ACTION_FIELD_KEYS: Partial<

  Record<string, (readiness: ReturnType<typeof buildProviderObservationReadiness>) => boolean>

> = {

  provider_ideal_observation_cases: (r) =>

    r.observationApproved === "yes" && r.candidateCasesIdentified !== "yes",

  provider_observation_best_days_case_types: (r) =>

    r.observationApproved === "yes" && r.observationDatesDiscussed !== "yes",

  provider_observation_cadence_preference: (r) =>

    r.observationApproved === "yes" && r.observationDatesDiscussed !== "yes",

  provider_credentialing_status: (r) =>

    r.observationApproved === "yes" &&

    r.credentialingRequired === "yes" &&

    r.credentialingPathKnown !== "yes",

  provider_observation_credentialing_needed: (r) =>

    r.observationApproved === "yes" &&

    r.credentialingRequired === "yes" &&

    r.credentialingPathKnown !== "yes",

  provider_observation_coordinator_contact: (r) =>

    r.observationApproved === "yes" && r.schedulerIdentified !== "yes",

  provider_scheduling_contact: (r) =>

    r.observationApproved === "yes" && r.schedulerIdentified !== "yes",

  provider_facility_scheduling_contact: (r) =>

    r.observationApproved === "yes" && r.schedulerIdentified !== "yes",

};



function credentialingRequiredOnFile(contact: Record<string, unknown>): boolean {

  const readiness = buildProviderObservationReadiness(contact);

  if (readiness.credentialingRequired === "yes") return true;

  const feasibility = String(contact.provider_observation_feasibility ?? "").toLowerCase();

  return /\bcredentialing required\b/.test(feasibility);

}



function observationInterestOnFile(contact: Record<string, unknown>): boolean {

  const readiness = buildProviderObservationReadiness(contact);

  return readiness.providerInterest === "yes";

}



function observationApprovedOnFile(contact: Record<string, unknown>): boolean {

  const readiness = buildProviderObservationReadiness(contact);

  return (

    readiness.observationApproved === "yes" ||

    isIntelligenceFieldValidatedOnFile("provider_observation_feasibility", contact)

  );

}



export function resolveIntelligenceGapStageId(

  contact: Record<string, unknown>,

  stageId?: SalesPathwayStageId | null,

): SalesPathwayStageId {

  if (stageId) return stageId;

  const stored = normalizeSalesPathwayStageId(

    String(contact.provider_relationship_pathway_stage_id ?? ""),

  );

  if (stored) return stored;

  return resolveSalesPathwayStage({ contact });

}



/** Domain completeness tracking — not used for open-question surfacing. */

export function isFieldMissionRelevant(

  dbKey: string,

  contact: Record<string, unknown>,

  stageId?: SalesPathwayStageId | null,

): boolean {

  const stage = resolveIntelligenceGapStageId(contact, stageId);

  if (STAGE_MISSION_REQUIRED_KEYS[stage]?.includes(dbKey)) return true;

  const conditional = STAGE_MISSION_CONDITIONAL_KEYS[stage] ?? [];

  return conditional.some((rule) => rule.dbKey === dbKey && rule.when(contact));

}



function fieldMetadata(

  contact: Record<string, unknown>,

): ProviderIntelligenceFieldMetadataMap {

  return parseProviderIntelligenceFieldMetadata(contact.provider_intelligence_field_metadata);

}



export function isRepMarkedStillNeeded(

  dbKey: string,

  contact: Record<string, unknown>,

  raw?: string | null,

): boolean {

  const meta = fieldMetadata(contact)[dbKey];

  if (

    (meta?.lifecycle_state === "captured" || meta?.lifecycle_state === "assumed") &&

    !isIntelligenceFieldValidatedOnFile(dbKey, contact)

  ) {

    return true;

  }

  const trimmed = String(raw ?? contact[dbKey] ?? "").trim();

  return /still\s+needed:/i.test(trimmed);

}



function evidenceReferencesUnresolvedDetail(trimmed: string): boolean {

  if (!trimmed) return false;

  if (CONTACT_INFO_MISSING_RE.test(trimmed)) return true;

  if (UNRESOLVED_IN_EVIDENCE_RE.test(trimmed)) return true;

  return false;

}



export function isRequiredForImmediateAction(

  dbKey: string,

  contact: Record<string, unknown>,

): boolean {

  const rule = IMMEDIATE_ACTION_FIELD_KEYS[dbKey];

  if (!rule) return false;

  return rule(buildProviderObservationReadiness(contact));

}



export function isFieldExplicitlyReferenced(

  dbKey: string,

  contact: Record<string, unknown>,

  raw: string | null | undefined,

  assessment: IntelligenceFieldQualityAssessment,

): boolean {

  const trimmed = String(raw ?? "").trim();



  if (isRepMarkedStillNeeded(dbKey, contact, trimmed)) {

    return !isIntelligenceFieldValidatedOnFile(dbKey, contact);

  }



  if (!assessment.hasSignal || !fieldHasIntelligenceSignal(dbKey, raw)) {

    return false;

  }



  if (isIntelligenceFieldValidatedOnFile(dbKey, contact)) {

    return false;

  }

  if (isOrganizationInheritanceConfirmedForProvider(contact, dbKey)) {

    return false;

  }



  if (evidenceReferencesUnresolvedDetail(trimmed)) {

    return true;

  }



  if (SCHEDULING_CONTACT_KEYS.has(dbKey)) {

    if (CONTACT_INFO_MISSING_RE.test(trimmed)) return true;

    if (

      PERSON_NAME_IN_TEXT_RE.test(trimmed) &&

      !/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b|@/.test(trimmed)

    ) {

      return true;

    }

  }



  if (assessment.depth === "weak" || assessment.depth === "structured") {

    return evidenceReferencesUnresolvedDetail(trimmed);

  }



  return false;

}



export function intelligenceGapQualifiesForSurfacing(input: {

  dbKey: string;

  contact: Record<string, unknown>;

  state: IntelligenceLearningGapState;

  stageId?: SalesPathwayStageId | null;

  raw?: string | null | undefined;

  assessment?: IntelligenceFieldQualityAssessment;

}): boolean {

  const raw = input.raw ?? (input.contact[input.dbKey] as string | null | undefined);

  const assessment =

    input.assessment ??

    assessIntelligenceFieldQuality(input.dbKey, raw);



  if (isRepMarkedStillNeeded(input.dbKey, input.contact, raw)) {

    return !isIntelligenceFieldValidatedOnFile(input.dbKey, input.contact);

  }



  if (input.state === "partial" || input.state === "outdated") {

    return isFieldExplicitlyReferenced(input.dbKey, input.contact, raw, assessment);

  }



  if (input.state === "unknown") {

    return isRequiredForImmediateAction(input.dbKey, input.contact);

  }



  return false;

}



/** Human phrase when a scheduling contact was referenced but not confirmed. */

export function schedulingContactUnresolvedPhrase(

  dbKey: string,

  raw: string | null | undefined,

  contact?: Record<string, unknown>,

): string | null {

  if (!SCHEDULING_CONTACT_KEYS.has(dbKey)) return null;

  const trimmed = String(raw ?? "").trim();

  if (!trimmed || !fieldHasIntelligenceSignal(dbKey, raw)) return null;

  if (contact && isOrganizationInheritanceConfirmedForProvider(contact, dbKey)) return null;

  if (isIntelligenceFieldValidatedOnFile(dbKey, contact ? contact : { [dbKey]: raw })) return null;

  if (

    CONTACT_INFO_MISSING_RE.test(trimmed) ||

    UNRESOLVED_IN_EVIDENCE_RE.test(trimmed) ||

    (PERSON_NAME_IN_TEXT_RE.test(trimmed) &&

      !/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b|@/.test(trimmed))

  ) {

    return "Scheduling contact needs confirmation";

  }

  return null;

}


