/**
 * Sales Command Rep Calendar — normalized event model and adapter inputs.
 */

export type SalesCalendarEventSourceType =
  | "engagement"
  | "observation"
  | "case"
  | "follow_up"
  | "prep"
  | "debrief"
  | "time_off";

export type SalesCalendarRecordType = "engagement" | "observation" | "case" | "task" | "time_off";

export type SalesCalendarEventPriority = "low" | "medium" | "high";

export type SalesCalendarViewMode = "today" | "week" | "month" | "agenda";

export type SalesCalendarEvent = {
  id: string;
  sourceType: SalesCalendarEventSourceType;
  sourceId: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  status?: string;
  priority?: SalesCalendarEventPriority;
  providerName?: string;
  organizationName?: string;
  productFocus?: string;
  location?: string;
  requiresPrep?: boolean;
  requiresDebrief?: boolean;
  needsFollowUp?: boolean;
  metadata?: Record<string, unknown>;
};

export type SalesCalendarEngagementInput = {
  id: string;
  engagement_type: string;
  engagement_type_label?: string;
  status: string;
  status_label?: string;
  title?: string | null;
  engagement_date?: string | null;
  scheduled_at?: string | null;
  notes?: string | null;
  provider_id?: string;
  provider_label?: string;
  organization_id?: string | null;
  organization_label?: string | null;
  organization_name?: string | null;
  case_id?: string | null;
  case_number?: string | null;
  prepared_at?: string | null;
  is_meeting_prepared?: boolean;
  pre_call_filled?: number;
  pre_call_total?: number;
  pre_call_complete?: boolean;
  debrief_completed?: boolean;
  debrief_completed_at?: string | null;
  is_legacy_draft?: boolean;
};

export type SalesCalendarCaseInput = {
  id: string;
  case_number: string;
  case_date: string | null;
  case_time?: string | null;
  status: string;
  case_type?: string | null;
  procedure_type?: string | null;
  account_name?: string | null;
  surgeon_display?: string | null;
  product_name?: string | null;
  observation_goal?: string | null;
  notes?: string | null;
  note_count?: number | null;
  debrief_key_findings?: string | null;
  follow_up_needed?: boolean | null;
  case_implants_on_site?: string | null;
  case_trays_sterilization_status?: string | null;
  case_support_coverage?: string | null;
  case_operational_risks?: string | null;
  engagement_id?: string | null;
};

export type SalesCalendarTaskInput = {
  id: string;
  title: string;
  due_date: string;
  completed_at?: string | null;
  opportunity_id?: string;
  opportunity_account?: string | null;
  notes?: string | null;
};

export type SalesCalendarTimeOffInput = {
  id: string;
  request_type: "pto" | "sick" | "personal";
  start_date: string;
  end_date: string;
  notes?: string | null;
  status: string;
};

export type SalesCalendarFilters = {
  engagements: boolean;
  observations: boolean;
  cases: boolean;
  followUps: boolean;
  timeOff: boolean;
  prepNeeded: boolean;
  debriefsNeeded: boolean;
  productFocus: string;
  provider: string;
  organization: string;
  status: string;
};

export const DEFAULT_SALES_CALENDAR_FILTERS: SalesCalendarFilters = {
  engagements: true,
  observations: true,
  cases: true,
  followUps: true,
  timeOff: true,
  prepNeeded: true,
  debriefsNeeded: true,
  productFocus: "",
  provider: "",
  organization: "",
  status: "",
};
