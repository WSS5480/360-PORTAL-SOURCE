/**

 * Provider overview discovery — access workflow vs clinical validation.

 * Access unlocks observation permission; clinical learning follows observation.

 */



import type { ProviderOverviewDiscoveryProgressionModel } from "@/lib/surgical-sales/buildProviderDiscoveryStageProgression";

import { hasProviderObservationApprovalValidated } from "@/lib/surgical-sales/buildProviderDiscoveryStageProgression";
import { resolveObservationReadinessLevelForPlanning } from "@/lib/surgical-sales/deriveProviderObservationReadiness";
import { buildProviderObservationReadiness } from "@/lib/surgical-sales/providerObservationReadiness";



export type ProviderOverviewDiscoveryOperationalPhase =

  | "clinical_sponsorship"

  | "operational_access";



/** @deprecated Access workflow only — clinical validation is a separate group */

export const CLINICAL_SPONSORSHIP_READINESS_IDS = new Set<string>();



/** Consolidated access-readiness signal ids (replaces redundant flat cards). */

export const ACCESS_WORKFLOW_READINESS_IDS = new Set([

  "observation_approval_status",

  "scheduling_owner",

  "facility_vendor_pathway",

  "observation_logistics",

]);



/** @deprecated Use ACCESS_WORKFLOW_READINESS_IDS */

export const OPERATIONAL_ACCESS_READINESS_IDS = ACCESS_WORKFLOW_READINESS_IDS;



/** Canonical access-readiness signals in the operational pathway. */

export const ACCESS_WORKFLOW_PATHWAY_ITEMS: Array<{ id: string; label: string }> = [

  { id: "observation_approval_status", label: "Observation approval status" },

  { id: "scheduling_owner", label: "Scheduling owner identified" },

  { id: "facility_vendor_pathway", label: "Facility/vendor pathway understood" },

  { id: "observation_logistics", label: "Observation logistics understood" },

];



/** @deprecated Rows are deferred inline in access workflow */

export const LOCKED_UNTIL_APPROVAL_ITEMS = ACCESS_WORKFLOW_PATHWAY_ITEMS.filter(

  (item) => item.id !== "observation_approval_status",

);



export const PRIMARY_CLINICAL_GAP_LABEL = "Provider observation approval pending";



export const POST_APPROVAL_PATHWAY_NEXT_MOVE = "Coordinate observation access";



export function resolveProviderOverviewDiscoveryOperationalPhase(input: {

  discovery: ProviderOverviewDiscoveryProgressionModel | null;

  contact: Record<string, unknown>;

}): ProviderOverviewDiscoveryOperationalPhase {

  const readinessLevel = resolveObservationReadinessLevelForPlanning(input.contact);

  if (readinessLevel === "ready" || readinessLevel === "conditional") {
    return "operational_access";
  }

  const readiness = buildProviderObservationReadiness(input.contact);
  if (readiness.providerInterest === "yes") {
    return "operational_access";
  }

  if (input.discovery) {

    return input.discovery.advancementSignal.met ? "operational_access" : "clinical_sponsorship";

  }

  return hasProviderObservationApprovalValidated(input.contact)

    ? "operational_access"

    : "clinical_sponsorship";

}



export function isOperationalAccessReadinessId(id: string): boolean {

  return ACCESS_WORKFLOW_READINESS_IDS.has(id);

}


