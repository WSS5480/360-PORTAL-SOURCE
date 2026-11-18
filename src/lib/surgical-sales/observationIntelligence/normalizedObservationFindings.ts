import type { ObservationLearningCategoryId } from "./observationLearningTypes";
import type { ObservationFact, ObservationFactType } from "./observationFactTypes";
import {
  extractProductTopic,
  normalizeFactsToCanonicalFindings,
  sanitizeDisplayLabel,
  type CanonicalFinding,
} from "@/lib/surgical-sales/canonicalFindingNormalization";
import { staffEfficiencyRepLabel } from "@/lib/surgical-sales/staffEfficiencyRepLabels";

export const WORKFLOW_VISUALIZATION_BEFORE_FIXATION_ID = "workflow_visualization_before_fixation";
export const PRODUCT_FIT_VISUALIZATION_FIXATION_WORKFLOW_ID =
  "product_fit_visualization_fixation_workflow";

export const NORMALIZED_FINDING_IDS = [
  WORKFLOW_VISUALIZATION_BEFORE_FIXATION_ID,
  "visualization_challenge",
  "staff_supply_delay",
  "workflow_delay",
  "room_turnover_delay",
  "provider_frustration",
  "staff_friction",
  "staff_supply_setup_delay",
  "staff_efficiency_coordinated",
  "staff_efficiency_organized",
  "staff_efficiency_comfortable",
  "product_in_use",
  "product_interest",
  "training_gap",
  "vendor_barrier",
] as const;

export type NormalizedFindingId = (typeof NORMALIZED_FINDING_IDS)[number];

export type NormalizedObservationFinding = {
  normalizedFindingId: string;
  categoryId: ObservationLearningCategoryId;
  label: string;
};

export const EXTRA_VISUALIZATION_BEFORE_FIXATION_LABEL = "Additional visualization required before fixation";

export function mergeVisualizationFindingLabels(left: string, right: string): string {
  if (left === right) return left;
  if (
    left === EXTRA_VISUALIZATION_BEFORE_FIXATION_LABEL ||
    right === EXTRA_VISUALIZATION_BEFORE_FIXATION_LABEL
  ) {
    return NORMALIZED_FINDING_LABELS.visualization_challenge;
  }
  return left.length >= right.length ? left : right;
}

const NORMALIZED_FINDING_LABELS: Record<NormalizedFindingId, string> = {
  [WORKFLOW_VISUALIZATION_BEFORE_FIXATION_ID]: "Visualization challenge before fixation",
  visualization_challenge: "Visualization challenge before fixation",
  staff_supply_delay: "Staff supply delays",
  workflow_delay: "Workflow delay",
  room_turnover_delay: "Room turnover delay",
  provider_frustration: "Provider clinical frustration",
  staff_friction: "Staff workflow friction",
  staff_supply_setup_delay: "Product availability/setup delays",
  staff_efficiency_coordinated: "Staff workflow appeared coordinated",
  staff_efficiency_organized: "Staff appeared organized",
  staff_efficiency_comfortable: "Staff appeared comfortable with current process",
  product_in_use: "Product observed",
  product_interest: "Product evaluation interest",
  training_gap: "Training need",
  vendor_barrier: "Vendor barrier",
};

function isVisualizationFact(fact: ObservationFact): boolean {
  if (fact.type === "visualization_challenge" || fact.type === "fixation_challenge") return true;
  if (fact.type !== "workflow_issue") return false;
  return /visuali|view|fixation|angle|challenge|exposure/i.test(fact.value);
}

function isExtraVisualizationTimeFact(fact: ObservationFact): boolean {
  return /extra visualization time before fixation|visualization delay before fixation/i.test(fact.value);
}

function visualizationFindingLabel(fact: ObservationFact): string {
  return NORMALIZED_FINDING_LABELS.visualization_challenge;
}

