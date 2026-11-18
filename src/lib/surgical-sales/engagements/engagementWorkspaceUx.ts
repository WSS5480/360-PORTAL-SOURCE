import type { EngagementPreparationStatus } from "@/lib/surgical-sales/engagements/engagementPreparationStatus";

import {
  ENGAGEMENT_CAPTURE_DEBRIEF_LABEL,
  ENGAGEMENT_FIELD_BRIEFING_LABEL,
  ENGAGEMENT_RECORD_TITLE,
  ENGAGEMENT_WORKSPACE_TITLE,
} from "@/lib/surgical-sales/engagements/engagementCreateWizard";

import {
  buildEngagementOperationalBanner,
  type EngagementOperationalBanner,
  type EngagementOperationalBannerId,
  type EngagementPlanProgress,
} from "@/lib/surgical-sales/engagements/engagementOperationalBanner";

import type { EngagementIntelligenceReadiness } from "@/lib/surgical-sales/engagements/engagementIntelligenceReadiness";
import {
  engagementBriefingStatusAllowsOptionalPlanning,
  isEngagementEmptyPlannedView,
  resolveEngagementBriefingStatus,
} from "@/lib/surgical-sales/engagements/engagementBriefingStatus";

import {
  buildEngagementDetailRecord,
  type EngagementDetailPhase,
} from "@/lib/surgical-sales/engagements/buildEngagementDetailRecord";

export { ENGAGEMENT_RECORD_TITLE, ENGAGEMENT_WORKSPACE_TITLE, ENGAGEMENT_FIELD_BRIEFING_LABEL };
export type { EngagementPlanProgress, EngagementOperationalBanner, EngagementOperationalBannerId };

export type EngagementWorkspaceGuidance = {
  banner: EngagementOperationalBanner;
  readiness: EngagementIntelligenceReadiness;
  phase: EngagementDetailPhase;
  statusLabel: string;
  statusHint: string;
  headline: string;
  nextActionTitle: string;
  nextActionBody: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string | null;
  secondaryCtaHref: string | null;
};

export function buildEngagementWorkspaceGuidance(params: {
  engagementId: string;
  engagement: Record<string, unknown>;
  engagementType: string;
  status: string;
  preparation: EngagementPreparationStatus;
  planProgress: EngagementPlanProgress;
  hasOutcomeNotes: boolean;
  provider?: Record<string, unknown> | null;
  providerId?: string | null;
}): EngagementWorkspaceGuidance {
  const banner = buildEngagementOperationalBanner({
    status: params.status,
    engagementType: params.engagementType,
    preparation: params.preparation,
    planProgress: params.planProgress,
    hasOutcomeNotes: params.hasOutcomeNotes,
    provider: params.provider,
    providerId: params.providerId,
    engagement: params.engagement,
  });

  const record = buildEngagementDetailRecord({
    engagementId: params.engagementId,
    engagement: params.engagement,
    preparation: params.preparation,
    planProgress: params.planProgress,
    readiness: banner.readiness,
    provider: params.provider,
    providerId: params.providerId,
  });

  let nextActionTitle = "Next step";
  let nextActionBody = record.headline;

  if (record.phase === "pre_visit") {
    if (isEngagementEmptyPlannedView(params.engagement)) {
      nextActionTitle = banner.nextActionTitle;
      nextActionBody = banner.nextActionBody;
    } else if (engagementBriefingStatusAllowsOptionalPlanning(resolveEngagementBriefingStatus(params.engagement))) {
      nextActionTitle = "Quick-add touch";
      nextActionBody =
        "No field briefing yet — that is fine. Generate one below when you want prep for this touchpoint.";
    } else {
      nextActionTitle =
        banner.preVisitBlockerCount > 0 ? "Confirm objectives in Field Briefing" : "Prep in Field Briefing";
      nextActionBody =
        banner.preVisitBlockerCount > 0
          ? `${banner.preVisitBlockerCount} observation objective${banner.preVisitBlockerCount === 1 ? "" : "s"} — confirm in briefing before the touch.`
          : "Discovery targets and asks live in Field Briefing — this page records execution after the visit.";
    }
  } else if (record.phase === "during_visit") {
    nextActionTitle = "Capture while in visit";
    nextActionBody = "Open Debrief to capture notes and intelligence while the touch is live.";
  } else if (record.debriefStatus.id === "needed") {
    nextActionTitle = ENGAGEMENT_CAPTURE_DEBRIEF_LABEL;
    nextActionBody = "Record what happened and what changed — debrief updates provider intelligence.";
  } else if (record.debriefStatus.id === "completed") {
    nextActionTitle = "Review outcomes";
    nextActionBody = "Debrief is on file. Use follow-ups below or reopen debrief if anything shifted.";
  }

  return {
    banner,
    readiness: banner.readiness,
    phase: record.phase,
    statusLabel: banner.title.toUpperCase(),
    statusHint: banner.subtitle,
    headline: record.headline,
    nextActionTitle,
    nextActionBody,
    primaryCtaLabel: record.primaryCta.label,
    primaryCtaHref: record.primaryCta.href,
    secondaryCtaLabel: record.secondaryCta?.label ?? null,
    secondaryCtaHref: record.secondaryCta?.href ?? null,
  };
}
