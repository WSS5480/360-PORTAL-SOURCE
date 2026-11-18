import type { IntelligenceDomain } from "@/lib/surgical-sales/structuredIntelligenceAnalysis";
import {
  DEBRIEF_INTELLIGENCE_CATEGORY_LABELS,
  type DebriefIntelligenceCategory,
} from "@/lib/surgical-sales/debriefIntelligenceCategories";
import { engagementHasTacticalDebrief } from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";

/** Rep-facing extraction groups — aligned to normalized intelligence categories. */
export const OUTCOME_INTELLIGENCE_EXTRACTION_GROUPS: ReadonlyArray<{
  id: DebriefIntelligenceCategory;
  label: string;
  domains: IntelligenceDomain[];
}> = [
  {
    id: "access_intelligence",
    label: DEBRIEF_INTELLIGENCE_CATEGORY_LABELS.access_intelligence,
    domains: ["or_access", "credentialing", "scheduling"],
  },
  {
    id: "relationship_intelligence",
    label: DEBRIEF_INTELLIGENCE_CATEGORY_LABELS.relationship_intelligence,
    domains: ["relationship", "stakeholders"],
  },
  {
    id: "clinical_focus",
    label: DEBRIEF_INTELLIGENCE_CATEGORY_LABELS.clinical_focus,
    domains: ["case_mix"],
  },
  {
    id: "workflow_intelligence",
    label: DEBRIEF_INTELLIGENCE_CATEGORY_LABELS.workflow_intelligence,
    domains: ["workflow"],
  },
  {
    id: "product_fit_signals",
    label: DEBRIEF_INTELLIGENCE_CATEGORY_LABELS.product_fit_signals,
    domains: ["product_fit", "evaluation"],
  },
  {
    id: "competitive_intelligence",
    label: DEBRIEF_INTELLIGENCE_CATEGORY_LABELS.competitive_intelligence,
    domains: ["procurement"],
  },
  {
    id: "people_contacts",
    label: DEBRIEF_INTELLIGENCE_CATEGORY_LABELS.people_contacts,
    domains: ["stakeholders"],
  },
  {
    id: "next_steps",
    label: DEBRIEF_INTELLIGENCE_CATEGORY_LABELS.next_steps,
    domains: ["next_steps"],
  },
] as const;

export type OutcomeIntelligenceExtractionGroupId = DebriefIntelligenceCategory;

export function outcomeGroupForIntelligenceDomain(
  domain: IntelligenceDomain,
): OutcomeIntelligenceExtractionGroupId | null {
  for (const group of OUTCOME_INTELLIGENCE_EXTRACTION_GROUPS) {
    if (group.domains.includes(domain)) return group.id;
  }
  return null;
}

export function outcomeGroupForPrimaryCategory(
  category: DebriefIntelligenceCategory,
): OutcomeIntelligenceExtractionGroupId {
  return category;
}

export function outcomeGroupLabel(groupId: OutcomeIntelligenceExtractionGroupId): string {
  return DEBRIEF_INTELLIGENCE_CATEGORY_LABELS[groupId] ?? "Suggested update";
}

/** Provider intelligence may only be written after outcome notes are saved on the engagement. */
export function engagementAllowsOutcomeIntelligenceApply(
  engagement: Record<string, unknown> | null | undefined,
): boolean {
  if (!engagement) return false;
  return engagementHasTacticalDebrief({
    notes: engagement.notes != null ? String(engagement.notes) : null,
    debrief_completed: Boolean(engagement.debrief_completed),
    debrief_completed_at:
      engagement.debrief_completed_at != null ? String(engagement.debrief_completed_at) : null,
  });
}
