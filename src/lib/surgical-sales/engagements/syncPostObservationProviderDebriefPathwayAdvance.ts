/**
 * After post-observation provider debrief save — unlock evaluation stage on the pathway.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import { saveMissionBoardEvaluationPath } from "@/lib/surgical-sales/missionBoardEvaluationPathSave";
import { PATHWAY_CONTACT_PRODUCT_FIT_VALIDATED } from "@/lib/surgical-sales/pathway/pathwayContactFlags";
import {
  readDebriefCompletionContextFromSnapshot,
  readDebriefNextStepFromSnapshot,
} from "@/lib/surgical-sales/engagements/mergeDebriefCompletionSnapshot";
import type { DebriefNextStepSnapshot } from "@/lib/surgical-sales/engagements/debriefCompletionValidationTypes";
import type { SalesPathwayEvaluationActivity } from "@/lib/surgical-sales/salesPathwayCanonical";

export function resolveEvaluationPathFromDebriefNextStep(
  nextStep: DebriefNextStepSnapshot | null | undefined,
): SalesPathwayEvaluationActivity | null {
  switch (nextStep?.recommendation) {
    case "evaluation":
    case "product_trial":
      return "Product Trial";
    case "360_experience":
      return "360 Experience";
    default:
      return null;
  }
}

export function shouldAdvancePathwayFromDebriefNextStep(
  nextStep: DebriefNextStepSnapshot | null | undefined,
): boolean {
  return resolveEvaluationPathFromDebriefNextStep(nextStep) != null;
}

export async function syncPostObservationProviderDebriefPathwayAdvance(input: {
  providerId: string;
  userId: string;
  debriefSnapshot: unknown;
  narrative?: string;
}): Promise<{ advancedToEvaluation: boolean; evaluationPath: SalesPathwayEvaluationActivity | null }> {
  const providerId = String(input.providerId ?? "").trim();
  if (!providerId) {
    return { advancedToEvaluation: false, evaluationPath: null };
  }

  const completionContext = readDebriefCompletionContextFromSnapshot(input.debriefSnapshot);
  const nextStep = readDebriefNextStepFromSnapshot(input.debriefSnapshot);
  const evaluationPath = resolveEvaluationPathFromDebriefNextStep(nextStep);
  if (!evaluationPath) {
    return { advancedToEvaluation: false, evaluationPath: null };
  }

  if (
    completionContext &&
    completionContext.isPostObservationProviderDebrief === false
  ) {
    return { advancedToEvaluation: false, evaluationPath: null };
  }

  const now = new Date().toISOString();
  const { error: fitErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .update({
      [PATHWAY_CONTACT_PRODUCT_FIT_VALIDATED]: "yes",
      updated_at: now,
    })
    .eq("id", providerId);

  if (fitErr) {
    throw new Error(fitErr.message);
  }

  const pathResult = await saveMissionBoardEvaluationPath({
    providerId,
    userId: input.userId,
    evaluationPath,
    notes: String(input.narrative ?? "").trim() || null,
  });

  if (!pathResult.ok) {
    throw new Error(pathResult.message);
  }

  return { advancedToEvaluation: true, evaluationPath };
}
