/**
 * Pathway workflow intelligence section labels — field-rep framing (not defect tracking).
 */

import type { SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";

export const PATHWAY_WORKFLOW_STAGE_INTELLIGENCE_LABELS = {
  discovery: "Discovery Targets",
  observation: "Observation Objectives",
  debrief: "Debrief Validation",
  evaluation: "Evaluation Planning",
  customer: "Growth Opportunities",
} as const;

export type PathwayWorkflowStageId = keyof typeof PATHWAY_WORKFLOW_STAGE_INTELLIGENCE_LABELS;

export function salesPathwayWorkflowStage(stageId: SalesPathwayStageId): PathwayWorkflowStageId {
  switch (stageId) {
    case "discovery":
      return "discovery";
    case "observe":
      return "observation";
    case "debrief":
      return "debrief";
    case "evaluation":
      return "evaluation";
    case "commitment":
      return "evaluation";
    case "outcomes":
      return "customer";
    default:
      return "discovery";
  }
}

/** Section heading for unresolved pathway intelligence on provider / engagement surfaces. */
export function pathwayStageIntelligenceSectionLabel(stageId: SalesPathwayStageId): string {
  return PATHWAY_WORKFLOW_STAGE_INTELLIGENCE_LABELS[salesPathwayWorkflowStage(stageId)];
}

/** Facility / organization operations queues — early mapping is discovery-stage work. */
export function organizationPathwayIntelligenceSectionLabel(): string {
  return PATHWAY_WORKFLOW_STAGE_INTELLIGENCE_LABELS.discovery;
}

/** Engagement type → section label for intelligence readiness lists. */
export function engagementPathwayIntelligenceSectionLabel(engagementType: string): string {
  const t = String(engagementType ?? "").trim().toLowerCase();
  if (t === "intro_call" || t === "follow_up" || t === "reactivation") {
    return PATHWAY_WORKFLOW_STAGE_INTELLIGENCE_LABELS.discovery;
  }
  if (t === "observation_request" || t === "or_visit") {
    return PATHWAY_WORKFLOW_STAGE_INTELLIGENCE_LABELS.observation;
  }
  if (
    t === "office_visit_360" ||
    t === "product_demo" ||
    t === "evaluation_planning" ||
    t === "evaluation_follow_up" ||
    t === "in_service_training" ||
    t === "post_case_follow_up"
  ) {
    return PATHWAY_WORKFLOW_STAGE_INTELLIGENCE_LABELS.evaluation;
  }
  return PATHWAY_WORKFLOW_STAGE_INTELLIGENCE_LABELS.discovery;
}

/** Pre-visit confirmation items for field-execution touches. */
export function engagementPreVisitIntelligenceSectionLabel(engagementType: string): string {
  const t = String(engagementType ?? "").trim().toLowerCase();
  if (t === "observation_request" || t === "or_visit") {
    return PATHWAY_WORKFLOW_STAGE_INTELLIGENCE_LABELS.observation;
  }
  return PATHWAY_WORKFLOW_STAGE_INTELLIGENCE_LABELS.discovery;
}
