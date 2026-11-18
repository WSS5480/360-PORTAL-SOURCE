/**
 * Provider overview — mission control for the next field interaction.
 */

import {
  formatEngagementWhen,
  pickNextUpcomingEngagement,
  type ProviderEngagementSummary,
} from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { buildEngagementSurfaceActionsFromSummary } from "@/lib/surgical-sales/engagements/engagementWorkflowState";
import { normalizeEngagementType, type EngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import { INTRO_CALL_START_MISSION_OBJECTIVE } from "@/lib/surgical-sales/engagements/startMissionConfig";
import { resolveEngagementPreparationContextState } from "@/lib/surgical-sales/engagements/engagementPreparationContextState";
import type { ProviderRepPrimaryAction } from "@/lib/surgical-sales/buildProviderRepPrimaryAction";
import type { ProviderOverviewReadinessIndicator } from "@/lib/surgical-sales/providerOverviewQualitativeReadiness";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";

import {
  PROVIDER_OVERVIEW_FIELD_TOUCH_TITLE as PROVIDER_OVERVIEW_MISSION_CONTROL_TITLE,
  PROVIDER_OVERVIEW_READINESS_DIMENSION_SHORT,
} from "@/lib/surgical-sales/providerOverviewVocabulary";

export { PROVIDER_OVERVIEW_MISSION_CONTROL_TITLE };

export type ProviderOverviewMissionPrepTone = "ready" | "attention" | "critical";

export type ProviderOverviewMissionControl = {
  title: string;
  hasUpcomingEngagement: boolean;
  engagement: {
    typeLabel: string;
    title: string | null;
    whenLabel: string;
    statusLabel: string;
    openHref: string;
    prepareHref: string | null;
    showPrepare: boolean;
  } | null;
  objective: string;
  objectiveScan: string;
  readinessSummary: string;
  missingPrep: string;
  missingPrepTone: ProviderOverviewMissionPrepTone;
  whyThisMeetingMatters: string;
  whyScan: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string } | null;
  scheduleEngagementHref: string;
};

const WHY_THIS_MEETING_MATTERS: Partial<Record<EngagementType, string>> = {
  intro_call: "Decides if OR observation is realistic.",
  observation_request: "Confirms observation can be scheduled without wasted OR time.",
  or_visit: "Validates live workflow before more field days.",
  product_demo: "Must tie to documented workflow pain.",
  office_visit_360: "Prove hands-on fit; lock next step.",
  follow_up: "Close open items; lock dated next action.",
  post_case_follow_up: "Capture case outcome; justify next step.",
  in_service_training: "Close one training gap before next case.",
  reactivation: "Confirm what changed; test re-entry fit.",
  evaluation_planning: "Lock evaluation design before first trial.",
  evaluation_follow_up: "Address operational risk on active evaluation cases.",
  preference_card_discussion: "Align card changes and approvers.",
};

const OBJECTIVE_BY_TYPE: Partial<Record<EngagementType, string>> = {
  intro_call: INTRO_CALL_START_MISSION_OBJECTIVE,
  observation_request: "Secure one OR observation with agreed case profile.",
  or_visit: "Validate workflow in live cases; surface one trial change.",
  product_demo: "Focused demo tied to evaluation criteria.",
  office_visit_360: "Hands-on session with committed next step.",
  follow_up: "Confirm prior outcomes; lock next action.",
  post_case_follow_up: "Document clinical outcome from recent case.",
  in_service_training: "Close one training gap with OR staff.",
  reactivation: "Agree one re-entry step aligned to priorities.",
  evaluation_planning: "Define case profile, metrics, supply path.",
  evaluation_follow_up: "Review trial progress; address operational risk.",
  preference_card_discussion: "Align card changes and go-live timing.",
};

function formatMissingPrep(row: ProviderEngagementSummary): {
  label: string;
  tone: ProviderOverviewMissionPrepTone;
} {
  if (row.is_meeting_prepared || row.prepared_at) {
    return { label: "Prep complete", tone: "ready" };
  }
  if (row.pre_call_complete) {
    return { label: "Pre-call complete", tone: "ready" };
  }
  if (row.pre_call_total > 0 && row.pre_call_filled > 0) {
    return { label: "Pre-call still developing", tone: "attention" };
  }
  if (row.pre_call_total > 0) {
    return { label: "Pre-call not started", tone: "critical" };
  }
  return { label: "Confirm prep requirements", tone: "attention" };
}

function readinessKeysForEngagement(type: EngagementType | null): Array<
  ProviderOverviewReadinessIndicator["id"]
