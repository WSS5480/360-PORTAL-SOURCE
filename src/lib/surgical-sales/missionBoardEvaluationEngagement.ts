/**
 * Evaluation engagement preview — mirrors the debrief preview pattern so the
 * Mission Board evaluation card can derive lifecycle status and CTAs from the
 * same engagement records the provider page reads.
 */

import { missionEngagementTypeLabel } from "@/lib/surgical-sales/missionEngagementTypeLabels";
import {
  formatEngagementType,
  normalizeEngagementType,
  type EngagementType,
} from "@/lib/surgical-sales/engagements/engagementTypes";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import {
  buildProviderObservationCaseHref,
  buildProviderProductTrialCaseHref,
} from "@/lib/surgical-sales/providerDirectoryLinks";
import { buildProviderEngagementTypeHref } from "@/lib/surgical-sales/providerOverviewDiscoveryProgression";
import type { SalesPathwayEvaluationActivity } from "@/lib/surgical-sales/salesPathwayCanonical";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Engagement types that execute an evaluation path (Additional Observation uses cases). */
export const EVALUATION_ENGAGEMENT_TYPES = [
  "product_demo",
  "office_visit_360",
  "in_service_training",
  "peer_discussion",
  "evaluation_planning",
  "evaluation_follow_up",
] as const satisfies readonly EngagementType[];

/** Evaluation path → engagement type (Product Trial + Additional Observation use cases). */
export const EVALUATION_PATH_ENGAGEMENT_TYPE: Record<string, string> = {
  "360 Experience": "office_visit_360",
  "In-Service": "in_service_training",
  "Surgeon Education": "peer_discussion",
};

export function isCaseBasedEvaluationPath(path: SalesPathwayEvaluationActivity): boolean {
  return path === "Product Trial" || path === "Additional Observation";
}

export function buildEvaluationPathScheduleHref(input: {
  path: SalesPathwayEvaluationActivity;
  providerId: string;
  accountId?: string | null;
  newEngagementHref: string;
}): string {
  const accountId = input.accountId ?? null;
  if (input.path === "Product Trial") {
    return buildProviderProductTrialCaseHref({
      providerId: input.providerId,
      accountId,
    });
  }
  if (input.path === "Additional Observation") {
    return buildProviderObservationCaseHref({
      providerId: input.providerId,
      accountId,
    });
  }
  const engagementType = evaluationPathToEngagementType(input.path);
  if (!engagementType) return input.newEngagementHref;
  return buildProviderEngagementTypeHref(input.newEngagementHref, engagementType);
}

export function isEvaluationEngagementType(raw: string | null | undefined): boolean {
  const normalized = normalizeEngagementType(raw);
  return Boolean(
    normalized && (EVALUATION_ENGAGEMENT_TYPES as readonly string[]).includes(normalized),
  );
}

const ACTIVE_EVALUATION_ENGAGEMENT_STATUSES = [
  "planned",
  "in_progress",
  "active",
  "scheduled",
  "confirmed",
] as const;

/** CRM engagement type for an evaluation path (null for case-only paths). */
export function evaluationPathToEngagementType(
  path: SalesPathwayEvaluationActivity,
): EngagementType | null {
  if (path === "Additional Observation") return null;
  const normalized = normalizeEngagementType(EVALUATION_PATH_ENGAGEMENT_TYPE[path] ?? "");
  return normalized && isEvaluationEngagementType(normalized) ? normalized : null;
}

/**
 * When a rep changes evaluation path, align the active evaluation engagement's type
 * so Mission Board CTAs, prepare routes, and provider overview stay in sync.
 */
export async function syncActiveEvaluationEngagementTypeForPath(input: {
  providerId: string;
  userId: string;
  evaluationPath: SalesPathwayEvaluationActivity;
}): Promise<
  | { ok: true; updated: false }
  | { ok: true; updated: true; engagementId: string; previousType: string; nextType: string }
  | { ok: false; message: string }
