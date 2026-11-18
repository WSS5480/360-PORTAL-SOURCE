/**
 * Account momentum indicators — quick movement signals for reps and managers.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { isUpcomingEngagementStatus } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { buildIntelligenceLearningGaps } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import { PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { assessIntelligenceFieldQuality } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import {
  buildProviderObservationFeasibilitySummary,
  type ObservationFeasibilityVerdictId,
} from "@/lib/surgical-sales/buildProviderObservationFeasibilitySummary";
import {
  buildProviderOverviewQualitativeReadiness,
  type ProviderOverviewReadinessIndicator,
} from "@/lib/surgical-sales/providerOverviewQualitativeReadiness";
import type { ProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";

import { PROVIDER_OVERVIEW_MOTION_INDICATORS_TITLE as PROVIDER_ACCOUNT_MOMENTUM_TITLE } from "@/lib/surgical-sales/providerOverviewVocabulary";

export { PROVIDER_ACCOUNT_MOMENTUM_TITLE };

export type ProviderAccountMomentumIndicatorId =
  | "discovery_accelerating"
  | "intelligence_capture_stalled"
  | "relationship_progressing"
  | "observation_pathway_strengthening"
  | "engagement_inactive"
  | "account_steady";

export type ProviderAccountMomentumIndicatorTone = "positive" | "warn" | "negative" | "neutral";

export type ProviderAccountMomentumIndicator = {
  id: ProviderAccountMomentumIndicatorId;
  label: string;
  scan: string;
  tone: ProviderAccountMomentumIndicatorTone;
  priority: number;
};

export type ProviderAccountMomentum = {
  title: string;
  indicators: ProviderAccountMomentumIndicator[];
};

const MS_DAY = 24 * 60 * 60 * 1000;

function parseMs(value: string | null | undefined): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function daysSinceMs(ms: number | null, nowMs: number): number | null {
  if (ms == null) return null;
  return Math.floor((nowMs - ms) / MS_DAY);
}

function lastRepActivityMs(timeline: Array<Record<string, unknown>>): number | null {
  let best: number | null = null;
  for (const entry of timeline) {
    const ms = parseMs(String(entry.at ?? entry.created_at ?? ""));
    if (ms == null) continue;
    if (best == null || ms > best) best = ms;
  }
  return best;
}

function engagementCompletedMs(row: ProviderEngagementSummary): number | null {
  return (
    parseMs(row.updated_at) ??
    parseMs(row.scheduled_at) ??
    parseMs(row.engagement_date ? `${row.engagement_date}T12:00:00` : null)
  );
}

function recentCompletedCount(engagements: ProviderEngagementSummary[], withinDays: number, nowMs: number): number {
  const cutoff = nowMs - withinDays * MS_DAY;
  return engagements.filter((e) => {
    if (String(e.status || "").toLowerCase() !== "completed") return false;
    const ms = engagementCompletedMs(e);
    return ms != null && ms >= cutoff;
  }).length;
}

function countValidatedIntelligenceFields(contact: Record<string, unknown>): number {
  let count = 0;
  for (const sectionId of Object.keys(
    PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER,
  ) as ProviderIntelligenceSectionId[]) {
    for (const dbKey of PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sectionId]) {
      const raw = contact[dbKey] as string | null | undefined;
      const assessment = assessIntelligenceFieldQuality(dbKey, raw);
      if (assessment.depth === "validated") count += 1;
    }
  }
  return count;
}

function countUnknownGaps(
  contact: Record<string, unknown>,
  planning?: ProviderPlanningCompletion | null,
): number {
  return buildIntelligenceLearningGaps(contact, planning, 24).filter((g) => g.state === "unknown").length;
}

function indicator(
  partial: Omit<ProviderAccountMomentumIndicator, "tone"> & { tone: ProviderAccountMomentumIndicatorTone },
): ProviderAccountMomentumIndicator {
  return partial;
}

type MomentumContext = {
  contact: Record<string, unknown>;
  relationshipStage: string;
  commercialStage: ProviderCommercialWorkflowStage;
  engagements: ProviderEngagementSummary[];
  activityTimeline: Array<Record<string, unknown>>;
  readinessIndicators: ProviderOverviewReadinessIndicator[];
  observationVerdict: ObservationFeasibilityVerdictId | null;
  unknownGaps: number;
  validatedFields: number;
  nowMs: number;
};

function detectEngagementInactive(ctx: MomentumContext): ProviderAccountMomentumIndicator | null {
  const rel = ctx.relationshipStage.trim().toLowerCase();
  if (rel === "dormant" || rel === "archived") {
    return indicator({
      id: "engagement_inactive",
      label: "Field touch stale",
      scan: "Surgeon marked dormant — re-establish access before OR time.",
      tone: "negative",
      priority: 96,
    });
  }

  const upcoming = ctx.engagements.filter((e) => isUpcomingEngagementStatus(e.status));
  const completed45 = recentCompletedCount(ctx.engagements, 45, ctx.nowMs);
  const lastActivity = lastRepActivityMs(ctx.activityTimeline);
  const daysSinceActivity = daysSinceMs(lastActivity, ctx.nowMs);

  const inactive =
    upcoming.length === 0 &&
    completed45 === 0 &&
    (daysSinceActivity == null || daysSinceActivity > 45);

  if (!inactive) return null;

  return indicator({
    id: "engagement_inactive",
    label: "Field touch stale",
    scan:
      daysSinceActivity != null && daysSinceActivity > 45
        ? `No OR or rep touch in ${daysSinceActivity} days — schedule field time or log outreach.`
        : "No recent field touches on file.",
    tone: "negative",
    priority: 94,
  });
}

function detectIntelligenceCaptureStalled(ctx: MomentumContext): ProviderAccountMomentumIndicator | null {
  if (ctx.unknownGaps < 4) return null;

  const lastActivity = lastRepActivityMs(ctx.activityTimeline);
  const daysSinceActivity = daysSinceMs(lastActivity, ctx.nowMs);
  const upcoming = ctx.engagements.filter((e) => isUpcomingEngagementStatus(e.status));
  const next = upcoming[0];
  const prepGap = Boolean(
    next &&
      next.pre_call_total > 0 &&
      !next.pre_call_complete &&
      !next.is_meeting_prepared &&
      !next.prepared_at,
  );

  const stalledByActivity = daysSinceActivity == null || daysSinceActivity > 21;
  const stalledByPrep = upcoming.length > 0 && prepGap;

  if (!stalledByActivity && !stalledByPrep && ctx.validatedFields >= 5) return null;

  return indicator({
    id: "intelligence_capture_stalled",
    label: "Intelligence capture stalled",
    scan: scanLine(
      `${ctx.unknownGaps} open signals on file${stalledByPrep ? " — field touch scheduled but OR intelligence thin" : ""}.`,
      72,
    ),
    tone: "warn",
    priority: 88,
  });
}

function detectDiscoveryAccelerating(ctx: MomentumContext): ProviderAccountMomentumIndicator | null {
  const lastActivity = lastRepActivityMs(ctx.activityTimeline);
  const daysSinceActivity = daysSinceMs(lastActivity, ctx.nowMs);
  const recentTouch = daysSinceActivity != null && daysSinceActivity <= 21;

  const completed45 = recentCompletedCount(ctx.engagements, 45, ctx.nowMs);
  const completed60 = recentCompletedCount(ctx.engagements, 60, ctx.nowMs);
  const upcoming = ctx.engagements.filter((e) => isUpcomingEngagementStatus(e.status));

  const motion =
    (recentTouch && (completed45 >= 1 || upcoming.length > 0)) ||
    completed60 >= 2;

  if (!motion) return null;
  if (ctx.unknownGaps > 5 && !recentTouch) return null;

  return indicator({
    id: "discovery_accelerating",
    label: "Intelligence accelerating",
    scan: scanLine(
      upcoming.length > 0
        ? `Recent field motion plus ${upcoming.length} scheduled OR touch${upcoming.length > 1 ? "es" : ""}.`
        : `Recent field activity — open signals closing (${Math.max(0, 12 - ctx.unknownGaps)}+ validated).`,
      64,
    ),
    tone: "positive",
    priority: 78,
  });
}

function detectRelationshipProgressing(
  ctx: MomentumContext,
): ProviderAccountMomentumIndicator | null {
  const rel = ctx.readinessIndicators.find((i) => i.id === "relationship_maturity");
  if (!rel) return null;

  const progressing =
    rel.state === "partially_validated" ||
    rel.state === "operationally_viable" ||
    rel.state === "adoption_building";

  if (!progressing) return null;

  const completed45 = recentCompletedCount(ctx.engagements, 45, ctx.nowMs);
  const upcoming = ctx.engagements.filter((e) => isUpcomingEngagementStatus(e.status));
  if (completed45 === 0 && upcoming.length === 0) return null;

  const strength = String(ctx.contact.relationship_strength ?? "").trim().toLowerCase();

  return indicator({
    id: "relationship_progressing",
    label: "Surgeon relationship advancing",
    scan: scanLine(
      strength === "strong" || strength === "medium"
        ? `${rel.stateLabel} with recent field motion.`
        : `${rel.stateLabel} — book the next dated OR touch while access holds.`,
      64,
    ),
    tone: "positive",
    priority: 74,
  });
}

function detectObservationPathwayStrengthening(
  ctx: MomentumContext,
): ProviderAccountMomentumIndicator | null {
  const obs = ctx.readinessIndicators.find((i) => i.id === "observation_readiness");
  if (!obs) return null;

  const strengthening =
    obs.state === "observation_ready" ||
    ctx.observationVerdict === "likely_feasible" ||
    (obs.state === "operationally_viable" &&
      ctx.observationVerdict !== "blockers_identified" &&
      ctx.observationVerdict !== "too_early");

  if (!strengthening) return null;
  if (ctx.observationVerdict === "blockers_identified") return null;

  return indicator({
    id: "observation_pathway_strengthening",
    label: "OR access pathway firming",
    scan: scanLine(
      obs.state === "observation_ready"
        ? "OR access validated — scheduling authority signals firming up."
        : "Observation allowance and OR access signals advancing on file.",
      64,
    ),
    tone: "positive",
    priority: 76,
  });
}

export function buildProviderAccountMomentumIndicators(input: {
  contact: Record<string, unknown>;
  relationshipStage: string;
  commercialStage: ProviderCommercialWorkflowStage;
  engagements?: ProviderEngagementSummary[];
  activity_timeline?: Array<Record<string, unknown>>;
  planning?: ProviderPlanningCompletion | null;
  nowMs?: number;
}): ProviderAccountMomentum {
  const nowMs = input.nowMs ?? Date.now();
  const engagements = input.engagements ?? [];
  const activityTimeline = input.activity_timeline ?? [];

  const readinessIndicators = buildProviderOverviewQualitativeReadiness({
    contact: input.contact,
    relationshipStage: input.relationshipStage,
    commercialStage: input.commercialStage,
    engagements,
    opportunities: [],
  });

  const observationSummary = buildProviderObservationFeasibilitySummary({
    contact: input.contact,
    commercialStage: input.commercialStage,
  });

  const ctx: MomentumContext = {
    contact: input.contact,
    relationshipStage: input.relationshipStage,
    commercialStage: input.commercialStage,
    engagements,
    activityTimeline,
    readinessIndicators,
    observationVerdict: observationSummary.showPanel ? observationSummary.verdictId : null,
    unknownGaps: countUnknownGaps(input.contact, input.planning),
    validatedFields: countValidatedIntelligenceFields(input.contact),
    nowMs,
  };

  const candidates = [
    detectEngagementInactive(ctx),
    detectIntelligenceCaptureStalled(ctx),
    detectDiscoveryAccelerating(ctx),
    detectObservationPathwayStrengthening(ctx),
    detectRelationshipProgressing(ctx),
  ].filter(Boolean) as ProviderAccountMomentumIndicator[];

  const inactive = candidates.some((c) => c.id === "engagement_inactive");

  const filtered = candidates.filter((c) => {
    if (!inactive) return true;
    if (c.id === "engagement_inactive") return true;
    if (c.id === "intelligence_capture_stalled") return true;
    return false;
  });

  const indicators = filtered
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 4);

  if (indicators.length === 0) {
    indicators.push(
      indicator({
        id: "account_steady",
        label: "Steady field motion",
        scan: "Neutral motion — keep dated OR touches and intelligence current.",
        tone: "neutral",
        priority: 40,
      }),
    );
  }

  return {
    title: PROVIDER_ACCOUNT_MOMENTUM_TITLE,
    indicators,
  };
}
