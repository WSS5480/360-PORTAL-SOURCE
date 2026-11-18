import { isProviderDebriefEngagement } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";

const OBSERVATION_DEBRIEF_ENGAGEMENT_TYPE = "observation_debrief";

export function isDebriefValidationEngagementType(raw: string | null | undefined): boolean {
  const key = String(raw ?? "").trim();
  return (
    isProviderDebriefEngagement(key) || key === OBSERVATION_DEBRIEF_ENGAGEMENT_TYPE
  );
}

export function isPostObservationProviderDebrief(input: {
  engagementType: string | null | undefined;
  completedObservationCount: number;
}): boolean {
  return (
    isDebriefValidationEngagementType(input.engagementType) &&
    Number.isFinite(input.completedObservationCount) &&
    input.completedObservationCount >= 1
  );
}