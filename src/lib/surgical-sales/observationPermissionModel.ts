/**

 * Normalized observation permission — single source of truth for all provider surfaces.

 *

 * Priority (highest wins):

 * 1. Observation Completed

 * 2. Observation Scheduled

 * 3. Permission Confirmed

 * 4. Permission Requested / Pending

 * 5. Interested

 * 6. Unknown

 * 7. Not Interested

 */



import { OBSERVATION_APPROVAL_PROFILE_SOURCE_LABEL } from "@/lib/surgical-sales/observationApprovalSave";

import { parseProviderIntelligenceFieldMetadata } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";

import {

  DISCOVERY_FIELD_STATUS,

  resolveObservationApprovalStatus,

} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";

import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";

import { readProviderCommercialIntelligence } from "@/lib/surgical-sales/providerCommercialIntelligenceModel";

import {

  hasProviderObservationApprovalOnFile,

  hasProviderObservationApprovalValidated,

} from "@/lib/surgical-sales/providerObservationApproval";

import {

  countObservedProcedures,

  hasObservationScheduled,

  type PathwayGateInput,

  type PathwayGateEngagementRef,

} from "@/lib/surgical-sales/pathwayStageGates";

import type { MissionAccessHeadlineKey } from "@/lib/surgical-sales/providerMissionExecutionLanguage";



export type ObservationPermissionStageId =

  | "unknown"

  | "interested"

  | "permission_not_yet_confirmed"

  | "permission_confirmed"

  | "observation_scheduled"

  | "observation_completed"

  | "not_interested";



/** Resolution priority — higher rank wins. */

export const OBSERVATION_PERMISSION_STAGE_ORDER: ObservationPermissionStageId[] = [

  "observation_completed",

  "observation_scheduled",

  "permission_confirmed",

  "permission_not_yet_confirmed",

  "interested",

  "unknown",

  "not_interested",

];



export const OBSERVATION_PERMISSION_STAGE_LABELS: Record<ObservationPermissionStageId, string> = {

  observation_completed: "Observation Completed",

  observation_scheduled: "Observation Scheduled",

  permission_confirmed: "Permission Confirmed",

  permission_not_yet_confirmed: "Permission Requested",

  interested: "Interested",

  unknown: "Unknown",

  not_interested: "Not Interested",

};



/** Compact chip on overview / mission card. */

export const OBSERVATION_PERMISSION_OVERVIEW_LABELS: Record<ObservationPermissionStageId, string> = {

  observation_completed: "Completed",

  observation_scheduled: "Scheduled",

  permission_confirmed: "Confirmed",

  permission_not_yet_confirmed: "Pending",

  interested: "Interested",

  unknown: "Not established",

  not_interested: "Not interested",

};



/** Secondary approval detail row — derived from the same stage (never contradicts permission). */

export const OBSERVATION_PERMISSION_APPROVAL_DETAIL_LABELS: Record<ObservationPermissionStageId, string> = {

  observation_completed: "Observation completed on file",

  observation_scheduled: "Observation scheduled on file",

  permission_confirmed: "Confirmed on file",

  permission_not_yet_confirmed: "Permission requested — awaiting confirmation",

  interested: "Interest captured — permission not yet confirmed",

  unknown: "Not established",

  not_interested: "Declined on file",

};



const OBSERVATION_PERMISSION_HEADLINE_KEYS: Record<ObservationPermissionStageId, MissionAccessHeadlineKey> = {

  observation_completed: "approved",

  observation_scheduled: "approved",

  permission_confirmed: "approved",

  permission_not_yet_confirmed: "pending",

  interested: "interested",

  unknown: "unknown",

  not_interested: "declined",

};



export type NormalizedObservationPermission = {

  stageId: ObservationPermissionStageId;

  label: string;

  overviewLabel: string;

  approvalDetailLabel: string;

  headlineKey: MissionAccessHeadlineKey;

};



export const DISCOVERY_COMMERCIAL_OBJECTIVE = "Get provider permission to observe";



