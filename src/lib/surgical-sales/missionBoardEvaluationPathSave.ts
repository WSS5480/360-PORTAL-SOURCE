import { supabaseAdmin } from "@/lib/supabase/admin";
import { repCanAccessContact } from "@/lib/surgical-sales/contactManagement";
import { isProviderDebriefEngagement } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";
import { isProviderRole } from "@/lib/surgical-sales/providerRoles";
import { syncActiveEvaluationEngagementTypeForPath } from "@/lib/surgical-sales/missionBoardEvaluationEngagement";
import { logSurgicalSalesCrmAudit } from "@/lib/surgical-sales/surgicalSalesCrmAudit";
import { PATHWAY_CONTACT_PRODUCT_FIT_VALIDATED } from "@/lib/surgical-sales/pathway/pathwayContactFlags";
import {
  isSalesPathwayEvaluationActivity,
  type SalesPathwayEvaluationActivity,
} from "@/lib/surgical-sales/salesPathwayCanonical";

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

function formatDbError(error: { message?: string; details?: string; hint?: string } | null): string {
  if (!error) return "Database error.";
  const parts = [error.message, error.details, error.hint].map((part) => String(part ?? "").trim()).filter(Boolean);
  return parts.join(" — ") || "Database error.";
}

function isMissingEvaluationPathColumnError(message: string): boolean {
  return /provider_evaluation_path/i.test(message) && /does not exist|unknown column/i.test(message);
}

function resolveStoredEvaluationPath(contact?: Record<string, unknown> | null): SalesPathwayEvaluationActivity | null {
  const raw = String(contact?.provider_evaluation_path ?? "").trim();
  return isSalesPathwayEvaluationActivity(raw) ? raw : null;
}

function isTruthyContactFlag(contact: Record<string, unknown>, key: string): boolean {
  const token = String(contact[key] ?? "").trim().toLowerCase();
  return token === "yes" || token === "true" || token === "1";
}

async function providerHasCompletedDebriefEngagement(providerId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .select("engagement_type, debrief_completed")
    .eq("provider_id", providerId)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);

  return (data ?? []).some(
    (row) =>
      isProviderDebriefEngagement(String(row.engagement_type ?? "")) &&
      Boolean(row.debrief_completed),
  );
}

