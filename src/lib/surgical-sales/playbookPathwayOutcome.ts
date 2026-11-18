import { supabaseAdmin } from "@/lib/supabase/admin";
import { nextSalesPathwayStage } from "@/lib/surgical-sales/pathway/salesPathwayRules";
import type { MissionBoardDebriefDictationReport } from "@/lib/surgical-sales/missionBoardDebriefDictationReport";
import {
  normalizeSalesPathwayStageId,
  type SalesPathwayStageId,
} from "@/lib/surgical-sales/salesPathwayCanonical";

export type PlaybookPathwayOutcomeStats = {
  successCount: number;
  noAdvanceCount: number;
  completedCount: number;
  /** Share of completed engagements that advanced to the next stage (0–1), or null when none completed. */
  conversionRatio: number | null;
};

const EMPTY_PLAYBOOK_PATHWAY_OUTCOME_STATS: PlaybookPathwayOutcomeStats = {
  successCount: 0,
  noAdvanceCount: 0,
  completedCount: 0,
  conversionRatio: null,
};

export function didPathwayAdvanceToNextStage(
  before: SalesPathwayStageId,
  after: SalesPathwayStageId,
): boolean {
  const expected = nextSalesPathwayStage(before);
  return expected !== null && after === expected;
}

export function buildPlaybookPathwayOutcomeStats(
  successCount: number,
  noAdvanceCount: number,
): PlaybookPathwayOutcomeStats {
  const completedCount = successCount + noAdvanceCount;
  return {
    successCount,
    noAdvanceCount,
    completedCount,
    conversionRatio:
      completedCount > 0 ? Math.round((successCount / completedCount) * 1000) / 1000 : null,
  };
}

export function formatPlaybookNextStageConversionRatio(ratio: number | null): string {
  if (ratio === null) return "—";
  return `${Math.round(ratio * 100)}%`;
}

export function buildEngagementPathwayCompletionOutcomePatch(
  report: Pick<MissionBoardDebriefDictationReport, "pathwayStageBefore" | "pathwayStageAfter">,
): {
  completion_pathway_stage_before: SalesPathwayStageId;
  completion_pathway_stage_after: SalesPathwayStageId;
} {
  return {
    completion_pathway_stage_before: report.pathwayStageBefore,
    completion_pathway_stage_after: report.pathwayStageAfter,
  };
}

export async function fetchPlaybookPathwayOutcomeStats(
  templateIds: string[],
): Promise<Map<string, PlaybookPathwayOutcomeStats>> {
  const ids = [...new Set(templateIds.filter(Boolean))];
  const stats = new Map<string, PlaybookPathwayOutcomeStats>();
  if (ids.length === 0) return stats;

  const { data, error } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .select(
      "pre_call_plan_template_id, completion_pathway_stage_before, completion_pathway_stage_after",
    )
    .in("pre_call_plan_template_id", ids)
    .not("completion_pathway_stage_before", "is", null)
    .not("completion_pathway_stage_after", "is", null);

  if (error) throw new Error(error.message);

  const successByTemplate = new Map<string, number>();
  const noAdvanceByTemplate = new Map<string, number>();

  for (const row of data ?? []) {
    const templateId = String(row.pre_call_plan_template_id ?? "").trim();
    if (!templateId) continue;
    const before = normalizeSalesPathwayStageId(row.completion_pathway_stage_before);
    const after = normalizeSalesPathwayStageId(row.completion_pathway_stage_after);
    if (!before || !after) continue;

    if (didPathwayAdvanceToNextStage(before, after)) {
      successByTemplate.set(templateId, (successByTemplate.get(templateId) ?? 0) + 1);
    } else {
      noAdvanceByTemplate.set(templateId, (noAdvanceByTemplate.get(templateId) ?? 0) + 1);
    }
  }

  for (const templateId of ids) {
    stats.set(
      templateId,
      buildPlaybookPathwayOutcomeStats(
        successByTemplate.get(templateId) ?? 0,
        noAdvanceByTemplate.get(templateId) ?? 0,
      ),
    );
  }

  return stats;
}

export function emptyPlaybookPathwayOutcomeStats(): PlaybookPathwayOutcomeStats {
  return { ...EMPTY_PLAYBOOK_PATHWAY_OUTCOME_STATS };
}
