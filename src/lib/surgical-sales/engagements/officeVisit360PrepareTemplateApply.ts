import type { EngagementWorkflowDraft } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";
import type { OfficeVisit360PrepareFieldKey } from "@/lib/surgical-sales/engagements/officeVisit360PrepareFields";
import type { PreCallPlanTemplate } from "@/lib/surgical-sales/preCallPlanTemplateModel";
import { trimOrNull } from "@/lib/surgical-sales/preCallPlanTemplateModel";

export type OfficeVisit360PrepareTemplateMapping = {
  label: string;
  draftKey: OfficeVisit360PrepareFieldKey;
  templateKey: keyof Pick<PreCallPlanTemplate, "smartObjective" | "probes">;
};

export const OFFICE_VISIT_360_PREPARE_TEMPLATE_MAPPINGS: readonly OfficeVisit360PrepareTemplateMapping[] =
  [
    { label: "Visit objective", draftKey: "observation_goal", templateKey: "smartObjective" },
    { label: "Sim lab focus", draftKey: "sim_lab_focus", templateKey: "probes" },
  ];

export type OfficeVisit360PrepareTemplateApplySection = {
  label: string;
  draftKey: OfficeVisit360PrepareFieldKey;
  templateValue: string | null;
  currentValue: string;
  hasTemplateContent: boolean;
  hasCurrentContent: boolean;
  wouldConflict: boolean;
  wouldFillOnBlankOnly: boolean;
};

export function buildOfficeVisit360PrepareTemplateApplySections(
  draft: EngagementWorkflowDraft,
  template: PreCallPlanTemplate,
): OfficeVisit360PrepareTemplateApplySection[] {
  return OFFICE_VISIT_360_PREPARE_TEMPLATE_MAPPINGS.map((mapping) => {
    const templateValue = trimOrNull(template[mapping.templateKey]);
    const currentValue = String(draft[mapping.draftKey] ?? "");
    const hasTemplateContent = Boolean(templateValue);
    const hasCurrentContent = Boolean(currentValue.trim());
    const wouldConflict = hasTemplateContent && hasCurrentContent;
    const wouldFillOnBlankOnly = hasTemplateContent && !hasCurrentContent;
    return {
      label: mapping.label,
      draftKey: mapping.draftKey,
      templateValue,
      currentValue,
      hasTemplateContent,
      hasCurrentContent,
      wouldConflict,
      wouldFillOnBlankOnly,
    };
  }).filter((section) => section.hasTemplateContent || section.hasCurrentContent);
}

export function officeVisit360PrepareTemplateHasApplyConflicts(
  draft: EngagementWorkflowDraft,
  template: PreCallPlanTemplate,
): boolean {
  return buildOfficeVisit360PrepareTemplateApplySections(draft, template).some(
    (section) => section.wouldConflict,
  );
}

export function applyOfficeVisit360PrepareTemplateToWorkflowDraft(
  draft: EngagementWorkflowDraft,
  template: PreCallPlanTemplate,
  mode: "fill_empty" | "overwrite" = "fill_empty",
): EngagementWorkflowDraft {
  const next = { ...draft };
  for (const mapping of OFFICE_VISIT_360_PREPARE_TEMPLATE_MAPPINGS) {
    const value = trimOrNull(template[mapping.templateKey]);
    if (!value) continue;
    if (mode === "fill_empty" && String(next[mapping.draftKey] ?? "").trim()) continue;
    next[mapping.draftKey] = value;
  }
  return next;
}
