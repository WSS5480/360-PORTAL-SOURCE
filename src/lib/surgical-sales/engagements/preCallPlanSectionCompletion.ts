import type { EngagementWorkflowFieldConfig } from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";
import type { EngagementWorkflowDraft } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";
import { PRE_CALL_PLAN_STRATEGIC_TEMPLATE_MAPPINGS } from "@/lib/surgical-sales/preCallPlanStrategicTemplateMapping";

const PLACEHOLDER_ONLY = /^(n\/a|na|none|tbd|todo|\.|-|—|\.{2,}|x)$/i;

/** True when the section has substantive rep-entered content (not whitespace or filler). */
export function isMeaningfulPreCallPlanSectionContent(raw: string): boolean {
  const text = String(raw ?? "").trim();
  if (!text) return false;
  if (PLACEHOLDER_ONLY.test(text)) return false;

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && text.length >= 6) return true;
  return text.length >= 12;
}

export type PreCallPlanSectionCompletionItem = {
  key: string;
  label: string;
  drafted: boolean;
};

export type PreCallPlanSectionCompletion = {
  draftedCount: number;
  totalSections: number;
  sections: PreCallPlanSectionCompletionItem[];
  missingLabels: string[];
};

function usesCustomPlanFields(fields: EngagementWorkflowFieldConfig[]): boolean {
  const strategicKeys = new Set<string>(PRE_CALL_PLAN_STRATEGIC_TEMPLATE_MAPPINGS.map((m) => m.draftKey));
  return fields.some((field) => !strategicKeys.has(field.key));
}

export function buildPreCallPlanSectionCompletion(
  draft: EngagementWorkflowDraft,
  fields?: EngagementWorkflowFieldConfig[],
): PreCallPlanSectionCompletion {
  if (fields && fields.length > 0 && usesCustomPlanFields(fields)) {
    const sections: PreCallPlanSectionCompletionItem[] = fields.map((field) => {
      const value = String(draft[field.key] ?? "");
      return {
        key: field.key,
        label: field.label,
        drafted: isMeaningfulPreCallPlanSectionContent(value),
      };
    });

    const draftedCount = sections.filter((s) => s.drafted).length;
    return {
      draftedCount,
      totalSections: sections.length,
      sections,
      missingLabels: sections.filter((s) => !s.drafted).map((s) => s.label),
    };
  }

  const sections: PreCallPlanSectionCompletionItem[] = PRE_CALL_PLAN_STRATEGIC_TEMPLATE_MAPPINGS.map(
    (mapping) => {
      const config = fields?.find((f) => f.key === mapping.draftKey);
      const label = config?.label ?? mapping.label;
      const value = String(draft[mapping.draftKey] ?? "");
      return {
        key: mapping.draftKey,
        label,
        drafted: isMeaningfulPreCallPlanSectionContent(value),
      };
    },
  );

  const draftedCount = sections.filter((s) => s.drafted).length;
  const missingLabels = sections.filter((s) => !s.drafted).map((s) => s.label);

  return {
    draftedCount,
    totalSections: sections.length,
    sections,
    missingLabels,
  };
}

export function countPreCallPlanSectionsDrafted(
  draft: EngagementWorkflowDraft,
  fields?: EngagementWorkflowFieldConfig[],
): number {
  return buildPreCallPlanSectionCompletion(draft, fields).draftedCount;
}

export function isPreCallPlanDraftEmpty(
  draft: EngagementWorkflowDraft,
  fields?: EngagementWorkflowFieldConfig[],
): boolean {
  return countPreCallPlanSectionsDrafted(draft, fields) === 0;
}