function isReadinessDelayFact(fact: ObservationFact): boolean {
  if (fact.type === "room_turnover_issue") return false;
  if (fact.type === "workflow_delay") return /readiness/i.test(fact.value);
  if (fact.type !== "workflow_issue") return false;
  return /readiness|waiting|not ready|looking for/i.test(fact.value);
}

function isTurnoverDelayFact(fact: ObservationFact): boolean {
  return fact.type === "room_turnover_issue" || /turnover/i.test(fact.value);
}

function isSetupWorkflowDelayFact(fact: ObservationFact): boolean {
  if (fact.type === "workflow_delay" && !/readiness/i.test(fact.value)) return true;
  if (fact.type !== "workflow_issue") return false;
  return /setup|pace slowed/i.test(fact.value);
}

function productInUseKey(productName: string): string {
  const topic = productName.trim().toLowerCase().replace(/\s+(observed|in use|usage)$/i, "");
  return `product_in_use:${topic}`;
}

function productInUseLabel(productName: string): string {
  const topic = extractProductTopic(productName);
  if (!topic || isJunkLabel(topic)) return "";
  return `${topic} observed`;
}

function isJunkLabel(label: string): boolean {
  return !label.trim() || /\bobserved observed\b/i.test(label) || /\busage in use\b/i.test(label);
}

function workflowDelayLabel(fact: ObservationFact): string {
  const value = fact.value.trim();
  if (!value || /^(workflow delay|workflow pace slowed|setup delay)$/i.test(value)) {
    return NORMALIZED_FINDING_LABELS.workflow_delay;
  }
  const cleaned = sanitizeDisplayLabel(value, "workflow_bottleneck");
  return cleaned || NORMALIZED_FINDING_LABELS.workflow_delay;
}

function resolveStaffEfficiencyFinding(fact: ObservationFact): NormalizedObservationFinding {
  const value = fact.value.trim();
  if (/coordinated|good|knew|doing/i.test(value)) {
    return {
      normalizedFindingId: "staff_efficiency_coordinated",
      categoryId: "staff_workflow",
      label: NORMALIZED_FINDING_LABELS.staff_efficiency_coordinated,
    };
  }
  if (/organized/i.test(value)) {
    return {
      normalizedFindingId: "staff_efficiency_organized",
      categoryId: "staff_workflow",
      label: NORMALIZED_FINDING_LABELS.staff_efficiency_organized,
    };
  }
  if (/comfortable|comfort with|comfortable with/i.test(value)) {
    return {
      normalizedFindingId: "staff_efficiency_comfortable",
      categoryId: "staff_workflow",
      label: NORMALIZED_FINDING_LABELS.staff_efficiency_comfortable,
    };
  }
  return {
    normalizedFindingId: `staff_efficiency:${value.toLowerCase().replace(/\s+/g, "_")}`,
    categoryId: "staff_workflow",
    label: staffEfficiencyRepLabel(value),
  };
}

