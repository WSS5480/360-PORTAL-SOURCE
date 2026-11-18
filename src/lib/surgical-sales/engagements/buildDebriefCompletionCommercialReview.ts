import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";

import {

  DEBRIEF_COMMERCIAL_STATUS_LABEL,

  DEBRIEF_COMMERCIAL_NEXT_STEP_OPTIONS,

} from "@/lib/surgical-sales/engagements/debriefCompletionCommercialCopy";

import {

  canonicalizeDebriefFindingKey,

  DEBRIEF_COMMERCIAL_INTELLIGENCE_FIELD_KEYS,

  formatDebriefProfileUpdateDisplay,

  mergeDebriefPatternValidationsByCanonicalKey,

} from "@/lib/surgical-sales/engagements/debriefCompletionFindingStatus";

import type {

  DebriefCommercialReviewLine,

  DebriefCompletionCommercialReview,

  DebriefFindingCommercialStatus,

  DebriefNextStepSnapshot,

  DebriefPatternValidationResult,

  DebriefProfileUpdateGroup,

} from "@/lib/surgical-sales/engagements/debriefCompletionValidationTypes";

import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";

import { POST_OBSERVATION_ACCESS_FIELD_KEYS } from "@/lib/surgical-sales/engagements/postObservationDebriefCompletion";



const PROFILE_GROUP_LABEL: Record<DebriefProfileUpdateGroup, string> = {

  products_used: "Products used",

  procedures_performed: "Procedures performed",

  volume_trends: "Volume trends",

  contacts: "Contacts",

  facilities: "Facilities",

};



const EMPTY_PROFILE_UPDATES: Record<DebriefProfileUpdateGroup, DebriefCommercialReviewLine[]> = {

  products_used: [],

  procedures_performed: [],

  volume_trends: [],

  contacts: [],

  facilities: [],

};



function resolveProfileGroup(dbKey: string): DebriefProfileUpdateGroup | null {

  if (DEBRIEF_COMMERCIAL_INTELLIGENCE_FIELD_KEYS.has(dbKey.trim())) {

    return null;

  }



  const key = dbKey.trim().toLowerCase();

  if (key === "provider_competitive_products" || key === "provider_technique_preferences") {

    return "products_used";

  }

  if (

    key === "provider_procedure_focus" ||

    key === "provider_technique_detail" ||

    key === "provider_preference_card_signals"

  ) {

    return "procedures_performed";

  }

  if (key === "provider_case_volume_estimate" || /volume|trend|adoption/i.test(key)) {

    return "volume_trends";

  }

  if (

    key === "provider_observation_coordinator_contact" ||

    key === "provider_evaluation_stakeholders" ||

    key === "provider_decision_maker_status" ||

    key === "provider_champion_potential"

  ) {

    return "contacts";

  }

  if (

    key.startsWith("provider_observation_") ||

    key.startsWith("provider_credentialing_") ||

    key === "preferred_hospital" ||

    key.includes("facility") ||

    key.includes("organization")

  ) {

    return "facilities";

  }

  return null;

}



function buildProfileUpdates(input: {

  logUpdate: LogUpdateParseResult | null;

  proposedContacts: DebriefProposedContactItem[];

}): Record<DebriefProfileUpdateGroup, DebriefCommercialReviewLine[]> {

  const groups: Record<DebriefProfileUpdateGroup, DebriefCommercialReviewLine[]> = {

    products_used: [],

    procedures_performed: [],

    volume_trends: [],

    contacts: [],

    facilities: [],

  };

  const seen = new Set<string>();



  for (const update of input.logUpdate?.fieldUpdates ?? []) {

    if (!update.accepted) continue;

    const value = String(update.proposedValue ?? "").trim();

    if (!value) continue;

    if (POST_OBSERVATION_ACCESS_FIELD_KEYS.has(update.dbKey.trim())) continue;

    if (DEBRIEF_COMMERCIAL_INTELLIGENCE_FIELD_KEYS.has(update.dbKey)) continue;



    const group = resolveProfileGroup(update.dbKey);

    if (!group) continue;



    const display = formatDebriefProfileUpdateDisplay(update.dbKey, value);

    const dedupeKey = `${group}:${canonicalizeDebriefFindingKey(`${update.dbKey}:${value}`)}`;

    if (seen.has(dedupeKey)) continue;

    seen.add(dedupeKey);



    groups[group].push({

      label: display.label,

      detail: display.detail,

    });

  }



  for (const contact of input.proposedContacts) {

    if (contact.disposition === "skipped") continue;

    const name = contact.displayName.trim();

    if (!name) continue;

    const dedupeKey = `contacts:${name.toLowerCase()}`;

    if (seen.has(dedupeKey)) continue;

    seen.add(dedupeKey);

    groups.contacts.push({

      label: name,

      detail: contact.roleLabel?.trim() || contact.workflowLabel?.trim() || undefined,

      evidence: contact.sourceQuote?.trim() || undefined,

    });

  }



  return groups;

}



