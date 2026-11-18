/**
 * Access Intelligence — optional reference fields on the provider record.
 * Informational only; never a mission board checklist or default blocker.
 */

import {
  MISSION_CAPTURE_CONFIDENCE_EMPTY,
  MISSION_CAPTURE_SOURCE_EMPTY,
  MISSION_INTELLIGENCE_NOT_YET_OBSERVED,
} from "@/lib/surgical-sales/providerMissionExecutionLanguage";
import { PROVIDER_OVERVIEW_BRIEFING_VOCABULARY as BRIEF } from "@/lib/surgical-sales/providerOverviewBriefingVocabulary";
import type { DiscoveryStructuredSignalId } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  parseProviderIntelligenceFieldMetadata,
  type ProviderIntelligenceFieldMetadataMap,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { assessIntelligenceFieldQuality } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import { formatIntelligenceCaptureSummaryChip } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";

export type BackgroundIntelligenceSectionId = "access" | "relationship" | "facility";

export type AccessIntelligenceFieldId =
  | "scheduler"
  | "credentialing_pathway"
  | "office_contact"
  | "facility_access_notes"
  | "or_coordinator"
  | "approval_process_details";

export const ACCESS_INTELLIGENCE_FIELD_LABELS: Record<AccessIntelligenceFieldId, string> = {
  scheduler: "Scheduler",
  credentialing_pathway: "Credentialing pathway",
  office_contact: "Office contact",
  facility_access_notes: "Facility access notes",
  or_coordinator: "OR coordinator",
  approval_process_details: "Approval process details",
};

/** Optional access signals — informational only; never progression blockers. */
export const OPTIONAL_ACCESS_INTELLIGENCE_SIGNAL_IDS = new Set<DiscoveryStructuredSignalId>([
  "scheduling_owner",
  "facility_vendor_pathway",
  "observation_logistics",
]);

export type BackgroundIntelligenceItem = {
  id: string;
  label: string;
  summary: string;
  confidence: string;
  source: string;
};

export type BackgroundIntelligenceSection = {
  id: BackgroundIntelligenceSectionId;
  title: string;
  items: BackgroundIntelligenceItem[];
};

export const ACCESS_INTELLIGENCE_SECTION_TITLE = BRIEF.accessStatus;

export const BACKGROUND_INTELLIGENCE_SECTION_TITLES: Record<BackgroundIntelligenceSectionId, string> = {
  access: ACCESS_INTELLIGENCE_SECTION_TITLE,
  relationship: BRIEF.keyRelationships,
  facility: BRIEF.facilityContext,
};

const ADMIN_PRIMARY_ALERT_PATTERN =
  /\b(scheduling owner unknown|scheduling owner missing|scheduling owner needed|scheduling needed|credentialing path(?:way)? (?:pending|incomplete|unclear|not)|vendor pathway (?:unclear|incomplete|unknown)|access pathway (?:incomplete|unclear|unknown|pending)|facility access not confirmed|vendor approval unknown|confirm scheduling|clear credentialing|complete credentialing pathway|identify scheduling owner|confirm vendor|access mapping)\b/i;

export const ADMIN_BACKGROUND_SIGNAL_IDS = new Set<DiscoveryStructuredSignalId>([
  "scheduling_owner",
  "facility_vendor_pathway",
  "observation_logistics",
]);

export const ADMIN_BACKGROUND_DB_KEYS = new Set([
  "provider_observation_scheduling_control",
  "provider_scheduling_contact",
  "provider_observation_coordinator_contact",
  "provider_facility_scheduling_contact",
  "provider_observation_access_path",
  "provider_observation_credentialing_needed",
  "provider_credentialing_status",
  "provider_credentialing_contact",
  "provider_credentialing_platform_name",
  "provider_credentialing_platform_id",
  "provider_observation_best_days_case_types",
  "access_notes",
  "provider_facility_access_notes",
]);

export const ADMIN_OPEN_SIGNAL_IDS = new Set([
  "sched",
  "cred",
  "access",
  "vendor",
  "obs_pending",
  "obs-not-started",
  "pathway-not-started",
]);

