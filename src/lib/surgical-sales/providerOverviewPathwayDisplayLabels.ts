import type { SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";

/** Company workflow labels shown on the provider overview pathway timeline. */
export const PROVIDER_OVERVIEW_PATHWAY_DISPLAY_LABELS: Record<SalesPathwayStageId, string> = {
  discovery: "Discovery",
  observe: "Observation",
  debrief: "Debrief",
  evaluation: "Evaluation",
  commitment: "Case Commitment",
  outcomes: "Outcomes",
};

export function providerOverviewPathwayDisplayLabel(stageId: SalesPathwayStageId): string {
  return PROVIDER_OVERVIEW_PATHWAY_DISPLAY_LABELS[stageId];
}
