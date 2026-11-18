import { extractEngagementMemoryContextLine } from "@/lib/surgical-sales/engagementMemoryContextLine";
import {
  formatEngagementPlanningStatusLabel,
  resolveEngagementPlanningStatus,
  type EngagementPlanningStatus,
} from "@/lib/surgical-sales/engagements/engagementPlanningModel";
import { countPreCallPlanFilled } from "@/lib/surgical-sales/preCallPlanFields";
import { formatEngagementPreparationDisplayStatus } from "@/lib/surgical-sales/engagements/engagementStatusDisplay";
import { formatEngagementStatus, formatEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import { formatEngagementWhenLabel } from "@/lib/surgical-sales/engagements/engagementScheduleDisplay";

export { buildEngagementPrepareForMeetingHref } from "@/lib/surgical-sales/engagements/engagementLifecycle";
import { buildEngagementOpenHrefFromSummary } from "@/lib/surgical-sales/engagements/engagementWorkflowState";

export type ProviderEngagementSummary = {
  id: string;
  engagement_type: string;
  engagement_type_label: string;
  status: string;
  status_label: string;
  title?: string | null;
  engagement_date?: string | null;
  scheduled_at?: string | null;
  notes?: string | null;
  organization_id?: string | null;
  organization_name?: string | null;
  opportunity_id?: string | null;
  opportunity_label?: string | null;
  case_id?: string | null;
  case_number?: string | null;
  pre_call_filled: number;
  pre_call_total: number;
  pre_call_complete: boolean;
  briefing_status: EngagementPlanningStatus;
  briefing_status_label: string;
  planning_status: EngagementPlanningStatus;
  planning_status_label: string;
  /** Set when rep marked prepared on Prepare for Meeting (migration 20260625). */
  prepared_at?: string | null;
  is_meeting_prepared?: boolean;
  outcome_label: string;
  updated_at?: string;
  /** One-line prep / observation excerpt for relationship memory on provider detail. */
  memory_context_line?: string | null;
  /** Present when plan data exists only on provider_pre_observation_* (pre-migration). */
  is_legacy_draft?: boolean;
  legacy_new_engagement_href?: string;
  debrief_completed?: boolean;
  debrief_completed_at?: string | null;
  pre_call_hospital_name?: string | null;
  follow_up_tasks?: string | null;
  next_action?: string | null;
  debrief_intelligence_snapshot?: unknown;
};

export function isUpcomingEngagementStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s === "planned" || s === "in_progress";
}

export function sortUpcomingEngagements(
  engagements: ProviderEngagementSummary[],
): ProviderEngagementSummary[] {
  return [...engagements]
    .filter((e) => isUpcomingEngagementStatus(e.status))
    .sort((a, b) => {
      const ta = a.scheduled_at || (a.engagement_date ? `${a.engagement_date}T12:00:00` : "");
      const tb = b.scheduled_at || (b.engagement_date ? `${b.engagement_date}T12:00:00` : "");
      if (!ta && !tb) return 0;
      if (!ta) return 1;
      if (!tb) return -1;
      return new Date(ta).getTime() - new Date(tb).getTime();
    });
}

/** Next calendar engagement for provider detail preview (soonest upcoming). */
export function pickNextUpcomingEngagement(
  engagements: ProviderEngagementSummary[] | undefined,
): ProviderEngagementSummary | null {
  const sorted = sortUpcomingEngagements(engagements || []);
  return sorted[0] ?? null;
}

export function formatEngagementWhen(row: ProviderEngagementSummary): string {
  return formatEngagementWhenLabel(row);
}

export function providerEngagementOpenHref(row: ProviderEngagementSummary): string {
  return providerEngagementFieldHref(row);
}

/** Open — routes to preparation, live workspace, debrief, or closed record by workflow state. */
export function providerEngagementFieldHref(row: ProviderEngagementSummary): string {
  return buildEngagementOpenHrefFromSummary(row);
}

export function canOpenPrepareForMeeting(row: ProviderEngagementSummary): boolean {
  return !row.is_legacy_draft && isUpcomingEngagementStatus(row.status);
}

