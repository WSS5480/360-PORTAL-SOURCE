import type { ActivityEventType } from "@/lib/activity/activityEventTypes";

/**
 * Maps unified ActivityEventType → legacy `activity_type` strings stored today.
 * Used by emit bridge only; adapters map the reverse when reading.
 */
export const UNIFIED_TO_LEGACY_CASE_ACTIVITY_TYPE: Partial<Record<ActivityEventType, string>> = {
  NOTE_ADDED: "note",
  WORKFLOW_FIELD_UPDATED: "case_updated",
  WORKFLOW_STAGE_COMPLETED: "case_updated",
  CASE_CREATED: "case_created",
  CASE_STATUS_CHANGED: "status_change",
  CASE_LINKED: "case_updated",
  PRODUCT_ADDED: "product_updated",
  DOCUMENT_UPLOADED: "document_uploaded",
  AI_INTELLIGENCE_CAPTURED: "ai_note_capture",
  PROVIDER_PLANNING_UPDATED: "clinical_discovery_insight_from_case",
  PROVIDER_INTELLIGENCE_UPDATED: "provider_intelligence_promoted",
  PRE_CALL_PLAN_CREATED: "pre_call_plan_created",
  PRE_CALL_PLAN_UPDATED: "pre_call_plan_updated",
  PRE_CALL_PLAN_COMPLETED: "pre_call_plan_completed",
};

export const UNIFIED_TO_LEGACY_PROVIDER_ACTIVITY_TYPE: Partial<Record<ActivityEventType, string>> = {
  PROVIDER_CREATED: "provider_created",
  PROVIDER_UPDATED: "provider_updated",
  PROVIDER_PLANNING_UPDATED: "clinical_discovery_updated",
  PROVIDER_INTELLIGENCE_UPDATED: "provider_intelligence_promoted",
  PLANNING_SECTION_COMPLETED: "planning_section_completed",
  PRE_CALL_PLAN_CREATED: "pre_call_plan_created",
  PRE_CALL_PLAN_UPDATED: "pre_call_plan_updated",
  PRE_CALL_PLAN_COMPLETED: "pre_call_plan_completed",
  ENGAGEMENT_CREATED: "engagement_created",
  ENGAGEMENT_UPDATED: "engagement_updated",
  ENGAGEMENT_COMPLETED: "engagement_completed",
  ENGAGEMENT_CONVERTED_TO_CASE: "engagement_converted_to_case",
  AI_INTELLIGENCE_CAPTURED: "ai_note_capture",
  NOTE_ADDED: "note_added",
};

/** Legacy case activity_type → unified type (best effort). */
export const LEGACY_CASE_ACTIVITY_TO_UNIFIED: Record<string, ActivityEventType> = {
  note: "NOTE_ADDED",
  case_created: "CASE_CREATED",
  case_updated: "WORKFLOW_FIELD_UPDATED",
  status_change: "CASE_STATUS_CHANGED",
  document_uploaded: "DOCUMENT_UPLOADED",
  document_deleted: "DOCUMENT_UPLOADED",
  product_updated: "PRODUCT_ADDED",
  provider_intelligence_promoted: "PROVIDER_INTELLIGENCE_UPDATED",
  clinical_discovery_insight_from_case: "PROVIDER_PLANNING_UPDATED",
  pre_call_plan_created: "PRE_CALL_PLAN_CREATED",
  pre_call_plan_updated: "PRE_CALL_PLAN_UPDATED",
  pre_call_plan_completed: "PRE_CALL_PLAN_COMPLETED",
  engagement_converted_to_case: "ENGAGEMENT_CONVERTED_TO_CASE",
  case_linked_from_engagement: "CASE_LINKED",
  case_created_from_engagement: "ENGAGEMENT_CONVERTED_TO_CASE",
  ai_note_capture: "AI_INTELLIGENCE_CAPTURED",
  billing_update: "CASE_STATUS_CHANGED",
  case_archived: "CASE_STATUS_CHANGED",
  case_restored: "CASE_STATUS_CHANGED",
};

