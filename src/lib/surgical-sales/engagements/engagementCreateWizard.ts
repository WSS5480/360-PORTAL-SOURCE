import { pickPrimaryOrgLink, type ProviderOrgLink } from "@/lib/surgical-sales/providerDirectory";
import type { EngagementStatus, EngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import {
  isOfficeVisitEngagement,
  resolveEngagementWorkflowMode,
  supportsPlaybookTemplates,
  type EngagementWorkflowMode,
  type EngagementWorkflowModeOverride,
} from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";
import {
  buildEngagementWorkflowPatch,
  countWorkflowFieldsFilled,
  emptyEngagementWorkflowDraft,
  hasWorkflowPlanData,
  strategicPreCallKeysFromDraft,
  type EngagementWorkflowDraft,
} from "@/lib/surgical-sales/engagements/engagementWorkflowFields";
import { PRE_CALL_PLAN_FIELD_CONFIGS, type PreCallPlanFieldKey } from "@/lib/surgical-sales/preCallPlanFields";
import {
  buildEngagementScheduleFieldsForNow,
  buildEngagementScheduleFieldsFromBasics,
} from "@/lib/surgical-sales/engagements/engagementScheduleDisplay";
import {
  resolvePlanningStatusOnCreate,
  type EngagementPlanningMode,
  type EngagementPlanningStatus,
} from "@/lib/surgical-sales/engagements/engagementPlanningModel";
import { engagementCategoryForType, type EngagementMissionGroupId } from "@/lib/surgical-sales/engagements/engagementTypeMissionPicker";
import * as engagementLifecycle from "@/lib/surgical-sales/engagements/engagementLifecycle";
import * as engagementUiLabels from "@/lib/surgical-sales/engagements/engagementUiLabels";

export { ENGAGEMENT_DEBRIEF_LABEL, ENGAGEMENT_EDIT_ENGAGEMENT_LABEL } from "@/lib/surgical-sales/engagements/engagementUiLabels";

export {
  buildEngagementBeginCallHref,
  buildEngagementCallHref,
  buildEngagementDebriefHref,
  buildEngagementDetailHref,
  buildEngagementPrepareForMeetingHref,
} from "@/lib/surgical-sales/engagements/engagementLifecycle";

export type EngagementOrgOption = { id: string; name: string };

export type ProviderOrgLinkInput = {
  account_id?: string;
  is_primary_org?: boolean | null;
  is_active?: boolean | null;
  accounts?: { id?: string; name?: string | null } | null;
};

export function orgOptionsFromProviderLinks(links: ProviderOrgLinkInput[] | undefined): EngagementOrgOption[] {
  const active = (links ?? []).filter((l) => l.is_active !== false);
  const seen = new Set<string>();
  const out: EngagementOrgOption[] = [];
  for (const l of active) {
    const id = String(l.account_id || l.accounts?.id || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const name = String(l.accounts?.name || "").trim() || "Organization";
    out.push({ id, name });
  }
  return out;
}

export function primaryOrganizationIdFromLinks(links: ProviderOrgLinkInput[] | undefined): string {
  const primary = pickPrimaryOrgLink((links ?? []) as ProviderOrgLink[]);
  return String(primary?.account_id || primary?.accounts?.id || "").trim();
}

export function resolveOrganizationIdForProvider(
  links: ProviderOrgLinkInput[] | undefined,
  options: { currentOrganizationId?: string; preferUrlOrganizationId?: string },
): string {
  const linkOrgs = orgOptionsFromProviderLinks(links);
  const primaryId = primaryOrganizationIdFromLinks(links);
  const urlId = String(options.preferUrlOrganizationId ?? "").trim();
  const current = String(options.currentOrganizationId ?? "").trim();

  if (urlId && linkOrgs.some((o) => o.id === urlId)) return urlId;
  if (current && linkOrgs.some((o) => o.id === current)) return current;
  if (primaryId) return primaryId;
  if (linkOrgs.length === 1) return linkOrgs[0]!.id;
  return "";
}

export const ENGAGEMENT_WIZARD_STEPS = [
  { id: "type", label: "Type" },
  { id: "details", label: "Details" },
] as const;

export type EngagementWizardStepId = (typeof ENGAGEMENT_WIZARD_STEPS)[number]["id"];

/** How the rep chose to create the engagement from the type step. */
export type EngagementCreationPath = EngagementPlanningMode;

/** @deprecated Removed from create wizard — use ENGAGEMENT_SAVE_LABEL */
export const ENGAGEMENT_SCHEDULE_TOUCHPOINT_LABEL = "Schedule touchpoint";
/** @deprecated */
export const ENGAGEMENT_START_MISSION_LABEL = ENGAGEMENT_SCHEDULE_TOUCHPOINT_LABEL;
/** @deprecated */
export const ENGAGEMENT_PREPARE_FIRST_LABEL = "Prepare First";

export const ENGAGEMENT_SAVE_LABEL = "Save Engagement";
export const ENGAGEMENT_SAVE_AND_PREPARE_LABEL = "Save & Prepare";
export const ENGAGEMENT_START_ENGAGEMENT_NOW_LABEL = "Start Engagement Now";
/** @deprecated Use ENGAGEMENT_START_ENGAGEMENT_NOW_LABEL */
export const ENGAGEMENT_START_CALL_NOW_LABEL = ENGAGEMENT_START_ENGAGEMENT_NOW_LABEL;

export const ENGAGEMENT_CREATE_DETAILS_LEAD =
  "Provider and organization are required. Date and time are optional — set them when you know the schedule.";

export const ENGAGEMENT_MISSION_CHOICE_HELPER =
  "Choose a type, then save the engagement or open Prepare or start when you are ready.";

/** Field execution — opens Field Briefing and marks the touch in progress. */
/** @deprecated Use engagementWorkflowPrimaryCtaLabel — prepared intro_call */
/** @deprecated Use ENGAGEMENT_BEGIN_ENGAGEMENT_LABEL */
export const ENGAGEMENT_BEGIN_INTRO_CALL_LABEL = "Start Engagement";
export const ENGAGEMENT_BEGIN_ENGAGEMENT_LABEL = "Start Engagement";
/** @deprecated Use engagementWorkflowPrimaryCtaLabel */
export const ENGAGEMENT_BEGIN_CALL_LABEL = ENGAGEMENT_BEGIN_ENGAGEMENT_LABEL;
/** @deprecated Use engagementWorkflowPrimaryCtaLabel */
export const ENGAGEMENT_OPEN_LABEL = "Prepare";

/** @deprecated Use ENGAGEMENT_MISSION_CHOICE_HELPER */
export const ENGAGEMENT_QUICK_ADD_HELPER = ENGAGEMENT_MISSION_CHOICE_HELPER;

/** Human label for the preparation segment in wizard progress and review (not “Pre-Call Plan”). */
export const ENGAGEMENT_WIZARD_PREPARATION_LABEL = "Preparation";

/**
 * Wizard “Preparation” = goals, playbooks, and planning fields while creating the engagement.
 * Not the same as Prepare for Meeting (intelligence briefing on an existing engagement).
 */
export const ENGAGEMENT_WIZARD_PREPARATION_STEP_HINT =
  "Template and intelligence suggestions are starting points only — confirm what belongs in the briefing before you save.";

export const ENGAGEMENT_WIZARD_PREPARATION_STEP_HINT_INTRO_CALL =
  "Template and provider intelligence suggestions are starting points only — nothing is saved as confirmed intelligence until you choose it.";

export function engagementWizardPreparationStepHint(engagementType: string): string {
  return normalizeEngagementType(engagementType) === "intro_call"
    ? ENGAGEMENT_WIZARD_PREPARATION_STEP_HINT_INTRO_CALL
    : ENGAGEMENT_WIZARD_PREPARATION_STEP_HINT;
}

/** Post-save briefing route title and links outside engagement detail (wizard, provider preview). */
/** @deprecated Use ENGAGEMENT_EDIT_ENGAGEMENT_LABEL */
export const ENGAGEMENT_EDIT_DETAILS_LABEL = engagementUiLabels.ENGAGEMENT_EDIT_ENGAGEMENT_LABEL;
export const ENGAGEMENT_EDIT_DATE_LABEL = "Edit Date";
export const ENGAGEMENT_EDIT_TIME_LABEL = "Edit Time";
export const ENGAGEMENT_EDIT_LOCATION_LABEL = "Edit Location";
export const ENGAGEMENT_EDIT_TYPE_LABEL = "Edit Engagement Type";

export const ENGAGEMENT_PATHWAY_PREPARATION_OPTIONAL_LABEL = "Optional";

export const ENGAGEMENT_EMPTY_PLANNED_PREPARATION_LABEL = "Not started";

export const ENGAGEMENT_EMPTY_PLANNED_OBJECTIVE_LABEL = "Not set yet";

export const ENGAGEMENT_EMPTY_PLANNED_NEXT_STEP =
  "Prepare before the touchpoint or capture the outcome after the engagement.";

/** @deprecated Use engagementWorkflowPrimaryCtaLabel — planned */
export const ENGAGEMENT_PREPARE_MISSION_LABEL = "Prepare";
/** @deprecated Use ENGAGEMENT_DEBRIEF_LABEL */
export const ENGAGEMENT_LOG_OUTCOME_LABEL = engagementUiLabels.ENGAGEMENT_DEBRIEF_LABEL;

export const ENGAGEMENT_PREPARE_FOR_MEETING_LABEL = "Prepare for Meeting";

/** Post-engagement execution record for one touch. */
export const ENGAGEMENT_RECORD_TITLE = "Engagement record";

export const ENGAGEMENT_DELETE_LABEL = "Delete engagement";
export const ENGAGEMENT_RESTORE_LABEL = "Restore engagement";
export const ENGAGEMENT_DELETE_CONFIRM_MESSAGE =
  "Delete this engagement? It will be removed from active lists. Linked case and history are kept.";
export const ENGAGEMENT_RESTORE_CONFIRM_MESSAGE =
  "Restore this engagement to your active engagement lists?";

/** @deprecated Use ENGAGEMENT_RECORD_TITLE */
export const ENGAGEMENT_WORKSPACE_TITLE = ENGAGEMENT_RECORD_TITLE;

/** @deprecated Use ENGAGEMENT_DEBRIEF_LABEL */
export const ENGAGEMENT_CAPTURE_DEBRIEF_LABEL = engagementUiLabels.ENGAGEMENT_DEBRIEF_LABEL;

/** Field Briefing route — tactical prep during / before a touch. */
export const ENGAGEMENT_FIELD_BRIEFING_LABEL = "Open Field Briefing";
export const ENGAGEMENT_GENERATE_FIELD_BRIEFING_LABEL = "Generate Field Briefing";
export const ENGAGEMENT_FIELD_BRIEFING_PAGE_KICKER = "Field Briefing";
export const ENGAGEMENT_FIELD_BRIEFING_PAGE_TITLE = "Field Briefing";
/** Field Briefing deck — execution console identity. */
export const FIELD_EXECUTION_CONSOLE_KICKER = "Field execution console";
export const PROVIDER_MISSION_BRIEF_KICKER = "Provider mission brief";

/** Primary CTA from workspace → tactical prep route. */
export const ENGAGEMENT_DETAIL_OPEN_FIELD_BRIEFING_LABEL = ENGAGEMENT_FIELD_BRIEFING_LABEL;

/** @deprecated Use ENGAGEMENT_FIELD_BRIEFING_LABEL */
export const ENGAGEMENT_DETAIL_REFINE_PREP_LABEL = ENGAGEMENT_FIELD_BRIEFING_LABEL;
/** @deprecated Use ENGAGEMENT_FIELD_BRIEFING_LABEL */
export const ENGAGEMENT_DETAIL_ADJUST_STRATEGY_LABEL = ENGAGEMENT_FIELD_BRIEFING_LABEL;

/** @deprecated Tactical editing lives on Field Briefing, not the workspace */
export const ENGAGEMENT_REFINE_PREP_SECTION_TITLE = "Workflow planning";

/** Prepare for Meeting footer — primary field action. */
export const PREPARE_CAPTURE_INTEL_LABEL = "Capture Intel";

/** Field Briefing footer — execution-first navigation. */
/** @deprecated Use ENGAGEMENT_DEBRIEF_LABEL */
export const FIELD_BRIEFING_COMPLETE_CALL_LABEL = engagementUiLabels.ENGAGEMENT_DEBRIEF_LABEL;
export const FIELD_BRIEFING_ADD_NOTE_LABEL = "Add Note";
export const FIELD_BRIEFING_BACK_TO_PROVIDER_LABEL = "Back to Provider";

export function buildPrepareCaptureIntelHref(providerId: string): string {
  return `/portal/sales/providers/${encodeURIComponent(providerId)}?tab=intelligence`;
}

/** @deprecated Use buildEngagementBeginCallHref */
export function buildEngagementStartMissionHref(engagementId: string): string {
  return engagementLifecycle.buildEngagementBeginCallHref(engagementId);
}

/** @deprecated Use ENGAGEMENT_BEGIN_CALL_LABEL */
export const ENGAGEMENT_START_MISSION_LIVE_LABEL = ENGAGEMENT_BEGIN_CALL_LABEL;

export function buildEngagementAddNoteHref(providerId: string): string {
  return `/portal/sales/providers/${encodeURIComponent(providerId)}?tab=activity&note=1`;
}

export const PROVIDER_OVERVIEW_LABEL = "Provider Overview";

export function buildProviderOverviewHref(providerId: string): string {
  return `/portal/sales/providers/${encodeURIComponent(providerId)}?tab=overview`;
}

/** Safe in-app return target from query params (e.g. case or provider flows). */
export function normalizeEngagementCreateReturnTo(raw: string | null | undefined): string | null {
  const path = String(raw ?? "").trim();
  if (!path.startsWith("/portal/") || path.startsWith("//")) return null;
  return path;
}

/** Back target for the create-engagement wizard — provider context when known. */
export function resolveEngagementCreateBackHref(input: {
  providerId?: string | null;
  returnTo?: string | null;
}): string {
  const returnTo = normalizeEngagementCreateReturnTo(input.returnTo);
  if (returnTo) return returnTo;
  const providerId = String(input.providerId ?? "").trim();
  if (providerId) return buildProviderOverviewHref(providerId);
  return "/portal/sales/engagements";
}

/** Back navigation from engagement / field briefing surfaces. */
export const ENGAGEMENT_NAV_BACK_TO_PROVIDER = `← ${PROVIDER_OVERVIEW_LABEL}`;

/** @deprecated Use workflow draft + STRATEGIC_PLAN_FIELD_KEYS */
export const ENGAGEMENT_WIZARD_PRE_CALL_FIELD_KEYS = [
  "observation_goal",
  "pre_observation_impact_opening_statement",
  "pre_observation_probes",
  "pre_observation_tools_resources",
  "pre_observation_value_hypothesis",
  "pre_observation_planned_close",
  "pre_observation_additional_notes",
] as const satisfies readonly PreCallPlanFieldKey[];

export type EngagementWizardCompletionStatusId =
  | "not_started"
  | "in_progress"
  | "complete"
  | "outcome_recorded";

export const ENGAGEMENT_WIZARD_COMPLETION_LABELS: Record<EngagementWizardCompletionStatusId, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
  outcome_recorded: "Completed / outcome recorded",
};

export type EngagementBasicsDraft = {
  provider_id: string;
  organization_id: string;
  engagement_type: string;
  engagement_date: string;
  /** Optional HH:mm — when empty, time displays as TBD and scheduled_at is not set. */
  engagement_time: string;
  opportunity_id: string;
  case_id: string;
  product_line: string;
  /** Optional link to source observation engagement (Observation Debrief). */
  source_observation_id: string;
  /** @deprecated Intro Call no longer uses prep mode — retained for API compat */
  prep_mode: string;
  /** Intro Call — comma-separated conversation focus chip ids */
  intro_call_conversation_focus: string;
};

export type EngagementWizardProgress = {
  overallPercent: number;
  completionStatus: EngagementWizardCompletionStatusId;
  completionLabel: string;
  workflowMode: EngagementWorkflowMode;
  planningLabel: string;
  basics: { filled: number; total: number; percent: number };
  planning: { filled: number; total: number; percent: number };
  stepProgress: Record<EngagementWizardStepId, { filled: number; total: number; percent: number }>;
};

export function emptyEngagementBasicsDraft(): EngagementBasicsDraft {
  return {
    provider_id: "",
    organization_id: "",
    engagement_type: "",
    engagement_date: "",
    engagement_time: "",
    opportunity_id: "",
    case_id: "",
    product_line: "",
    source_observation_id: "",
    prep_mode: "",
    intro_call_conversation_focus: "",
  };
}

/** @deprecated Prefer emptyEngagementWorkflowDraft */
export function emptyEngagementPreCallDraft(): Record<PreCallPlanFieldKey, string> {
  const draft = {} as Record<PreCallPlanFieldKey, string>;
  for (const field of PRE_CALL_PLAN_FIELD_CONFIGS) {
    draft[field.key] = "";
  }
  return draft;
}

function basicsFilledCount(basics: EngagementBasicsDraft): number {
  let n = 0;
  if (basics.engagement_type.trim()) n += 1;
  if (basics.provider_id.trim()) n += 1;
  if (basics.organization_id.trim()) n += 1;
  if (basics.engagement_date.trim()) n += 1;
  if (basics.opportunity_id.trim()) n += 1;
  return n;
}

const BASICS_TOTAL = 5;

export function wizardPlanningLabel(
  _engagementType: string,
  _workflowModeOverride?: EngagementWorkflowModeOverride | null,
): string {
  return ENGAGEMENT_WIZARD_PREPARATION_LABEL;
}

export function computeEngagementWizardProgress(
  basics: EngagementBasicsDraft,
  workflowDraft: EngagementWorkflowDraft,
  options?: {
    markOutcomeRecorded?: boolean;
    templateChosen?: boolean;
    workflowModeOverride?: EngagementWorkflowModeOverride | null;
  },
): EngagementWizardProgress {
  const workflowMode = resolveEngagementWorkflowMode(basics.engagement_type, options?.workflowModeOverride);
  const basicsFilled = basicsFilledCount(basics);
  const basicsPercent = Math.round((basicsFilled / BASICS_TOTAL) * 100);

  const planningCounts = countWorkflowFieldsFilled(workflowDraft, workflowMode, basics.engagement_type);
  const planningPercent =
    planningCounts.total > 0 ? Math.round((planningCounts.filled / planningCounts.total) * 100) : 0;

  const overallPercent = basicsPercent;

  let completionStatus: EngagementWizardCompletionStatusId = "not_started";
  if (options?.markOutcomeRecorded) {
    completionStatus = "outcome_recorded";
  } else if (
    planningCounts.filled >= Math.min(2, planningCounts.total) &&
    basics.provider_id.trim() &&
    basics.engagement_type.trim()
  ) {
    completionStatus = "complete";
  } else if (basicsFilled > 0 || planningCounts.filled > 0 || options?.templateChosen) {
    completionStatus = "in_progress";
  }

  const typeSelected = Boolean(basics.engagement_type.trim());

  return {
    overallPercent,
    completionStatus,
    completionLabel: ENGAGEMENT_WIZARD_COMPLETION_LABELS[completionStatus],
    workflowMode,
    planningLabel: ENGAGEMENT_WIZARD_PREPARATION_LABEL,
    basics: { filled: basicsFilled, total: BASICS_TOTAL, percent: basicsPercent },
    planning: { filled: planningCounts.filled, total: planningCounts.total, percent: planningPercent },
    stepProgress: {
      type: {
        filled: typeSelected ? 1 : 0,
        total: 1,
        percent: typeSelected ? 100 : 0,
      },
      details: {
        filled: Math.min(basicsFilled, 4),
        total: 4,
        percent:
          basics.provider_id && basics.organization_id && basics.engagement_type
            ? 100
            : basics.provider_id && basics.engagement_type
              ? 67
              : basics.engagement_type
                ? 33
                : 0,
      },
    },
  };
}

export function resolveEngagementStatusOnCreate(params: {
  save_mode: "draft" | "final";
  mark_outcome_recorded?: boolean;
  basics: EngagementBasicsDraft;
  workflowDraft: EngagementWorkflowDraft;
  workflowModeOverride?: EngagementWorkflowModeOverride | null;
}): EngagementStatus {
  if (params.save_mode === "draft") return "planned";
  if (params.mark_outcome_recorded) return "completed";
  const mode = resolveEngagementWorkflowMode(params.basics.engagement_type, params.workflowModeOverride);
  if (
    hasWorkflowPlanData(params.workflowDraft, mode, params.basics.engagement_type) ||
    params.basics.opportunity_id.trim()
  ) {
    return "in_progress";
  }
  return "planned";
}

export type EngagementCreatePostAction = "save" | "prepare" | "start_call";

export function resolveHrefAfterEngagementCreate(
  engagementId: string,
  action: EngagementCreatePostAction,
): string {
  switch (action) {
    case "prepare":
      return engagementLifecycle.buildEngagementPrepareForMeetingHref(engagementId);
    case "start_call":
      return engagementLifecycle.buildEngagementActiveHref(engagementId);
    case "save":
    default:
      return engagementLifecycle.buildEngagementDetailHref(engagementId);
  }
}

/* ── Mission Launch screens (field execution, not CRM wizard) ────────────────
 * Every engagement type shares one launch-screen template with intent-based
 * actions: Schedule for Later / Prepare Now / Start {mission}. The per-mission
 * table below only varies the mission name, start verb, and which action gets
 * primary emphasis (prepare for planned conversations, start for quick
 * support touches). Generic "New engagement" copy is used only before a type
 * has been chosen. */

export const ENGAGEMENT_SCHEDULE_FOR_LATER_LABEL = "Schedule for Later";
export const ENGAGEMENT_PREPARE_NOW_LABEL = "Prepare Now";

export const DEBRIEF_CREATE_SCREEN_TITLE = "Plan Observation Debrief";
export const DEBRIEF_SCHEDULE_FOR_LATER_LABEL = ENGAGEMENT_SCHEDULE_FOR_LATER_LABEL;
export const DEBRIEF_PREPARE_NOW_LABEL = ENGAGEMENT_PREPARE_NOW_LABEL;
export const DEBRIEF_START_NOW_LABEL = "Start Debrief";
export const DEBRIEF_SCHEDULING_TOGGLE_LABEL = "Optional: Schedule this debrief";
export const DEBRIEF_CREATE_DETAILS_LEAD =
  "Who is this debrief for? Provider and organization are all that's required — everything else is optional.";

export const INTRO_CALL_SAVE_WITHOUT_PREPARING_LABEL = "Save Without Preparing";

export type EngagementCreateScreenCopy = {
  title: string;
  detailsLead: string;
  scheduleForLaterLabel: string;
  prepareNowLabel: string;
  startNowLabel: string;
  startSavingLabel: string;
  /** When set, date/time stay collapsed behind this toggle until expanded. Null = always visible. */
  schedulingToggleLabel: string | null;
  /** Which post-create action gets the visually primary button. */
  primaryAction: EngagementCreatePostAction;
  /** Short hint above mission-launch footer actions. */
  footerHelper: string | null;
  /** When false, the live start action is hidden (e.g. intro call is prepare-or-save only). */
  showStartNow: boolean;
};

type MissionLaunchCopySpec = {
  missionName: string;
  /** Lowercase noun for sentences — "this {noun}". */
  noun: string;
  startLabel: string;
  detailsLead?: string;
  footerHelper?: string | null;
  saveWithoutPrepareLabel?: string;
  showStartNow?: boolean;
};

const MISSION_LAUNCH_COPY: Partial<Record<EngagementType, MissionLaunchCopySpec>> = {
  intro_call: {
    missionName: "Intro Call",
    noun: "intro call",
    startLabel: "Start Intro Call",
    detailsLead: "",
    footerHelper: null,
    saveWithoutPrepareLabel: INTRO_CALL_SAVE_WITHOUT_PREPARING_LABEL,
    showStartNow: false,
  },
  provider_debrief: {
    missionName: "Observation Debrief",
    noun: "debrief",
    startLabel: DEBRIEF_START_NOW_LABEL,
  },
  product_demo: { missionName: "Product Demo", noun: "demo", startLabel: "Start Demo" },
  in_service_training: { missionName: "Training", noun: "training", startLabel: "Start Training" },
  peer_discussion: {
    missionName: "Surgeon Education",
    noun: "surgeon education session",
    startLabel: "Start Surgeon Education",
  },
  follow_up: { missionName: "Follow-Up", noun: "follow-up", startLabel: "Start Follow-Up" },
  reactivation: {
    missionName: "Reactivation",
    noun: "reactivation",
    startLabel: "Start Reactivation",
  },
};

function missionLaunchLead(noun: string): string {
  return `Who is this ${noun} for? Provider and organization are all that's required — everything else is optional.`;
}

/** Relationship touches are execution-first; planned conversations are prepare-first. */
function missionPrimaryAction(type: string): EngagementCreatePostAction {
  return engagementCategoryForType(type) === "relationship_management" ? "start_call" : "prepare";
}

export function engagementCreateScreenCopy(
  launchType: string | null | undefined,
): EngagementCreateScreenCopy {
  const type = normalizeEngagementType(launchType);

  if (type) {
    const spec = MISSION_LAUNCH_COPY[type];
    const missionName = spec?.missionName ?? "Engagement";
    const noun = spec?.noun ?? "engagement";
    const primaryAction = missionPrimaryAction(type);
    return {
      title: `Plan ${missionName}`,
      detailsLead: spec?.detailsLead ?? missionLaunchLead(noun),
      scheduleForLaterLabel:
        spec?.saveWithoutPrepareLabel ?? ENGAGEMENT_SCHEDULE_FOR_LATER_LABEL,
      prepareNowLabel: ENGAGEMENT_PREPARE_NOW_LABEL,
      startNowLabel: spec?.startLabel ?? "Start Engagement",
      startSavingLabel: `Starting ${noun}…`,
      schedulingToggleLabel: type === "intro_call" ? null : `Add date & time (optional)`,
      primaryAction,
      footerHelper:
        spec?.footerHelper ??
        (primaryAction === "prepare"
          ? "Prepare Now is the usual next step — scheduling can wait."
          : "Start opens the live workspace right away."),
      showStartNow: spec?.showStartNow ?? true,
    };
  }

  return {
    title: "New engagement",
    detailsLead: ENGAGEMENT_CREATE_DETAILS_LEAD,
    scheduleForLaterLabel: ENGAGEMENT_SAVE_LABEL,
    prepareNowLabel: ENGAGEMENT_SAVE_AND_PREPARE_LABEL,
    startNowLabel: ENGAGEMENT_START_ENGAGEMENT_NOW_LABEL,
    startSavingLabel: "Starting…",
    schedulingToggleLabel: null,
    primaryAction: "start_call",
    footerHelper: null,
    showStartNow: true,
  };
}

/**
 * Post-create routing for mission-specific launches. "Schedule for Later"
 * returns the rep to field context (provider page, calendar fallback for
 * debriefs) instead of the CRM engagement detail page. Generic creation and
 * the prepare/start paths are unchanged.
 */
export function resolveHrefAfterMissionEngagementCreate(input: {
  engagementId: string;
  action: EngagementCreatePostAction;
  launchType?: string | null;
  providerId?: string | null;
}): string {
  const launchType = normalizeEngagementType(input.launchType);
  if (input.action === "save" && launchType) {
    const providerId = String(input.providerId ?? "").trim();
    if (providerId) return buildProviderOverviewHref(providerId);
    if (launchType === "provider_debrief") return "/portal/sales/calendar";
  }
  return resolveHrefAfterEngagementCreate(input.engagementId, input.action);
}

export function buildEngagementCreatePayload(params: {
  basics: EngagementBasicsDraft;
  workflowDraft: EngagementWorkflowDraft;
  providerLabel: string;
  organizationLabel: string;
  save_mode: "draft" | "final";
  mark_outcome_recorded?: boolean;
  preCallPlanTemplateId?: string | null;
  workflowModeOverride?: EngagementWorkflowModeOverride | null;
  /** @deprecated Ignored — create wizard always uses plan_first scheduling. */
  creationPath?: EngagementCreationPath;
  planningMode?: EngagementPlanningMode;
  postCreateAction?: EngagementCreatePostAction;
}): Record<string, unknown> {
  const engagementType = normalizeEngagementType(params.basics.engagement_type) || params.basics.engagement_type;
  const planningMode: EngagementPlanningMode =
    params.planningMode ?? (params.creationPath === "quick_add" ? "quick_add" : "plan_first");
  const engagementCategory = engagementCategoryForType(engagementType);
  const startCallNow = params.postCreateAction === "start_call";
  const schedule = startCallNow
    ? buildEngagementScheduleFieldsForNow()
    : buildEngagementScheduleFieldsFromBasics({
        engagement_date: params.basics.engagement_date,
        engagement_time: params.basics.engagement_time,
      });
  const sourceObservationId = params.basics.source_observation_id.trim() || null;
  const productFocus = params.basics.product_line.trim() || null;

  return payloadForLightweightEngagementCreate({
    params,
    engagementType,
    engagementCategory,
    schedule,
    sourceObservationId,
    productFocus,
    planningMode,
    status: startCallNow ? "in_progress" : "planned",
  });
}

function payloadForLightweightEngagementCreate(input: {
  params: {
    save_mode: "draft" | "final";
    mark_outcome_recorded?: boolean;
    basics: EngagementBasicsDraft;
  };
  engagementType: string;
  engagementCategory: EngagementMissionGroupId | null;
  schedule: ReturnType<typeof buildEngagementScheduleFieldsFromBasics>;
  sourceObservationId: string | null;
  productFocus: string | null;
  planningMode: EngagementPlanningMode;
  status: EngagementStatus;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    save_mode: input.params.save_mode,
    mark_outcome_recorded: input.params.mark_outcome_recorded ?? false,
    engagement_type: input.engagementType,
    engagement_category: input.engagementCategory,
    planning_mode: input.planningMode satisfies EngagementPlanningMode,
    planning_status: "not_planned" satisfies EngagementPlanningStatus,
    briefing_id: null,
    source_observation_id: input.sourceObservationId,
    status: input.status,
    provider_id: input.params.basics.provider_id,
    organization_id: input.params.basics.organization_id || null,
    opportunity_id: input.params.basics.opportunity_id || null,
    case_id: input.params.basics.case_id || null,
    notes: null,
  };
  if (input.schedule.engagement_date) {
    payload.engagement_date = input.schedule.engagement_date;
    payload.scheduled_date = input.schedule.engagement_date;
  }
  if (input.schedule.scheduled_at) payload.scheduled_at = input.schedule.scheduled_at;
  if (input.productFocus) payload.product_focus = input.productFocus;
  return payload;
}

export function createEmptyWorkflowDraftForType(
  engagementType: string,
  workflowModeOverride?: EngagementWorkflowModeOverride | null,
): EngagementWorkflowDraft {
  const mode = resolveEngagementWorkflowMode(engagementType, workflowModeOverride);
  return emptyEngagementWorkflowDraft(mode, engagementType);
}
