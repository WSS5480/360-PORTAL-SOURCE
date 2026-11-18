import {
  buildEngagementPrimaryAction,
  resolveEngagementWorkflowState,
} from "@/lib/surgical-sales/engagements/engagementWorkflowState";
import {
  engagementBriefingStatusAllowsOptionalPlanning,
  isEngagementEmptyPlannedView,
  resolveEngagementBriefingStatus,
} from "@/lib/surgical-sales/engagements/engagementBriefingStatus";
import type { EngagementIntelligenceReadiness } from "@/lib/surgical-sales/engagements/engagementIntelligenceReadiness";
import {
  buildEngagementOperationalBanner,
  type EngagementPlanProgress,
} from "@/lib/surgical-sales/engagements/engagementOperationalBanner";
import type { EngagementPreparationStatus } from "@/lib/surgical-sales/engagements/engagementPreparationStatus";
import {
  engagementHasTacticalDebrief,
  engagementNeedsTacticalDebrief,
} from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";
import { extractRawDebriefFromStoredNotes } from "@/lib/surgical-sales/engagements/prepareTacticalDebriefRawNotes";
import {
  buildPrepareOutcomeCaptureContext,
  type PrepareOutcomeCaptureContext,
} from "@/lib/surgical-sales/engagements/prepareOutcomeCaptureContext";
import {
  ENGAGEMENT_DEBRIEF_DISPLAY_LABELS,
  formatEngagementDebriefDisplayStatus,
} from "@/lib/surgical-sales/engagements/engagementStatusDisplay";
import { formatEngagementStatus, formatEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import { buildDebriefReviewHref } from "@/lib/surgical-sales/engagements/debriefIntelligenceSnapshot";
import {
  operationalSignalsForEngagement,
  sanitizeOperationalUserText,
} from "@/lib/surgical-sales/operationalIntelligenceEngine";

export type EngagementDetailPhase = "pre_visit" | "during_visit" | "post_visit" | "closed";

export type EngagementDebriefStatusId = "not_applicable" | "needed" | "completed" | "pending_review";

export type EngagementDetailActivity = {
  id: string;
  activity_type: string;
  body: string;
  created_at: string;
};

export type EngagementDetailRecord = {
  phase: EngagementDetailPhase;
  typeLabel: string;
  statusLabel: string;
  dateLabel: string | null;
  timeLabel: string | null;
  participants: string[];
  operationalOutcome: string | null;
  debriefStatus: {
    id: EngagementDebriefStatusId;
    label: string;
    hint: string | null;
  };
  keyObjectives: { label: string; summary: string }[];
  intelligenceChanges: string[];
  followUpActions: string[];
  linkedWorkflows: {
    id: string;
    kind: "case" | "initiative" | "provider";
    label: string;
    href: string;
    meta?: string | null;
  }[];
  timeline: { id: string; label: string; at: string | null }[];
  headline: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string } | null;
};

function trimOrNull(v: unknown): string | null {
  const t = String(v ?? "").trim();
  return t || null;
}

