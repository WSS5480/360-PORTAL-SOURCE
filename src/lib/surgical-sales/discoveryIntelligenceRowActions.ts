/**

 * Contextual inline actions for discovery workflow rows (overview + intelligence).

 */



import type { WorkflowRowAction } from "@/lib/surgical-sales/buildProviderOverviewStageRequirementsView";

import type { ProviderOverviewWorkflowApiAction } from "@/lib/surgical-sales/buildProviderOverviewStageRequirementsView";

import { DISCOVERY_SIGNAL_STATUS } from "@/lib/surgical-sales/discoverySignalStatusConstants";
import type { DiscoveryStructuredSignalId } from "@/lib/surgical-sales/discoveryStructuredSignalIds";

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";

import { intelligenceSectionIdForDbKey } from "@/lib/surgical-sales/providerIntelligenceArchitecture";

import { SCHEDULING_OWNER_INTELLIGENCE_DB_KEY } from "@/lib/surgical-sales/rapidDiscoverySupportContact";



const S = DISCOVERY_SIGNAL_STATUS;



export type DiscoveryIntelligenceRowActions = {

  primary: WorkflowRowAction[];

  overflow: WorkflowRowAction[];

};



function sectionFor(dbKey: string, fallback?: ProviderIntelligenceSectionId): ProviderIntelligenceSectionId {

  return intelligenceSectionIdForDbKey(dbKey) ?? fallback ?? "observation_readiness";

}



function capture(

  id: string,

  label: string,

  dbKey: string,

  sectionId?: ProviderIntelligenceSectionId,

): WorkflowRowAction {

  return {

    id,

    label,

    kind: "capture_field",

    dbKey,

    sectionId: sectionId ?? sectionFor(dbKey),

  };

}



function api(id: string, label: string, apiAction: ProviderOverviewWorkflowApiAction): WorkflowRowAction {

  return { id, label, kind: "api", apiAction };

}



function assignContact(

  id: string,

  label: string,

  dbKey: string,

  mode: "select" | "create",

  sectionId?: ProviderIntelligenceSectionId,

): WorkflowRowAction {

  return {

    id,

    label,

    kind: "assign_support_contact",

    dbKey,

    sectionId: sectionId ?? sectionFor(dbKey),

    contactPickerMode: mode,

  };

}



/** Overview shows up to three compact inline actions; remainder stay in overflow for intelligence tab. */

function splitActions(all: WorkflowRowAction[], inlineLimit = 3): DiscoveryIntelligenceRowActions {

  return {

    primary: all.slice(0, inlineLimit),

    overflow: all.slice(inlineLimit),

  };

}



function observationApprovalActions(statusLabel: string): DiscoveryIntelligenceRowActions {

  const updateStatus = capture(

    "update_observation_status",

    "Update observation status",

    "provider_observation_feasibility",

    "observation_readiness",

  );



  void statusLabel;

  return splitActions([updateStatus]);

}



function schedulingOwnerActions(

  statusLabel: string,

  sectionId?: ProviderIntelligenceSectionId,

): DiscoveryIntelligenceRowActions {

  const select = assignContact(

    "select_scheduling_owner",

    "Name owner",

    SCHEDULING_OWNER_INTELLIGENCE_DB_KEY,

    "select",

    sectionId,

  );

  const add = assignContact(

    "add_scheduling_owner",

    "Add owner",

    SCHEDULING_OWNER_INTELLIGENCE_DB_KEY,

    "create",

    sectionId,

  );



  if (statusLabel === S.schedulingOwner.confirmed) {

    return splitActions([select, add]);

  }

  return splitActions([select, add]);

}



function facilityPathwayActions(

  statusLabel: string,

  sectionId?: ProviderIntelligenceSectionId,

): DiscoveryIntelligenceRowActions {

  const partial = api("mark_pathway_partial", "Capture partial path", "mark_pathway_partially_known");

  const confirmed = api("mark_pathway_confirmed", "Confirm pathway", "mark_access_path_known");

  const notes = capture("add_pathway_notes", "Add detail", "provider_observation_access_path", sectionId);



  if (statusLabel === S.pathwayOrLogistics.confirmed) {

    return splitActions([notes, partial]);

  }

  if (statusLabel === S.pathwayOrLogistics.partial) {

    return splitActions([confirmed, notes, partial]);

  }

  return splitActions([partial, confirmed, notes]);

}



function observationLogisticsActions(sectionId?: ProviderIntelligenceSectionId): DiscoveryIntelligenceRowActions {

  return splitActions([

    capture(

      "add_observation_date",

      "Set timing",

      "provider_ideal_observation_cases",

      sectionId,

    ),

    capture(

      "add_logistics_note",

      "Add detail",

      "provider_observation_best_days_case_types",

      sectionId,

    ),

  ]);

}



