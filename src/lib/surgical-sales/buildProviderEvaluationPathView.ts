/**

 * Evaluation path — activity within the Evaluation pathway stage (not a stage itself).

 * Examples: Product Trial, 360 Experience, In-Service, Surgeon Education, Additional Observation.

 */



import type { ProviderMissionEngagementPreview } from "@/lib/surgical-sales/buildProviderMissionEngagementPreview";

import { formatEngagementMissionWhenLabel } from "@/lib/surgical-sales/engagements/engagementScheduleDisplay";

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";

import {

  isUpcomingEngagementStatus,

  pickNextUpcomingEngagement,

} from "@/lib/surgical-sales/engagements/providerEngagementSummary";

import {

  normalizeEngagementType,

  type EngagementType,

} from "@/lib/surgical-sales/engagements/engagementTypes";

import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";

import {
  evaluationEngagementPreviewAsSummary,
  resolveProviderEvaluationEngagementPreview,
} from "@/lib/surgical-sales/missionBoardEvaluationEngagement";

import {

  deriveProviderObservationCount,

  PROVIDER_OBSERVATION_TARGET,

} from "@/lib/surgical-sales/providerObservationProgress";

import {
  EVALUATION_STATUS_ACTIVE,
  EVALUATION_STATUS_COMPLETE,
  EVALUATION_STATUS_NOT_SCHEDULED,
  EVALUATION_STATUS_PLANNED,
  evaluationActivityStatusLabel,
  resolveStoredEvaluationActivityStatus,
} from "@/lib/surgical-sales/evaluationActivityStatus";

export {
  EVALUATION_STATUS_ACTIVE,
  EVALUATION_STATUS_COMPLETE,
  EVALUATION_STATUS_NOT_SCHEDULED,
  EVALUATION_STATUS_PLANNED,
} from "@/lib/surgical-sales/evaluationActivityStatus";
import { hasProductFitSignal } from "@/lib/surgical-sales/pathwayStageGates";

import {

  SALES_PATHWAY_EVALUATION_ACTIVITIES,

  type SalesPathwayEvaluationActivity,

} from "@/lib/surgical-sales/salesPathwayCanonical";



export type ProviderEvaluationPathView = {

  pathLabel: SalesPathwayEvaluationActivity;

  statusLabel: string;

  nextActionLabel: string;

};



export const EVALUATION_SCHEDULE_ACTION_LABELS: Record<SalesPathwayEvaluationActivity, string> = {
  "Product Trial": "Schedule product trial case",
  "360 Experience": "Schedule 360 Experience",
  "In-Service": "Schedule in-service",
  "Surgeon Education": "Schedule surgeon education",
  "Additional Observation": "Add observation case",
};

export const EVALUATION_PREPARE_ACTION_LABELS: Record<SalesPathwayEvaluationActivity, string> = {
  "Product Trial": "Prepare product trial case",
  "360 Experience": "Prepare 360 Experience",
  "In-Service": "Prepare in-service",
  "Surgeon Education": "Prepare surgeon education",
  "Additional Observation": "Add observation case",
};

export const MISSION_BOARD_CHOOSE_EVALUATION_PATH_LABEL = "Choose Evaluation Path";

/** Status line when no evaluation path has been selected yet. */
export const EVALUATION_PATH_NEEDED_LABEL = "Evaluation Path Needed";

export function isEvaluationStatusComplete(statusLabel: string): boolean {
  return statusLabel === EVALUATION_STATUS_COMPLETE;
}



const COMPLETED_STATUSES = new Set(["completed", "done", "closed"]);

const IN_PROGRESS_STATUSES = new Set(["in_progress", "active"]);



function resolveUpcomingEngagementType(

  engagement: ProviderMissionEngagementPreview | null | undefined,

): EngagementType | null {

  if (!engagement) return null;

  if (engagement.engagement_type) {
    const normalized = normalizeEngagementType(String(engagement.engagement_type));
    return normalized || null;
  }

  const label = String(engagement.type_label ?? "").toLowerCase();

  if (/intro/.test(label)) return "intro_call";

  if (/observation access/i.test(label)) return "observation_request";

  if (/debrief/.test(label)) return "provider_debrief";

  if (/office visit|360/.test(label)) return "office_visit_360";

  if (/in-service|training/.test(label)) return "in_service_training";

  if (/product evaluation|product demo|trial/.test(label)) return "product_demo";

  if (/surgeon education|peer discussion|lab visit|education/.test(label)) {

    return "peer_discussion";

  }

  if (/observation|or visit/.test(label)) return "or_visit";

  return null;

}