export type ActiveScheduledFieldContext = {
  recentCaseCount?: number;
  upcomingEngagementCount?: number;
  caseStatus?: string | null;
};

export function isAdminPrimaryAlertLabel(label: string): boolean {
  const trimmed = String(label ?? "").trim();
  if (!trimmed) return false;
  return ADMIN_PRIMARY_ALERT_PATTERN.test(trimmed);
}

export function isAdminBackgroundSignalId(signalId: string | null | undefined): boolean {
  if (!signalId) return false;
  return ADMIN_BACKGROUND_SIGNAL_IDS.has(signalId as DiscoveryStructuredSignalId);
}

export function isAdminBackgroundDbKey(dbKey: string | null | undefined): boolean {
  if (!dbKey) return false;
  return ADMIN_BACKGROUND_DB_KEYS.has(dbKey);
}

export function isOptionalAccessIntelligenceSignal(signalId: string | null | undefined): boolean {
  if (!signalId) return false;
  return OPTIONAL_ACCESS_INTELLIGENCE_SIGNAL_IDS.has(signalId as DiscoveryStructuredSignalId);
}

export function hasActiveScheduledFieldWork(context: ActiveScheduledFieldContext): boolean {
  if ((context.recentCaseCount ?? 0) > 0) return true;
  if ((context.upcomingEngagementCount ?? 0) > 0) return true;
  const status = String(context.caseStatus ?? "").trim().toLowerCase();
  return status === "scheduled" || status === "confirmed" || status === "in_progress";
}

export function adminGapBlocksActiveScheduledCase(context: ActiveScheduledFieldContext): boolean {
  return hasActiveScheduledFieldWork(context);
}

export function filterPrimaryAlertLabels(
  labels: string[],
  context: ActiveScheduledFieldContext = {},
): string[] {
  const blockAdmin = !adminGapBlocksActiveScheduledCase(context);
  if (!blockAdmin) return labels;
  return labels.filter((label) => !isAdminPrimaryAlertLabel(label));
}

export function filterPrimaryAlertItems<T>(
  items: T[],
  getLabel: (item: T) => string,
  context: ActiveScheduledFieldContext = {},
): T[] {
  const blockAdmin = !adminGapBlocksActiveScheduledCase(context);
  if (!blockAdmin) return items;
  return items.filter((item) => !isAdminPrimaryAlertLabel(getLabel(item)));
}

function formatConfidence(
  dbKey: string,
  value: string | null | undefined,
  meta: ProviderIntelligenceFieldMetadataMap,
): string {
  if (!fieldHasIntelligenceSignal(dbKey, value)) return MISSION_CAPTURE_CONFIDENCE_EMPTY;
  const quality = assessIntelligenceFieldQuality(dbKey, value);
  switch (quality.depth) {
    case "validated":
      return "Validated";
    case "structured":
      return "Confirmed";
    case "weak":
      return "Partial";
    default:
      return "Early";
  }
}

function formatSource(meta: ProviderIntelligenceFieldMetadataMap[string] | undefined): string {
  if (!meta) return MISSION_CAPTURE_SOURCE_EMPTY;
  const label = String(meta.source_label ?? "").trim();
  if (label) return label;
  switch (meta.source_type) {
    case "intro_call":
      return "Intro call notes";
    case "observation":
      return "Observation notes";
    case "case":
      return "Case notes";
    case "engagement":
      return "Engagement notes";
    case "ai_capture":
      return "Field capture";
    default:
      return "Profile notes";
  }
}

function firstCapturedSummary(
  dbKeys: readonly string[],
  contact: Record<string, unknown>,
  meta: ProviderIntelligenceFieldMetadataMap,
  emptySummary: string,
): { summary: string; dbKey: string; confidence: string; source: string } {
  for (const dbKey of dbKeys) {
    const raw = String(contact[dbKey] ?? "").trim();
    if (!fieldHasIntelligenceSignal(dbKey, raw)) continue;
    const chip = formatIntelligenceCaptureSummaryChip(dbKey, raw);
    return {
      summary: chip || raw,
      dbKey,
      confidence: formatConfidence(dbKey, raw, meta),
      source: formatSource(meta[dbKey]),
    };
  }
  return {
    summary: emptySummary,
    dbKey: dbKeys[0] ?? "",
    confidence: MISSION_CAPTURE_CONFIDENCE_EMPTY,
    source: MISSION_CAPTURE_SOURCE_EMPTY,
  };
}

