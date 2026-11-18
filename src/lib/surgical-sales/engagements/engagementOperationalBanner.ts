import type { EngagementPreparationStatus } from "@/lib/surgical-sales/engagements/engagementPreparationStatus";
import type { EngagementStatus } from "@/lib/surgical-sales/engagements/engagementTypes";
import {
  buildEngagementIntelligenceReadiness,
  isEarlyDiscoveryEngagementType,
  type EngagementIntelligenceReadiness,
} from "@/lib/surgical-sales/engagements/engagementIntelligenceReadiness";
import { isEngagementEmptyPlannedView } from "@/lib/surgical-sales/engagements/engagementPlanningModel";
import {
  engagementPathwayIntelligenceSectionLabel,
  engagementPreVisitIntelligenceSectionLabel,
} from "@/lib/surgical-sales/pathwayStageIntelligenceLabels";

export type EngagementPlanProgress = {
  filled: number;
  total: number;
};

/** Single contextual operational banner — discovery-friendly, not CRM field completion. */
export type EngagementOperationalBannerId =
  | "planned_touch"
  | "field_touch_ready"
  | "early_discovery_touch"
  | "discovery_in_progress"
  | "operational_understanding_developing"
  | "pre_visit_blockers"
  | "post_visit_debrief_required"
  | "visit_closed";

export type EngagementOperationalBannerTone =
  | "ready"
  | "discovery"
  | "attention"
  | "debrief"
  | "closed";

export type EngagementOperationalBanner = {
  id: EngagementOperationalBannerId;
  tone: EngagementOperationalBannerTone;
  title: string;
  subtitle: string;
  nextActionTitle: string;
  nextActionBody: string;
  readiness: EngagementIntelligenceReadiness;
  /** @deprecated Use readiness.preVisitBlockerCount */
  intelligenceGapCount: number;
  preVisitBlockerCount: number;
  discoveryObjectiveCount: number;
};

const BANNER_NEXT_ACTION: Record<
  EngagementOperationalBannerId,
  Pick<EngagementOperationalBanner, "nextActionTitle" | "nextActionBody" | "tone">
> = {
  planned_touch: {
    tone: "ready",
    nextActionTitle: "Mission scheduled",
    nextActionBody:
      "No prep was auto-generated. Open Field Briefing when you want to plan — or capture notes after the visit.",
  },
  field_touch_ready: {
    tone: "ready",
    nextActionTitle: "Run the touch",
    nextActionBody:
      "Pre-visit requirements are clear. Open Field Briefing during the visit for priorities and top asks.",
  },
  early_discovery_touch: {
    tone: "discovery",
    nextActionTitle: "Run the discovery touch",
    nextActionBody:
      "This is an early discovery touch — use the visit to learn workflow, access, and influence. Capture notes in Field Briefing or debrief after.",
  },
  discovery_in_progress: {
    tone: "discovery",
    nextActionTitle: "Shape the discovery agenda",
    nextActionBody:
      "Review discovery targets below and set 2–3 questions in Field Briefing. You do not need a complete profile before this touch.",
  },
  operational_understanding_developing: {
    tone: "discovery",
    nextActionTitle: "Advance operational understanding",
    nextActionBody:
      "Use this touch to close discovery targets while confirming any observation objectives listed below.",
  },
  pre_visit_blockers: {
    tone: "discovery",
    nextActionTitle: "Confirm observation objectives",
    nextActionBody:
      "Optional prep items below — confirm observation objectives before you commit OR time. Discovery targets can wait until you are in the room.",
  },
  post_visit_debrief_required: {
    tone: "debrief",
    nextActionTitle: "Record the debrief",
    nextActionBody:
      "Capture what happened while the visit is fresh — debrief updates provider intelligence across touches.",
  },
  visit_closed: {
    tone: "closed",
    nextActionTitle: "Review or update debrief",
    nextActionBody:
      "Visit is closed. Reopen debrief if anything changed, or adjust Field Briefing for the next touch.",
  },
};

const BANNER_TITLES: Record<EngagementOperationalBannerId, string> = {
  planned_touch: "Mission scheduled",
  field_touch_ready: "Field touch ready",
  early_discovery_touch: "Early discovery touch",
  discovery_in_progress: "Discovery in progress",
  operational_understanding_developing: "Operational understanding developing",
  pre_visit_blockers: "Observation objectives to confirm",
  post_visit_debrief_required: "Post-visit debrief due",
  visit_closed: "Visit closed",
};

function intelligenceCountLine(count: number, sectionLabel: string): string | null {
  if (count <= 0) return null;
  const lower = sectionLabel.toLowerCase();
  return count === 1 ? `1 ${lower.replace(/s$/, "")} for this touch` : `${count} ${lower} for this touch`;
}

function formatDiscoveryObjectiveLine(count: number, engagementType: string): string | null {
  return intelligenceCountLine(count, engagementPathwayIntelligenceSectionLabel(engagementType));
}

function formatPreVisitLine(count: number, engagementType: string): string | null {
  return intelligenceCountLine(count, engagementPreVisitIntelligenceSectionLabel(engagementType));
}

