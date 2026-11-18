import {
  engagementCategoryForType,
  type EngagementMissionGroupId,
} from "@/lib/surgical-sales/engagements/engagementTypeMissionPicker";
import {
  formatEngagementPreparationDisplayStatus,
  ENGAGEMENT_PREPARATION_DISPLAY_LABELS,
} from "@/lib/surgical-sales/engagements/engagementStatusDisplay";
import { countPreCallPlanFilled } from "@/lib/surgical-sales/preCallPlanFields";

export const ENGAGEMENT_PLANNING_MODES = ["quick_add", "plan_first"] as const;
export type EngagementPlanningMode = (typeof ENGAGEMENT_PLANNING_MODES)[number];

/** @deprecated Use EngagementPlanningMode */
export type EngagementCreationPath = EngagementPlanningMode;

export const ENGAGEMENT_PLANNING_STATUSES = [
  "not_planned",
  "planning_in_progress",
  "planned",
] as const;
export type EngagementPlanningStatus = (typeof ENGAGEMENT_PLANNING_STATUSES)[number];

/** @deprecated Use EngagementPlanningStatus */
export type EngagementBriefingStatus = EngagementPlanningStatus;

/** @deprecated Use ENGAGEMENT_PLANNING_STATUSES */
export const ENGAGEMENT_BRIEFING_STATUSES = ENGAGEMENT_PLANNING_STATUSES;

/** @deprecated Internal DB values — use formatEngagementPreparationDisplayStatus for UI. */
export const ENGAGEMENT_PLANNING_STATUS_LABELS: Record<EngagementPlanningStatus, string> = {
  not_planned: ENGAGEMENT_PREPARATION_DISPLAY_LABELS.not_started,
  planning_in_progress: ENGAGEMENT_PREPARATION_DISPLAY_LABELS.not_started,
  planned: ENGAGEMENT_PREPARATION_DISPLAY_LABELS.ready,
};

/** Rep-facing field briefing label (Not Started | Ready). */
export const ENGAGEMENT_FIELD_BRIEFING_LABELS: Record<EngagementPlanningStatus, string> = {
  not_planned: ENGAGEMENT_PREPARATION_DISPLAY_LABELS.not_started,
  planning_in_progress: ENGAGEMENT_PREPARATION_DISPLAY_LABELS.not_started,
  planned: ENGAGEMENT_PREPARATION_DISPLAY_LABELS.ready,
};

export function formatEngagementFieldBriefingLabel(
  status: EngagementPlanningStatus | string | null | undefined,
): string {
  const key = String(status ?? "").trim() as EngagementPlanningStatus;
  if (key === "planned") return ENGAGEMENT_FIELD_BRIEFING_LABELS.planned;
  return ENGAGEMENT_FIELD_BRIEFING_LABELS.not_planned;
}

/** Rep-facing preparation label from an engagement row. */
export function formatEngagementFieldBriefingLabelFromRow(row: Record<string, unknown>): string {
  return formatEngagementPreparationDisplayStatus(row) ?? "";
}

/** @deprecated Use ENGAGEMENT_PLANNING_STATUS_LABELS */
export const ENGAGEMENT_BRIEFING_STATUS_LABELS = ENGAGEMENT_PLANNING_STATUS_LABELS;

export const ENGAGEMENT_FIELD_BRIEFING_EMPTY_TITLE = "No field briefing created yet.";
export const ENGAGEMENT_FIELD_BRIEFING_EMPTY_LEAD =
  "Generate one when you need prep for this touchpoint.";
export const ENGAGEMENT_GENERATE_FIELD_BRIEFING_LABEL = "Generate Field Briefing";

export function isEngagementPlanningStatus(
  raw: string | null | undefined,
): raw is EngagementPlanningStatus {
  return (ENGAGEMENT_PLANNING_STATUSES as readonly string[]).includes(String(raw ?? "").trim());
}

/** @deprecated Use isEngagementPlanningStatus */
export function isEngagementBriefingStatus(
  raw: string | null | undefined,
): raw is EngagementBriefingStatus {
  return isEngagementPlanningStatus(raw);
}

export function isEngagementPlanningMode(
  raw: string | null | undefined,
): raw is EngagementPlanningMode {
  return (ENGAGEMENT_PLANNING_MODES as readonly string[]).includes(String(raw ?? "").trim());
}