/** Map a single fact to zero or one normalized finding. */
export function resolveNormalizedFindingFromFact(fact: ObservationFact): NormalizedObservationFinding | null {
  if (isVisualizationFact(fact)) {
    return {
      normalizedFindingId: WORKFLOW_VISUALIZATION_BEFORE_FIXATION_ID,
      categoryId: "workflow_findings",
      label: visualizationFindingLabel(fact),
    };
  }

  if (isReadinessDelayFact(fact)) {
    return {
      normalizedFindingId: "staff_supply_delay",
      categoryId: "workflow_findings",
      label: NORMALIZED_FINDING_LABELS.staff_supply_delay,
    };
  }

  if (isTurnoverDelayFact(fact)) {
    return {
      normalizedFindingId: "room_turnover_delay",
      categoryId: "workflow_findings",
      label: NORMALIZED_FINDING_LABELS.room_turnover_delay,
    };
  }

  if (isSetupWorkflowDelayFact(fact)) {
    return {
      normalizedFindingId: "workflow_delay",
      categoryId: "workflow_findings",
      label: workflowDelayLabel(fact),
    };
  }

  switch (fact.type as ObservationFactType) {
    case "provider_frustration":
      return {
        normalizedFindingId: "provider_frustration",
        categoryId: "provider_pain_points",
        label: NORMALIZED_FINDING_LABELS.provider_frustration,
      };
    case "staff_issue":
      if (/setup|product|opening|packaging/i.test(fact.value)) {
        return {
          normalizedFindingId: "staff_supply_setup_delay",
          categoryId: "staff_pain_points",
          label: NORMALIZED_FINDING_LABELS.staff_supply_setup_delay,
        };
      }
      return {
        normalizedFindingId: "staff_friction",
        categoryId: "staff_pain_points",
        label: NORMALIZED_FINDING_LABELS.staff_friction,
      };
    case "staff_efficiency":
      return resolveStaffEfficiencyFinding(fact);
    case "competitor_product":
    case "current_product": {
      const productName = fact.value.trim();
      if (!productName) return null;
      return {
        normalizedFindingId: productInUseKey(productName),
        categoryId: "current_products",
        label: productInUseLabel(productName),
      };
    }
    case "product_interest":
      return {
        normalizedFindingId: "product_interest",
        categoryId: "product_fit_signals",
        label: NORMALIZED_FINDING_LABELS.product_interest,
      };
    case "product_fit_signal":
      if (/visualization.*fixation|fixation.*workflow/i.test(fact.value)) {
        return {
          normalizedFindingId: PRODUCT_FIT_VISUALIZATION_FIXATION_WORKFLOW_ID,
          categoryId: "product_fit_signals",
          label: "Visualization/fixation workflow opportunity",
        };
      }
      return {
        normalizedFindingId: "product_interest",
        categoryId: "product_fit_signals",
        label: NORMALIZED_FINDING_LABELS.product_interest,
      };
    case "training_gap":
      return {
        normalizedFindingId: "training_gap",
        categoryId: "provider_pain_points",
        label: fact.value.trim() || NORMALIZED_FINDING_LABELS.training_gap,
      };
    case "vendor_barrier":
      return {
        normalizedFindingId: "vendor_barrier",
        categoryId: "product_fit_signals",
        label: fact.value.trim() || NORMALIZED_FINDING_LABELS.vendor_barrier,
      };
    default:
      return null;
  }
}

/** Collapse facts into deduplicated normalized findings for one observation case. */
export function normalizeFactsToFindings(facts: ObservationFact[]): NormalizedObservationFinding[] {
  const canonical = normalizeFactsToCanonicalFindings(facts);
  return canonical.map(canonicalFindingToNormalized);
}

function canonicalFindingToNormalized(finding: CanonicalFinding): NormalizedObservationFinding {
  return {
    normalizedFindingId: finding.normalizedFindingId,
    categoryId: finding.categoryId,
    label: finding.canonical_label,
  };
}

/** Legacy path — prefer normalizeFactsToFindings which uses canonical normalization. */
export function normalizeFactsToFindingsLegacy(facts: ObservationFact[]): NormalizedObservationFinding[] {
  const byKey = new Map<string, NormalizedObservationFinding>();

  for (const fact of facts) {
    const finding = resolveNormalizedFindingFromFact(fact);
    if (!finding || isJunkLabel(finding.label)) continue;

    const existing = byKey.get(finding.normalizedFindingId);
    if (!existing) {
      byKey.set(finding.normalizedFindingId, finding);
      continue;
    }

    if (
      (finding.normalizedFindingId === WORKFLOW_VISUALIZATION_BEFORE_FIXATION_ID ||
        finding.normalizedFindingId === "visualization_challenge") &&
      existing.label !== finding.label
    ) {
      byKey.set(finding.normalizedFindingId, {
        ...existing,
        label: mergeVisualizationFindingLabels(existing.label, finding.label),
      });
      continue;
    }

    const cleaned = sanitizeDisplayLabel(finding.label);
    if (cleaned && cleaned.length >= existing.label.length) {
      byKey.set(finding.normalizedFindingId, { ...finding, label: cleaned });
    }
  }

  return [...byKey.values()];
}