export function buildEngagementOperationalBannerSubtitle(params: {
  bannerId: EngagementOperationalBannerId;
  preparation: EngagementPreparationStatus;
  readiness: EngagementIntelligenceReadiness;
  planProgress: EngagementPlanProgress;
  hasOutcomeNotes: boolean;
  engagementType: string;
}): string {
  const {
    bannerId,
    preparation,
    readiness,
    planProgress,
    hasOutcomeNotes,
    engagementType,
  } = params;
  const discoveryLine = formatDiscoveryObjectiveLine(readiness.discoveryObjectiveCount, engagementType);
  const preVisitLine = formatPreVisitLine(readiness.preVisitBlockerCount, engagementType);
  const earlyDiscovery = isEarlyDiscoveryEngagementType(engagementType);

  switch (bannerId) {
    case "planned_touch":
      return "Add a date when you have one — briefing prep is optional until you choose it.";
    case "field_touch_ready":
      return preVisitLine
        ? `${preVisitLine} • prep marked ready`
        : "Pre-visit picture clear • prep marked ready";
    case "early_discovery_touch": {
      const parts = ["Learn during the visit — open items are expected"];
      if (discoveryLine) parts.push(discoveryLine);
      return parts.join(" • ");
    }
    case "discovery_in_progress": {
      const parts: string[] = [];
      if (discoveryLine) parts.push(discoveryLine);
      parts.push(earlyDiscovery ? "No observation objectives due yet" : "Profile still forming");
      return parts.join(" • ");
    }
    case "operational_understanding_developing": {
      const parts: string[] = ["Building account picture across touches"];
      if (discoveryLine) parts.push(discoveryLine);
      return parts.join(" • ");
    }
    case "pre_visit_blockers": {
      const parts: string[] = [];
      if (preVisitLine) parts.push(preVisitLine);
      if (discoveryLine && earlyDiscovery) parts.push(discoveryLine);
      else if (discoveryLine) parts.push(`${readiness.discoveryObjectiveCount} can wait until in-room`);
      return parts.length > 0 ? parts.join(" • ") : "Confirm observation objectives before the touch";
    }
    case "post_visit_debrief_required":
      return hasOutcomeNotes
        ? "Debrief started — finish capture while visit is fresh"
        : "Continue mapping while visit is fresh";
    case "visit_closed":
      return hasOutcomeNotes ? "Debrief on file" : "Close debrief when notes are captured";
    default:
      return "";
  }
}

export function resolveEngagementOperationalBannerId(input: {
  status: string;
  engagementType: string;
  preparation: Pick<EngagementPreparationStatus, "is_prepared">;
  readiness: Pick<EngagementIntelligenceReadiness, "preVisitBlockerCount" | "discoveryObjectiveCount">;
  engagement?: Record<string, unknown> | null;
}): EngagementOperationalBannerId {
  const status = String(input.status ?? "planned").toLowerCase() as EngagementStatus;
  if (status === "completed") return "visit_closed";
  if (status === "in_progress") return "post_visit_debrief_required";

  if (input.engagement && isEngagementEmptyPlannedView(input.engagement)) {
    return "planned_touch";
  }

  const blockers = input.readiness.preVisitBlockerCount;
  const objectives = input.readiness.discoveryObjectiveCount;
  const earlyDiscovery = isEarlyDiscoveryEngagementType(input.engagementType);

  if (blockers > 0) return "pre_visit_blockers";

  if (earlyDiscovery) {
    if (input.preparation.is_prepared || objectives === 0) return "early_discovery_touch";
    return "discovery_in_progress";
  }

  if (input.preparation.is_prepared) return "field_touch_ready";

  if (objectives > 0) return "operational_understanding_developing";
  return "discovery_in_progress";
}

export function buildEngagementOperationalBanner(params: {
  status: string;
  engagementType: string;
  preparation: EngagementPreparationStatus;
  planProgress: EngagementPlanProgress;
  hasOutcomeNotes: boolean;
  provider?: Record<string, unknown> | null;
  providerId?: string | null;
  engagement?: Record<string, unknown> | null;
}): EngagementOperationalBanner {
  const providerId =
    params.providerId ?? (params.provider?.id ? String(params.provider.id) : null);
  const lightweightPlanned =
    params.engagement != null && isEngagementEmptyPlannedView(params.engagement);
  const readiness = lightweightPlanned
    ? {
        preVisitBlockers: [],
        discoveryObjectives: [],
        preVisitBlockerCount: 0,
        discoveryObjectiveCount: 0,
      }
    : buildEngagementIntelligenceReadiness({
        provider: params.provider,
        engagementType: params.engagementType,
        providerId,
      });
  const id = resolveEngagementOperationalBannerId({
    status: params.status,
    engagementType: params.engagementType,
    preparation: params.preparation,
    readiness,
    engagement: params.engagement,
  });
  const next = BANNER_NEXT_ACTION[id];
  const subtitle = buildEngagementOperationalBannerSubtitle({
    bannerId: id,
    preparation: params.preparation,
    readiness,
    planProgress: params.planProgress,
    hasOutcomeNotes: params.hasOutcomeNotes,
    engagementType: params.engagementType,
  });

  return {
    id,
    tone: next.tone,
    title: BANNER_TITLES[id],
    subtitle,
    nextActionTitle: next.nextActionTitle,
    nextActionBody: next.nextActionBody,
    readiness,
    intelligenceGapCount: readiness.preVisitBlockerCount,
    preVisitBlockerCount: readiness.preVisitBlockerCount,
    discoveryObjectiveCount: readiness.discoveryObjectiveCount,
  };
}

/** @deprecated Use buildEngagementIntelligenceReadiness */
export function countEngagementIntelligenceGaps(
  provider: Record<string, unknown> | null | undefined,
): number {
  return buildEngagementIntelligenceReadiness({
    provider,
    engagementType: "intro_call",
  }).discoveryObjectiveCount;
}
