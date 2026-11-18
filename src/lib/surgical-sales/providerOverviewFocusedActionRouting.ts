import type { ProviderOverviewExecutionAction } from "@/lib/surgical-sales/buildProviderOverviewExecutionCtas";



/** Focused overview modals — never the full Build Intelligence / question bank. */

export type ProviderOverviewFocusedModal =

  | "observationApproval"

  | "debriefStatus"

  | "scheduler"

  | "supportContacts"

  | "credentialing"

  | "followUp"

  | "logInteraction"

  | "evaluationPath"

  | "commitment"

  | "outcomeUpdate"

  | "productUse"

  | "moveToOutcomes";



export function resolveOverviewFocusedModal(

  action: ProviderOverviewExecutionAction,

): ProviderOverviewFocusedModal | null {

  if (action.href?.trim()) return null;



  const custom = action.customAction;

  if (custom === "openObservationApproval") return "observationApproval";

  if (custom === "logFieldIntel" || custom === "logInteraction") return "logInteraction";

  if (custom === "openScheduler") return "scheduler";

  if (custom === "openSupportContacts") return "supportContacts";

  if (custom === "openCredentialingNote") return "credentialing";

  if (custom === "openFollowUp") return "followUp";

  if (custom === "openEvaluationPath") return "evaluationPath";

  if (custom === "openDebriefStatus") return "debriefStatus";

  if (custom === "openCommitment") return "commitment";

  if (custom === "openOutcomeUpdate") return "outcomeUpdate";

  if (custom === "openProductUse") return "productUse";

  if (custom === "moveToOutcomes") return "moveToOutcomes";



  switch (action.id) {

    case "update_permission_status":

    case "request_observation_permission":

      return "observationApproval";

    case "add_scheduler":

      return "scheduler";

    case "add_support_contacts":

      return "supportContacts";

    case "add_credentialing_note":

      return "credentialing";

    case "create_follow_up":

      return "followUp";

    case "log_interaction":

      return "logInteraction";

    case "choose_evaluation_path":

      return "evaluationPath";

    case "confirm_commitment":

      return "commitment";

    case "log_outcome_update":

      return "outcomeUpdate";

    case "log_product_use":

      return "productUse";

    case "move_to_outcomes":

      return "moveToOutcomes";

    default:

      return null;

  }

}



export function overviewActionUsesIntelligenceWorkflow(action: ProviderOverviewExecutionAction): boolean {

  const href = action.href ?? "";

  return /[?&]mapping=1|openMapping|tab=intelligence/i.test(href);

}


