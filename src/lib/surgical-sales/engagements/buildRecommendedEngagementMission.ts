import { normalizeSalesStage, type SalesStage } from "@/lib/sales/stages";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { normalizeEngagementType, type EngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import { engagementMissionCardForType } from "@/lib/surgical-sales/engagements/engagementTypeMissionPicker";
import {
  isEarlyDiscoveryRelationshipStage,
  normalizeProviderRelationshipStage,
} from "@/lib/surgical-sales/providerRelationshipStage";

export type RecommendedEngagementMission = {
  type: EngagementType;
  name: string;
  reason: string;
};

const OBSERVATION_ENGAGEMENT_TYPES = new Set<string>([
  "observation_request",
  "or_visit",
  "or_observation",
]);

function engagementIsObservationType(engagementType: string | null | undefined): boolean {
  const raw = String(engagementType ?? "").trim().toLowerCase();
  if (OBSERVATION_ENGAGEMENT_TYPES.has(raw)) return true;
  const normalized = normalizeEngagementType(engagementType);
  return normalized === "observation_request" || normalized === "or_visit";
}

const ADVANCE_OPPORTUNITY_STAGES = new Set<SalesStage>([
  "evaluation_planned",
  "evaluation_active",
  "outcome_review",
  "preference_card_progress",
  "clinical_validation",
]);

function engagementTimestamp(e: ProviderEngagementSummary): number {
  const raw =
    e.updated_at || e.scheduled_at || (e.engagement_date ? `${e.engagement_date}T12:00:00` : "");
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function sortByRecency(engagements: ProviderEngagementSummary[]): ProviderEngagementSummary[] {
  return [...engagements].sort((a, b) => engagementTimestamp(b) - engagementTimestamp(a));
}

function hasType(engagements: ProviderEngagementSummary[], type: EngagementType): boolean {
  return engagements.some((e) => normalizeEngagementType(e.engagement_type) === type);
}

function lastCompletedOfType(
  engagements: ProviderEngagementSummary[],
  type: EngagementType,
): ProviderEngagementSummary | null {
  return (
    sortByRecency(engagements).find(
      (e) =>
        String(e.status || "").toLowerCase() === "completed" &&
        normalizeEngagementType(e.engagement_type) === type,
    ) ?? null
  );
}

function pickAdvanceOpportunity(
  opportunities: Array<Record<string, unknown>>,
): { stage: SalesStage } | null {
  for (const row of opportunities) {
    const stage = normalizeSalesStage(String(row.stage || ""));
    if (stage && ADVANCE_OPPORTUNITY_STAGES.has(stage)) {
      return { stage };
    }
  }
  return null;
}

function wrap(type: EngagementType, reason: string): RecommendedEngagementMission {
  const card = engagementMissionCardForType(type);
  return {
    type,
    name: card?.name ?? type,
    reason,
  };
}

/** Single next mission recommendation for the New Engagement screen. */
export function buildRecommendedEngagementMission(input: {
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
}): RecommendedEngagementMission {
  const rawRelationshipStage = String(input.relationshipStage ?? "").trim().toLowerCase();
  const stage = normalizeProviderRelationshipStage(input.relationshipStage);
  const engagements = input.engagements ?? [];
  const opportunities = input.opportunities ?? [];
  const completedObservations = sortByRecency(
    engagements.filter(
      (e) =>
        String(e.status || "").toLowerCase() === "completed" &&
        normalizeEngagementType(e.engagement_type) === "or_visit",
    ),
  );
  const latestObservation = completedObservations[0] ?? null;
  const debriefAfterObservation = latestObservation
    ? sortByRecency(engagements).find((e) => {
        const type = normalizeEngagementType(e.engagement_type);
        if (type !== "provider_debrief") return false;
        return engagementTimestamp(e) >= engagementTimestamp(latestObservation);
      })
    : null;

  if (latestObservation && !debriefAfterObservation) {
    const label = latestObservation.title?.trim() || "Observation";
    return wrap(
      "provider_debrief",
      `${label} is complete — debrief while workflow and product signals are still fresh.`,
    );
  }

  if (stage === "dormant") {
    return wrap(
      "reactivation",
      "This relationship has gone quiet — reopen with a credible reason to reconnect.",
    );
  }

  if (isEarlyDiscoveryRelationshipStage(stage) || engagements.length === 0) {
    return wrap(
      "intro_call",
      "Early discovery — start with an intro conversation and map the path to observation access.",
    );
  }

  if (
    rawRelationshipStage === "observation_scheduled" ||
    rawRelationshipStage === "observation_requested"
  ) {
    const introDone = lastCompletedOfType(engagements, "intro_call");
    if (introDone) {
      return wrap(
        "follow_up",
        "Observation access is in motion — confirm scheduling, stakeholders, and what you still need before case day.",
      );
    }
  }

  if (!engagements.some((e) => engagementIsObservationType(e.engagement_type))) {
    const introDone = lastCompletedOfType(engagements, "intro_call");
    if (introDone) {
      return wrap(
        "follow_up",
        "Intro conversation is done — lock the next move toward observation access and case timing.",
      );
    }
  }

  const advanceOpp = pickAdvanceOpportunity(opportunities);
  if (advanceOpp || stage === "active_evaluation") {
    return wrap(
      "product_demo",
      "Evaluation is active — run a focused product demo tied to what you learned in the field.",
    );
  }

  if (stage === "established_customer" || stage === "active_relationship") {
    const recentFollowUp = lastCompletedOfType(engagements, "follow_up");
    if ((input.cases ?? []).length > 0 && !recentFollowUp) {
      return wrap(
        "follow_up",
        "Supported cases are on file — review outcomes and capture product learnings while they are recent.",
      );
    }
    return wrap(
      "follow_up",
      "Keep momentum with a follow-up that confirms the next move and timing.",
    );
  }

  return wrap(
    "intro_call",
    "Schedule the next touch that moves this provider relationship forward.",
  );
}
