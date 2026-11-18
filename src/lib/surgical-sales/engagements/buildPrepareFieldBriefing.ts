import type { PrepareForMeetingView } from "@/lib/surgical-sales/engagements/buildPrepareForMeetingView";
import type { PrepareWhatMattersMost } from "@/lib/surgical-sales/engagements/buildPrepareWhatMattersMost";
import {
  DEPLOYMENT_RISK_LABEL,
  NEXT_STEP_OPPORTUNITY_LABEL,
  REFINE_PREP_EMPTY_DISCOVERY_HINT,
  TOP_ASKS_LABEL,
} from "@/lib/surgical-sales/engagements/prepareFlowTerminology";
import { splitProbeLines } from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistProbeUtils";

export type PrepareFieldBriefingSection = {
  id: "who" | "why" | "learn" | "risks" | "next";
  title: string;
};

export const PREPARE_FIELD_BRIEFING_SECTIONS: PrepareFieldBriefingSection[] = [
  { id: "who", title: "Who" },
  { id: "why", title: "Outcome" },
  { id: "learn", title: TOP_ASKS_LABEL },
  { id: "risks", title: DEPLOYMENT_RISK_LABEL },
  { id: "next", title: NEXT_STEP_OPPORTUNITY_LABEL },
];

/** Above-the-fold scan card — fits one screen with page header on mobile */
export type PrepareFieldBriefingSummary = {
  displayName: string;
  metaLine: string | null;
  chips: string[];
  meetingLine: string;
  goal: string | null;
  topRisk: string | null;
  riskCount: number;
  primaryNext: string | null;
};

export type PrepareFieldBriefingWho = {
  displayName: string;
  specialty: string | null;
  organizationName: string | null;
  locationLabel: string | null;
  chips: string[];
  metrics: Array<{ label: string; value: string; href: string | null }>;
  lastTouchLabel: string | null;
  lastTouchHref: string | null;
  providerHref: string | null;
};

export type PrepareFieldBriefingWhy = {
  meetingLine: string;
  goal: string | null;
  contextLine: string | null;
  officeLines: Array<{ label: string; value: string }>;
  opportunityLabel: string | null;
  opportunityHref: string | null;
};

export type PrepareFieldBriefingLearn = {
  talkingPoints: string[];
  intelligenceLines: Array<{ label: string; value: string }>;
  lastInsight: string | null;
  lastInsightHref: string | null;
  emptyHint: string | null;
};

export type PrepareFieldBriefingRisks = {
  items: string[];
  moreItems: string[];
  emptyHint: string;
};

export type PrepareFieldBriefingActivityTeaser = {
  id: string;
  title: string;
  atLabel: string;
  href: string | null;
};

export type PrepareFieldBriefingNext = {
  actions: string[];
  primaryCta: { label: string; href: string };
  recentTeaser: PrepareFieldBriefingActivityTeaser[];
  timelineHref: string;
};

/** Secondary prep data — shown in collapsed drawers only */
export type PrepareFieldBriefingSupporting = {
  account: {
    summaryLabel: string | null;
    metrics: Array<{ label: string; value: string; href: string | null }>;
    opportunityLabel: string | null;
    opportunityHref: string | null;
    officeLines: Array<{ label: string; value: string }>;
    lastTouchLabel: string | null;
    lastTouchHref: string | null;
    metaLine: string | null;
    chips: string[];
  };
  intelligence: {
    summaryLabel: string | null;
    contextLine: string | null;
    lines: Array<{ label: string; value: string }>;
    lastInsight: string | null;
    lastInsightHref: string | null;
  };
  activity: {
    summaryLabel: string | null;
    recentTeaser: PrepareFieldBriefingActivityTeaser[];
    timelineHref: string;
  };
  extraFlags: {
    summaryLabel: string | null;
    moreRisks: string[];
    moreNextActions: string[];
  };
};

export type PrepareFieldBriefing = {
  whatMattersMost: PrepareWhatMattersMost;
  supporting: PrepareFieldBriefingSupporting;
  summary: PrepareFieldBriefingSummary;
  who: PrepareFieldBriefingWho;
  why: PrepareFieldBriefingWhy;
  learn: PrepareFieldBriefingLearn;
  risks: PrepareFieldBriefingRisks;
  next: PrepareFieldBriefingNext;
};

/** Top discovery probes shown before scroll */
export const MAX_FIELD_BRIEFING_DISCOVERIES = 3;
const MAX_TALKING_POINTS = MAX_FIELD_BRIEFING_DISCOVERIES;
const MAX_RISKS_VISIBLE = 2;
const MAX_RISKS_STORED = 5;
const MAX_NEXT_ACTIONS = 2;
const MAX_RECENT = 5;
const MAX_METRICS = 6;
const MAX_OFFICE_LINES = 4;
const MAX_INTEL_DRAWER = 6;

function supportingCountLabel(count: number, singular: string, plural?: string): string | null {
  if (count <= 0) return null;
  return count === 1 ? `1 ${singular}` : `${count} ${plural ?? `${singular}s`}`;
}

function trimWhy(why: string, goal: string): string | null {
  const w = why.trim();
  const g = goal.trim();
  if (!w || w === g) return null;
  if (g && w.includes(g.slice(0, Math.min(40, g.length)))) return null;
  return w.length > 140 ? `${w.slice(0, 139)}…` : w;
}

