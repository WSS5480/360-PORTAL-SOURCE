import {

  formatObservationPermissionStatusLine,

  observationPermissionStageLabel,

  resolveNormalizedObservationPermission,

  resolveObservationPermissionStage,

  type ObservationPermissionStageId,

} from "@/lib/surgical-sales/observationPermissionModel";



/** @deprecated Use ObservationPermissionStageId — kept for modal / API compatibility. */

export type ObservationStatusChoice = ObservationPermissionStageId | "denied";



export const OBSERVATION_STATUS_LABELS: Record<ObservationStatusChoice, string> = {

  unknown: "Unknown",

  interested: "Interested",

  permission_not_yet_confirmed: "Permission Requested",

  permission_confirmed: "Permission Confirmed (advances to Observation)",

  observation_scheduled: "Observation Scheduled",

  observation_completed: "Observation Completed",

  not_interested: "Not Interested",

  denied: "Not Interested",

};

export const OBSERVATION_STATUS_CHOICES: ObservationStatusChoice[] = [

  "unknown",

  "interested",

  "permission_not_yet_confirmed",

  "permission_confirmed",

  "observation_scheduled",

  "observation_completed",

  "not_interested",

];



/** Editable permission states in the observation approval modal (derived stages excluded). */

export const OBSERVATION_APPROVAL_EDIT_CHOICES = [

  "unknown",

  "interested",

  "permission_not_yet_confirmed",

  "permission_confirmed",

  "not_interested",

] as const satisfies readonly ObservationStatusChoice[];



export type ObservationApprovalEditChoice = (typeof OBSERVATION_APPROVAL_EDIT_CHOICES)[number];

/** Short labels for Mission Board fast status updates — no guided workflow copy. */
export const MISSION_BOARD_OBSERVATION_STATUS_LABELS: Record<ObservationApprovalEditChoice, string> = {
  unknown: "Unknown",
  interested: "Interested",
  permission_not_yet_confirmed: "Permission Requested",
  permission_confirmed: "Permission Confirmed",
  not_interested: "Not Interested",
};

export function missionBoardObservationStatusLabel(status: ObservationStatusChoice): string {
  if (status in MISSION_BOARD_OBSERVATION_STATUS_LABELS) {
    return MISSION_BOARD_OBSERVATION_STATUS_LABELS[status as ObservationApprovalEditChoice];
  }
  return observationStatusLabel(status);
}

export function observationStatusLabel(status: ObservationStatusChoice): string {

  return OBSERVATION_STATUS_LABELS[status];

}



/** Maps stored contact intelligence to the normalized observation permission model. */

export function resolveObservationStatusFromContact(

  contact: Record<string, unknown>,

  engagements?: import("@/lib/surgical-sales/engagements/providerEngagementSummary").ProviderEngagementSummary[],

): ObservationStatusChoice {

  const stage = resolveObservationPermissionStage({ contact, engagements });

  return stage;

}



export function resolveObservationStatusLabelFromContact(

  contact: Record<string, unknown>,

  engagements?: import("@/lib/surgical-sales/engagements/providerEngagementSummary").ProviderEngagementSummary[],

): string {

  return resolveNormalizedObservationPermission({ contact, engagements }).overviewLabel;

}



export function observationStatusGrantsPathwayAdvance(status: ObservationStatusChoice): boolean {

  if (status === "denied") return false;

  return (

    status === "permission_confirmed" ||

    status === "observation_scheduled" ||

    status === "observation_completed"

  );

}

/** Mission board drag-drop — only explicit permission on file advances Discovery → Observation. */
export function observationStatusGrantsMissionBoardObservationAdvance(
  status: ObservationStatusChoice,
): boolean {
  return status === "permission_confirmed";
}



export function formatObservationPermissionOverviewLine(

  contact: Record<string, unknown>,

  engagements?: import("@/lib/surgical-sales/engagements/providerEngagementSummary").ProviderEngagementSummary[],

): string {

  return formatObservationPermissionStatusLine({ contact, engagements });

}



export {

  observationPermissionStageLabel,

  resolveNormalizedObservationPermission,

  resolveObservationPermissionStage,

};
