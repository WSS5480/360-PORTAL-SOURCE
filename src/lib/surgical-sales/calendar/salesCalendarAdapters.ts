/**
 * Sales Command Rep Calendar — map workflow objects to normalized calendar events.
 */

import { caseListOperationalPrepHint } from "@/lib/surgical-sales/buildCaseOperationalContextView";
import { resolveEngagementPlanningStatus } from "@/lib/surgical-sales/engagements/engagementPlanningModel";
import { formatEngagementPreparationDisplayStatus } from "@/lib/surgical-sales/engagements/engagementStatusDisplay";
import { formatEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import {
  engagementHasTacticalDebrief,
  engagementNeedsTacticalDebrief,
} from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";
import {
  isUpcomingEngagementStatus,
  type ProviderEngagementSummary,
} from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  formatSurgicalCaseStatus,
  formatSurgicalCaseType,
  isSurgicalObservationCase,
} from "@/lib/surgical-sales/labels";
import {
  buildSalesCalendarEventId,
  resolveCaseCalendarSchedule,
  resolveEngagementCalendarSchedule,
  resolveTaskCalendarSchedule,
  resolveTimeOffCalendarSchedule,
} from "@/lib/surgical-sales/calendar/salesCalendarSchedule";
import type {
  SalesCalendarCaseInput,
  SalesCalendarEngagementInput,
  SalesCalendarEvent,
  SalesCalendarEventPriority,
  SalesCalendarEventSourceType,
  SalesCalendarRecordType,
  SalesCalendarTaskInput,
  SalesCalendarTimeOffInput,
} from "@/lib/surgical-sales/calendar/salesCalendarTypes";
import { TIME_OFF_TYPE_LABELS } from "@/lib/sales/timeOffRequests";

const OBSERVATION_ENGAGEMENT_TYPES = new Set(["observation_request", "or_visit", "or_observation"]);
const DONE_CASE_STATUSES = new Set(["completed", "invoiced", "closed", "cancelled"]);

function trimOrNull(v: string | null | undefined): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

function caseStatusNormalized(status: string | null | undefined): string {
  return String(status ?? "").trim().toLowerCase();
}

function isDoneCase(status: string): boolean {
  return DONE_CASE_STATUSES.has(status);
}

export function caseNeedsDebriefForCalendar(c: SalesCalendarCaseInput): boolean {
  const st = caseStatusNormalized(c.status);
  if (!isSurgicalObservationCase(c.case_type)) {
    return st === "docs_needed" || st === "billing_review";
  }
  if (st === "completed" || st === "docs_needed" || st === "billing_review") {
    const goal = String(c.observation_goal ?? "").trim();
    const notes = String(c.notes ?? "").trim();
    const debriefFindings = String(c.debrief_key_findings ?? "").trim();
    const noteCount = Number(c.note_count ?? 0);
    return !goal && !notes && !debriefFindings && noteCount <= 0;
  }
  return false;
}

export function engagementNeedsPrepForCalendar(
  engagement: Pick<
    SalesCalendarEngagementInput,
    | "status"
    | "prepared_at"
    | "is_meeting_prepared"
    | "pre_call_total"
    | "pre_call_complete"
    | "is_legacy_draft"
  >,
): boolean {
  if (engagement.is_legacy_draft) return false;
  if (!isUpcomingEngagementStatus(engagement.status)) return false;
  if (engagement.is_meeting_prepared || engagement.prepared_at) return false;
  if ((engagement.pre_call_total ?? 0) > 0) {
    return !engagement.pre_call_complete;
  }
  return false;
}

export function caseNeedsPrepForCalendar(c: SalesCalendarCaseInput): boolean {
  const st = caseStatusNormalized(c.status);
  if (isDoneCase(st) || st === "cancelled") return false;
  if (st !== "scheduled" && st !== "confirmed" && st !== "draft") return false;
  const hint = caseListOperationalPrepHint(c);
  if (!hint) return false;
  return !hint.toLowerCase().includes("strong");
}