function splitLines(text: string | null | undefined): string[] {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

function buildEngagementIntelligenceContributions(input: {
  notes: string | null;
  providerId: string | null;
  engagementId: string;
  provider?: Record<string, unknown> | null;
  engagementTypeLabel: string;
}): string[] {
  const fromNotes = parseIntelligenceChangesFromEngagementNotes(input.notes);
  if (!input.providerId || !input.provider) {
    return fromNotes;
  }

  const signals = operationalSignalsForEngagement({
    providerId: input.providerId,
    engagementId: input.engagementId,
    contact: input.provider,
    engagementSourceLabel: input.engagementTypeLabel,
  });

  const fromSignals = signals
    .filter((s) => s.signalType === "evidence" || s.signalType === "early_signal")
    .map((s) => sanitizeOperationalUserText(`${s.label}: ${s.summary}`, 160))
    .filter(Boolean);

  if (fromSignals.length === 0) return fromNotes;
  const merged = [...fromSignals];
  for (const line of fromNotes) {
    if (!merged.some((m) => m.toLowerCase() === line.toLowerCase())) merged.push(line);
  }
  return merged.slice(0, 8);
}

export function parseIntelligenceChangesFromEngagementNotes(notes: string | null | undefined): string[] {
  const t = String(notes ?? "");
  const match = /operational intelligence captured:\s*\n([\s\S]*)/i.exec(t);
  if (!match?.[1]) return [];
  return match[1]
    .split(/\n/)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function resolveEngagementDetailPhase(
  status: string,
  outcome?: Pick<PrepareOutcomeCaptureContext, "is_post_meeting" | "is_completed">,
): EngagementDetailPhase {
  const s = String(status ?? "planned").toLowerCase();
  if (s === "completed" || outcome?.is_completed) return "closed";
  if (s === "in_progress") return "during_visit";
  if (outcome?.is_post_meeting) return "post_visit";
  return "pre_visit";
}

function formatEngagementDateTime(engagement: Record<string, unknown>): {
  dateLabel: string | null;
  timeLabel: string | null;
} {
  const scheduled = trimOrNull(engagement.scheduled_at);
  const dateOnly = trimOrNull(engagement.engagement_date);

  if (scheduled) {
    const d = new Date(scheduled);
    if (!Number.isNaN(d.getTime())) {
      return {
        dateLabel: d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
        timeLabel: d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
      };
    }
  }

  if (dateOnly) {
    const d = new Date(`${dateOnly}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return {
        dateLabel: d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
        timeLabel: null,
      };
    }
  }

  return { dateLabel: null, timeLabel: null };
}

function buildDebriefStatus(params: {
  phase: EngagementDetailPhase;
  engagement: Record<string, unknown>;
  hasOutcomeNotes: boolean;
}): EngagementDetailRecord["debriefStatus"] {
  const hasDebrief = engagementHasTacticalDebrief({
    notes: params.engagement.notes ? String(params.engagement.notes) : null,
    debrief_completed: Boolean(params.engagement.debrief_completed),
    debrief_completed_at: params.engagement.debrief_completed_at
      ? String(params.engagement.debrief_completed_at)
      : null,
  });

  const displayLabel = formatEngagementDebriefDisplayStatus(params.engagement);

  if (params.phase === "pre_visit" || params.phase === "during_visit") {
    return {
      id: "not_applicable",
      label: ENGAGEMENT_DEBRIEF_DISPLAY_LABELS.pending,
      hint: "Debrief opens once the touch is complete.",
    };
  }

  if (hasDebrief) {
    return {
      id: "completed",
      label: ENGAGEMENT_DEBRIEF_DISPLAY_LABELS.completed,
      hint: params.hasOutcomeNotes ? "On file — reopen to adjust." : null,
    };
  }

  if (engagementNeedsTacticalDebrief(params.engagement as Parameters<typeof engagementNeedsTacticalDebrief>[0])) {
    return {
      id: "needed",
      label: displayLabel ?? ENGAGEMENT_DEBRIEF_DISPLAY_LABELS.pending,
      hint: "Capture what happened while the visit is fresh.",
    };
  }

  return {
    id: "pending_review",
    label: displayLabel ?? ENGAGEMENT_DEBRIEF_DISPLAY_LABELS.pending,
    hint: "Add debrief notes to close the record.",
  };
}

function buildOperationalOutcome(params: {
  engagement: Record<string, unknown>;
  phase: EngagementDetailPhase;
  nextAction: string | null;
  briefingStatus: ReturnType<typeof resolveEngagementBriefingStatus>;
}): string | null {
  const narrative = extractRawDebriefFromStoredNotes(
    params.engagement.notes ? String(params.engagement.notes) : null,
  );
  if (narrative) {
    const firstLine = narrative.split(/\n/).find((l) => l.trim())?.trim();
    if (firstLine) return firstLine.length > 220 ? `${firstLine.slice(0, 217)}…` : firstLine;
  }

  if (params.nextAction) return params.nextAction;

  if (params.phase === "pre_visit") {
    if (engagementBriefingStatusAllowsOptionalPlanning(params.briefingStatus)) {
      return "Scheduled touch — generate a field briefing when you want prep.";
    }
    return "Touch not yet executed — prep lives in Field Briefing.";
  }

  if (params.phase === "during_visit") {
    return "Visit in progress — capture notes or debrief when ready.";
  }

  return null;
}

function buildTimelineFromActivities(
  activities: EngagementDetailActivity[],
  engagement: Record<string, unknown>,
): EngagementDetailRecord["timeline"] {
  const rows: EngagementDetailRecord["timeline"] = [];

  const created = trimOrNull(engagement.created_at);
  if (created) {
    rows.push({ id: "created", label: "Engagement created", at: created });
  }

  const prepared = trimOrNull(engagement.prepared_at);
  if (prepared) {
    rows.push({ id: "prepared", label: "Field briefing marked ready", at: prepared });
  }

  const debriefAt = trimOrNull(engagement.debrief_completed_at);
  if (debriefAt) {
    rows.push({ id: "debrief", label: "Debrief submitted", at: debriefAt });
  }

  const activityLabels: Record<string, string> = {
    engagement_completed: "Visit marked complete",
    engagement_updated: "Engagement updated",
    pre_call_plan_updated: "Prep plan updated",
    debrief_saved: "Debrief saved",
    intelligence_captured: "Intelligence updated",
  };

  for (const act of activities.slice(0, 6)) {
    const type = String(act.activity_type || "").toLowerCase();
    const label =
      activityLabels[type] ||
      (act.body.trim().length > 0 && act.body.length <= 80 ? act.body.trim() : null);
    if (!label) continue;
    rows.push({
      id: act.id,
      label,
      at: act.created_at || null,
    });
  }

  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.label}|${row.at ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

function buildDetailHeadline(phase: EngagementDetailPhase): string {
  switch (phase) {
    case "pre_visit":
      return "Scheduled touch — execution record will populate after the visit.";
    case "during_visit":
      return "Visit underway — capture outcomes and intelligence as you go.";
    case "post_visit":
      return "Post-visit record — close debrief and follow-ups.";
    case "closed":
      return "Execution record — what happened, what changed, and what is still open.";
    default:
      return "Engagement execution record.";
  }
}

function buildDetailActions(params: {
  engagementId: string;
  engagement: Record<string, unknown>;
  status: string;
}): Pick<EngagementDetailRecord, "primaryCta" | "secondaryCta"> {
  const workflowState = resolveEngagementWorkflowState({
    status: params.status,
    isMeetingPrepared: Boolean(params.engagement.is_meeting_prepared),
    preparedAt: params.engagement.prepared_at ? String(params.engagement.prepared_at) : null,
    planningStatus: params.engagement.planning_status
      ? String(params.engagement.planning_status)
      : null,
    briefingStatus: params.engagement.briefing_status
      ? String(params.engagement.briefing_status)
      : null,
    hasDebrief: engagementHasTacticalDebrief({
      notes: params.engagement.notes ? String(params.engagement.notes) : null,
      debrief_completed: Boolean(params.engagement.debrief_completed),
      debrief_completed_at: params.engagement.debrief_completed_at
        ? String(params.engagement.debrief_completed_at)
        : null,
    }),
    engagement: params.engagement,
  });
  const primary = buildEngagementPrimaryAction({
    engagementId: params.engagementId,
    state: workflowState,
    engagementType: String(params.engagement.engagement_type ?? ""),
  });
  return {
    primaryCta: { label: primary.label, href: primary.href },
    secondaryCta: null,
  };
}

export function buildEngagementDetailRecord(params: {
  engagementId: string;
  engagement: Record<string, unknown>;
  preparation: EngagementPreparationStatus;
  planProgress: EngagementPlanProgress;
  readiness: EngagementIntelligenceReadiness;
  provider?: Record<string, unknown> | null;
  providerId?: string | null;
  linkedCaseId?: string | null;
  caseNumber?: string | null;
  linkedOpportunityId?: string | null;
  opportunityLabel?: string | null;
  activities?: EngagementDetailActivity[];
  nowMs?: number;
}): EngagementDetailRecord {
  const engagement = params.engagement;
  const status = String(engagement.status ?? "planned");
  const notes = trimOrNull(engagement.notes);
  const outcome = buildPrepareOutcomeCaptureContext(engagement, params.nowMs);
  const phase = resolveEngagementDetailPhase(status, outcome);
  const typeLabel = formatEngagementType(String(engagement.engagement_type ?? ""));
  const statusLabel = formatEngagementStatus(status, engagement);
  const briefingStatus = resolveEngagementBriefingStatus(engagement);
  const { dateLabel, timeLabel } = formatEngagementDateTime(engagement);
  const participants = splitLines(trimOrNull(engagement.attendees)).slice(0, 6);

  const banner = buildEngagementOperationalBanner({
    status,
    engagementType: String(engagement.engagement_type ?? ""),
    preparation: params.preparation,
    planProgress: params.planProgress,
    hasOutcomeNotes: Boolean(notes),
    provider: params.provider,
    providerId: params.providerId,
    engagement,
  });

  const nextAction = trimOrNull(engagement.next_action);
  const followUpActions = [
    ...splitLines(trimOrNull(engagement.follow_up_tasks)),
    ...(nextAction && !splitLines(trimOrNull(engagement.follow_up_tasks)).includes(nextAction)
      ? [nextAction]
      : []),
  ].slice(0, 8);

  const debriefStatus = buildDebriefStatus({
    phase,
    engagement,
    hasOutcomeNotes: Boolean(notes),
  });

  const keyObjectives =
    !isEngagementEmptyPlannedView(engagement) &&
    phase === "pre_visit" &&
    params.readiness.discoveryObjectives.length > 0
      ? params.readiness.discoveryObjectives.slice(0, 4).map((o) => ({
          label: o.label,
          summary: o.summary,
        }))
      : [];

  const linkedWorkflows: EngagementDetailRecord["linkedWorkflows"] = [];
  const providerId =
    params.providerId ?? (params.provider?.id ? String(params.provider.id) : null);

  const intelligenceChanges = isEngagementEmptyPlannedView(engagement)
    ? []
    : buildEngagementIntelligenceContributions({
    notes,
    providerId,
    engagementId: params.engagementId,
    provider: params.provider,
    engagementTypeLabel: typeLabel,
  });
  if (providerId) {
    linkedWorkflows.push({
      id: "provider",
      kind: "provider",
      label: "Provider account",
      href: `/portal/sales/providers/${encodeURIComponent(providerId)}`,
    });
  }
  if (params.linkedCaseId) {
    linkedWorkflows.push({
      id: "case",
      kind: "case",
      label: params.caseNumber ? `Case ${params.caseNumber}` : "Linked case",
      href: `/portal/sales/cases/${encodeURIComponent(params.linkedCaseId)}`,
    });
  }
  if (params.linkedOpportunityId) {
    linkedWorkflows.push({
      id: "initiative",
      kind: "initiative",
      label: params.opportunityLabel || "Evaluation",
      href: `/portal/sales/opportunities/${encodeURIComponent(params.linkedOpportunityId)}`,
    });
  }

  const timeline = buildTimelineFromActivities(params.activities ?? [], engagement);

  const actions = buildDetailActions({
    engagementId: params.engagementId,
    engagement,
    status,
  });

  // Banner subtitle is still useful for operational tone in compact surfaces.
  void banner;

  return {
    phase,
    typeLabel,
    statusLabel,
    dateLabel,
    timeLabel,
    participants,
    operationalOutcome: buildOperationalOutcome({ engagement, phase, nextAction, briefingStatus }),
    debriefStatus,
    keyObjectives,
    intelligenceChanges,
    followUpActions,
    linkedWorkflows,
    timeline,
    headline: buildDetailHeadline(phase),
    ...actions,
  };
}
