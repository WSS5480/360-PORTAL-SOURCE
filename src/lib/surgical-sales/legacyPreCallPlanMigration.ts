/**
 * Pre-Call Plan field inventory and legacy migration helpers.
 * No data deletion — provider_pre_observation_* and case pre_observation_* are preserved.
 */

import {
  countPreCallPlanFilled,
  PRE_CALL_PLAN_CASE_KEYS,
  PROVIDER_PRE_CALL_PLAN_LEGACY_KEYS,
} from "@/lib/surgical-sales/preCallPlanFields";
import {
  formatEngagementStatus,
  formatEngagementType,
} from "@/lib/surgical-sales/engagements/engagementTypes";
import {
  formatEngagementPlanningStatusLabel,
  resolveEngagementPlanningStatus,
} from "@/lib/surgical-sales/engagements/engagementPlanningModel";
import { formatEngagementPreparationDisplayStatus } from "@/lib/surgical-sales/engagements/engagementStatusDisplay";
import {
  buildEngagementOutcomeLabel,
  type ProviderEngagementSummary,
} from "@/lib/surgical-sales/engagements/providerEngagementSummary";

export const LEGACY_CASE_PRE_CALL_MARKER = "[legacy_case_pre_call_migrated]";
export const LEGACY_PROVIDER_PLANNING_MARKER = "[legacy_provider_planning_migrated]";

export const PRE_CALL_PLAN_FIELD_INVENTORY = {
  engagement: [...PRE_CALL_PLAN_CASE_KEYS],
  case_legacy: [...PRE_CALL_PLAN_CASE_KEYS],
  provider_legacy: [...PROVIDER_PRE_CALL_PLAN_LEGACY_KEYS],
} as const;

export function rowHasLegacyPreCallPlanData(row: Record<string, unknown>): boolean {
  return countPreCallPlanFilled(row).filled > 0;
}

export function providerRowHasLegacyProfilePlanning(row: Record<string, unknown>): boolean {
  return PROVIDER_PRE_CALL_PLAN_LEGACY_KEYS.some((key) => String(row[key] ?? "").trim().length > 0);
}

export function engagementListCoversLegacyProviderPlanning(
  engagements: ProviderEngagementSummary[],
): boolean {
  return engagements.some((e) => e.pre_call_filled > 0);
}

/** UI-only draft row when DB migration has not yet created an engagement. */
export function buildLegacyProviderPlanningEngagementDraft(
  provider: Record<string, unknown>,
  opts?: { organizationName?: string | null },
): ProviderEngagementSummary | null {
  if (!providerRowHasLegacyProfilePlanning(provider)) return null;

  const draftRow: Record<string, unknown> = {
    observation_goal: provider.provider_strategic_goal ?? null,
    pre_observation_impact_opening_statement:
      provider.provider_pre_observation_impact_opening_statement,
    pre_observation_probes: provider.provider_pre_observation_probes,
    pre_observation_tools_resources: provider.provider_pre_observation_tools_resources,
    pre_observation_value_hypothesis: provider.provider_pre_observation_value_hypothesis,
    pre_observation_planned_close: provider.provider_pre_observation_planned_close,
    pre_observation_additional_notes: provider.provider_pre_observation_additional_notes,
  };

  const preCall = countPreCallPlanFilled(draftRow);
  const planningStatus = resolveEngagementPlanningStatus(draftRow);
  const planningLabel =
    formatEngagementPreparationDisplayStatus(draftRow) ??
    formatEngagementPlanningStatusLabel(planningStatus);
  const providerId = String(provider.id ?? "");

  const enriched = {
    id: `legacy-planning-${providerId}`,
    engagement_type: "follow_up",
    status: "planned",
    title: "Pre-Call Plan (legacy profile data)",
    organization_name: opts?.organizationName ?? null,
    outcome_label: "",
  };

  return {
    id: enriched.id,
    engagement_type: "follow_up",
    engagement_type_label: formatEngagementType("follow_up"),
    status: "planned",
    status_label: formatEngagementStatus("planned"),
    title: enriched.title,
    organization_name: opts?.organizationName ?? null,
    pre_call_filled: preCall.filled,
    pre_call_total: preCall.total,
    pre_call_complete: preCall.total > 0 && preCall.filled >= preCall.total,
    briefing_status: planningStatus,
    briefing_status_label: planningLabel,
    planning_status: planningStatus,
    planning_status_label: planningLabel,
    outcome_label: buildEngagementOutcomeLabel({
      ...enriched,
      status_label: formatEngagementStatus("planned"),
      notes: "Legacy planning on provider profile — open to migrate into an engagement.",
    }),
    is_legacy_draft: true,
    legacy_new_engagement_href: `/portal/sales/engagements/new?provider_id=${encodeURIComponent(providerId)}`,
  };
}

export function mergeProviderEngagementsWithLegacyDraft(
  provider: Record<string, unknown>,
  engagements: ProviderEngagementSummary[],
  opts?: { organizationName?: string | null },
): ProviderEngagementSummary[] {
  if (engagementListCoversLegacyProviderPlanning(engagements)) return engagements;
  const draft = buildLegacyProviderPlanningEngagementDraft(provider, opts);
  if (!draft) return engagements;
  const hasDraft = engagements.some((e) => e.is_legacy_draft);
  if (hasDraft) return engagements;
  return [draft, ...engagements];
}