export const LEGACY_PROVIDER_ACTIVITY_TO_UNIFIED: Record<string, ActivityEventType> = {
  clinical_discovery_updated: "PROVIDER_PLANNING_UPDATED",
  provider_intelligence_promoted: "PROVIDER_INTELLIGENCE_UPDATED",
  provider_updated: "PROVIDER_UPDATED",
  provider_created: "PROVIDER_CREATED",
  planning_section_completed: "PLANNING_SECTION_COMPLETED",
  pre_call_plan_created: "PRE_CALL_PLAN_CREATED",
  pre_call_plan_updated: "PRE_CALL_PLAN_UPDATED",
  pre_call_plan_completed: "PRE_CALL_PLAN_COMPLETED",
  engagement_created: "ENGAGEMENT_CREATED",
  engagement_updated: "ENGAGEMENT_UPDATED",
  engagement_completed: "ENGAGEMENT_COMPLETED",
  engagement_converted_to_case: "ENGAGEMENT_CONVERTED_TO_CASE",
  engagement_prepared: "PRE_CALL_PLAN_COMPLETED",
  case_created_from_engagement: "ENGAGEMENT_CONVERTED_TO_CASE",
  ai_note_capture: "AI_INTELLIGENCE_CAPTURED",
  note_added: "NOTE_ADDED",
};

export const LEGACY_ENGAGEMENT_ACTIVITY_TO_UNIFIED: Record<string, ActivityEventType> = {
  engagement_created: "ENGAGEMENT_CREATED",
  engagement_updated: "ENGAGEMENT_UPDATED",
  engagement_completed: "ENGAGEMENT_COMPLETED",
  engagement_converted_to_case: "ENGAGEMENT_CONVERTED_TO_CASE",
  case_created_from_engagement: "ENGAGEMENT_CONVERTED_TO_CASE",
  pre_call_plan_created: "PRE_CALL_PLAN_CREATED",
  pre_call_plan_updated: "PRE_CALL_PLAN_UPDATED",
  pre_call_plan_completed: "PRE_CALL_PLAN_COMPLETED",
  engagement_prepared: "PRE_CALL_PLAN_COMPLETED",
};

export function unifiedTypeFromLegacyEngagementActivity(raw: string): ActivityEventType {
  const key = String(raw ?? "").trim().toLowerCase();
  return LEGACY_ENGAGEMENT_ACTIVITY_TO_UNIFIED[key] ?? "ENGAGEMENT_UPDATED";
}

export const LEGACY_SALES_ACTIVITY_TO_UNIFIED: Record<string, ActivityEventType> = {
  note: "NOTE_ADDED",
  call: "NOTE_ADDED",
  email: "NOTE_ADDED",
  meeting: "NOTE_ADDED",
  other: "NOTE_ADDED",
};

export function legacyCaseActivityTypeForUnified(type: ActivityEventType): string {
  return UNIFIED_TO_LEGACY_CASE_ACTIVITY_TYPE[type] ?? type.toLowerCase();
}

export function legacyProviderActivityTypeForUnified(type: ActivityEventType): string {
  return UNIFIED_TO_LEGACY_PROVIDER_ACTIVITY_TYPE[type] ?? type.toLowerCase();
}

export function unifiedTypeFromLegacyCaseActivity(raw: string): ActivityEventType {
  const key = String(raw ?? "").trim().toLowerCase();
  return LEGACY_CASE_ACTIVITY_TO_UNIFIED[key] ?? "WORKFLOW_FIELD_UPDATED";
}

export function unifiedTypeFromLegacyProviderActivity(raw: string): ActivityEventType {
  const key = String(raw ?? "").trim().toLowerCase();
  return LEGACY_PROVIDER_ACTIVITY_TO_UNIFIED[key] ?? "PROVIDER_UPDATED";
}

export function unifiedTypeFromLegacySalesActivity(raw: string): ActivityEventType {
  const key = String(raw ?? "").trim().toLowerCase();
  return LEGACY_SALES_ACTIVITY_TO_UNIFIED[key] ?? "NOTE_ADDED";
}
