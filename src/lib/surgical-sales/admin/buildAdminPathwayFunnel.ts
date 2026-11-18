import type { SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";

export type AdminPathwayFunnelStageId =
  | "discovery"
  | "observation"
  | "evaluation"
  | "commitment"
  | "outcomes";

export type AdminPathwayFunnelSegment = {
  stage_id: AdminPathwayFunnelStageId;
  label: string;
  provider_count: number;
  sublabel?: string;
};

const FUNNEL_LABELS: Record<AdminPathwayFunnelStageId, string> = {
  discovery: "Discovery",
  observation: "Observation",
  evaluation: "Evaluation",
  commitment: "Commitment",
  outcomes: "Outcomes",
};

export function adminFunnelStageFromPathway(stage: SalesPathwayStageId): AdminPathwayFunnelStageId {
  if (stage === "discovery") return "discovery";
  if (stage === "observe" || stage === "debrief") return "observation";
  if (stage === "evaluation") return "evaluation";
  if (stage === "commitment") return "commitment";
  return "outcomes";
}

export function buildAdminPathwayFunnel(
  providerStages: Array<{ providerId: string; currentStage: SalesPathwayStageId }>,
): AdminPathwayFunnelSegment[] {
  const counts = new Map<AdminPathwayFunnelStageId, number>([
    ["discovery", 0],
    ["observation", 0],
    ["evaluation", 0],
    ["commitment", 0],
    ["outcomes", 0],
  ]);
  let debriefCount = 0;

  for (const row of providerStages) {
    if (row.currentStage === "debrief") debriefCount += 1;
    const funnelStage = adminFunnelStageFromPathway(row.currentStage);
    counts.set(funnelStage, (counts.get(funnelStage) ?? 0) + 1);
  }

  return (["discovery", "observation", "evaluation", "commitment", "outcomes"] as const).map(
    (stage_id) => ({
      stage_id,
      label: FUNNEL_LABELS[stage_id],
      provider_count: counts.get(stage_id) ?? 0,
      ...(stage_id === "observation" && debriefCount > 0
        ? { sublabel: `${debriefCount} in debrief` }
        : {}),
    }),
  );
}