export function readStoredPlanningStatus(row: Record<string, unknown>): string {
  return String(row.planning_status ?? row.briefing_status ?? "").trim();
}

export function readStoredPlanningMode(row: Record<string, unknown>): string {
  return String(row.planning_mode ?? "").trim();
}

export function isEngagementBriefingReady(row: Record<string, unknown>): boolean {
  if (row.prepared_at) return true;
  const preCall = countPreCallPlanFilled(row);
  return preCall.total > 0 && preCall.filled >= preCall.total;
}

export function hasEngagementBriefingProgress(row: Record<string, unknown>): boolean {
  if (isEngagementBriefingReady(row)) return true;
  const preCall = countPreCallPlanFilled(row);
  if (preCall.filled > 0) return true;
  if (String(row.pre_call_plan_template_id ?? "").trim()) return true;
  if (String(row.pre_call_plan_updated_at ?? "").trim()) return true;
  return false;
}

/** Resolve planning status from stored value + prep signals (legacy-safe). */
export function resolveEngagementPlanningStatus(row: Record<string, unknown>): EngagementPlanningStatus {
  if (isEngagementBriefingReady(row)) return "planned";
  if (hasEngagementBriefingProgress(row)) return "planning_in_progress";

  const stored = readStoredPlanningStatus(row);
  if (isEngagementPlanningStatus(stored)) return stored;
  return "not_planned";
}

/** @deprecated Use resolveEngagementPlanningStatus */
export function resolveEngagementBriefingStatus(row: Record<string, unknown>): EngagementBriefingStatus {
  return resolveEngagementPlanningStatus(row);
}

export function formatEngagementPlanningStatusLabel(
  status: EngagementPlanningStatus | string | null | undefined,
): string {
  const key = String(status ?? "").trim() as EngagementPlanningStatus;
  if (key === "planned") return ENGAGEMENT_PLANNING_STATUS_LABELS.planned;
  return ENGAGEMENT_PLANNING_STATUS_LABELS.not_planned;
}

/** @deprecated Use formatEngagementPlanningStatusLabel */
export function formatEngagementBriefingStatusLabel(
  status: EngagementBriefingStatus | string | null | undefined,
): string {
  return formatEngagementPlanningStatusLabel(status);
}

export function resolvePlanningStatusOnCreate(params: {
  planningMode?: EngagementPlanningMode;
  /** @deprecated Use planningMode */
  creationPath?: EngagementPlanningMode;
  engagementRow: Record<string, unknown>;
}): EngagementPlanningStatus {
  const mode = params.planningMode ?? params.creationPath;
  if (mode === "quick_add" || mode === "plan_first") return "not_planned";
  if (isEngagementBriefingReady(params.engagementRow)) return "planned";
  return resolveEngagementPlanningStatus(params.engagementRow);
}

/** @deprecated Use resolvePlanningStatusOnCreate */
export function resolveBriefingStatusOnCreate(params: {
  creationPath?: EngagementPlanningMode;
  engagementRow: Record<string, unknown>;
}): EngagementBriefingStatus {
  return resolvePlanningStatusOnCreate(params);
}

export function resolvePlanningModeOnCreate(params: {
  planningMode?: EngagementPlanningMode;
  /** @deprecated Use planningMode */
  creationPath?: EngagementPlanningMode;
  engagementRow?: Record<string, unknown>;
}): EngagementPlanningMode {
  const explicit = params.planningMode ?? params.creationPath;
  if (explicit && isEngagementPlanningMode(explicit)) return explicit;
  const row = params.engagementRow;
  if (row) {
    const stored = readStoredPlanningMode(row);
    if (isEngagementPlanningMode(stored)) return stored;
    if (resolveEngagementPlanningStatus(row) === "not_planned" && !hasEngagementBriefingProgress(row)) {
      return "quick_add";
    }
  }
  return "plan_first";
}

export function engagementCategoryForEngagementType(
  engagementType: string,
): EngagementMissionGroupId | null {
  return engagementCategoryForType(engagementType);
}

export function briefingIdForPlannedEngagement(
  engagementId: string,
  planningStatus: EngagementPlanningStatus,
): string | null {
  if (planningStatus !== "planned") return null;
  const id = String(engagementId ?? "").trim();
  return id || null;
}

