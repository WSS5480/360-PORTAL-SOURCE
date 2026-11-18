import type {
  IntelligenceSignal,
  IntelligenceSignalType,
  EvidenceStatus,
} from "@/lib/surgical-sales/caseIntelligenceSignals";
import type {
  UfCoachingGuidanceInputs,
  UfLearningGapCategory,
  UfProgramSignalSummary,
} from "@/lib/surgical-sales/universalExtractor/coachingGuidanceInputsTypes";

function maturityToEvidenceStatus(maturity: UfProgramSignalSummary["maturity"]): EvidenceStatus {
  if (maturity === "established") return "validated";
  if (maturity === "observed_once") return "observed_once";
  return "missing";
}

function signalFromUfSummary(summary: UfProgramSignalSummary): IntelligenceSignal | null {
  const label =
    summary.sampleEvidence?.trim() ||
    summary.productMentioned?.trim() ||
    summary.concept.replace(/_/g, " ");

  let type: IntelligenceSignalType = "workflow_signal";
  let normalizedFindingId = summary.concept;
  let isPositiveStaffSignal = false;

  switch (summary.concept) {
    case "current_product":
      type = "observed_product";
      normalizedFindingId = `product_in_use:${summary.productMentioned ?? "product"}`;
      break;
    case "competitor_product":
      type = "competitor_product";
      normalizedFindingId = `competitor_product:${summary.productMentioned ?? "product"}`;
      break;
    case "provider_sentiment":
      type = "provider_pain_point";
      normalizedFindingId = "provider_frustration";
      break;
    case "staff_workflow":
    case "case_outcome":
      type = "staff_workflow_signal";
      normalizedFindingId = "staff_efficiency_coordinated";
      isPositiveStaffSignal = /organized|coordinated|smooth|routine|efficient/i.test(label);
      break;
    case "visualization_or_access_issue":
      type = "workflow_signal";
      normalizedFindingId = "workflow_visualization_before_fixation";
      break;
    case "workflow_or_timing_issue":
    case "placement_or_positioning_issue":
      type = "workflow_signal";
      normalizedFindingId = "workflow_delay";
      break;
    case "inventory_availability_issue":
    case "alternative_used":
    case "unavailable_item":
      type = "workflow_bottleneck";
      normalizedFindingId = "staff_supply_delay";
      break;
    case "sizing_or_fit_issue":
      type = "product_handling_issue";
      normalizedFindingId = "product_fit_opportunity";
      break;
    case "product_performance_issue":
      type = "product_objection";
      normalizedFindingId = "product_performance_issue";
      break;
    case "training_or_familiarity_issue":
      type = "training_need";
      normalizedFindingId = "training_gap";
      break;
    case "procedure_volume_trend":
      type = "procedure_type";
      normalizedFindingId = "procedure_volume_trend";
      break;
    case "procedure_focus":
      type = "procedure_type";
      normalizedFindingId = "procedure_focus";
      break;
    case "technology_preference":
      type = "procedure_type";
      normalizedFindingId = "technology_preference";
      break;
    default:
      return null;
  }

  if (summary.maturity === "absent") return null;

  return {
    label,
    type,
    subtype: null,
    procedureContext: null,
    productContext: summary.productMentioned ?? null,
    workflowStep: null,
    evidenceCount: summary.completedCaseCount,
    completedCaseCount: summary.completedCaseCount,
    confidence: summary.maturity === "established" ? "High" : "Medium",
    evidenceStatus: maturityToEvidenceStatus(summary.maturity),
    sourceCaseIds: [],
    lastObservedAt: null,
    normalizedFindingId,
    isPositiveStaffSignal,
  };
}

/** Map UF coaching summaries to IntelligenceSignal[] for briefing/gap composers. */
export function adaptUfCoachingToIntelligenceSignals(
  input: UfCoachingGuidanceInputs,
  scope: "prior" | "merged" = "prior",
): IntelligenceSignal[] {
  const summaries =
    scope === "prior"
      ? input.priorSignals
      : [...input.priorSignals, ...input.currentCaseSignals];

  const signals: IntelligenceSignal[] = [];
  const seen = new Set<string>();

  for (const summary of summaries) {
    const signal = signalFromUfSummary(summary);
    if (!signal) continue;
    const key = signal.normalizedFindingId;
    if (seen.has(key)) continue;
    seen.add(key);
    signals.push(signal);
  }

  for (const gap of input.gaps) {
    const gapSignal = gapToUnresolvedSignal(gap);
    if (gapSignal) signals.push(gapSignal);
  }

  return signals;
}

function gapToUnresolvedSignal(gap: UfLearningGapCategory): IntelligenceSignal | null {
  const mapping: Record<UfLearningGapCategory, { subtype: string; label: string }> = {
    provider_friction_unknown: {
      subtype: "provider_pain_points",
      label: "Provider pain points still unknown",
    },
    staff_friction_unknown: {
      subtype: "staff_pain_points",
      label: "Staff pain points still unknown",
    },
    product_usage_unknown: {
      subtype: "current_products",
      label: "Current products used",
    },
    repeat_confirmation_needed: {
      subtype: "repeat_confirmation",
      label: "Repeat confirmation needed",
    },
  };
  const meta = mapping[gap];
  if (!meta) return null;
  return {
    label: meta.label,
    type: "unresolved_gap",
    subtype: meta.subtype,
    procedureContext: null,
    productContext: null,
    workflowStep: null,
    evidenceCount: 0,
    completedCaseCount: 0,
    confidence: "Low",
    evidenceStatus: "missing",
    sourceCaseIds: [],
    lastObservedAt: null,
    normalizedFindingId: `gap:${gap}`,
    isPositiveStaffSignal: false,
  };
}

/** UF gap categories → evidence gap strings consumed by briefing templates. */
export function ufGapsToEvidenceGaps(gaps: UfLearningGapCategory[]): string[] {
  const lines: string[] = [];
  for (const gap of gaps) {
    if (gap === "provider_friction_unknown") lines.push("Provider pain points");
    if (gap === "staff_friction_unknown") lines.push("Staff pain points");
    if (gap === "product_usage_unknown") lines.push("Current products used");
  }
  return lines;
}
