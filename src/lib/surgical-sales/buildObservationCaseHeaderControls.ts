import type { ObservationCaseExecutionStatusId } from "@/lib/surgical-sales/observationCaseExecutionStatus";
import { OBSERVATION_DETAIL_SECTION_LABELS } from "@/lib/surgical-sales/observationCaseDetailVocabulary";
import { isCaseDateInThePast } from "@/lib/surgical-sales/casePerformedStatus";

export type ObservationHeaderPrimaryActionId =
  | "start_observation"
  | "complete_observation"
  | "mark_completed"
  | "view_intelligence"
  | "update_datetime"
  | "reopen_observation";

export type ObservationHeaderMoreActionId =
  | "mark_completed"
  | "reschedule"
  | "cancel_observation"
  | "reopen_observation"
  | "start_observation"
  | "archive_case"
  | "convert_to_product_support";

export const OBSERVATION_HEADER_ACTION_LABELS: Record<
  ObservationHeaderPrimaryActionId | ObservationHeaderMoreActionId,
  string
> = {
  start_observation: OBSERVATION_DETAIL_SECTION_LABELS.startObservation,
  complete_observation: OBSERVATION_DETAIL_SECTION_LABELS.completeObservation,
  view_intelligence: OBSERVATION_DETAIL_SECTION_LABELS.viewIntelligence,
  update_datetime: "Update Date / Time",
  reopen_observation: "Reopen Observation",
  mark_completed: "Mark Completed",
  reschedule: "Reschedule",
  cancel_observation: "Cancel Observation",
  archive_case: "Archive Case",
  convert_to_product_support: "Change to Product Support",
};

export function observationToProductSupportCasePatch(): {
  case_type: "product_support";
  debrief_convert_to_product_support_case: true;
} {
  return {
    case_type: "product_support",
    debrief_convert_to_product_support_case: true,
  };
}

/** Primary header CTA for observation case lifecycle (not dictation). */
export function observationHeaderPrimaryAction(
  status: ObservationCaseExecutionStatusId,
  opts?: { caseDate?: unknown; todayYmd?: string },
): ObservationHeaderPrimaryActionId | null {
  switch (status) {
    case "scheduled":
      return isCaseDateInThePast(opts?.caseDate, opts?.todayYmd) ? "mark_completed" : "start_observation";
    case "in_progress":
      return "complete_observation";
    case "completed":
    case "debrief_planned":
      return "view_intelligence";
    case "rescheduled":
      return "update_datetime";
    case "cancelled":
      return "reopen_observation";
    default:
      return null;
  }
}

/** More-menu lifecycle actions for observation cases. */
export function observationHeaderMoreActions(
  status: ObservationCaseExecutionStatusId,
  opts?: { caseDate?: unknown; todayYmd?: string },
): ObservationHeaderMoreActionId[] {
  const lifecycle: ObservationHeaderMoreActionId[] = (() => {
    switch (status) {
      case "scheduled":
        return isCaseDateInThePast(opts?.caseDate, opts?.todayYmd)
          ? ["start_observation", "reschedule", "cancel_observation"]
          : ["mark_completed", "reschedule", "cancel_observation"];
      case "in_progress":
        return ["reschedule", "cancel_observation"];
      case "completed":
      case "debrief_planned":
        return ["reopen_observation"];
      case "rescheduled":
        return ["start_observation", "cancel_observation"];
      case "cancelled":
        return ["archive_case"];
      default:
        return [];
    }
  })();

  if (status === "cancelled") return lifecycle;
  return [...lifecycle, "convert_to_product_support"];
}