const STAGE_RANK: Record<ObservationPermissionStageId, number> = {

  observation_completed: 6,

  observation_scheduled: 5,

  permission_confirmed: 4,

  permission_not_yet_confirmed: 3,

  interested: 2,

  unknown: 1,

  not_interested: 0,

};



export type ObservationPermissionMilestone = {

  id: ObservationPermissionStageId;

  label: string;

  state: "complete" | "current" | "upcoming";

};



export function providerHasObservationInterestSignal(contact: Record<string, unknown>): boolean {
  return hasObservationInterest(contact);
}

function hasObservationInterest(contact: Record<string, unknown>): boolean {

  const intel = readProviderCommercialIntelligence(contact);

  if (intel?.observation.interest === "yes") return true;

  if (

    intel?.observation.approval_status === "interested" ||

    intel?.observation.approval_status === "discussed"

  ) {

    return true;

  }



  const feasibility = String(contact.provider_observation_feasibility ?? "").trim().toLowerCase();

  if (["yes", "easy", "restricted", "approved", "discussed", "interested"].includes(feasibility)) {

    return true;

  }



  if (

    fieldHasIntelligenceSignal(

      "provider_evaluation_openness",

      contact.provider_evaluation_openness as string | null | undefined,

    )

  ) {

    return true;

  }



  return false;

}



function isPermissionDeclined(contact: Record<string, unknown>): boolean {

  const feasibility = String(contact.provider_observation_feasibility ?? "").trim().toLowerCase();

  if (feasibility === "no" || feasibility === "blocked" || feasibility === "denied") {

    return true;

  }



  const intel = readProviderCommercialIntelligence(contact);

  if (intel?.observation.interest === "no" || intel?.observation.approval_status === "not_approved") {

    return true;

  }



  const signalStatus = resolveObservationApprovalStatus(contact);

  if (signalStatus === DISCOVERY_FIELD_STATUS.blocked) {

    return !hasObservationInterest(contact);

  }



  return false;

}



function isActivelySeekingPermission(input: {

  contact: Record<string, unknown>;

  engagements?: PathwayGateEngagementRef[];

}): boolean {

  if (hasProviderObservationApprovalOnFile(input.contact)) return false;

  if (isPermissionDeclined(input.contact)) return false;



  if (hasCompletedIntroTouchRef(input.engagements) && hasObservationInterest(input.contact)) {

    return true;

  }



  const signalStatus = resolveObservationApprovalStatus(input.contact);

  if (

    signalStatus === DISCOVERY_FIELD_STATUS.captured ||

    signalStatus === DISCOVERY_FIELD_STATUS.conditional

  ) {

    return true;

  }



  const intel = readProviderCommercialIntelligence(input.contact);

  if (

    intel?.observation.approval_status === "not_approved" ||

    intel?.observation.approval_status === "discussed"

  ) {

    return true;

  }



  return false;

}

function hasCompletedIntroTouchRef(engagements: PathwayGateEngagementRef[] | undefined): boolean {
  return Boolean(
    engagements?.some((engagement) => {
      const type = String(engagement.engagement_type ?? "").toLowerCase();
      const status = String(engagement.status ?? "").toLowerCase();
      return type === "intro_call" && (status === "completed" || status === "closed");
    }),
  );
}



function resolveManualObservationPermissionStage(

  contact: Record<string, unknown>,

): ObservationPermissionStageId | null {

  const meta = parseProviderIntelligenceFieldMetadata(

    contact.provider_intelligence_field_metadata,

  )?.provider_observation_feasibility;

  if (meta?.source_type !== "profile") return null;

  if (

    meta.source_label &&

    meta.source_label !== OBSERVATION_APPROVAL_PROFILE_SOURCE_LABEL

  ) {

    return null;

  }



  const feasibility = String(contact.provider_observation_feasibility ?? "").trim().toLowerCase();

  if (!feasibility) return "unknown";



  switch (feasibility) {

    case "interested":

      return "interested";

    case "discussed":

      return "permission_not_yet_confirmed";

    case "approved":

    case "yes":

    case "easy":

    case "restricted":

      return hasProviderObservationApprovalOnFile(contact) ? "permission_confirmed" : null;

    case "denied":

    case "no":

    case "blocked":

      return "not_interested";

    default:

      return null;

  }

}