> {
  switch (type) {
    case "intro_call":
    case "follow_up":
    case "reactivation":
      return ["observation_readiness", "relationship_maturity"];
    case "observation_request":
    case "or_visit":
      return ["observation_readiness", "workflow_understanding"];
    case "product_demo":
    case "evaluation_planning":
    case "evaluation_follow_up":
    case "preference_card_discussion":
      return ["commercial_influence", "workflow_understanding"];
    case "office_visit_360":
    case "in_service_training":
    case "post_case_follow_up":
      return ["workflow_understanding", "relationship_maturity"];
    default:
      return ["observation_readiness", "commercial_influence"];
  }
}

function buildReadinessSummary(
  type: EngagementType | null,
  indicators: ProviderOverviewReadinessIndicator[],
): { summary: string; detail: string | null } {
  const byId = new Map(indicators.map((i) => [i.id, i]));
  const keys = readinessKeysForEngagement(type);
  const parts = keys
    .map((id) => {
      const row = byId.get(id);
      if (!row) return null;
      const short =
        PROVIDER_OVERVIEW_READINESS_DIMENSION_SHORT[id] ?? id;
      return `${short}: ${row.stateLabel}`;
    })
    .filter(Boolean);

  const detail = indicators.find((i) => i.context)?.context ?? null;
  return {
    summary: parts.length > 0 ? parts.join(" · ") : "Readiness signals still forming",
    detail,
  };
}

function buildObjective(
  type: EngagementType | null,
  typeLabel: string,
  contact: Record<string, unknown>,
  opportunityStage: string | null,
): string {
  if (type && OBJECTIVE_BY_TYPE[type]) return OBJECTIVE_BY_TYPE[type]!;

  const prepState = resolveEngagementPreparationContextState({
    engagementType: type ?? "intro_call",
    opportunityStage,
    providerRelationshipStage: String(contact.provider_relationship_stage ?? ""),
  });

  if (prepState === "evaluation_planning") {
    return "Leave with a concrete evaluation pathway, not open-ended discovery.";
  }
  if (prepState === "observation_support") {
    return "Support the active case path and remove barriers to the next adoption step.";
  }
  return `Advance the ${typeLabel.toLowerCase()} with one measurable field outcome.`;
}

function buildWhyThisMeetingMatters(type: EngagementType | null, typeLabel: string): string {
  if (type && WHY_THIS_MEETING_MATTERS[type]) return WHY_THIS_MEETING_MATTERS[type]!;
  return `This ${typeLabel.toLowerCase()} should produce one clear field outcome — not a general conversation.`;
}

export function buildProviderOverviewMissionControl(input: {
  contact: Record<string, unknown>;
  engagements: ProviderEngagementSummary[];
  primaryAction: ProviderRepPrimaryAction;
  readinessIndicators: ProviderOverviewReadinessIndicator[];
  newEngagementHref: string;
  opportunityStage?: string | null;
}): ProviderOverviewMissionControl {
  const upcoming = pickNextUpcomingEngagement(input.engagements);
  const engagementType = upcoming
    ? normalizeEngagementType(upcoming.engagement_type) || null
    : null;
  const typeLabel = upcoming?.engagement_type_label ?? "Engagement";

  const { summary: readinessSummary } = buildReadinessSummary(
    engagementType,
    input.readinessIndicators,
  );

  const prep = upcoming ? formatMissingPrep(upcoming) : null;

  let primaryCta = { label: input.primaryAction.label, href: input.primaryAction.href };
  let secondaryCta: { label: string; href: string } | null = null;

  if (upcoming) {
    const surface = buildEngagementSurfaceActionsFromSummary(upcoming);
    primaryCta = { label: surface.primary.label, href: surface.primary.href };
    secondaryCta = surface.prepareSecondary;
  }

  const objective = buildObjective(
    engagementType,
    typeLabel,
    input.contact,
    input.opportunityStage ?? null,
  );
  const why = buildWhyThisMeetingMatters(engagementType, typeLabel);
  return {
    title: PROVIDER_OVERVIEW_MISSION_CONTROL_TITLE,
    hasUpcomingEngagement: Boolean(upcoming),
    engagement: upcoming
      ? {
          typeLabel: upcoming.engagement_type_label,
          title:
            upcoming.title?.trim() &&
            upcoming.title.trim().toLowerCase() !== upcoming.engagement_type_label.toLowerCase()
              ? upcoming.title.trim()
              : null,
          whenLabel: formatEngagementWhen(upcoming),
          statusLabel: upcoming.status_label,
          openHref: buildEngagementSurfaceActionsFromSummary(upcoming).primary.href,
          prepareHref: null,
          showPrepare: false,
        }
      : null,
    objective,
    objectiveScan: scanLine(objective, 64),
    readinessSummary,
    missingPrep: prep?.label ?? "No visit scheduled",
    missingPrepTone: prep?.tone ?? "attention",
    whyThisMeetingMatters: why,
    whyScan: scanLine(why, 72),
    primaryCta,
    secondaryCta,
    scheduleEngagementHref: input.newEngagementHref,
  };
}