async function persistEvaluationPathPatch(input: {
  providerId: string;
  evaluationPath: SalesPathwayEvaluationActivity;
  targetDate: string;
  notes: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const fullPatch: Record<string, unknown> = {
    provider_evaluation_path: input.evaluationPath,
    provider_evaluation_path_target_date: input.targetDate || null,
    provider_evaluation_path_notes: input.notes || null,
    updated_at: new Date().toISOString(),
  };

  const { error: fullErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .update(fullPatch)
    .eq("id", input.providerId);

  if (!fullErr) return { ok: true };

  const fullMessage = formatDbError(fullErr);
  if (!/provider_evaluation_path_target_date|provider_evaluation_path_notes/i.test(fullMessage)) {
    if (isMissingEvaluationPathColumnError(fullMessage)) {
      return {
        ok: false,
        message:
          "Evaluation path columns are missing. Apply migration db/migrations/20260661_provider_evaluation_path.sql.",
      };
    }
    return { ok: false, message: fullMessage };
  }

  const minimalPatch: Record<string, unknown> = {
    provider_evaluation_path: input.evaluationPath,
    updated_at: new Date().toISOString(),
  };
  const { error: minimalErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .update(minimalPatch)
    .eq("id", input.providerId);

  if (!minimalErr) return { ok: true };

  const minimalMessage = formatDbError(minimalErr);
  if (isMissingEvaluationPathColumnError(minimalMessage)) {
    return {
      ok: false,
      message:
        "Evaluation path columns are missing. Apply migration db/migrations/20260661_provider_evaluation_path.sql.",
    };
  }
  return { ok: false, message: minimalMessage };
}

export async function saveMissionBoardEvaluationPath(input: {
  providerId: string;
  userId: string;
  evaluationPath: SalesPathwayEvaluationActivity;
  targetDate?: string | null;
  notes?: string | null;
}): Promise<
  ServiceResult<{
    evaluationPath: SalesPathwayEvaluationActivity;
    engagementSynced: boolean;
    engagementSyncWarning: string | null;
  }>
> {
  try {
    if (!isSalesPathwayEvaluationActivity(input.evaluationPath)) {
      return { ok: false, status: 400, message: "Invalid evaluation path." };
    }

    // Use select("*") so load still works when evaluation path columns are not migrated yet.
    const { data: existing, error: loadErr } = await supabaseAdmin
      .from("surgical_sales_contacts")
      .select("*")
      .eq("id", input.providerId)
      .maybeSingle();

    if (loadErr) return { ok: false, status: 500, message: formatDbError(loadErr) };
    if (!existing) return { ok: false, status: 404, message: "Not found" };
    if (!isProviderRole(String((existing as { role_type?: string }).role_type ?? ""))) {
      return { ok: false, status: 400, message: "Not a provider record." };
    }
    if (!(await repCanAccessContact(input.userId, existing as never))) {
      return { ok: false, status: 404, message: "Not found" };
    }

    const previousPath = resolveStoredEvaluationPath(existing as Record<string, unknown>);
    const targetDate = String(input.targetDate ?? "").trim();
    const notes = String(input.notes ?? "").trim();

    const persist = await persistEvaluationPathPatch({
      providerId: input.providerId,
      evaluationPath: input.evaluationPath,
      targetDate,
      notes,
    });
    if (!persist.ok) {
      return { ok: false, status: 500, message: persist.message };
    }

    const debriefCompleted = await providerHasCompletedDebriefEngagement(input.providerId);
    if (
      debriefCompleted &&
      !isTruthyContactFlag(existing as Record<string, unknown>, PATHWAY_CONTACT_PRODUCT_FIT_VALIDATED)
    ) {
      const { error: fitErr } = await supabaseAdmin
        .from("surgical_sales_contacts")
        .update({
          [PATHWAY_CONTACT_PRODUCT_FIT_VALIDATED]: "yes",
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.providerId);
      if (fitErr) {
        return { ok: false, status: 500, message: fitErr.message };
      }
    }

    let engagementSync:
      | { ok: true; updated: false }
      | { ok: true; updated: true; engagementId: string; previousType: string; nextType: string }
      | { ok: false; message: string } = { ok: true, updated: false };

    try {
      engagementSync = await syncActiveEvaluationEngagementTypeForPath({
        providerId: input.providerId,
        userId: input.userId,
        evaluationPath: input.evaluationPath,
      });
    } catch (syncErr) {
      console.error("[saveMissionBoardEvaluationPath] engagement sync threw", syncErr);
      engagementSync = {
        ok: false,
        message: syncErr instanceof Error ? syncErr.message : "Engagement sync failed.",
      };
    }

    const engagementSyncWarning = engagementSync.ok
      ? null
      : engagementSync.message || "Could not sync evaluation engagement type.";
    if (engagementSyncWarning) {
      console.error(
        "[saveMissionBoardEvaluationPath] engagement sync failed",
        engagementSyncWarning,
        { providerId: input.providerId, evaluationPath: input.evaluationPath },
      );
    }

    await logSurgicalSalesCrmAudit({
      actorUserId: input.userId,
      action: "evaluation_path_selected",
      meta: {
        provider_id: input.providerId,
        evaluation_path: input.evaluationPath,
        previous_path: previousPath,
        target_date: targetDate || null,
        has_notes: Boolean(notes),
        engagement_type_synced: engagementSync.ok && engagementSync.updated,
        engagement_sync_warning: engagementSyncWarning,
        ...(engagementSync.ok && engagementSync.updated
          ? {
              engagement_id: engagementSync.engagementId,
              previous_engagement_type: engagementSync.previousType,
              next_engagement_type: engagementSync.nextType,
            }
          : {}),
      },
    });

    if (engagementSync.ok && engagementSync.updated) {
      await logSurgicalSalesCrmAudit({
        actorUserId: input.userId,
        action: "evaluation_path_engagement_type_synced",
        meta: {
          engagement_id: engagementSync.engagementId,
          evaluation_path: input.evaluationPath,
          previous_engagement_type: engagementSync.previousType,
          next_engagement_type: engagementSync.nextType,
        },
      });
    }

    return {
      ok: true,
      data: {
        evaluationPath: input.evaluationPath,
        engagementSynced: engagementSync.ok && engagementSync.updated,
        engagementSyncWarning,
      },
    };
  } catch (err) {
    console.error("[saveMissionBoardEvaluationPath]", err);
    return {
      ok: false,
      status: 500,
      message: err instanceof Error ? err.message : "Failed to save evaluation path.",
    };
  }
}
