import { buildMissionBoardEvaluationCardContext } from "@/lib/surgical-sales/buildMissionBoardEvaluationCardContext";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import type { SalesPathwayEvaluationActivity } from "@/lib/surgical-sales/salesPathwayCanonical";

export type MissionBoardEvaluationPathView = {
  providerName: string;
  organizationName: string | null;
  debriefOutcomeSummary: string | null;
  primaryOpportunity: string | null;
  recommendedPath: SalesPathwayEvaluationActivity;
  selectedPath: SalesPathwayEvaluationActivity | null;
  targetDate: string | null;
  notes: string | null;
};

/** Client-safe view builder — uses directory row data already on the Mission Board card. */
export function buildMissionBoardEvaluationPathViewFromDirectoryRow(
  provider: ProviderDirectoryRow,
  options?: {
    debriefEngagements?: ReadonlyArray<Record<string, unknown>>;
    debriefOutcomeSummary?: string | null;
  },
): MissionBoardEvaluationPathView {
  const contact = provider as Record<string, unknown>;
  const cardContext = buildMissionBoardEvaluationCardContext({
    provider,
    engagements: options?.debriefEngagements,
  });

  return {
    providerName: contactDisplayName(provider),
    organizationName: provider.primary_organization_name?.trim() || null,
    debriefOutcomeSummary:
      options?.debriefOutcomeSummary ??
      cardContext.debriefOutcomeSummary,
    primaryOpportunity: cardContext.primaryOpportunity,
    recommendedPath: cardContext.recommendedPath,
    selectedPath: cardContext.selectedPath,
    targetDate: String(contact.provider_evaluation_path_target_date ?? "").trim() || null,
    notes: String(contact.provider_evaluation_path_notes ?? "").trim() || null,
  };
}
