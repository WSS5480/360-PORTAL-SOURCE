import {

  DISCOVERY_FIELD_STATUS,

  resolveDiscoveryStructuredSignalStatus,

} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";



export type ObservationReadinessCheckId =

  | "observation_approval"

  | "provider_confirmed"

  | "case_scheduled"

  | "scheduler_identified"

  | "credentialing_complete";



export type ObservationReadinessCheckState = "complete" | "pending" | "blocked";



export type ObservationReadinessCheck = {

  id: ObservationReadinessCheckId;

  label: string;

  state: ObservationReadinessCheckState;

  required: boolean;

};



export type ObservationCaseReadinessBannerView = {

  headline: "READY FOR OBSERVATION" | "PREP IN PROGRESS";

  tone: "ready" | "not_ready";

  statusLabel: "READY FOR OBSERVATION" | "PREP IN PROGRESS";

  checks: ObservationReadinessCheck[];

  /** Required execution gates still open — drive mission banner urgency. */

  pendingChecks: ObservationReadinessCheck[];

  /** Admin access reference — shown only in collapsed Access Summary. */

  accessSummaryChecks: ObservationReadinessCheck[];

  readyToObserve: boolean;

};



function observationApprovalState(input: {

  caseRow: Record<string, unknown>;

  providerContact?: Record<string, unknown> | null;

}): ObservationReadinessCheck {

  const pathway = String(input.caseRow.observation_access_pathway ?? "").trim();

  if (pathway) {

    return {

      id: "observation_approval",

      label: "Observation approved",

      state: "complete",

      required: false,

    };

  }



  if (input.providerContact) {

    const status = resolveDiscoveryStructuredSignalStatus(

      "observation_approval",

      input.providerContact,

    );

    if (status === DISCOVERY_FIELD_STATUS.validated) {

      return {

        id: "observation_approval",

        label: "Observation approved",

        state: "complete",

        required: false,

      };

    }

    if (status === DISCOVERY_FIELD_STATUS.blocked) {

      return {

        id: "observation_approval",

        label: "Observation access blocked",

        state: "blocked",

        required: true,

      };

    }

    if (status === DISCOVERY_FIELD_STATUS.captured || status === DISCOVERY_FIELD_STATUS.conditional) {

      return {

        id: "observation_approval",

        label: "Observation approval partial",

        state: "pending",

        required: false,

      };

    }

  }



  return {

    id: "observation_approval",

    label: "Observation approval pending",

    state: "pending",

    required: false,

  };

}



function providerConfirmedState(caseRow: Record<string, unknown>): ObservationReadinessCheck {

  const hasProvider =

    Boolean(String(caseRow.surgeon_contact_id ?? "").trim()) ||

    Boolean(String(caseRow.surgeon_display ?? "").trim()) ||

    Boolean(String(caseRow.provider_name ?? "").trim());



  return {

    id: "provider_confirmed",

    label: hasProvider ? "Provider confirmed" : "Provider not assigned",

    state: hasProvider ? "complete" : "pending",

    required: true,

  };

}



function caseScheduledState(caseRow: Record<string, unknown>): ObservationReadinessCheck {

  const status = String(caseRow.status ?? "").trim().toLowerCase();

  const hasDate = Boolean(String(caseRow.case_date ?? "").trim());

  const scheduled = hasDate && (status === "scheduled" || status === "confirmed");



  if (scheduled) {

    return {

      id: "case_scheduled",

      label: "Case scheduled",

      state: "complete",

      required: true,

    };

  }



  if (hasDate && status !== "scheduled" && status !== "confirmed") {

    return {

      id: "case_scheduled",

      label: "Case date set — confirm status",

      state: "pending",

      required: true,

    };

  }



  return {

    id: "case_scheduled",

    label: "Case not scheduled",

    state: "pending",

    required: true,

  };

}



function schedulerIdentifiedState(caseRow: Record<string, unknown>): ObservationReadinessCheck {

  const owner = String(caseRow.observation_access_scheduling_owner ?? "").trim();

  return {

    id: "scheduler_identified",

    label: owner ? "Scheduler identified" : "Scheduling owner pending",

    state: owner ? "complete" : "pending",

    required: false,

  };

}



function credentialingCompleteState(caseRow: Record<string, unknown>): ObservationReadinessCheck {

  const cred = String(caseRow.observation_access_credentialing ?? "unknown").trim().toLowerCase();



  if (cred === "verified") {

    return {

      id: "credentialing_complete",

      label: "Credentialing complete",

      state: "complete",

      required: false,

    };

  }

  if (cred === "not_required") {

    return {

      id: "credentialing_complete",

      label: "Credentialing not required",

      state: "complete",

      required: false,

    };

  }

  if (cred === "in_progress") {

    return {

      id: "credentialing_complete",

      label: "Credentialing in progress",

      state: "pending",

      required: false,

    };

  }

  if (cred === "required_not_started") {

    return {

      id: "credentialing_complete",

      label: "Credentialing not started",

      state: "pending",

      required: false,

    };

  }



  return {

    id: "credentialing_complete",

    label: "Credentialing path pending",

    state: "pending",

    required: false,

  };

}



export function buildObservationCaseReadinessBanner(input: {

  caseRow: Record<string, unknown>;

  providerContact?: Record<string, unknown> | null;

}): ObservationCaseReadinessBannerView {

  const checks = [

    observationApprovalState(input),

    providerConfirmedState(input.caseRow),

    caseScheduledState(input.caseRow),

    schedulerIdentifiedState(input.caseRow),

    credentialingCompleteState(input.caseRow),

  ];



  const pendingChecks = checks.filter((check) => check.required && check.state !== "complete");

  const accessSummaryChecks = checks.filter(
    (check) =>
      check.id === "scheduler_identified" ||
      check.id === "credentialing_complete" ||
      (check.id === "observation_approval" && check.state !== "blocked"),
  );

  const readyToObserve = pendingChecks.length === 0;



  const statusLabel = readyToObserve ? "READY FOR OBSERVATION" : "PREP IN PROGRESS";



  return {

    headline: statusLabel,

    statusLabel,

    tone: readyToObserve ? "ready" : "not_ready",

    checks,

    pendingChecks,

    accessSummaryChecks,

    readyToObserve,

  };

}