function workflowVisibilityActions(

  statusLabel: string,

  sectionId?: ProviderIntelligenceSectionId,

): DiscoveryIntelligenceRowActions {

  const logObservation = capture(

    "log_observation",

    "Record observation",

    "provider_procedure_focus",

    sectionId ?? "clinical_workflow",

  );

  const partial = capture(

    "mark_partially_observed",

    "Note partial workflow",

    "provider_workflow_pain_points",

    sectionId ?? "clinical_workflow",

  );

  const validated = capture(

    "mark_validated",

    "Confirm workflow",

    "provider_technique_preferences",

    sectionId ?? "clinical_workflow",

  );



  if (statusLabel === S.workflowVisibility.validated) {

    return splitActions([logObservation, partial]);

  }

  if (statusLabel === S.workflowVisibility.partial) {

    return splitActions([validated, logObservation, partial]);

  }

  return splitActions([logObservation, partial, validated]);

}



function productAlignmentActions(sectionId?: ProviderIntelligenceSectionId): DiscoveryIntelligenceRowActions {

  return splitActions([

    capture(

      "set_alignment_confidence",

      "Assess product fit",

      "provider_competitive_products",

      sectionId ?? "commercial_signals",

    ),

  ]);

}



function caseOpportunityActions(sectionId?: ProviderIntelligenceSectionId): DiscoveryIntelligenceRowActions {

  return splitActions([

    capture(

      "set_case_potential",

      "Size opportunity",

      "provider_case_volume_estimate",

      sectionId ?? "clinical_workflow",

    ),

  ]);

}



function clinicalChampionActions(

  statusLabel: string,

  sectionId?: ProviderIntelligenceSectionId,

): DiscoveryIntelligenceRowActions {

  const addContact = assignContact(

    "add_champion_contact",

    "Add champion",

    "provider_champion_potential",

    "create",

    sectionId ?? "relationship_intelligence",

  );

  const markPotential = capture(

    "mark_champion_potential",

    "Note champion lead",

    "provider_champion_potential",

    sectionId ?? "relationship_intelligence",

  );

  const confirmChampion = api("confirm_champion", "Confirm champion", "mark_champion_confirmed");



  if (statusLabel === S.champion.confirmed) {

    return splitActions([addContact, markPotential]);

  }

  if (statusLabel === S.champion.potential) {

    return splitActions([confirmChampion, addContact, markPotential]);

  }

  return splitActions([addContact, markPotential, confirmChampion]);

}



function decisionInfluenceActions(sectionId?: ProviderIntelligenceSectionId): DiscoveryIntelligenceRowActions {

  return splitActions([

    assignContact(

      "add_influence_contact",

      "Add influencer",

      "influence_level",

      "create",

      sectionId ?? "relationship_intelligence",

    ),

    capture("mark_influence_mapped", "Map influence", "influence_level", sectionId ?? "relationship_intelligence"),

  ]);

}



export function buildDiscoveryIntelligenceRowActions(input: {

  signalId: DiscoveryStructuredSignalId;

  statusLabel: string;

  sectionId?: ProviderIntelligenceSectionId;

}): DiscoveryIntelligenceRowActions {

  const { signalId, statusLabel, sectionId } = input;



  switch (signalId) {

    case "observation_approval":

      return observationApprovalActions(statusLabel);

    case "scheduling_owner":

      return schedulingOwnerActions(statusLabel, sectionId);

    case "facility_vendor_pathway":

      return facilityPathwayActions(statusLabel, sectionId);

    case "observation_logistics":

      return observationLogisticsActions(sectionId);

    case "workflow_visibility":

      return workflowVisibilityActions(statusLabel, sectionId);

    case "product_alignment":

      return productAlignmentActions(sectionId);

    case "case_opportunity":

      return caseOpportunityActions(sectionId);

    case "clinical_champion":

      return clinicalChampionActions(statusLabel, sectionId);

    case "decision_influence":

      return decisionInfluenceActions(sectionId);

    default:

      return { primary: [], overflow: [] };

  }

}



/** Flat list for provider overview workflow rows (primary + overflow). */

export function discoveryIntelligenceRowActionsFlat(

  input: Parameters<typeof buildDiscoveryIntelligenceRowActions>[0],

): WorkflowRowAction[] {

  const { primary, overflow } = buildDiscoveryIntelligenceRowActions(input);

  return [...primary, ...overflow];

}

