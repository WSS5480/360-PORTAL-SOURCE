/**
 * Machine-readable debrief fact keys — Pass 1 output has no prose, only keys + attributes.
 */

export type DebriefFactBucket =
  | "workflowParticipants"
  | "clinicalFocus"
  | "observationAccess"
  | "facilityIntelligence"
  | "followUpActions";

export type DebriefFactKey =
  | "observation_approved_explicit"
  | "observation_interest_without_approval"
  | "observation_denied"
  | "observation_mentioned"
  | "credentialing_required_platform_unknown"
  | "credentialing_platform_mentioned_unconfirmed"
  | "credentialing_platform_confirmed"
  | "credentialing_discussed"
  | "scheduling_person_named"
  | "scheduling_discussed"
  | "workflow_person_named"
  | "workflow_person_with_contact_info"
  | "workflow_coordination_mentioned"
  | "clinical_robotic_ventral_hernia_increasing"
  | "clinical_abdominal_wall_reconstruction_increasing"
  | "clinical_robotic_ventral_hernia"
  | "clinical_abdominal_wall_reconstruction"
  | "clinical_procedure_discussed"
  | "product_fit_discussed"
  | "product_acsis_discussed"
  | "current_product_needs_confirmation"
  | "current_product_validated"
  | "relationship_mentioned"
  | "follow_up_stated"
  | "facility_access_partial"
  | "facility_credentialing_partial";

export type DebriefExtractedFactRecord = {
  id: string;
  factKey: DebriefFactKey;
  attributes: Record<string, string | string[] | boolean>;
  evidenceQuote: string;
  namedPeople: string[];
  confidence: "High" | "Medium" | "Low";
};

export type DebriefExtractedFacts = {
  workflowParticipants: DebriefExtractedFactRecord[];
  clinicalFocus: DebriefExtractedFactRecord[];
  observationAccess: DebriefExtractedFactRecord[];
  facilityIntelligence: DebriefExtractedFactRecord[];
  followUpActions: DebriefExtractedFactRecord[];
};

const BUCKET_BY_KEY: Record<DebriefFactKey, DebriefFactBucket> = {
  observation_approved_explicit: "observationAccess",
  observation_interest_without_approval: "observationAccess",
  observation_denied: "observationAccess",
  observation_mentioned: "observationAccess",
  credentialing_required_platform_unknown: "observationAccess",
  credentialing_platform_mentioned_unconfirmed: "observationAccess",
  credentialing_platform_confirmed: "observationAccess",
  credentialing_discussed: "observationAccess",
  scheduling_person_named: "workflowParticipants",
  scheduling_discussed: "workflowParticipants",
  workflow_person_named: "workflowParticipants",
  workflow_person_with_contact_info: "workflowParticipants",
  workflow_coordination_mentioned: "workflowParticipants",
  clinical_robotic_ventral_hernia_increasing: "clinicalFocus",
  clinical_abdominal_wall_reconstruction_increasing: "clinicalFocus",
  clinical_robotic_ventral_hernia: "clinicalFocus",
  clinical_abdominal_wall_reconstruction: "clinicalFocus",
  clinical_procedure_discussed: "clinicalFocus",
  product_fit_discussed: "clinicalFocus",
  product_acsis_discussed: "clinicalFocus",
  current_product_needs_confirmation: "clinicalFocus",
  current_product_validated: "clinicalFocus",
  relationship_mentioned: "followUpActions",
  follow_up_stated: "followUpActions",
  facility_access_partial: "facilityIntelligence",
  facility_credentialing_partial: "facilityIntelligence",
};

export function bucketForFactKey(factKey: DebriefFactKey): DebriefFactBucket {
  return BUCKET_BY_KEY[factKey];
}

export function emptyExtractedFacts(): DebriefExtractedFacts {
  return {
    workflowParticipants: [],
    clinicalFocus: [],
    observationAccess: [],
    facilityIntelligence: [],
    followUpActions: [],
  };
}

export function pushExtractedFact(
  buckets: DebriefExtractedFacts,
  record: DebriefExtractedFactRecord,
): void {
  const bucket = bucketForFactKey(record.factKey);
  buckets[bucket].push(record);
}

export function allExtractedRecords(buckets: DebriefExtractedFacts): DebriefExtractedFactRecord[] {
  return [
    ...buckets.workflowParticipants,
    ...buckets.clinicalFocus,
    ...buckets.observationAccess,
    ...buckets.facilityIntelligence,
    ...buckets.followUpActions,
  ];
}
