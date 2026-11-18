import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { pickNextUpcomingEngagement } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { resolveProviderDebriefEngagementFromSummaries } from "@/lib/surgical-sales/missionBoardEngagementCommand";
import { resolveProviderEvaluationEngagementFromSummaries } from "@/lib/surgical-sales/missionBoardEvaluationEngagement";
import { buildProviderMissionEngagementPreview } from "@/lib/surgical-sales/buildProviderMissionEngagementPreview";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import type { ProviderPlanningStatus } from "@/lib/surgical-sales/providerPlanning";

/** Minimal Mission Board provider row for debrief status / schedule modals on provider overview. */
export function buildProviderOverviewPathwayDebriefProviderRow(input: {
  providerId: string;
  contact: Record<string, unknown>;
  engagements?: ProviderEngagementSummary[];
  organizationName?: string | null;
  organizationId?: string | null;
}): ProviderDirectoryRow {
  const { providerId, contact, engagements, organizationName, organizationId } = input;
  const debrief = resolveProviderDebriefEngagementFromSummaries(engagements);
  const upcoming = pickNextUpcomingEngagement(engagements);
  const orgId =
    organizationId?.trim() ||
    String(contact.organization_id ?? contact.account_id ?? "").trim() ||
    null;

  const providerRow: ProviderDirectoryRow = {
    ...(contact as ProviderDirectoryRow),
    id: providerId,
    first_name: (contact.first_name as string | null | undefined) ?? null,
    last_name: (contact.last_name as string | null | undefined) ?? null,
    organization_count: 0,
    specialty: (contact.specialty as string | null | undefined) ?? null,
    primary_organization_name: organizationName?.trim() || null,
    primary_organization_id: orgId,
    organization_id: orgId,
    account_id: orgId,
    additional_organizations_count: 0,
    territory: null,
    planning_status: (contact.planning_status as ProviderPlanningStatus | undefined) ?? "not_started",
    linked_opportunities_count: 0,
    recent_case_count: 0,
    last_activity_at: null,
    provider_debrief_engagement: debrief,
    provider_evaluation_engagement: resolveProviderEvaluationEngagementFromSummaries(engagements),
    upcoming_engagement: null,
  };

  return {
    ...providerRow,
    upcoming_engagement: upcoming ? buildProviderMissionEngagementPreview(upcoming, providerRow) : null,
  };
}
