import { isOfficeVisitEngagement } from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";
import type { EngagementWorkflowDraft } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";
import {
  resolveContextProductLine,
  type TemplateSuggestContext,
} from "@/lib/surgical-sales/preCallPlanTemplateSuggest";

export type PreparationReadinessLevel = "minimal" | "solid" | "strong";

export type PreparationReadinessSignal = {
  key: string;
  label: string;
  met: boolean;
};

export type PreparationReadiness = {
  level: PreparationReadinessLevel;
  level_label: string;
  /** 0–100 from met checklist signals */
  percent_complete: number;
  met_count: number;
  total_count: number;
  signals: PreparationReadinessSignal[];
};

/** Short chip labels for missing-item row (maps signal key → display). */
export const PREP_READINESS_GAP_CHIP_LABELS: Record<string, string> = {
  goal: "Objective",
  discovery: "Questions",
  opening: "Opening",
  product: "Product",
};

export function preparationReadinessGapChipLabel(signal: PreparationReadinessSignal): string {
  return PREP_READINESS_GAP_CHIP_LABELS[signal.key] ?? signal.label;
}

export function preparationReadinessMissingSignals(
  readiness: PreparationReadiness,
): PreparationReadinessSignal[] {
  return readiness.signals.filter((s) => !s.met);
}

/** One-line answer for intro call: "Am I ready?" */
export function preparationReadinessIntroCallHeadline(
  level: PreparationReadinessLevel,
  percentComplete: number,
): string {
  if (level === "strong" || percentComplete >= 100) {
    return "Ready for this intro call";
  }
  if (level === "solid") {
    return "Almost ready for this intro call";
  }
  return "Still developing for this intro call";
}

function fieldFilled(draft: EngagementWorkflowDraft, key: string, minLen = 12): boolean {
  return String(draft[key] ?? "").trim().length >= minLen;
}

function hasProductFocus(
  basicsProductLine: string,
  suggestContext: TemplateSuggestContext,
  opportunityProductLine?: string | null,
): boolean {
  if (String(basicsProductLine ?? "").trim()) return true;
  if (resolveContextProductLine(suggestContext)) return true;
  const opp = String(opportunityProductLine ?? "").trim();
  return opp.length > 0;
}

export function assessEngagementWizardPrepReadiness(input: {
  isStrategic: boolean;
  engagementType: string;
  workflowDraft: EngagementWorkflowDraft;
  basicsProductLine?: string;
  suggestContext: TemplateSuggestContext;
  opportunityProductLine?: string | null;
}): PreparationReadiness {
  const isOfficeVisit = isOfficeVisitEngagement(input.engagementType);
  const productMet = hasProductFocus(
    input.basicsProductLine ?? "",
    input.suggestContext,
    input.opportunityProductLine,
  );

  let signals: PreparationReadinessSignal[];

  if (input.isStrategic) {
    const discoveryKey = isOfficeVisit ? "sim_lab_focus" : "pre_observation_probes";
    signals = [
      {
        key: "goal",
        label: "Goal defined",
        met: fieldFilled(input.workflowDraft, "observation_goal", 10),
      },
      {
        key: "discovery",
        label: isOfficeVisit ? "Sim lab focus added" : "Discovery questions added",
        met: fieldFilled(input.workflowDraft, discoveryKey, 10),
      },
      {
        key: "opening",
        label: "Opening statement added",
        met: fieldFilled(input.workflowDraft, "pre_observation_impact_opening_statement", 10),
      },
      {
        key: "product",
        label: "Product focus identified",
        met: productMet,
      },
    ];
  } else {
    signals = [
      {
        key: "goal",
        label: "Purpose defined",
        met: fieldFilled(input.workflowDraft, "engagement_purpose", 8),
      },
      {
        key: "discovery",
        label: "Context notes added",
        met: fieldFilled(input.workflowDraft, "pre_observation_additional_notes", 10),
      },
      {
        key: "opening",
        label: "Next action captured",
        met: fieldFilled(input.workflowDraft, "next_action", 6),
      },
      {
        key: "product",
        label: "Product focus identified",
        met: productMet,
      },
    ];
  }

  const goalMet = signals.find((s) => s.key === "goal")?.met ?? false;
  const discoveryMet = signals.find((s) => s.key === "discovery")?.met ?? false;
  const openingMet = signals.find((s) => s.key === "opening")?.met ?? false;
  const metCount = signals.filter((s) => s.met).length;

  let level: PreparationReadinessLevel = "minimal";

  if (input.isStrategic) {
    if (goalMet && discoveryMet && openingMet) {
      level = "strong";
    } else if (goalMet && (discoveryMet || openingMet) && metCount >= 2) {
      level = "solid";
    } else if (goalMet || metCount >= 2) {
      level = metCount >= 3 ? "solid" : "minimal";
    }
  } else {
    if (goalMet && metCount >= 3) {
      level = "strong";
    } else if (goalMet && metCount >= 2) {
      level = "solid";
    } else if (metCount >= 2) {
      level = "solid";
    }
  }

  const level_label =
    level === "strong" ? "Strong" : level === "solid" ? "Solid" : "Minimal";

  const total_count = signals.length;
  const met_count = signals.filter((s) => s.met).length;
  const percent_complete =
    total_count > 0 ? Math.round((met_count / total_count) * 100) : 0;

  return { level, level_label, percent_complete, met_count, total_count, signals };
}
