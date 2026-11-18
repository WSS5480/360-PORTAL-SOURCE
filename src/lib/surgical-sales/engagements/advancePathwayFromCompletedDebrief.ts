/**
 * Advance provider from completed debrief to Evaluation stage.
 * Used when tactical debrief saved notes but product fit was not stamped yet.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import { repCanAccessContact } from "@/lib/surgical-sales/contactManagement";
import { isProviderDebriefEngagement } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";
import { readDebriefNextStepFromSnapshot } from "@/lib/surgical-sales/engagements/mergeDebriefCompletionSnapshot";
import {
  resolveEvaluationPathFromDebriefNextStep,
  syncPostObservationProviderDebriefPathwayAdvance,
} from "@/lib/surgical-sales/engagements/syncPostObservationProviderDebriefPathwayAdvance";
import { saveMissionBoardEvaluationPath } from "@/lib/surgical-sales/missionBoardEvaluationPathSave";
import { PATHWAY_CONTACT_PRODUCT_FIT_VALIDATED } from "@/lib/surgical-sales/pathway/pathwayContactFlags";
import { hasProductFitValidated } from "@/lib/surgical-sales/pathwayStageGates";
import {
  isSalesPathwayEvaluationActivity,
  type SalesPathwayEvaluationActivity,
} from "@/lib/surgical-sales/salesPathwayCanonical";
import { extractRawDebriefFromStoredNotes } from "@/lib/surgical-sales/engagements/prepareTacticalDebriefRawNotes";

export type AdvancePathwayFromCompletedDebriefResult =
  | {
      ok: true;
      advancedToEvaluation: boolean;
      evaluationPath: SalesPathwayEvaluationActivity | null;
      alreadyAdvanced?: boolean;
    }
  | { ok: false; message: string; status: number };

async function loadLatestProviderDebriefEngagement(providerId: string) {
  const { data, error } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .select("id, engagement_type, status, debrief_completed, debrief_intelligence_snapshot, notes")
    .eq("provider_id", providerId)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);

  return (data ?? []).find((row) =>
    isProviderDebriefEngagement(String(row.engagement_type ?? "")),
  ) as
    | {
        id: string;
        engagement_type: string;
        status: string;
        debrief_completed?: boolean;
        debrief_intelligence_snapshot?: unknown;
        notes?: string | null;
      }
    | undefined;
}

export async function advancePathwayFromCompletedDebrief(input: {
  providerId: string;
  userId: string;
  evaluationPath?: SalesPathwayEvaluationActivity | null;
  notes?: string | null;
}): Promise<AdvancePathwayFromCompletedDebriefResult> {
  const providerId = String(input.providerId ?? "").trim();
  if (!providerId) {
    return { ok: false, message: "Invalid provider id.", status: 400 };
  }

  const { data: contact, error: contactErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", providerId)
    .maybeSingle();
  if (contactErr) return { ok: false, message: contactErr.message, status: 500 };
  if (!contact) return { ok: false, message: "Provider not found.", status: 404 };
  if (!(await repCanAccessContact(input.userId, contact as never))) {
    return { ok: false, message: "Provider not found.", status: 404 };
  }

  const gateInput = { contact: contact as Record<string, unknown> };
  if (hasProductFitValidated(gateInput)) {
    const stored = String(contact.provider_evaluation_path ?? "").trim();
    return {
      ok: true,
      advancedToEvaluation: true,
      evaluationPath: isSalesPathwayEvaluationActivity(stored) ? stored : null,
      alreadyAdvanced: true,
    };
  }

  const debriefEngagement = await loadLatestProviderDebriefEngagement(providerId);
  if (!debriefEngagement?.debrief_completed) {
    return {
      ok: false,
      message: "Complete the provider debrief before advancing to Evaluation.",
      status: 409,
    };
  }

  const snapshotPath = resolveEvaluationPathFromDebriefNextStep(
    readDebriefNextStepFromSnapshot(debriefEngagement.debrief_intelligence_snapshot),
  );
  const evaluationPath = input.evaluationPath ?? snapshotPath;
  if (!evaluationPath) {
    return {
      ok: false,
      message: "Select an evaluation path to continue.",
      status: 400,
    };
  }

  const narrative =
    String(input.notes ?? "").trim() ||
    extractRawDebriefFromStoredNotes(String(debriefEngagement.notes ?? ""));

  const syncResult = await syncPostObservationProviderDebriefPathwayAdvance({
    providerId,
    userId: input.userId,
    debriefSnapshot: debriefEngagement.debrief_intelligence_snapshot,
    narrative,
  });

  if (syncResult.advancedToEvaluation) {
    return {
      ok: true,
      advancedToEvaluation: true,
      evaluationPath: syncResult.evaluationPath,
    };
  }

  const now = new Date().toISOString();
  const { error: fitErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .update({
      [PATHWAY_CONTACT_PRODUCT_FIT_VALIDATED]: "yes",
      updated_at: now,
    })
    .eq("id", providerId);
  if (fitErr) return { ok: false, message: fitErr.message, status: 500 };

  const pathResult = await saveMissionBoardEvaluationPath({
    providerId,
    userId: input.userId,
    evaluationPath,
    notes: narrative || null,
  });
  if (!pathResult.ok) {
    return { ok: false, message: pathResult.message, status: pathResult.status };
  }

  return {
    ok: true,
    advancedToEvaluation: true,
    evaluationPath,
  };
}
