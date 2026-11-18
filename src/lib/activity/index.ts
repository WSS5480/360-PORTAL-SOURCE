/**
 * Unified activity event system — canonical model alongside legacy activity tables.
 *
 * Legacy persistence (unchanged contract):
 * - surgical_sales_case_activities
 * - surgical_sales_provider_activities
 * - sales_activities (opportunities)
 *
 * Use adapters to read legacy rows as ActivityEvent; use emitActivityEvent to write
 * both unified shape + legacy rows during migration.
 */

export {
  ACTIVITY_EVENT_TYPES,
  ACTIVITY_EVENT_TYPE_LABELS,
  isActivityEventType,
  type ActivityEventType,
} from "@/lib/activity/activityEventTypes";

export {
  activityEventIdFromLegacy,
  buildActivityEvent,
  compareActivityEventsNewestFirst,
  coerceActivityEventType,
  defaultTitleForActivityType,
  newSyntheticActivityId,
  parseActivityEventId,
  sortActivityEventsNewestFirst,
  type ActivityEntityType,
  type ActivityEvent,
  type ActivityEventActor,
  type ActivityEventSource,
  type ActivityRelatedEntity,
  type BuildActivityEventInput,
} from "@/lib/activity/activityEvent";

export {
  LEGACY_CASE_ACTIVITY_TO_UNIFIED,
  LEGACY_PROVIDER_ACTIVITY_TO_UNIFIED,
  LEGACY_SALES_ACTIVITY_TO_UNIFIED,
  legacyCaseActivityTypeForUnified,
  legacyProviderActivityTypeForUnified,
  unifiedTypeFromLegacyCaseActivity,
  unifiedTypeFromLegacyProviderActivity,
  unifiedTypeFromLegacySalesActivity,
} from "@/lib/activity/legacyTypeMap";

export {
  activityEventFromProviderTimelineEntry,
  activityEventFromSalesOpportunityActivity,
  activityEventFromEngagementActivity,
  activityEventFromSurgicalCaseActivity,
  activityEventFromSurgicalProviderActivity,
  type SurgicalEngagementActivityRow,
  activityEventsFromProviderTimeline,
  activityEventsFromSurgicalCaseActivities,
  type ProviderTimelineEntry,
  type SalesOpportunityActivityRow,
  type SurgicalCaseActivityRow,
  type SurgicalProviderActivityRow,
} from "@/lib/activity/adapters";

export {
  emitActivityEvent,
  emitCaseNoteActivity,
  type EmitActivityEventInput,
  type EmitActivityEventResult,
} from "@/lib/activity/emit";

export { persistActivityEvent, type PersistActivityEventInput } from "@/lib/activity/activityEventStore";

export {
  dualWriteAfterCaseLegacyLog,
  dualWriteAfterProviderLegacyLog,
  dualWriteOpportunityEvent,
  dualWriteEntityEvent,
  inferWorkflowStageFromChangedFields,
  recordActivityEventDual,
  voidRecordActivityEventDual,
} from "@/lib/activity/dualWrite";

export {
  adoptionInitiativeSnapshotFromRow,
  buildAdoptionInitiativeRelatedEntities,
  logAdoptionInitiativeActivity,
  logAdoptionInitiativeCaseLinked,
  logAdoptionInitiativeEngagementLinked,
  logAdoptionInitiativeOrganizationLinked,
  logAdoptionInitiativeProviderLinked,
  logAdoptionInitiativeStageChange,
  resolveAdoptionStageActivityType,
  type AdoptionInitiativeSnapshot,
} from "@/lib/activity/adoptionInitiativeActivity";

export { dualWriteFromCaseActivityLog } from "@/lib/activity/caseActivityDualWrite";
export { dualWriteFromProviderActivityLog } from "@/lib/activity/providerActivityDualWrite";
export { dualWriteFromEngagementActivityLog } from "@/lib/activity/engagementActivityDualWrite";

export {
  LEGACY_ENGAGEMENT_ACTIVITY_TO_UNIFIED,
  unifiedTypeFromLegacyEngagementActivity,
} from "@/lib/activity/legacyTypeMap";

export {
  filterActivityEvents,
  mergeActivityFeeds,
  paginateActivityEvents,
  type ActivityFeedFilter,
} from "@/lib/activity/feed";