> {
  const nextType = evaluationPathToEngagementType(input.evaluationPath);
  if (!nextType) return { ok: true, updated: false };

  const { data: rows, error } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .select("id, engagement_type, status, title, updated_at, sales_rep_id")
    .eq("provider_id", input.providerId)
    .is("archived_at", null)
    .in("status", [...ACTIVE_EVALUATION_ENGAGEMENT_STATUSES])
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) return { ok: false, message: error.message };

  const candidates = (rows ?? []).filter((row) =>
    isEvaluationEngagementType(String((row as { engagement_type?: string }).engagement_type ?? "")),
  );
  if (candidates.length === 0) return { ok: true, updated: false };

  const target =
    candidates.find(
      (row) => String((row as { sales_rep_id?: string }).sales_rep_id ?? "") === input.userId,
    ) ?? candidates[0];
  const targetRow = target as { id: string; engagement_type: string; title?: string | null };
  const previousType = String(targetRow.engagement_type ?? "");
  const previousNormalized = normalizeEngagementType(previousType);
  if (previousNormalized === nextType) return { ok: true, updated: false };

  const previousDefaultTitle = missionEngagementTypeLabel(previousType);
  const currentTitle = String(targetRow.title ?? "").trim();
  const titlePatch =
    !currentTitle || currentTitle === previousDefaultTitle
      ? missionEngagementTypeLabel(nextType)
      : undefined;

  const patch: Record<string, unknown> = {
    engagement_type: nextType,
    updated_at: new Date().toISOString(),
  };
  if (titlePatch) patch.title = titlePatch;

  const { error: updateErr } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .update(patch)
    .eq("id", targetRow.id);

  if (updateErr) return { ok: false, message: updateErr.message };

  return {
    ok: true,
    updated: true,
    engagementId: String(targetRow.id),
    previousType: previousNormalized ?? previousType,
    nextType,
  };
}

export type ProviderEvaluationEngagementPreview = {
  id: string;
  engagement_type: string;
  status: string;
  prepared_at?: string | null;
  planning_status?: string | null;
};

export function resolveProviderEvaluationEngagementPreview(
  provider: ProviderDirectoryRow,
): ProviderEvaluationEngagementPreview | null {
  const dedicated = provider.provider_evaluation_engagement;
  if (dedicated?.id) {
    return {
      id: String(dedicated.id),
      engagement_type: String(dedicated.engagement_type ?? ""),
      status: String(dedicated.status ?? "planned"),
      prepared_at: dedicated.prepared_at ?? null,
      planning_status: dedicated.planning_status ?? null,
    };
  }

  const upcoming = provider.upcoming_engagement;
  if (upcoming?.id && isEvaluationEngagementType(String(upcoming.engagement_type ?? ""))) {
    return {
      id: String(upcoming.id),
      engagement_type: String(upcoming.engagement_type ?? ""),
      status: String(upcoming.status ?? "planned"),
      prepared_at: (upcoming as { prepared_at?: string | null }).prepared_at ?? null,
      planning_status: (upcoming as { planning_status?: string | null }).planning_status ?? null,
    };
  }

  return null;
}

/** Provider page — same preview derived from full engagement summaries. */
export function resolveProviderEvaluationEngagementFromSummaries(
  engagements: ProviderEngagementSummary[] | null | undefined,
): ProviderEvaluationEngagementPreview | null {
  const candidates = (engagements ?? []).filter((engagement) =>
    isEvaluationEngagementType(String(engagement.engagement_type ?? "")),
  );
  if (candidates.length === 0) return null;

  const byStatus = (statuses: string[]) =>
    candidates.find((engagement) =>
      statuses.includes(String(engagement.status ?? "").trim().toLowerCase()),
    );

  const picked =
    byStatus(["in_progress", "active"]) ??
    byStatus(["planned", "scheduled", "confirmed"]) ??
    byStatus(["completed", "done", "closed"]) ??
    candidates[0];

  return {
    id: String(picked.id),
    engagement_type: String(picked.engagement_type ?? ""),
    status: String(picked.status ?? "planned"),
    prepared_at: picked.prepared_at ?? null,
    planning_status: picked.planning_status ?? null,
  };
}

/** Minimal summary so the preview can flow through resolveEvaluationStatus / path matching. */
export function evaluationEngagementPreviewAsSummary(
  preview: ProviderEvaluationEngagementPreview,
): ProviderEngagementSummary {
  return {
    id: preview.id,
    engagement_type: preview.engagement_type,
    engagement_type_label: formatEngagementType(preview.engagement_type),
    status: preview.status,
    status_label: preview.status,
    pre_call_filled: 0,
    pre_call_total: 0,
    pre_call_complete: false,
    briefing_status: "not_planned",
    briefing_status_label: "",
    planning_status: "not_planned",
    planning_status_label: "",
    prepared_at: preview.prepared_at ?? null,
    outcome_label: "",
  };
}