function resolveDisplaySourceType(input: {
  recordType: SalesCalendarRecordType;
  needsFollowUp: boolean;
  isObservationRecord: boolean;
}): SalesCalendarEventSourceType {
  if (input.needsFollowUp || input.recordType === "task") return "follow_up";
  if (input.isObservationRecord) return "observation";
  if (input.recordType === "case") return "case";
  return "engagement";
}

function resolveEventPriority(input: {
  requiresDebrief: boolean;
  requiresPrep: boolean;
  needsFollowUp: boolean;
  status?: string;
}): SalesCalendarEventPriority {
  if (input.requiresDebrief) return "high";
  if (input.requiresPrep) return "medium";
  if (input.needsFollowUp) return "medium";
  const st = caseStatusNormalized(input.status);
  if (st === "cancelled") return "low";
  return "medium";
}

function engagementToSummaryShape(row: SalesCalendarEngagementInput): ProviderEngagementSummary {
  const briefingStatus = resolveEngagementPlanningStatus(row as Record<string, unknown>);
  const briefingLabel = formatEngagementPreparationDisplayStatus(row) ?? "";
  return {
    id: row.id,
    engagement_type: row.engagement_type,
    engagement_type_label: row.engagement_type_label ?? formatEngagementType(row.engagement_type),
    status: row.status,
    status_label: row.status_label ?? row.status,
    title: row.title,
    engagement_date: row.engagement_date,
    scheduled_at: row.scheduled_at,
    notes: row.notes,
    organization_id: row.organization_id ?? null,
    organization_name: row.organization_label ?? row.organization_name ?? null,
    pre_call_filled: row.pre_call_filled ?? 0,
    pre_call_total: row.pre_call_total ?? 0,
    pre_call_complete: row.pre_call_complete ?? false,
    briefing_status: briefingStatus,
    briefing_status_label: briefingLabel,
    planning_status: briefingStatus,
    planning_status_label: briefingLabel,
    prepared_at: row.prepared_at,
    is_meeting_prepared: row.is_meeting_prepared ?? Boolean(row.prepared_at),
    outcome_label: "",
    debrief_completed: row.debrief_completed,
    debrief_completed_at: row.debrief_completed_at,
    is_legacy_draft: row.is_legacy_draft,
  };
}

function buildEngagementTitle(row: SalesCalendarEngagementInput): string {
  const typeLabel = row.engagement_type_label ?? formatEngagementType(row.engagement_type);
  const provider = trimOrNull(row.provider_label);
  const custom = trimOrNull(row.title);
  if (custom && provider) return `${typeLabel} — ${provider}`;
  if (provider) return `${typeLabel} — ${provider}`;
  if (custom) return `${typeLabel} — ${custom}`;
  return typeLabel;
}

function calendarEngagementStatusLabel(row: SalesCalendarEngagementInput, requiresPrep: boolean): string {
  const rawStatus = String(row.status ?? "").trim();
  const label = String(row.status_label ?? rawStatus).trim();
  if (requiresPrep && rawStatus.toLowerCase() === "planned") return "Scheduled";
  return label || rawStatus;
}

