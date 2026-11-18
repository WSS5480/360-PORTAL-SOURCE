import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";

export const OFFICE_VISIT_360_PATHWAY_OBJECTIVE =
  "Prove hands-on workflow fit and secure a committed next step — evaluation, first use, or preference card review.";

export const OFFICE_VISIT_360_PATHWAY_OBJECTIVE_WHY =
  "This session should answer whether the provider can run the workflow confidently — not end as a general product tour.";

export const OFFICE_VISIT_360_PATHWAY_PRIMARY_QUESTION =
  "After today, what would you need to see to feel confident using this in your next case?";

export const OFFICE_VISIT_360_PATHWAY_SECONDARY_QUESTIONS = [
  "Which part of the workflow felt most natural versus where you hesitated?",
  "Who else needs to see this hands-on before you would move forward?",
  "What would make a follow-up lab or first case worthwhile versus unnecessary?",
] as const;

export function isOfficeVisit360PathwayMission(engagementType: string): boolean {
  return normalizeEngagementType(engagementType) === "office_visit_360";
}