/** Briefing line for engagement lists and cards (null when completed touch). */
export function formatEngagementBriefingListLabel(row: ProviderEngagementSummary): string | null {
  if (row.status.toLowerCase() === "completed") return null;
  if (row.is_legacy_draft) return null;
  return row.briefing_status_label;
}

/** Preparation line for upcoming engagement preview (null when nothing to show). */
export function formatEngagementPreparationStatus(row: ProviderEngagementSummary): string | null {
  if (!isUpcomingEngagementStatus(row.status)) return null;
  const label = formatEngagementPreparationDisplayStatus(row);
  return label === "Not Started" ? null : label;
}

export function buildEngagementOutcomeLabel(row: Record<string, unknown>): string {
  const status = formatEngagementStatus(String(row.status ?? ""), row);
  const caseNumber = String(row.case_number ?? "").trim();
  const oppLabel = String(row.opportunity_label ?? "").trim();
  const notes = String(row.notes ?? "").trim();

  const parts: string[] = [status];
  if (caseNumber) parts.push(`Case ${caseNumber}`);
  else if (oppLabel) parts.push(oppLabel);
  if (notes && notes.length <= 120) parts.push(notes);
  else if (notes) parts.push(`${notes.slice(0, 117)}…`);

  return parts.filter(Boolean).join(" · ");
}

export function mapEngagementRowForProviderProfile(
  row: Record<string, unknown>,
  orgBy: Map<string, string>,
  caseBy: Map<string, string>,
  oppBy: Map<string, string>,
): ProviderEngagementSummary {
  const id = String(row.id);
  const orgId = row.organization_id ? String(row.organization_id) : null;
  const caseId = row.case_id ? String(row.case_id) : null;
  const oppId = row.opportunity_id ? String(row.opportunity_id) : null;
  const preCall = countPreCallPlanFilled(row);
  const briefingStatus = resolveEngagementPlanningStatus(row);

  const explicitOrgName = row.organization_name ? String(row.organization_name).trim() : "";
  const enriched = {
    ...row,
    organization_name: explicitOrgName || (orgId ? orgBy.get(orgId) ?? null : null),
    case_number: caseId ? caseBy.get(caseId) ?? null : null,
    opportunity_label: oppId ? oppBy.get(oppId) ?? null : null,
  };

  return {
    id,
    engagement_type: String(row.engagement_type ?? ""),
    engagement_type_label: formatEngagementType(String(row.engagement_type)),
    status: String(row.status ?? ""),
    status_label: formatEngagementStatus(String(row.status), row),
    title: row.title ? String(row.title) : null,
    engagement_date: row.engagement_date ? String(row.engagement_date) : null,
    scheduled_at: row.scheduled_at ? String(row.scheduled_at) : null,
    notes: row.notes ? String(row.notes) : null,
    organization_id: orgId,
    organization_name: enriched.organization_name,
    opportunity_id: oppId,
    opportunity_label: enriched.opportunity_label,
    case_id: caseId,
    case_number: enriched.case_number,
    pre_call_filled: preCall.filled,
    pre_call_total: preCall.total,
    pre_call_complete: preCall.total > 0 && preCall.filled >= preCall.total,
    briefing_status: briefingStatus,
    briefing_status_label: formatEngagementPreparationDisplayStatus(row) ?? "",
    planning_status: briefingStatus,
    planning_status_label: formatEngagementPreparationDisplayStatus(row) ?? "",
    prepared_at: row.prepared_at ? String(row.prepared_at) : null,
    is_meeting_prepared: Boolean(row.prepared_at),
    outcome_label: buildEngagementOutcomeLabel(enriched),
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
    memory_context_line: extractEngagementMemoryContextLine(row),
    debrief_completed: Boolean(row.debrief_completed),
    debrief_completed_at: row.debrief_completed_at ? String(row.debrief_completed_at) : null,
    pre_call_hospital_name: row.pre_call_hospital_name ? String(row.pre_call_hospital_name) : null,
    follow_up_tasks: row.follow_up_tasks ? String(row.follow_up_tasks) : null,
    next_action: row.next_action ? String(row.next_action) : null,
    debrief_intelligence_snapshot: row.debrief_intelligence_snapshot ?? null,
  };
}