export function mapEngagementToCalendarEvent(
  row: SalesCalendarEngagementInput,
): SalesCalendarEvent | null {
  if (row.is_legacy_draft) return null;

  const schedule = resolveEngagementCalendarSchedule({
    scheduled_at: row.scheduled_at,
    engagement_date: row.engagement_date,
  });
  if (!schedule) return null;

  const summary = engagementToSummaryShape(row);
  const requiresDebrief = engagementNeedsTacticalDebrief(summary);
  const requiresPrep = engagementNeedsPrepForCalendar(row);
  const isObservationRecord = OBSERVATION_ENGAGEMENT_TYPES.has(String(row.engagement_type || ""));
  const debriefDone = engagementHasTacticalDebrief(summary);

  const sourceType = resolveDisplaySourceType({
    recordType: "engagement",
    needsFollowUp: false,
    isObservationRecord,
  });

  return {
    id: buildSalesCalendarEventId("engagement", row.id),
    sourceType,
    sourceId: row.id,
    title: buildEngagementTitle(row),
    start: schedule.start,
    end: schedule.end,
    allDay: schedule.allDay,
    status: calendarEngagementStatusLabel(row, requiresPrep),
    priority: resolveEventPriority({
      requiresDebrief,
      requiresPrep,
      needsFollowUp: false,
      status: row.status,
    }),
    providerName: trimOrNull(row.provider_label) ?? undefined,
    organizationName:
      trimOrNull(row.organization_label) ?? trimOrNull(row.organization_name) ?? undefined,
    requiresDebrief,
    requiresPrep,
    needsFollowUp: false,
    metadata: {
      recordType: "engagement",
      engagementType: row.engagement_type,
      caseId: row.case_id ?? null,
      debriefCompleted: debriefDone,
      preparedAt: row.prepared_at ?? null,
      href: `/portal/sales/engagements/${encodeURIComponent(row.id)}`,
      prepareHref: `/portal/sales/engagements/${encodeURIComponent(row.id)}/prepare`,
      opportunityId: null,
    },
  };
}

function buildCaseTitle(c: SalesCalendarCaseInput, observation: boolean): string {
  const typeLabel = observation ? "Observation" : formatSurgicalCaseType(c.case_type);
  const org = trimOrNull(c.account_name);
  const surgeon = trimOrNull(c.surgeon_display);
  const product = trimOrNull(c.product_name);
  if (observation && org) return `${typeLabel} — ${org}`;
  if (product && surgeon) return `${typeLabel} — ${product}`;
  if (surgeon) return `${typeLabel} — ${surgeon}`;
  if (org) return `${typeLabel} — ${org}`;
  const num = trimOrNull(c.case_number);
  return num ? `${typeLabel} — ${num}` : typeLabel;
}

export function mapCaseToCalendarEvent(c: SalesCalendarCaseInput): SalesCalendarEvent | null {
  const schedule = resolveCaseCalendarSchedule({
    case_date: c.case_date,
    case_time: c.case_time,
  });
  if (!schedule) return null;

  const observation = isSurgicalObservationCase(c.case_type);
  const st = caseStatusNormalized(c.status);
  const requiresDebrief = caseNeedsDebriefForCalendar(c);
  const requiresPrep = caseNeedsPrepForCalendar(c);
  const needsFollowUp = Boolean(c.follow_up_needed) && st !== "cancelled";

  const sourceType = resolveDisplaySourceType({
    recordType: observation ? "observation" : "case",
    needsFollowUp,
    isObservationRecord: observation,
  });

  const title = buildCaseTitle(c, observation);

  return {
    id: buildSalesCalendarEventId(observation ? "observation" : "case", c.id),
    sourceType,
    sourceId: c.id,
    title,
    start: schedule.start,
    end: schedule.end,
    allDay: schedule.allDay,
    status: formatSurgicalCaseStatus(c.status),
    priority: resolveEventPriority({
      requiresDebrief,
      requiresPrep,
      needsFollowUp,
      status: c.status,
    }),
    providerName: trimOrNull(c.surgeon_display) ?? undefined,
    organizationName: trimOrNull(c.account_name) ?? undefined,
    productFocus: trimOrNull(c.product_name) ?? undefined,
    requiresDebrief,
    requiresPrep,
    needsFollowUp,
    metadata: {
      recordType: observation ? "observation" : "case",
      caseType: c.case_type,
      caseNumber: c.case_number,
      engagementId: c.engagement_id ?? null,
      href: `/portal/sales/cases/${encodeURIComponent(c.id)}`,
      opportunityId: null,
    },
  };
}