function painFindingLine(row: DebriefPatternValidationResult): DebriefCommercialReviewLine {

  const status = row.commercial_status;

  const prefix = status != null ? DEBRIEF_COMMERCIAL_STATUS_LABEL[status] : row.pattern_label;

  return {

    label: prefix,

    detail: row.pattern_label,

    evidence: row.provider_quote,

  };

}



function buildCommercialFindings(validationResults: DebriefPatternValidationResult[]) {

  const merged = mergeDebriefPatternValidationsByCanonicalKey(validationResults);

  const validatedPainPoints: DebriefCommercialReviewLine[] = [];

  const qualifiedPainPoints: DebriefCommercialReviewLine[] = [];

  const rejectedPainPoints: DebriefCommercialReviewLine[] = [];

  const opportunitiesIdentified: DebriefCommercialReviewLine[] = [];

  const opportunitiesRejected: DebriefCommercialReviewLine[] = [];

  const seen = new Set<string>();



  for (const row of merged) {

    const status = row.commercial_status;

    if (!status) continue;



    const key = row.canonical_finding_key ?? canonicalizeDebriefFindingKey(row.pattern_label);

    if (seen.has(`${key}:${status}`)) continue;

    seen.add(`${key}:${status}`);



    const line = painFindingLine(row);

    switch (status as DebriefFindingCommercialStatus) {

      case "validated_pain_point":

        validatedPainPoints.push(line);

        break;

      case "qualified_issue":

      case "mentioned_only":

        qualifiedPainPoints.push(line);

        break;

      case "rejected_issue":

      case "no_active_opportunity":

        rejectedPainPoints.push(line);

        break;

      case "active_opportunity":

        opportunitiesIdentified.push(line);

        break;

      default:

        break;

    }

  }



  return {

    validatedPainPoints,

    qualifiedPainPoints,

    rejectedPainPoints,

    opportunitiesIdentified,

    opportunitiesRejected,

  };

}



function summarizeWhatWeLearned(input: {

  validationResults: DebriefPatternValidationResult[];

  nextStep: DebriefNextStepSnapshot;

}): string {

  const merged = mergeDebriefPatternValidationsByCanonicalKey(input.validationResults);

  const validated = merged.filter((row) => row.commercial_status === "validated_pain_point");

  const qualified = merged.filter(

    (row) => row.commercial_status === "qualified_issue" || row.commercial_status === "mentioned_only",

  );



  if (
    input.nextStep.recommendation === "evaluation" ||
    input.nextStep.recommendation === "product_trial"
  ) {
    if (validated.length > 0) {
      return `Provider confirmed ${validated[0].pattern_label.toLowerCase()} is meaningful enough to address.`;
    }
    if (qualified.length > 0) {
      return `Provider sees ${qualified[0].pattern_label.toLowerCase()} as occasional on some case types — not an active pain every case.`;
    }
    return "No strong clinical pain point confirmed during the debrief.";
  }

  if (validated.length > 0) {

    return `Provider confirmed ${validated[0].pattern_label.toLowerCase()} is meaningful enough to address.`;

  }

  if (qualified.length > 0) {

    return `Provider sees ${qualified[0].pattern_label.toLowerCase()} as occasional or not significant — not an active pain today.`;

  }

  if (input.nextStep.opportunity_strength === "none") {

    return "No significant clinical or workflow issue was confirmed during the debrief.";

  }

  return "The debrief clarified what matters to the provider without confirming a strong pain point.";

}