function readAccessField(
  id: AccessIntelligenceFieldId,
  dbKeys: readonly string[],
  contact: Record<string, unknown>,
  meta: ProviderIntelligenceFieldMetadataMap,
  emptySummary: string,
): BackgroundIntelligenceItem {
  const captured = firstCapturedSummary(dbKeys, contact, meta, emptySummary);
  return {
    id,
    label: ACCESS_INTELLIGENCE_FIELD_LABELS[id],
    summary: captured.summary,
    confidence: captured.confidence,
    source: captured.source,
  };
}

/** Collapsed Access Intelligence section for the provider record. */
export function buildAccessIntelligenceSection(input: {
  contact: Record<string, unknown>;
  caseRow?: Record<string, unknown> | null;
}): BackgroundIntelligenceSection {
  const contact = input.contact ?? {};
  const caseRow = input.caseRow ?? null;
  const meta = parseProviderIntelligenceFieldMetadata(contact.provider_intelligence_field_metadata);

  const items: BackgroundIntelligenceItem[] = [
    readAccessField(
      "scheduler",
      [
        "provider_scheduling_contact",
        "provider_observation_scheduling_control",
        "provider_facility_scheduling_contact",
      ],
      contact,
      meta,
      "Scheduler not identified yet.",
    ),
    readAccessField(
      "credentialing_pathway",
      [
        "provider_observation_credentialing_needed",
        "provider_credentialing_status",
        "provider_credentialing_platform_name",
      ],
      contact,
      meta,
      "Credentialing pathway still being learned.",
    ),
    readAccessField(
      "office_contact",
      ["provider_credentialing_contact", "preferred_contact_method"],
      contact,
      meta,
      "Office contact not yet observed in the field.",
    ),
    readAccessField(
      "facility_access_notes",
      ["provider_observation_access_path", "access_notes", "provider_facility_access_notes"],
      contact,
      meta,
      "Facility access notes not yet observed in the field.",
    ),
    readAccessField(
      "or_coordinator",
      ["provider_observation_coordinator_contact"],
      contact,
      meta,
      "OR coordinator not yet identified in the field.",
    ),
    readAccessField(
      "approval_process_details",
      ["provider_observation_feasibility"],
      contact,
      meta,
      "Approval process details still being learned.",
    ),
  ];

  if (caseRow) {
    const caseScheduling = String(caseRow.observation_access_scheduling_owner ?? "").trim();
    const casePath = String(caseRow.observation_access_pathway ?? "").trim();
    const caseCred = String(caseRow.observation_access_credentialing ?? "").trim();
    if (caseScheduling) {
      items.unshift({
        id: "case_scheduling",
        label: "Case scheduling note",
        summary: caseScheduling,
        confidence: "Case file",
        source: "Case planning",
      });
    }
    if (casePath) {
      items.push({
        id: "case_path",
        label: "Case access pathway",
        summary: casePath,
        confidence: "Case file",
        source: "Case planning",
      });
    }
    if (caseCred && caseCred !== "unknown") {
      items.push({
        id: "case_cred",
        label: "Case credentialing note",
        summary: caseCred.replace(/_/g, " "),
        confidence: "Case file",
        source: "Case planning",
      });
    }
  }

  return {
    id: "access",
    title: ACCESS_INTELLIGENCE_SECTION_TITLE,
    items,
  };
}

function relationshipSummary(contact: Record<string, unknown>): string {
  const strength = String(contact.relationship_strength ?? "").trim().toLowerCase();
  if (strength && strength !== "unknown") {
    return `Relationship strength noted as ${strength.replace(/_/g, " ")}.`;
  }
  const dynamics = String(contact.provider_or_team_dynamics ?? "").trim();
  if (dynamics) return dynamics.endsWith(".") ? dynamics : `${dynamics}.`;
  return "Relationship context still light — capture on your next touch.";
}

function championSummary(contact: Record<string, unknown>): string {
  const champion = String(contact.provider_champion_potential ?? "").trim();
  if (champion) return champion.endsWith(".") ? champion : `${champion}.`;
  return "Champion landscape not mapped yet.";
}