export function resolveObservationPermissionStage(input: PathwayGateInput): ObservationPermissionStageId {

  const contact = input.contact ?? {};



  if (countObservedProcedures(input) > 0) {

    return "observation_completed";

  }



  if (hasObservationScheduled(input)) {

    return "observation_scheduled";

  }



  if (hasProviderObservationApprovalOnFile(contact)) {

    return "permission_confirmed";

  }



  const manualStage = resolveManualObservationPermissionStage(contact);

  if (manualStage && manualStage !== "unknown") {

    return manualStage;

  }



  if (isActivelySeekingPermission(input)) {

    return "permission_not_yet_confirmed";

  }



  if (hasObservationInterest(contact) && !isPermissionDeclined(contact)) {

    return "interested";

  }



  if (isPermissionDeclined(contact)) {

    return "not_interested";

  }



  if (manualStage === "unknown") {

    return "unknown";

  }



  return "unknown";

}



export function resolveNormalizedObservationPermission(

  input: PathwayGateInput,

): NormalizedObservationPermission {

  const stageId = resolveObservationPermissionStage(input);

  return {

    stageId,

    label: OBSERVATION_PERMISSION_STAGE_LABELS[stageId],

    overviewLabel: OBSERVATION_PERMISSION_OVERVIEW_LABELS[stageId],

    approvalDetailLabel: OBSERVATION_PERMISSION_APPROVAL_DETAIL_LABELS[stageId],

    headlineKey: OBSERVATION_PERMISSION_HEADLINE_KEYS[stageId],

  };

}



export function observationPermissionOverviewLabel(

  stageId: ObservationPermissionStageId,

): string {

  return OBSERVATION_PERMISSION_OVERVIEW_LABELS[stageId];

}



export function observationPermissionStageLabel(

  stageId: ObservationPermissionStageId,

): string {

  return OBSERVATION_PERMISSION_STAGE_LABELS[stageId];

}



export function observationPermissionGrantsPathwayAdvance(

  stageId: ObservationPermissionStageId,

): boolean {

  return STAGE_RANK[stageId] >= STAGE_RANK.permission_confirmed;

}



export function observationPermissionConfirmedOnFile(contact: Record<string, unknown>): boolean {

  return (

    hasProviderObservationApprovalValidated(contact) || hasProviderObservationApprovalOnFile(contact)

  );

}



function milestoneState(

  currentRank: number,

  milestoneRank: number,

): ObservationPermissionMilestone["state"] {

  if (currentRank > milestoneRank) return "complete";

  if (currentRank === milestoneRank) return "current";

  return "upcoming";

}



const MILESTONE_TRACK: ObservationPermissionStageId[] = [

  "unknown",

  "interested",

  "permission_not_yet_confirmed",

  "permission_confirmed",

  "observation_scheduled",

  "observation_completed",

];



export function buildDiscoveryObservationPermissionMilestones(

  input: PathwayGateInput,

): ObservationPermissionMilestone[] {

  const current = resolveObservationPermissionStage(input);

  if (current === "not_interested") {

    return [

      {

        id: "not_interested",

        label: OBSERVATION_PERMISSION_STAGE_LABELS.not_interested,

        state: "current",

      },

    ];

  }



  const currentRank = STAGE_RANK[current];



  return MILESTONE_TRACK.map((id) => ({

    id,

    label: OBSERVATION_PERMISSION_STAGE_LABELS[id],

    state: milestoneState(currentRank, STAGE_RANK[id]),

  }));

}



export function formatObservationPermissionStatusLine(input: PathwayGateInput): string {

  return resolveNormalizedObservationPermission(input).label;

}