function engagementMatchesEvaluationPath(

  engagement: ProviderEngagementSummary,

  path: SalesPathwayEvaluationActivity,

): boolean {

  const type = normalizeEngagementType(String(engagement.engagement_type ?? ""));

  const label = String(engagement.engagement_type_label ?? engagement.title ?? "").toLowerCase();



  switch (path) {

    case "Product Trial":

      return (

        type === "product_demo" ||

        type === "evaluation_planning" ||

        type === "evaluation_follow_up" ||

        /product|trial|demo/.test(label)

      );

    case "360 Experience":

      return type === "office_visit_360" || /360|office visit|sim lab/.test(label);

    case "In-Service":

      return type === "in_service_training" || /in-service|training/.test(label);

    case "Surgeon Education":

      return (

        type === "peer_discussion" ||

        (type === "evaluation_planning" && /surgeon education|education|peer/.test(label)) ||

        /surgeon education|peer discussion|clinical education/.test(label)

      );

    case "Additional Observation":

      return type === "or_visit" || /observation|or visit/.test(label);

    default:

      return false;

  }

}



function hasCompletedProductTrialCase(cases: Array<Record<string, unknown>> | undefined): boolean {

  return (cases ?? []).some((row) => {

    if (String(row.case_type ?? "").trim().toLowerCase() !== "product_support") return false;

    const status = String(row.status ?? "").trim().toLowerCase();

    return COMPLETED_STATUSES.has(status);

  });

}



export function resolveEvaluationStatus(input: {
  pathLabel: SalesPathwayEvaluationActivity;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  upcomingEngagement?: ProviderMissionEngagementPreview | null;
  contact?: Record<string, unknown> | null;
}): string {
  const stored = resolveStoredEvaluationActivityStatus(input.contact);
  if (stored) return evaluationActivityStatusLabel(stored);

  const engagements = input.engagements ?? [];

  if (input.pathLabel === "Product Trial" && hasCompletedProductTrialCase(input.cases)) {
    return EVALUATION_STATUS_COMPLETE;
  }

  const completed = engagements.some(
    (engagement) =>
      COMPLETED_STATUSES.has(String(engagement.status ?? "").toLowerCase()) &&
      engagementMatchesEvaluationPath(engagement, input.pathLabel),
  );
  if (completed) return EVALUATION_STATUS_COMPLETE;

  const inProgress = engagements.some(
    (engagement) =>
      IN_PROGRESS_STATUSES.has(String(engagement.status ?? "").toLowerCase()) &&
      engagementMatchesEvaluationPath(engagement, input.pathLabel),
  );
  if (inProgress) return EVALUATION_STATUS_ACTIVE;

  const scheduled = engagements.some((engagement) => {
    const status = String(engagement.status ?? "").toLowerCase();
    const isScheduled =
      isUpcomingEngagementStatus(engagement.status) ||
      status === "scheduled" ||
      status === "confirmed" ||
      status === "planned";
    return isScheduled && engagementMatchesEvaluationPath(engagement, input.pathLabel);
  });
  if (scheduled) return EVALUATION_STATUS_PLANNED;

  if (
    input.upcomingEngagement &&
    deriveProviderEvaluationPath({ upcomingEngagement: input.upcomingEngagement }) ===
      input.pathLabel
  ) {
    return EVALUATION_STATUS_PLANNED;
  }

  return EVALUATION_STATUS_NOT_SCHEDULED;
}



export function resolveEvaluationNextActionLabel(input: {

  pathLabel: SalesPathwayEvaluationActivity;

  engagements?: ProviderEngagementSummary[];

  upcomingEngagement?: ProviderMissionEngagementPreview | null;

}): string {

  const upcomingType = resolveUpcomingEngagementType(input.upcomingEngagement);

  const upcoming = pickNextUpcomingEngagement(input.engagements ?? []);

  const hasScheduledEvaluation =

    Boolean(input.upcomingEngagement) ||

    (upcoming != null &&

      isUpcomingEngagementStatus(upcoming.status) &&

      engagementMatchesEvaluationPath(upcoming, input.pathLabel));



  if (hasScheduledEvaluation) {

    if (upcomingType === "office_visit_360") {

      return EVALUATION_PREPARE_ACTION_LABELS["360 Experience"];

    }

    if (upcomingType === "product_demo" || upcomingType === "evaluation_planning") {

      return EVALUATION_PREPARE_ACTION_LABELS["Product Trial"];

    }

    if (upcomingType === "in_service_training") {

      return EVALUATION_PREPARE_ACTION_LABELS["In-Service"];

    }

    if (upcomingType === "peer_discussion") {

      return EVALUATION_PREPARE_ACTION_LABELS["Surgeon Education"];

    }

    if (upcomingType === "or_visit") {

      return EVALUATION_PREPARE_ACTION_LABELS["Additional Observation"];

    }

    return EVALUATION_PREPARE_ACTION_LABELS[input.pathLabel];

  }



  return EVALUATION_SCHEDULE_ACTION_LABELS[input.pathLabel];

}



export function resolveStoredEvaluationPath(
  contact?: Record<string, unknown> | null,
): SalesPathwayEvaluationActivity | null {
  const raw = String(contact?.provider_evaluation_path ?? "").trim();
  return isSalesPathwayEvaluationActivity(raw) ? raw : null;
}

export function hasProviderSelectedEvaluationPath(contact?: Record<string, unknown> | null): boolean {
  return resolveStoredEvaluationPath(contact) !== null;
}