function readFieldItem(input: {
  id: string;
  label: string;
  dbKey: string;
  contact: Record<string, unknown>;
  meta: ProviderIntelligenceFieldMetadataMap;
  emptySummary: string;
  formatKnown?: (value: string) => string;
}): BackgroundIntelligenceItem {
  const raw = String(input.contact[input.dbKey] ?? "").trim();
  const hasSignal = fieldHasIntelligenceSignal(input.dbKey, raw);
  const summary = hasSignal
    ? (input.formatKnown ? input.formatKnown(raw) : raw)
    : input.emptySummary;
  return {
    id: input.id,
    label: input.label,
    summary,
    confidence: formatConfidence(input.dbKey, raw, input.meta),
    source: hasSignal ? formatSource(input.meta[input.dbKey]) : MISSION_CAPTURE_SOURCE_EMPTY,
  };
}

export function buildBackgroundIntelligenceSections(input: {
  contact: Record<string, unknown>;
  caseRow?: Record<string, unknown> | null;
}): BackgroundIntelligenceSection[] {
  const contact = input.contact ?? {};
  const meta = parseProviderIntelligenceFieldMetadata(contact.provider_intelligence_field_metadata);

  const relationshipItems: BackgroundIntelligenceItem[] = [
    readFieldItem({
      id: "relationship_strength",
      label: "Relationship strength",
      dbKey: "relationship_strength",
      contact,
      meta,
      emptySummary: relationshipSummary(contact),
      formatKnown: (value) => `Relationship strength noted as ${value.replace(/_/g, " ")}.`,
    }),
    readFieldItem({
      id: "team_dynamics",
      label: "Team dynamics",
      dbKey: "provider_or_team_dynamics",
      contact,
      meta,
      emptySummary: relationshipSummary(contact),
    }),
    readFieldItem({
      id: "champion",
      label: "Champion potential",
      dbKey: "provider_champion_potential",
      contact,
      meta,
      emptySummary: championSummary(contact),
    }),
  ];

  const facilityItems: BackgroundIntelligenceItem[] = [
    readFieldItem({
      id: "facility_notes",
      label: "Facility notes",
      dbKey: "provider_credentialing_platform_name",
      contact,
      meta,
      emptySummary: "Facility logistics notes not yet observed in the field.",
      formatKnown: (value) => `Vendor access via ${value.replace(/\.$/, "")}.`,
    }),
  ];

  return [
    buildAccessIntelligenceSection(input),
    { id: "relationship", title: BACKGROUND_INTELLIGENCE_SECTION_TITLES.relationship, items: relationshipItems },
    { id: "facility", title: BACKGROUND_INTELLIGENCE_SECTION_TITLES.facility, items: facilityItems },
  ];
}

export function providerDirectoryFieldContext(p: {
  recent_case_count?: number;
  upcoming_engagement_count?: number;
}): ActiveScheduledFieldContext {
  return {
    recentCaseCount: p.recent_case_count ?? 0,
    upcomingEngagementCount: p.upcoming_engagement_count ?? 0,
  };
}

export function caseRowFieldContext(caseRow: Record<string, unknown> | null | undefined): ActiveScheduledFieldContext {
  if (!caseRow) return {};
  return {
    caseStatus: String(caseRow.status ?? ""),
    recentCaseCount: 1,
  };
}

export function providerProfileFieldContext(input: {
  cases?: Array<Record<string, unknown>> | null;
  engagements?: Array<{ status?: string | null }> | null;
}): ActiveScheduledFieldContext {
  const scheduledCaseCount = (input.cases ?? []).filter((row) => {
    const status = String(row.status ?? "").trim().toLowerCase();
    return status === "scheduled" || status === "confirmed" || status === "in_progress";
  }).length;
  const upcomingEngagementCount = (input.engagements ?? []).filter((row) => {
    const status = String(row.status ?? "").trim().toLowerCase();
    return status === "scheduled" || status === "confirmed" || status === "pending";
  }).length;
  return { recentCaseCount: scheduledCaseCount, upcomingEngagementCount };
}