export function buildPrepareFieldBriefing(data: PrepareForMeetingView): PrepareFieldBriefing {
  const snap = data.provider_snapshot;
  const upcoming = data.upcoming_engagement;
  const goal = data.suggested_goal.goal?.trim() || null;

  const chips: string[] = [];
  if (snap.relationship_status_label) chips.push(snap.relationship_status_label);
  if (snap.influence_level_label) chips.push(snap.influence_level_label);

  const metrics = data.at_a_glance_stats.slice(0, MAX_METRICS).map((s) => ({
    label: s.label,
    value: s.value,
    href: s.href ?? null,
  }));

  const meetingParts = [upcoming.type_label, upcoming.datetime_label].filter(Boolean);
  const meetingLine = meetingParts.join(" · ");

  const officeLines =
    upcoming.office_visit_context?.lines.slice(0, MAX_OFFICE_LINES).map((l) => ({
      label: l.label,
      value: l.value,
    })) ?? [];

  const savedProbes = splitProbeLines(data.plan_fields.pre_observation_probes);
  const talkingPoints =
    savedProbes.length > 0
      ? savedProbes.slice(0, MAX_TALKING_POINTS)
      : data.suggested_talking_points.points.slice(0, MAX_TALKING_POINTS);

  const intelligenceLines = data.known_intelligence.bullets
    .slice(0, MAX_INTEL_DRAWER)
    .map((b) => ({ label: b.label, value: b.value }));

  const lastInsight = data.known_intelligence.last_key_insight;
  const learnEmpty =
    talkingPoints.length === 0 && intelligenceLines.length === 0 && !lastInsight
      ? REFINE_PREP_EMPTY_DISCOVERY_HINT
      : null;

  const riskLabels = data.risks_barriers.risks.slice(0, MAX_RISKS_STORED).map((r) => r.label);
  const actions = data.recommended_next_actions.actions.slice(0, MAX_NEXT_ACTIONS);

  const metaParts = [snap.specialty, snap.organization_name, snap.location_label].filter(Boolean);
  const summary: PrepareFieldBriefingSummary = {
    displayName: snap.display_name,
    metaLine: metaParts.length > 0 ? metaParts.join(" · ") : null,
    chips,
    meetingLine,
    goal,
    topRisk: riskLabels[0] ?? null,
    riskCount: riskLabels.length,
    primaryNext: actions[0] ?? null,
  };

  const contextLine = goal
    ? trimWhy(data.suggested_goal.why, goal)
    : data.suggested_goal.why?.trim() || null;
  const recentTeaser: PrepareFieldBriefingActivityTeaser[] = data.recent_activity.items
    .slice(0, MAX_RECENT)
    .map((item) => ({
      id: item.id,
      title: item.title,
      atLabel: item.at_label,
      href: item.href,
    }));
  const moreRisks = riskLabels.slice(MAX_RISKS_VISIBLE);
  const moreNextActions = actions.slice(1);
  const opportunityLabel = upcoming.opportunity_label;

  const accountParts = [
    supportingCountLabel(metrics.length, "stat"),
    opportunityLabel ? "opportunity" : null,
    officeLines.length > 0 ? supportingCountLabel(officeLines.length, "visit detail", "visit details") : null,
    snap.last_engagement_title ? "last touch" : null,
  ].filter(Boolean);
  const intelParts = [
    supportingCountLabel(intelligenceLines.length, "field"),
    lastInsight ? "latest insight" : null,
    contextLine ? "prep context" : null,
  ].filter(Boolean);
  const activityParts = [supportingCountLabel(recentTeaser.length, "activity")].filter(Boolean);
  const flagParts = [
    supportingCountLabel(moreRisks.length, "risk"),
    supportingCountLabel(moreNextActions.length, "action"),
  ].filter(Boolean);

  return {
    whatMattersMost: data.what_matters_most,
    supporting: {
      account: {
        summaryLabel: accountParts.length > 0 ? accountParts.join(" · ") : null,
        metrics,
        opportunityLabel,
        opportunityHref: upcoming.opportunity_href,
        officeLines,
        lastTouchLabel: snap.last_engagement_title,
        lastTouchHref: snap.last_engagement_href,
        metaLine: metaParts.length > 0 ? metaParts.join(" · ") : null,
        chips,
      },
      intelligence: {
        summaryLabel: intelParts.length > 0 ? intelParts.join(" · ") : null,
        contextLine,
        lines: intelligenceLines,
        lastInsight: lastInsight?.body?.trim() || null,
        lastInsightHref: lastInsight?.href ?? null,
      },
      activity: {
        summaryLabel: activityParts.length > 0 ? activityParts.join(" · ") : null,
        recentTeaser,
        timelineHref: data.recent_activity.timeline_href,
      },
      extraFlags: {
        summaryLabel: flagParts.length > 0 ? flagParts.join(" · ") : null,
        moreRisks,
        moreNextActions,
      },
    },
    summary,
    who: {
      displayName: snap.display_name,
      specialty: snap.specialty,
      organizationName: snap.organization_name,
      locationLabel: snap.location_label,
      chips,
      metrics,
      lastTouchLabel: snap.last_engagement_title,
      lastTouchHref: snap.last_engagement_href,
      providerHref: data.provider_href,
    },
    why: {
      meetingLine,
      goal,
      contextLine,
      officeLines,
      opportunityLabel,
      opportunityHref: upcoming.opportunity_href,
    },
    learn: {
      talkingPoints,
      intelligenceLines,
      lastInsight: lastInsight?.body?.trim() || null,
      lastInsightHref: lastInsight?.href ?? null,
      emptyHint: learnEmpty,
    },
    risks: {
      items: riskLabels.slice(0, MAX_RISKS_VISIBLE),
      moreItems: riskLabels.slice(MAX_RISKS_VISIBLE),
      emptyHint: "Nothing flagged — confirm on site.",
    },
    next: {
      actions,
      primaryCta: data.recommended_next_actions.primary_cta,
      recentTeaser,
      timelineHref: data.recent_activity.timeline_href,
    },
  };
}
