import {
  buildProviderOverviewHref,
  normalizeEngagementCreateReturnTo,
} from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import type { DebriefNextStepSnapshot } from "@/lib/surgical-sales/engagements/debriefCompletionValidationTypes";
import { resolveEvaluationPathFromDebriefNextStep } from "@/lib/surgical-sales/engagements/syncPostObservationProviderDebriefPathwayAdvance";
import { buildEvaluationPathScheduleHref } from "@/lib/surgical-sales/missionBoardEvaluationEngagement";
import type { SalesPathwayEvaluationActivity } from "@/lib/surgical-sales/salesPathwayCanonical";

export function buildNewEngagementHrefForProvider(input: {
  providerId: string;
  organizationId?: string | null;
  returnTo?: string | null;
}): string {
  const providerId = String(input.providerId ?? "").trim();
  const params = new URLSearchParams();
  if (providerId) params.set("provider_id", providerId);
  const organizationId = String(input.organizationId ?? "").trim();
  if (organizationId) params.set("organization_id", organizationId);
  const returnTo = normalizeEngagementCreateReturnTo(input.returnTo);
  if (returnTo) params.set("return_to", returnTo);
  const qs = params.toString();
  return qs ? `/portal/sales/engagements/new?${qs}` : "/portal/sales/engagements/new";
}

/** Provider overview after debrief — no scheduling wizard. */
export function resolvePostProviderDebriefFinishHref(input: {
  providerId: string;
}): string {
  const providerId = String(input.providerId ?? "").trim();
  return providerId ? buildProviderOverviewHref(providerId) : "/portal/sales/engagements";
}

/** Deep-link into schedule evaluation when rep is ready. */
export function resolvePostProviderDebriefScheduleHref(input: {
  providerId: string;
  organizationId?: string | null;
  nextStep?: DebriefNextStepSnapshot | null;
  returnTo?: string | null;
}): string | null {
  const providerId = String(input.providerId ?? "").trim();
  if (!providerId) return null;

  const evaluationPath = resolveEvaluationPathFromDebriefNextStep(input.nextStep);
  if (!evaluationPath) return null;

  const scheduleBase = buildNewEngagementHrefForProvider({
    providerId,
    organizationId: input.organizationId,
    returnTo: input.returnTo,
  });

  return buildEvaluationPathScheduleHref({
    path: evaluationPath as SalesPathwayEvaluationActivity,
    providerId,
    accountId: input.organizationId ?? null,
    newEngagementHref: scheduleBase,
  });
}