/** Infer recommended path from engagements and intelligence — ignores stored selection. */
export function inferProviderEvaluationPath(input: {
  upcomingEngagement?: ProviderMissionEngagementPreview | null;
  linkedOpportunitiesCount?: number;
  observationCount?: number;
  contact?: Record<string, unknown>;
}): SalesPathwayEvaluationActivity {

  const upcomingType = resolveUpcomingEngagementType(input.upcomingEngagement);

  const upcomingLabel = String(input.upcomingEngagement?.type_label ?? "").toLowerCase();

  const observationCount = Math.max(0, input.observationCount ?? 0);

  const linkedOpportunitiesCount = Math.max(0, input.linkedOpportunitiesCount ?? 0);



  if (
    upcomingType === "peer_discussion" ||
    /surgeon education|peer discussion|lab visit|clinical education/.test(upcomingLabel)
  ) {

    return "Surgeon Education";

  }



  if (

    upcomingType === "product_demo" ||

    (upcomingType === "evaluation_planning" && !/surgeon education|education/.test(upcomingLabel)) ||

    upcomingType === "evaluation_follow_up"

  ) {

    return "Product Trial";

  }



  if (upcomingType === "office_visit_360") {

    return "360 Experience";

  }



  if (upcomingType === "in_service_training") {

    return "In-Service";

  }



  if (upcomingType === "or_visit" && observationCount >= PROVIDER_OBSERVATION_TARGET) {

    return "Additional Observation";

  }



  if (linkedOpportunitiesCount > 0) {

    return "Product Trial";

  }



  if (input.contact && hasProductFitSignal({ contact: input.contact })) {

    return "Product Trial";

  }



  return "360 Experience";
}

export function deriveProviderEvaluationPath(input: {
  upcomingEngagement?: ProviderMissionEngagementPreview | null;
  linkedOpportunitiesCount?: number;
  observationCount?: number;
  contact?: Record<string, unknown>;
}): SalesPathwayEvaluationActivity {
  const stored = resolveStoredEvaluationPath(input.contact);
  if (stored) return stored;
  return inferProviderEvaluationPath(input);
}

export function buildProviderEvaluationPathView(

  input: Parameters<typeof deriveProviderEvaluationPath>[0] & {

    engagements?: ProviderEngagementSummary[];

    cases?: Array<Record<string, unknown>>;

  },

): ProviderEvaluationPathView {

  const pathLabel = deriveProviderEvaluationPath(input);

  return {

    pathLabel,

    statusLabel: resolveEvaluationStatus({
      pathLabel,
      engagements: input.engagements,
      cases: input.cases,
      upcomingEngagement: input.upcomingEngagement,
      contact: input.contact,
    }),

    nextActionLabel: resolveEvaluationNextActionLabel({

      pathLabel,

      engagements: input.engagements,

      upcomingEngagement: input.upcomingEngagement,

    }),

  };

}



export function upcomingEngagementPreviewFromSummary(

  engagement: ProviderEngagementSummary | null | undefined,

): ProviderMissionEngagementPreview | null {

  if (!engagement) return null;

  return {

    id: engagement.id,

    href: `/portal/sales/engagements/${encodeURIComponent(engagement.id)}`,

    engagement_type: engagement.engagement_type,

    type_label:

      engagement.engagement_type_label?.trim() ||

      engagement.title?.trim() ||

      "Engagement",

    datetime_label: formatEngagementMissionWhenLabel(engagement),

    location_label: engagement.organization_name?.trim() || "",

    primary_goal: "",

    open_items: [],

  };

}



export function buildProviderEvaluationPathViewFromEngagements(input: {

  contact?: Record<string, unknown>;

  engagements?: ProviderEngagementSummary[];

  linkedOpportunitiesCount?: number;

  observationCount?: number;

  cases?: Array<Record<string, unknown>>;

}): ProviderEvaluationPathView {

  const upcomingEngagement = upcomingEngagementPreviewFromSummary(

    pickNextUpcomingEngagement(input.engagements),

  );

  return buildProviderEvaluationPathView({

    upcomingEngagement,

    linkedOpportunitiesCount: input.linkedOpportunitiesCount,

    observationCount: input.observationCount,

    contact: input.contact,

    engagements: input.engagements,

    cases: input.cases,

  });

}



export function providerEvaluationPathFromDirectoryRow(

  provider: ProviderDirectoryRow,

): ProviderEvaluationPathView {

  const evaluationPreview = resolveProviderEvaluationEngagementPreview(provider);

  return buildProviderEvaluationPathView({

    upcomingEngagement: provider.upcoming_engagement,

    linkedOpportunitiesCount: provider.linked_opportunities_count,

    observationCount: deriveProviderObservationCount(provider),

    contact: provider as Record<string, unknown>,

    engagements: evaluationPreview
      ? [evaluationEngagementPreviewAsSummary(evaluationPreview)]
      : undefined,

  });

}



export function isSalesPathwayEvaluationActivity(

  value: string,

): value is SalesPathwayEvaluationActivity {

  return (SALES_PATHWAY_EVALUATION_ACTIVITIES as readonly string[]).includes(value);

}