export function mapObservationToCalendarEvent(c: SalesCalendarCaseInput): SalesCalendarEvent | null {
  if (!isSurgicalObservationCase(c.case_type)) return null;
  return mapCaseToCalendarEvent(c);
}

export function mapTaskToCalendarEvent(task: SalesCalendarTaskInput): SalesCalendarEvent | null {
  if (task.completed_at) return null;

  const schedule = resolveTaskCalendarSchedule(task.due_date);
  if (!schedule) return null;

  const sourceType = resolveDisplaySourceType({
    recordType: "task",
    needsFollowUp: true,
    isObservationRecord: false,
  });

  return {
    id: buildSalesCalendarEventId("task", task.id),
    sourceType,
    sourceId: task.id,
    title: task.title.trim(),
    start: schedule.start,
    end: schedule.end,
    allDay: schedule.allDay,
    status: "Open",
    priority: "medium",
    organizationName: trimOrNull(task.opportunity_account) ?? undefined,
    needsFollowUp: true,
    metadata: {
      recordType: "task",
      opportunityId: task.opportunity_id ?? null,
      notes: task.notes ?? null,
      href: task.opportunity_id
        ? `/portal/sales/opportunities/${encodeURIComponent(task.opportunity_id)}`
        : "/portal/sales/tasks",
    },
  };
}

export function mapEngagementsToCalendarEvents(
  rows: SalesCalendarEngagementInput[],
): SalesCalendarEvent[] {
  return rows.map(mapEngagementToCalendarEvent).filter((e): e is SalesCalendarEvent => e != null);
}

export function mapCasesToCalendarEvents(rows: SalesCalendarCaseInput[]): SalesCalendarEvent[] {
  return rows.map(mapCaseToCalendarEvent).filter((e): e is SalesCalendarEvent => e != null);
}

export function mapTasksToCalendarEvents(rows: SalesCalendarTaskInput[]): SalesCalendarEvent[] {
  return rows.map(mapTaskToCalendarEvent).filter((e): e is SalesCalendarEvent => e != null);
}

export function mapTimeOffToCalendarEvent(row: SalesCalendarTimeOffInput): SalesCalendarEvent | null {
  if (String(row.status).toLowerCase() !== "approved") return null;

  const schedule = resolveTimeOffCalendarSchedule({
    start_date: row.start_date,
    end_date: row.end_date,
  });
  if (!schedule) return null;

  const typeLabel = TIME_OFF_TYPE_LABELS[row.request_type] ?? "Time off";

  return {
    id: buildSalesCalendarEventId("time_off", row.id),
    sourceType: "time_off",
    sourceId: row.id,
    title: typeLabel,
    start: schedule.start,
    end: schedule.end,
    allDay: true,
    status: "Approved",
    priority: "low",
    metadata: {
      recordType: "time_off",
      requestType: row.request_type,
      notes: row.notes ?? null,
      href: "/portal/sales/time-off",
    },
  };
}

export function mapTimeOffToCalendarEvents(rows: SalesCalendarTimeOffInput[]): SalesCalendarEvent[] {
  return rows.map(mapTimeOffToCalendarEvent).filter((e): e is SalesCalendarEvent => e != null);
}

export function buildSalesCalendarEvents(input: {
  engagements?: SalesCalendarEngagementInput[];
  cases?: SalesCalendarCaseInput[];
  tasks?: SalesCalendarTaskInput[];
  timeOffRequests?: SalesCalendarTimeOffInput[];
}): SalesCalendarEvent[] {
  const events = [
    ...mapEngagementsToCalendarEvents(input.engagements ?? []),
    ...mapCasesToCalendarEvents(input.cases ?? []),
    ...mapTasksToCalendarEvents(input.tasks ?? []),
    ...mapTimeOffToCalendarEvents(input.timeOffRequests ?? []),
  ];
  return events.sort((a, b) => a.start.localeCompare(b.start));
}