/** DB patch when prep or prepared state changes. */
export function syncEngagementPlanningPatch(
  row: Record<string, unknown>,
  engagementId?: string,
): { planning_status: EngagementPlanningStatus; briefing_id?: string } {
  const planning_status = resolveEngagementPlanningStatus(row);
  const patch: { planning_status: EngagementPlanningStatus; briefing_id?: string } = {
    planning_status,
  };
  const id = engagementId ?? String(row.id ?? "").trim();
  const briefingId = briefingIdForPlannedEngagement(id, planning_status);
  if (briefingId && !String(row.briefing_id ?? "").trim()) {
    patch.briefing_id = briefingId;
  }
  return patch;
}

/** @deprecated Use syncEngagementPlanningPatch */
export function syncEngagementBriefingStatusPatch(
  row: Record<string, unknown>,
): { briefing_status: EngagementBriefingStatus } {
  const synced = syncEngagementPlanningPatch(row);
  return { briefing_status: synced.planning_status };
}

export function engagementPlanningStatusAllowsOptionalPlanning(
  status: EngagementPlanningStatus,
): boolean {
  return status === "not_planned";
}

/** Quick-add engagement still in planned state with no briefing progress. */
export function isLightweightPlannedEngagement(row: Record<string, unknown>): boolean {
  if (readStoredPlanningMode(row) !== "quick_add") return false;
  if (String(row.status ?? "").toLowerCase() !== "planned") return false;
  return resolveEngagementPlanningStatus(row) === "not_planned";
}

/** Planned engagement with no prep started and no outcome captured yet. */
export function isEngagementEmptyPlannedView(row: Record<string, unknown>): boolean {
  if (String(row.status ?? "").toLowerCase() !== "planned") return false;
  if (String(row.notes ?? "").trim()) return false;
  if (row.prepared_at) return false;
  if (hasEngagementBriefingProgress(row)) return false;
  return true;
}

export function resolveEngagementPreparationDisplayLabel(row: Record<string, unknown>): string {
  return formatEngagementPreparationDisplayStatus(row) ?? "";
}

/** Engagement detail hub — Not Started | Ready (only when preparation applies). */
export function resolveEngagementDetailPreparationStatusLabel(row: Record<string, unknown>): string {
  return formatEngagementPreparationDisplayStatus(row) ?? "";
}

/** Sales-pathway missions — same preparation labels as all engagements. */
export function resolveEngagementPathwayPreparationDisplayLabel(row: Record<string, unknown>): string {
  return formatEngagementPreparationDisplayStatus(row) ?? "Not Started";
}

/** @deprecated Use engagementPlanningStatusAllowsOptionalPlanning */
export function engagementBriefingStatusAllowsOptionalPlanning(
  status: EngagementBriefingStatus,
): boolean {
  return engagementPlanningStatusAllowsOptionalPlanning(status);
}

export type EngagementPlanningFields = {
  engagement_type: string;
  engagement_category: EngagementMissionGroupId | null;
  planning_mode: EngagementPlanningMode;
  planning_status: EngagementPlanningStatus;
  briefing_id: string | null;
  source_observation_id: string | null;
  provider_id: string;
  organization_id: string | null;
  product_focus: string | null;
  scheduled_date: string | null;
  notes: string | null;
};

export function buildEngagementPlanningFieldsOnCreate(params: {
  engagementType: string;
  providerId: string;
  organizationId?: string | null;
  productFocus?: string | null;
  scheduledDate?: string | null;
  notes?: string | null;
  sourceObservationId?: string | null;
  planningMode: EngagementPlanningMode;
  engagementRow: Record<string, unknown>;
  briefingId?: string | null;
}): EngagementPlanningFields {
  const planning_status = resolvePlanningStatusOnCreate({
    planningMode: params.planningMode,
    engagementRow: params.engagementRow,
  });

  return {
    engagement_type: params.engagementType,
    engagement_category: engagementCategoryForEngagementType(params.engagementType),
    planning_mode: params.planningMode,
    planning_status,
    briefing_id: params.briefingId ?? briefingIdForPlannedEngagement("", planning_status),
    source_observation_id: params.sourceObservationId?.trim() || null,
    provider_id: params.providerId,
    organization_id: params.organizationId?.trim() || null,
    product_focus: params.productFocus?.trim() || null,
    scheduled_date: params.scheduledDate?.trim() || null,
    notes: params.notes?.trim() || null,
  };
}
