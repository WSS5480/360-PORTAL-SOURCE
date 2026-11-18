/**

 * Provider overview — contextual quick-action strip on the mission card.

 * Primary CTA stays phase-driven separately.

 */



import type { ProviderOverviewExecutionAction } from "@/lib/surgical-sales/buildProviderOverviewExecutionCtas";

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";

import {

  type SalesPathwayStageId,

} from "@/lib/surgical-sales/salesPathwayCanonical";

import {

  buildContextualProviderQuickActions,

} from "@/lib/surgical-sales/providerPathwayExecutionRouting";

export {
  buildScheduleIntroCallAction,
  shouldSuggestScheduleIntroCallAction,
  shouldSuggestScheduleIntroCallQuickAction,
} from "@/lib/surgical-sales/buildProviderOverviewExecutionCtas";



export function providerOverviewActionDuplicatesPrimary(

  primary: ProviderOverviewExecutionAction,

  action: ProviderOverviewExecutionAction,

): boolean {

  if (action.id === primary.id) return true;

  if (action.customAction && action.customAction === primary.customAction) return true;

  if (primary.href && action.href && primary.href === action.href) return true;

  return false;

}

export function providerOverviewActionDuplicatesCoPrimary(
  coPrimary: ProviderOverviewExecutionAction | undefined,
  action: ProviderOverviewExecutionAction,
): boolean {
  if (!coPrimary) return false;
  return providerOverviewActionDuplicatesPrimary(coPrimary, action);
}



export function filterProviderOverviewQuickActionsAgainstPrimary(

  primary: ProviderOverviewExecutionAction,

  quickActions: ProviderOverviewExecutionAction[],

  coPrimary?: ProviderOverviewExecutionAction,

): ProviderOverviewExecutionAction[] {

  return quickActions.filter(
    (action) =>
      !providerOverviewActionDuplicatesPrimary(primary, action) &&
      !providerOverviewActionDuplicatesCoPrimary(coPrimary, action),
  );

}



export function buildProviderOverviewMissionQuickActions(input: {

  intelligenceHref: string;

  newEngagementHref: string;

  providerId: string;

  accountId?: string | null;

  contact: Record<string, unknown>;

  engagements?: ProviderEngagementSummary[];

  cases?: Array<Record<string, unknown>>;

  stageId?: SalesPathwayStageId | string;

}): ProviderOverviewExecutionAction[] {

  return buildContextualProviderQuickActions(input);

}