function summarizeWhatChanged(input: {

  profileUpdates: Record<DebriefProfileUpdateGroup, DebriefCommercialReviewLine[]>;

}): string {

  const counts = Object.values(input.profileUpdates).reduce((sum, rows) => sum + rows.length, 0);

  if (counts === 0) {

    return "No provider profile fields will be updated from this debrief.";

  }

  const parts: string[] = [];

  if (input.profileUpdates.products_used.length > 0) parts.push("product usage");

  if (input.profileUpdates.procedures_performed.length > 0) parts.push("procedure focus");

  if (input.profileUpdates.volume_trends.length > 0) parts.push("volume trends");

  if (input.profileUpdates.contacts.length > 0) parts.push("contacts");

  if (input.profileUpdates.facilities.length > 0) parts.push("facility or access details");

  return `Selected updates will refresh ${parts.join(", ")} on the provider record.`;

}



function appendOpportunitySignals(input: {

  findings: DebriefCompletionCommercialReview["commercialFindings"];

  nextStep: DebriefNextStepSnapshot;

}) {

  const evalWorthy =

    input.nextStep.recommendation === "evaluation" ||

    input.nextStep.recommendation === "product_trial" ||

    input.nextStep.recommendation === "opportunity_creation" ||

    input.nextStep.recommendation === "360_experience";



  if (evalWorthy) {

    input.findings.opportunitiesIdentified.push({

      label: input.nextStep.label,

      detail: input.nextStep.reason,

      evidence: input.nextStep.evidence,

    });

    return;

  }



  if (

    input.nextStep.recommendation === "no_action" ||

    input.nextStep.provider_interest === "not_interested" ||

    input.nextStep.opportunity_strength === "none"

  ) {

    input.findings.opportunitiesRejected.push({

      label: "No active commercial pursuit",

      detail: input.nextStep.reason,

      evidence: input.nextStep.evidence,

    });

  }

}



export function buildDebriefCompletionCommercialReview(input: {

  logUpdate: LogUpdateParseResult | null;

  proposedContacts?: DebriefProposedContactItem[];

  validationResults: DebriefPatternValidationResult[];

  nextStep: DebriefNextStepSnapshot;

}): DebriefCompletionCommercialReview {

  const profileUpdates = buildProfileUpdates({

    logUpdate: input.logUpdate,

    proposedContacts: input.proposedContacts ?? [],

  });

  const commercialFindings = buildCommercialFindings(input.validationResults);

  appendOpportunitySignals({ findings: commercialFindings, nextStep: input.nextStep });



  const whatWeLearned = summarizeWhatWeLearned({

    validationResults: input.validationResults,

    nextStep: input.nextStep,

  });

  const whatChanged = summarizeWhatChanged({ profileUpdates });



  return {

    whatWeLearned,

    whatChanged,

    whatShouldWeDoNext: input.nextStep.reason,

    providerProfileUpdates: profileUpdates,

    commercialFindings,

    recommendedNextStep: {

      selectedId: input.nextStep.recommendation,

      selectedLabel: input.nextStep.label,

      reason: input.nextStep.reason,

      options: DEBRIEF_COMMERCIAL_NEXT_STEP_OPTIONS,

    },

  };

}



export { PROFILE_GROUP_LABEL, EMPTY_PROFILE_UPDATES };

export function flattenDebriefCompletionProfileUpdates(
  profileUpdates: DebriefCompletionCommercialReview["providerProfileUpdates"],
): DebriefCommercialReviewLine[] {
  const groups: DebriefProfileUpdateGroup[] = [
    "products_used",
    "procedures_performed",
    "volume_trends",
    "contacts",
    "facilities",
  ];
  return groups.flatMap((group) => profileUpdates[group]);
}


